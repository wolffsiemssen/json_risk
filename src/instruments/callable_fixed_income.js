(function (library) {
  class CallableFixedIncome extends library.Instrument {
    constructor(obj) {
      super(obj);

      //only fixed rate instruments
      if (!library.number_vector_or_null(obj.fixed_rate))
        throw new Error(
          "callable_fixed_income: must provide valid fixed_rate.",
        );

      var fcd = library.date_or_null(obj.first_exercise_date);
      if (null === fcd)
        throw new Error("callable_fixed_income: must provide first call date");

      this.mean_reversion = library.number_or_null(obj.mean_reversion); // null allowed
      this.hull_white_volatility = library.number_or_null(
        obj.hull_white_volatility,
      ); // null allowed

      if (null === this.mean_reversion) this.mean_reversion = 0.0;
      this.base = new library.FixedIncome(obj);
      if (fcd.getTime() <= this.base.schedule[0].getTime())
        throw new Error(
          "callable_fixed_income: first call date before issue date",
        );
      if (!this.base.notional_exchange)
        throw new Error(
          "callable_fixed_income: callable instruments must exchange notionals",
        );
      var call_tenor = library.natural_number_or_null(obj.call_tenor);
      this.call_schedule = library.schedule(
        fcd,
        library.date_or_null(obj.maturity),
        call_tenor || 0, //european call by default
        this.base.adj,
        null,
        null,
        true,
        false,
      );
      this.call_schedule.pop(); //pop removes maturity from call schedule as maturity is not really a call date

      var i;
      for (i = 0; i < this.call_schedule.length; i++) {
        // adjust exercise dates according to business day rule
        this.call_schedule[i] = this.base.adj(this.call_schedule[i]);
      }
      this.opportunity_spread =
        library.number_or_null(obj.opportunity_spread) || 0.0;
      this.exclude_base = library.make_bool(obj.exclude_base);
      this.simple_calibration = library.make_bool(obj.simple_calibration);

      //truncate call dates as soon as principal has been redeemed
      var cf_obj = this.base.get_cash_flows();
      i = cf_obj.current_principal.length - 1;
      while (cf_obj.current_principal[i] === 0) i--;
      while (
        this.call_schedule[this.call_schedule.length - 1] >= cf_obj.date_pmt[i]
      )
        this.call_schedule.pop();

      //basket generation
      this.basket = new Array(this.call_schedule.length);
      var temp;
      for (i = 0; i < this.call_schedule.length; i++) {
        if (
          (!this.base.is_amortizing && this.base.fixed_rate.length === 1) ||
          this.simple_calibration
        ) {
          //basket instruments are co-terminal swaptions with standard conditions
          this.basket[i] = new library.Swaption({
            is_payer: false,
            maturity: obj.maturity,
            first_exercise_date: this.call_schedule[i],
            notional: obj.notional,
            fixed_rate:
              this.base.fixed_rate[0] -
              this.opportunity_spread -
              this.base.excl_margin,
            tenor: 12,
            float_spread: 0.0,
            float_tenor: obj.float_tenor || 6,
            float_current_rate: 0.0,
            calendar: obj.calendar,
            bdc: obj.bdc,
            float_bdc: obj.bdc,
            dcc: obj.dcc,
            float_dcc: obj.dcc,
          });
        } else {
          //basket instruments are equivalent regular swaptions with standard conditions
          temp = library.create_equivalent_regular_swaption(
            this.base.get_cash_flows(),
            this.call_schedule[i],
            {
              tenor: 12,
              float_spread: 0.0,
              float_tenor: obj.float_tenor || 6,
              calendar: obj.calendar,
              bdc: obj.bdc,
            },
          );
          temp.fixed_rate -= this.opportunity_spread;
          this.basket[i] = new library.Swaption(temp);
        }
      }

      // market deps
      this.disc_curve = obj.disc_curve || "";
      this.spread_curve = obj.spread_curve || "";
      this.fwd_curve = obj.fwd_curve || "";
      this.surface = obj.surface || "";
    }

    present_value(disc_curve, spread_curve, fwd_curve, surface) {
      var res = 0;
      var i;
      //eliminate past call dates and derive time to exercise
      var t_exercise = [],
        tte;
      for (i = 0; i < this.call_schedule.length; i++) {
        tte = library.time_from_now(this.call_schedule[i]);
        if (tte > 1 / 512) t_exercise.push(tte); //non-expired call date
      }

      if (typeof disc_curve !== "object" || disc_curve === null)
        throw new Error(
          "callable_fixed_income.present_value: must provide discount curve",
        );
      if (typeof fwd_curve !== "object" || fwd_curve === null)
        throw new Error(
          "callable_fixed_income.present_value: must provide forward curve for calibration",
        );
      if ((!disc_curve) instanceof library.Curve)
        disc_curve = new library.Curve(disc_curve);
      if ((!fwd_curve) instanceof library.Curve)
        fwd_curve = new library.Curve(fwd_curve);
      if (spread_curve) {
        if ((!spread_curve) instanceof library.Curve)
          spread_curve = new library.Curve(spread_curve);
      } else {
        spread_curve = null;
      }
      // get LGM model with desired mean reversion
      const lgm = new library.LGM(this.mean_reversion);

      if (null == this.hull_white_volatility) {
        //calibrate lgm model - returns xi for non-expired swaptions only
        if (!(surface instanceof library.Surface))
          surface = new library.Surface(surface);

        lgm.calibrate(this.basket, disc_curve, fwd_curve, surface);
      } else {
        lgm.set_times_and_hull_white_volatility(
          t_exercise,
          this.hull_white_volatility,
        );
      }

      //derive call option price
      const xi_vec = lgm.xi;
      if (1 === xi_vec.length) {
        //european call, use closed formula
        res = -lgm.european_call(
          this.base.get_cash_flows(),
          t_exercise[0],
          disc_curve,
          xi_vec[0],
          spread_curve,
          this.base.residual_spread,
          this.opportunity_spread,
        );
      } else if (1 < xi_vec.length) {
        //bermudan call, use numeric integration
        res = -lgm.bermudan_call(
          this.base.get_cash_flows(),
          t_exercise,
          disc_curve,
          xi_vec,
          spread_curve,
          this.base.residual_spread,
          this.opportunity_spread,
        );
      } //if xi_vec.length===0 all calls are expired, no value subtracted

      //add bond base price if not explicitly excluded
      if (!this.exclude_base)
        res += this.base.present_value(disc_curve, spread_curve, null);
      return res;
    }

    add_deps_impl(deps) {
      deps.add_curve(this.disc_curve);
      if (this.spread_curve != "") deps.add_curve(this.spread_curve);
      deps.add_curve(this.fwd_curve);
      deps.add_surface(this.surface);
    }

    value_impl(params) {
      const disc_curve = params.get_curve(this.disc_curve);
      const spread_curve =
        this.spread_curve != "" ? params.get_curve(this.spread_curve) : null;
      const fwd_curve = params.get_curve(this.fwd_curve);
      const surface = params.get_surface(this.surface);
      return this.present_value(disc_curve, spread_curve, fwd_curve, surface);
    }
  }

  library.CallableFixedIncome = CallableFixedIncome;
})(this.JsonRisk || module.exports);
