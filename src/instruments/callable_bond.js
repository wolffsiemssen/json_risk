(function (library) {
  /**
   * Class representing a bond with single or multiple call rights
   * @memberof JsonRisk
   * @extends Bond
   */
  class CallableBond extends library.Bond {
    #call_schedule = null;
    #mean_reversion = 0.0;
    #hull_white_volatility = null;
    #opportunity_spread = 0.0;
    #exclude_base = false;
    #basket = null;
    #surface = "";
    #fwd_curve = "";

    /**
     * Create a callable bond instrument. If legs are not provided, legs are generated from terms and conditions. Legs must be one and only one leg with fixed and notional payments.
     * @param {obj} obj A plain object representing the instrument
     * @param {string} [obj.currency=""] the currency in which this instrument's value is represented
     * @param {number} [obj.quantity=1.0] the quantity with which the instrument's value is multiplied
     * @param {array} [obj.legs=[]] the legs of this instrument.
     * @param {date} [obj.acquire_date=01.01.1900] the acquire date
     * @param {date} obj.first_exercise_date the first date bond can be called
     * @param {number} [obj.call_tenor=0] the distance of call dates in months. A call schedule is generated forward from the first exercise date until maturity.
     * @param {number} [obj.mean_reversion=0] the hull-white mean reversion for valuation of the call rights
     * @param {number} [obj.hull_white_volatility=null] the hull-white volatility for valuation of the call rights, if not provided, volatilities are calibrated against the supplied swaption volatility surface.
     */

    constructor(obj) {
      // bond makes sure only fixed rate is supported
      super(obj);

      // call schedule
      const fcd = library.date_or_null(obj.first_exercise_date);
      if (null === fcd)
        throw new Error("CallableBond: must provide first call date");
      const leg = this.legs[0];
      const payments = leg.payments;
      if (fcd.getTime() <= payments[0].date_start.getTime())
        throw new Error("CallableBond: first call date before issue date");

      const call_tenor = library.natural_number_or_null(obj.call_tenor) || 0; //european call by default
      const date_end = payments[payments.length - 1].date_value;
      const is_holiday_func = library.is_holiday_factory(obj.calendar);
      const bdc = library.string_or_empty(obj.bdc);
      const adjust = function (d) {
        return library.adjust(d, bdc, is_holiday_func);
      };
      let call_schedule = library.schedule(
        fcd,
        date_end,
        call_tenor,
        adjust,
        null,
        null,
        true,
        false,
      );
      call_schedule.pop(); //pop removes maturity from call schedule as maturity is not really a call date

      call_schedule = call_schedule.map(function (dt) {
        return adjust(dt);
      }); // adjust call dates with calendar

      //truncate call dates as soon as principal has been redeemed
      let i = payments.length - 1;
      while (payments[i].notional === 0) i--;
      while (
        call_schedule[call_schedule.length - 1].getTime() >=
        payments[i].date_pmt.getTime()
      )
        call_schedule.pop();

      this.#call_schedule = call_schedule;
      Object.freeze(call_schedule);

      this.#mean_reversion = library.number_or_null(obj.mean_reversion) || 0.0; // null allowed
      this.hull_white_volatility = library.number_or_null(
        obj.hull_white_volatility,
      ); // null allowed

      this.#opportunity_spread =
        library.number_or_null(obj.opportunity_spread) || 0.0;
      this.#exclude_base = library.make_bool(obj.exclude_base);
      const simple_calibration = library.make_bool(obj.simple_calibration);

      //basket generation
      this.#basket = new Array(call_schedule.length);
      for (let i = 0; i < call_schedule.length; i++) {
        if (
          (leg.has_constant_notional && leg.has_constant_rate) ||
          simple_calibration
        ) {
          //basket instruments are co-terminal swaptions with standard conditions
          this.#basket[i] = new library.Swaption({
            is_payer: false,
            maturity: date_end,
            first_exercise_date: this.#call_schedule[i],
            notional: -payments[0].notional,
            fixed_rate: this.fixed_rate - this.#opportunity_spread,
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
          const temp = library.create_equivalent_regular_swaption(
            leg,
            this.#call_schedule[i],
            {
              tenor: 12,
              float_spread: 0.0,
              float_tenor: obj.float_tenor || 6,
              calendar: obj.calendar,
              bdc: obj.bdc,
            },
          );
          temp.fixed_rate -= this.#opportunity_spread;
          this.#basket[i] = new library.Swaption(temp);
        }
      }

      // market deps
      this.#surface = obj.surface || "";
      this.#fwd_curve = obj.fwd_curve || "";
    }

    /**
     * Returns the vector of call dates. Array is frozen, i.e., read only.
     * @type {Array}
     */
    get call_schedule() {
      return this.#call_schedule;
    }

    value_impl(params) {
      const leg = this.legs[0];
      const disc_curve = params.get_curve(leg.disc_curve);
      const spread_curve =
        leg.spread_curve != "" ? params.get_curve(leg.spread_curve) : null;
      const fwd_curve = params.get_curve(this.#fwd_curve);

      //eliminate past call dates and derive time to exercise
      const t_exercise = [];
      for (const dt of this.#call_schedule) {
        const tte = library.time_from_now(dt);
        if (tte > 1 / 512) t_exercise.push(tte); //non-expired call date
      }

      // get LGM model with desired mean reversion
      const lgm = new library.LGM(this.#mean_reversion);

      if (null == this.#hull_white_volatility) {
        //calibrate lgm model - returns xi for non-expired swaptions only
        const surface = params.get_surface(this.#surface);

        lgm.calibrate(this.#basket, disc_curve, fwd_curve, surface);
      } else {
        lgm.set_times_and_hull_white_volatility(
          t_exercise,
          this.hull_white_volatility,
        );
      }

      //derive call option price
      let res = 0;
      const xi_vec = lgm.xi;
      if (1 === xi_vec.length) {
        //european call, use closed formula
        res = -lgm.european_call(
          leg.get_cash_flows(),
          t_exercise[0],
          disc_curve,
          xi_vec[0],
          spread_curve,
          leg.residual_spread,
          this.#opportunity_spread,
        );
      } else if (1 < xi_vec.length) {
        //bermudan call, use numeric integration
        res = -lgm.bermudan_call(
          leg.get_cash_flows(),
          t_exercise,
          disc_curve,
          xi_vec,
          spread_curve,
          leg.residual_spread,
          this.#opportunity_spread,
        );
      } //if xi_vec.length===0 all calls are expired, no value subtracted

      //add bond base price if not explicitly excluded
      if (!this.#exclude_base) res += this.legs[0].value(params);
      return res;
    }

    add_deps_impl(deps) {
      this.legs[0].add_deps(deps);
      deps.add_curve(this.#fwd_curve);
      deps.add_surface(this.#surface);
    }
  }

  library.CallableBond = CallableBond;
})(this.JsonRisk || module.exports);
