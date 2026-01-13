(function (library) {
  class Swaption extends library.Swap {
    #first_exercise_date = null;
    #maturity = null;
    #surface = "";
    #std_dev = 0.0;
    #vol = 0.0;
    constructor(obj) {
      //first_exercise_date (a.k.a. expiry) of the swaption
      let first_exercise_date = library.date_or_null(obj.first_exercise_date);
      if (!first_exercise_date)
        throw new Error(
          "swaption: must provide valid first_exercise_date date.",
        );

      if (!Array.isArray(obj.legs)) {
        // make temp object for the super class Swap to generate legs starting from first exercise date
        const tempobj = Object.assign(obj);
        tempobj.effective_date = first_exercise_date;
        super(tempobj);
      } else {
        super(obj);
      }

      this.#first_exercise_date = first_exercise_date;

      //maturity of the underlying swap
      this.#maturity = library.date_or_null(obj.maturity);
      if (!this.#maturity)
        throw new Error("swaption: must provide valid maturity date.");

      // surface
      this.#surface = obj.surface || "";
    }

    // getter functions
    get first_exercise_date() {
      return this.#first_exercise_date;
    }

    get surface() {
      return this.#surface;
    }

    get vol() {
      return this.#vol;
    }

    get std_dev() {
      return this.#std_dev;
    }

    add_deps_impl(deps) {
      // swap legdependencies
      super.add_deps_impl(deps);
      // surface
      if ("" != this.#surface) deps.add_surface(this.#surface);
    }

    value_impl(params) {
      const disc_curve = params.get_curve(this.fixed_leg.disc_curve);
      const surface = params.get_surface(this.#surface);

      // fwd curve from first index that can be found
      let fwd_curve = null;
      for (const idx of Object.values(this.float_leg.indices)) {
        fwd_curve = idx.fwd_curve;
        break;
      }
      fwd_curve = params.get_curve(fwd_curve);

      return this.value_with_curves(disc_curve, fwd_curve, surface);
    }

    value_with_curves(disc_curve, fwd_curve, surface) {
      //obtain times
      var t_maturity = library.time_from_now(this.#maturity);
      var t_first_exercise_date = library.time_from_now(
        this.#first_exercise_date,
      );
      var t_term = t_maturity - t_first_exercise_date;
      if (t_term < 1 / 512) {
        return 0;
      }
      //obtain fwd rate, that is, fair swap rate
      const fair_rate = this.fair_rate(disc_curve, fwd_curve);
      const fixed_rate = this.fixed_rate();

      //obtain time-scaled volatility
      this.#vol = surface.get_rate(
        t_first_exercise_date,
        t_term,
        fair_rate, // fwd rate
        fixed_rate, // strike
      );
      this.#std_dev = this.#vol * Math.sqrt(t_first_exercise_date);

      // initialize model
      const model = new library.BachelierModel(t_first_exercise_date, this.vol);

      const annuity = this.annuity(disc_curve);
      let res;
      if (annuity > 0) {
        // receiver swap is put option
        res = model.put_price(fair_rate, fixed_rate);
        res *= annuity;
      } else {
        // payer swap is call option
        res = model.call_price(fair_rate, fixed_rate);
        res *= -annuity;
      }
      return res;
    }
  }

  library.Swaption = Swaption;

  /**
   * ...
   * @param {object} cf_obj cash flow object
   * @param {date} first_exercise_date first exercise date
   * @param {object} conventions conventions
   * @returns {object} ...
   * @memberof JsonRisk
   * @public
   */
  library.create_equivalent_regular_swaption = function (
    cf_obj,
    first_exercise_date,
    conventions,
  ) {
    //sanity checks
    if (
      undefined === cf_obj.date_pmt ||
      undefined === cf_obj.pmt_total ||
      undefined === cf_obj.current_principal
    )
      throw new Error(
        "create_equivalent_regular_swaption: invalid cashflow object",
      );
    if (
      cf_obj.t_pmt.length !== cf_obj.pmt_total.length ||
      cf_obj.t_pmt.length !== cf_obj.current_principal.length
    )
      throw new Error(
        "create_equivalent_regular_swaption: invalid cashflow object",
      );
    if (!conventions) conventions = {};
    var tenor = conventions.tenor || 6;
    var bdc = conventions.bdc || "unadjusted";
    var calendar = conventions.calendar || "";

    //retrieve outstanding principal on first_exercise_date (corresponds to regular swaption notional)
    var outstanding_principal = 0;
    var i = 0;
    while (cf_obj.date_pmt[i] <= first_exercise_date) i++;
    outstanding_principal = cf_obj.current_principal[i];

    if (outstanding_principal === 0)
      throw new Error(
        "create_equivalent_regular_swaption: invalid cashflow object or first_exercise_date, zero outstanding principal",
      );
    //compute internal rate of return for remaining cash flow including settlement payment
    var irr;
    try {
      irr = library.irr(cf_obj, first_exercise_date, -outstanding_principal);
    } catch (e) {
      // somtimes irr fails with degenerate options, e.g., on a last very short period
      irr = 0;
    }

    //regular swaption rate (that is, moneyness) should be equal to irr converted from annual compounding to simple compounding
    irr = (12 / tenor) * (Math.pow(1 + irr, tenor / 12) - 1);

    //compute forward effective duration of remaining cash flow
    var tte = library.time_from_now(first_exercise_date);
    var cup = library.get_const_curve(irr + 0.0001);
    var cdown = library.get_const_curve(irr - 0.0001);
    var npv_up = library.dcf(cf_obj, cup, null, null, first_exercise_date);
    npv_up /= cup.get_df(tte);
    var npv_down = library.dcf(cf_obj, cdown, null, null, first_exercise_date);
    npv_down /= cdown.get_df(tte);
    var effective_duration_target =
      (10000.0 * (npv_down - npv_up)) / (npv_down + npv_up);

    // in some cases effective duration target is very short, make it at least one day
    if (effective_duration_target < 1 / 365)
      effective_duration_target = 1 / 365;

    //brief function to compute forward effective duration
    var ed = function (bond) {
      var fi = new library.FixedIncome(bond);
      npv_up = fi.present_value(cup);
      npv_up /= cup.get_df(tte);
      npv_down = fi.present_value(cdown);
      npv_down /= cdown.get_df(tte);
      var res = (10000.0 * (npv_down - npv_up)) / (npv_down + npv_up);
      return res;
    };

    //find bullet bond maturity that has approximately the same effective duration
    //start with simple estimate
    var ttm_guess = effective_duration_target;
    var ttm = ttm_guess;
    var maturity = library.add_days(first_exercise_date, Math.round(ttm * 365));

    var bond = {
      maturity: maturity,
      effective_date: first_exercise_date,
      settlement_date: library.adjust(
        first_exercise_date,
        bdc,
        library.is_holiday_factory(calendar),
      ), //exclude initial disboursement cashflow from valuation
      notional: outstanding_principal,
      fixed_rate: irr,
      tenor: tenor,
      calendar: calendar,
      bdc: bdc,
    };
    var effective_duration = ed(bond);
    var iter = 10;

    //alter maturity until we obtain effective duration target value
    while (
      Math.abs(effective_duration - effective_duration_target) > 1 / 512 &&
      iter > 0
    ) {
      ttm = (ttm * effective_duration_target) / effective_duration;
      // revert to best estimate when value is implausible
      if (isNaN(ttm) || ttm > 100 || ttm < 1 / 365) ttm = ttm_guess;
      maturity = library.add_days(first_exercise_date, Math.round(ttm * 365));
      bond.maturity = maturity;
      effective_duration = ed(bond);
      iter--;
    }

    return {
      is_payer: false,
      maturity: maturity,
      first_exercise_date: first_exercise_date,
      effective_date: first_exercise_date,
      settlement_date: first_exercise_date,
      notional: outstanding_principal,
      fixed_rate: irr,
      tenor: tenor,
      float_spread: 0.0,
      float_tenor: conventions.float_tenor || 6,
      float_current_rate: 0.0,
      calendar: calendar,
      bdc: bdc,
      float_bdc: bdc,
    };
  };
})(this.JsonRisk || module.exports);
