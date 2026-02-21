(function (library) {
  /**
   * Class representing a plain vanilla swaption
   * @memberof JsonRisk
   * @extends Swap
   */
  class Swaption extends library.Swap {
    #first_exercise_date = null;
    #maturity = null;
    #surface = "";
    #std_dev = 0.0;
    #vol = 0.0;

    /**
     * Create a swaption instrument. If legs are not provided, legs are generated from terms and conditions. Legs must be one purely fix and one purely float leg.
     * @param {obj} obj A plain object representing the instrument
     * @param {string} [obj.currency=""] the currency in which this instrument's value is represented
     * @param {number} [obj.quantity=1.0] the quantity with which the instrument's value is multiplied
     * @param {array} [obj.legs=[]] the legs of this instrument.
     * @param {date} [obj.acquire_date=01.01.1900] the acquire date
  * @param {date} obj.first_exercise_date the exercise date for the swaption
       * @param {date} obj.maturity the maturity date of the underlying swap
     * @param {string} [obj.surface=""] the reference to a surface object
     
     */
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
      const t_maturity = library.time_from_now(this.#maturity);
      const t_first_exercise_date = library.time_from_now(
        this.#first_exercise_date,
      );
      const t_term = t_maturity - t_first_exercise_date;
      if (t_term < 1 / 512) {
        return 0;
      }
      //obtain fwd rate, that is, fair swap rate
      const fair_rate = this.fair_rate(disc_curve, fwd_curve);
      const fixed_rate = this.fixed_rate;

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
    original_leg,
    exercise_date,
    conventions,
  ) {
    //sanity checks
    if (!(original_leg instanceof library.Leg))
      throw new Error("create_equivalent_regular_swaption: invalid leg");

    if (!conventions) conventions = {};
    const tenor = conventions.tenor || 6;
    const bdc = conventions.bdc || "unadjusted";
    const calendar = conventions.calendar || "";

    // rebuild leg with just a discount curve
    const leg = new library.Leg({
      disc_curve: "discount",
      payments: original_leg.payments,
    });

    //retrieve outstanding principal on first_exercise_date (corresponds to regular swaption notional)
    const balance = leg.balance(exercise_date);
    if (balance === 0)
      throw new Error(
        "create_equivalent_regular_swaption: invalid leg or first_exercise_date, zero outstanding principal",
      );
    //compute internal rate of return for remaining cash flow including settlement payment
    let irr = 0;
    try {
      irr = leg.irr(exercise_date);
    } catch (e_not_used) {
      // somtimes irr fails with degenerate options, e.g., on a last very short period
    }

    //regular swaption rate (that is, moneyness) should be equal to irr converted from annual compounding to simple compounding
    irr = (12 / tenor) * (Math.pow(1 + irr, tenor / 12) - 1);

    //compute forward effective duration of remaining cash flow
    const params_up = new library.Params({
      valuation_date: library.valuation_date,
      curves: {
        discount: {
          type: "yield",
          times: [1],
          zcs: [irr + 0.0001],
        },
      },
    });
    const df_ex_up = params_up
      .get_curve("discount")
      .get_df(library.time_from_now(exercise_date));

    const params_down = new library.Params({
      valuation_date: library.valuation_date,
      curves: {
        discount: {
          type: "yield",
          times: [1],
          zcs: [irr - 0.0001],
        },
      },
    });
    const df_ex_down = params_down
      .get_curve("discount")
      .get_df(library.time_from_now(exercise_date));

    //brief function to compute forward effective duration on a leg
    const ed = function (leg) {
      const npv_up = leg.value(params_up, exercise_date) / df_ex_up;
      const npv_down = leg.value(params_down, exercise_date) / df_ex_down;
      const res = (10000.0 * (npv_down - npv_up)) / (npv_down + npv_up);
      return res;
    };

    // in some cases effective duration target is very short, make it at least one day
    let effective_duration = ed(leg);
    const effective_duration_target = Math.max(effective_duration, 1 / 365);

    //find bullet bond maturity that has approximately the same effective duration
    //start with simple estimate
    const ttm_guess = effective_duration_target;
    let ttm = ttm_guess;
    let maturity = library.add_days(exercise_date, Math.round(ttm * 365));

    const bond = {
      maturity: maturity,
      effective_date: exercise_date,
      acquire_date_: library.adjust(
        exercise_date,
        bdc,
        library.is_holiday_factory(calendar),
      ), //exclude initial disboursement cashflow from valuation
      notional: balance,
      fixed_rate: irr,
      tenor: tenor,
      calendar: calendar,
      bdc: bdc,
      disc_curve: "discount",
    };
    effective_duration = ed(new library.Bond(bond).legs[0]);
    let iter = 10;

    //alter maturity until we obtain effective duration target value
    while (
      Math.abs(effective_duration - effective_duration_target) > 1 / 512 &&
      iter > 0
    ) {
      ttm = (ttm * effective_duration_target) / effective_duration;
      // revert to best estimate when value is implausible
      if (isNaN(ttm) || ttm > 100 || ttm < 1 / 365) ttm = ttm_guess;
      maturity = library.add_days(exercise_date, Math.round(ttm * 365));
      bond.maturity = maturity;
      const leg = new library.Bond(bond).legs[0];
      effective_duration = ed(leg);
      iter--;
    }

    return {
      is_payer: false,
      maturity: maturity,
      first_exercise_date: exercise_date,
      effective_date: exercise_date,
      settlement_date: exercise_date,
      notional: balance,
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
