/*!
	JSON Risk
	v1.0.0
	https://github.com/wolffsiemssen/json_risk
	License: MIT
*/

(function (root, factory) {
  if (typeof module === "object" && typeof exports !== "undefined") {
    // Node
    module.exports = factory();
  } else {
    // Browser
    root.JsonRisk = factory();
  }
})(this, function () {
  var JsonRisk = {
    valuation_date: null,
  };

  JsonRisk.require_vd = function () {
    if (!(JsonRisk.valuation_date instanceof Date))
      throw new Error("JsonRisk: valuation_date must be set");
  };

  return JsonRisk;
});
(function (library) {
  /**
   * @name library
   * @namespace functions
   */

  /**
   * creates an internal callable bond object (including swaption and baskets) from input data
   * @param {object} instrument a callable bond
   * @memberof library
   * @public
   */

  library.callable_fixed_income = function (instrument) {
    /*
         
         callable fixed income consists of
           -- an internal simple_fixed_income base instrument
           -- a call schedule
           -- a calibration basket of internal swaptions
           

         */

    //only fixed rate instruments
    if (!library.get_safe_number_vector(instrument.fixed_rate))
      throw new Error("callable_fixed_income: must provide valid fixed_rate.");

    var fcd = library.get_safe_date(instrument.first_exercise_date);
    if (null === fcd)
      throw new Error("callable_fixed_income: must provide first call date");

    this.mean_reversion = library.get_safe_number(instrument.mean_reversion); // null allowed
    this.hull_white_volatility = library.get_safe_number(
      instrument.hull_white_volatility,
    ); // null allowed

    if (null === this.mean_reversion) this.mean_reversion = 0.0;
    this.base = new library.fixed_income(instrument);
    if (fcd.getTime() <= this.base.schedule[0].getTime())
      throw new Error(
        "callable_fixed_income: first call date before issue date",
      );
    if (!this.base.notional_exchange)
      throw new Error(
        "callable_fixed_income: callable instruments must exchange notionals",
      );
    var call_tenor = library.get_safe_natural(instrument.call_tenor);
    this.call_schedule = library.schedule(
      fcd,
      library.get_safe_date(instrument.maturity),
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
      library.get_safe_number(instrument.opportunity_spread) || 0.0;
    this.exclude_base = library.get_safe_bool(instrument.exclude_base);
    this.simple_calibration = library.get_safe_bool(
      instrument.simple_calibration,
    );

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
        this.basket[i] = new library.swaption({
          is_payer: false,
          maturity: instrument.maturity,
          first_exercise_date: this.call_schedule[i],
          notional: instrument.notional,
          fixed_rate:
            this.base.fixed_rate[0] -
            this.opportunity_spread -
            this.base.excl_margin,
          tenor: 12,
          float_spread: 0.0,
          float_tenor: instrument.float_tenor || 6,
          float_current_rate: 0.0,
          calendar: instrument.calendar,
          bdc: instrument.bdc,
          float_bdc: instrument.bdc,
          dcc: instrument.dcc,
          float_dcc: instrument.dcc,
        });
      } else {
        //basket instruments are equivalent regular swaptions with standard conditions
        temp = library.create_equivalent_regular_swaption(
          this.base.get_cash_flows(),
          this.call_schedule[i],
          {
            tenor: 12,
            float_spread: 0.0,
            float_tenor: instrument.float_tenor || 6,
            calendar: instrument.calendar,
            bdc: instrument.bdc,
          },
        );
        temp.fixed_rate -= this.opportunity_spread;
        this.basket[i] = new library.swaption(temp);
      }
    }
  };

  /**
   * calculates the present value for internal callable bond (object)
   * @param {object} disc_curve discount curve
   * @param {object} spread_curve spread curve
   * @param {object} fwd_curve forward curve
   * @param {object} surface surface
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.callable_fixed_income.prototype.present_value = function (
    disc_curve,
    spread_curve,
    fwd_curve,
    surface,
  ) {
    var res = 0;
    var i;
    //eliminate past call dates and derive time to exercise
    library.require_vd(); //valuation date must be set
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
    library.get_safe_curve(disc_curve);
    library.get_safe_curve(fwd_curve);
    if (spread_curve) library.get_safe_curve(spread_curve);

    // set lgm mean reversion
    library.lgm_set_mean_reversion(this.mean_reversion);

    //calibrate lgm model - returns xi for non-expired swaptions only
    if (typeof surface !== "object" || surface === null)
      throw new Error(
        "callable_fixed_income.present_value: must provide valid surface",
      );

    var xi_vec;
    if (null == this.hull_white_volatility) {
      xi_vec = library.lgm_calibrate(
        this.basket,
        disc_curve,
        fwd_curve,
        surface,
      );
    } else {
      xi_vec = library.get_xi_from_hull_white_volatility(
        t_exercise,
        this.hull_white_volatility,
      );
    }

    //derive call option price
    if (1 === xi_vec.length) {
      //european call, use closed formula
      res = -library.lgm_european_call_on_cf(
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
      res = -library.lgm_bermudan_call_on_cf(
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
  };

  /**
   * calculates the present value for callable bonds
   * @param {object} bond instrument of type bond
   * @param {object} disc_curve discount curve
   * @param {object} spread_curve spread curve
   * @param {object} fwd_curve forward curve
   * @param {object} surface surface
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.pricer_callable_bond = function (
    bond,
    disc_curve,
    spread_curve,
    fwd_curve,
    surface,
  ) {
    var cb_internal = new library.callable_fixed_income(bond);
    return cb_internal.present_value(
      disc_curve,
      spread_curve,
      fwd_curve,
      surface,
    );
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * creates an internal equity object from input data
   * @param {object} instrument instrument of type equity
   * @memberof library
   * @public
   */
  library.equity = function (instrument) {
    this.quantity = library.get_safe_number(instrument.quantity);
    if (null === this.quantity)
      throw new Error("equity: must provide valid quantity");
  };
  /**
   * calculates the present value for internal equity object
   * @param {object} quote scalar object
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.equity.prototype.present_value = function (quote) {
    var q = library.get_safe_scalar(quote);
    return this.quantity * q.get_value();
  };

  /**
   * calculates the present value for equity JSON
   * @param {object} equity instrument of type equity
   * @param {object} quote market quote scalar object
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.pricer_equity = function (equity, quote) {
    var equity_internal = new library.equity(equity);
    return equity_internal.present_value(quote);
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * creates an internal fixed income object from input data
   * @param {object} instrument Instrument
   * @memberof library
   * @public
   */
  library.fixed_income = function (instrument) {
    var maturity = library.get_safe_date(instrument.maturity);
    if (!maturity) throw new Error("fixed_income: must provide maturity date.");

    var effective_date = library.get_safe_date(instrument.effective_date); //null allowed

    this.notional = library.get_safe_number(instrument.notional);
    if (null === this.notional)
      throw new Error("fixed_income: must provide valid notional.");

    //include notional exchange unless explicitly set to false (e.g., for swaps)
    this.notional_exchange = library.get_safe_bool(
      instrument.notional_exchange,
    );
    if (
      null === instrument.notional_exchange ||
      "" === instrument.notional_exchange ||
      undefined === instrument.notional_exchange
    )
      this.notional_exchange = true;

    //interest related fields
    var tenor = library.get_safe_natural(instrument.tenor);
    if (null === tenor)
      throw new Error("fixed_income: must provide valid tenor.");

    var first_date = library.get_safe_date(instrument.first_date); //null allowed
    var next_to_last_date = library.get_safe_date(instrument.next_to_last_date); //null allowed
    var stub_end = library.get_safe_bool(instrument.stub_end);
    var stub_long = library.get_safe_bool(instrument.stub_long);
    this.excl_margin = library.get_safe_number(instrument.excl_margin) || 0;

    //    this.current_accrued_interest = instrument.current_accrued_interest || 0;

    this.type =
      typeof instrument.type === "string" ? instrument.type : "unknown";

    this.is_holiday_func = library.is_holiday_factory(
      instrument.calendar || "",
    );
    this.year_fraction_func = library.year_fraction_factory(
      instrument.dcc || "",
    );
    this.bdc = instrument.bdc || "";
    this.adjust_accrual_periods = library.get_safe_bool(
      instrument.adjust_accrual_periods,
    );

    this.adj = (function (b, i) {
      return function (d) {
        return library.adjust(d, b, i);
      };
    })(this.bdc, this.is_holiday_func);

    //amortisation related fields
    var repay_tenor = library.get_safe_natural(instrument.repay_tenor);
    if (null === repay_tenor) repay_tenor = tenor;

    var linear_amortization = library.get_safe_bool(
      instrument.linear_amortization,
    );

    this.repay_amount = library.get_safe_number_vector(
      instrument.repay_amount,
    ) || [0]; //array valued

    this.interest_capitalization = library.get_safe_bool_vector(
      instrument.interest_capitalization,
    );

    var repay_first_date =
      library.get_safe_date(instrument.repay_first_date) || this.first_date;
    var repay_next_to_last_date =
      library.get_safe_date(instrument.repay_next_to_last_date) ||
      this.next_to_last_date;
    var repay_stub_end = instrument.stub_end || false;
    var repay_stub_long = instrument.stub_long || false;

    //condition arrays
    this.conditions_valid_until = library.get_safe_date_vector(
      instrument.conditions_valid_until,
    );
    if (this.conditions_valid_until) {
      if (
        this.conditions_valid_until[
          this.conditions_valid_until.length - 1
        ].getTime() !== maturity.getTime()
      )
        throw new Error(
          "fixed_income: last date provided under conditions_valid_until must match maturity",
        );
    } else {
      this.conditions_valid_until = [maturity]; //by default, conditions do not change until maturity
    }

    var settlement_days =
      library.get_safe_natural(instrument.settlement_days) || 0;
    this.settlement_date =
      library.get_safe_date(instrument.settlement_date) ||
      library.add_business_days(
        library.valuation_date,
        settlement_days,
        this.is_holiday_func,
      );

    this.residual_spread =
      library.get_safe_number(instrument.residual_spread) || 0;

    // interest rate schedule
    this.schedule = library.schedule(
      effective_date,
      maturity,
      tenor,
      this.adj,
      first_date,
      next_to_last_date,
      stub_end,
      stub_long,
    );

    // fixing schedule
    if (instrument.fixed_rate || instrument.fixed_rate === 0) {
      //fixed rate instrument
      this.is_float = false;
      this.fixed_rate = library.get_safe_number_vector(instrument.fixed_rate); //array valued
      this.float_spread = 0;
      this.cap_rate = [0];
      this.floor_rate = [0];
      this.fixing_schedule = [this.schedule[0], maturity];
    } else {
      //floating rate instrument
      this.is_float = true;
      this.fixed_rate = null;
      this.float_spread = library.get_safe_number_vector(
        instrument.float_spread,
      ) || [0]; // can be number or array, arrays to be impleented

      this.float_current_rate = library.get_safe_number(
        instrument.float_current_rate,
      );
      if (this.float_current_rate === null)
        throw new Error("fixed_income: must provide valid float_current_rate.");

      //fixing schedule related fields

      var fixing_tenor = library.get_safe_natural(instrument.fixing_tenor);
      if (null === fixing_tenor) fixing_tenor = tenor;

      var fixing_first_date =
        library.get_safe_date(instrument.fixing_first_date) || this.first_date;
      var fixing_next_to_last_date =
        library.get_safe_date(instrument.fixing_next_to_last_date) ||
        this.next_to_last_date;
      var fixing_stub_end = instrument.fixing_stub_end || false;
      var fixing_stub_long = instrument.fixing_stub_long || false;

      this.cap_rate =
        typeof instrument.cap_rate === "number"
          ? [instrument.cap_rate]
          : [Number.POSITIVE_INFINITY]; // can be number or array, arrays to be implemented
      this.floor_rate =
        typeof instrument.floor_rate === "number"
          ? [instrument.floor_rate]
          : [Number.POSITIVE_INFINITY]; // can be number or array, arrays to be implemented
      this.fixing_schedule = library.schedule(
        this.schedule[0],
        maturity,
        fixing_tenor,
        this.adj,
        fixing_first_date,
        fixing_next_to_last_date,
        fixing_stub_end,
        fixing_stub_long,
      );
    }

    // repay schedule
    this.is_amortizing =
      this.repay_amount.reduce(function (a, b) {
        return Math.max(a * a, b * b);
      }, 0) > 0 ||
      this.interest_capitalization.reduce(function (a, b) {
        return a || b;
      }, false) ||
      linear_amortization;

    if (!this.is_amortizing) {
      this.repay_schedule = [this.schedule[0], maturity];
    } else {
      this.repay_schedule = library.schedule(
        this.schedule[0],
        maturity,
        repay_tenor,
        this.adj,
        repay_first_date,
        repay_next_to_last_date,
        repay_stub_end,
        repay_stub_long,
      );
    }
    if (linear_amortization)
      this.repay_amount = [
        Math.abs(this.notional) / (this.repay_schedule.length - 1),
      ];

    this.cash_flows = this.initialize_cash_flows(); // pre-initializes cash flow table

    if (!this.is_float) this.cash_flows = this.finalize_cash_flows(null); // finalize cash flow table only for fixed rate instruments, for floaters this is done in present_value()
  };

  /**
   * initialize a cash flow for internal fixed income instrument
   * @returns {object} initialized cash flow
   * @memberof library
   * @public
   */

  library.fixed_income.prototype.initialize_cash_flows = function () {
    library.require_vd(); //valuation date must be set

    var date_accrual_start = new Array(this.schedule.length);
    var date_accrual_end = new Array(this.schedule.length);
    var is_interest_date = new Array(this.schedule.length);
    var is_repay_date = new Array(this.schedule.length);
    var is_fixing_date = new Array(this.schedule.length);
    var is_condition_date = new Array(this.schedule.length);
    /* arrays are possibly longer than schedule
       as schedule is just the pure interest payment schedule.
       for better performance, generate all other columns later when size is known.
     */

    //first line corresponds to effective date only and captures notional pay out (if any)
    date_accrual_start[0] = this.schedule[0];
    date_accrual_end[0] = this.schedule[0];
    is_interest_date[0] = false;
    is_repay_date[0] = false;
    is_fixing_date[0] = true;
    is_condition_date[0] = false;

    var i = 1,
      i_int = 1,
      i_rep = 1,
      i_fix = 1,
      i_cond = 0,
      i_max =
        this.schedule.length +
        this.repay_schedule.length +
        this.fixing_schedule.length +
        this.conditions_valid_until.length;
    while (i < i_max) {
      date_accrual_start[i] = date_accrual_end[i - 1];
      date_accrual_end[i] = new Date(
        Math.min(
          this.schedule[i_int],
          this.repay_schedule[i_rep],
          this.fixing_schedule[i_fix],
          this.conditions_valid_until[i_cond],
        ),
      );

      //end date is interest date?
      if (
        i_int < this.schedule.length &&
        date_accrual_end[i].getTime() === this.schedule[i_int].getTime()
      ) {
        is_interest_date[i] = true;
        i_int++;
      } else {
        is_interest_date[i] = false;
      }

      //end date is repay date?
      if (
        i_rep < this.repay_schedule.length &&
        date_accrual_end[i].getTime() === this.repay_schedule[i_rep].getTime()
      ) {
        is_repay_date[i] = true;
        i_rep++;
      } else {
        is_repay_date[i] = false;
      }

      //end date is fixing date?
      if (
        i_fix < this.fixing_schedule.length &&
        date_accrual_end[i].getTime() === this.fixing_schedule[i_fix].getTime()
      ) {
        is_fixing_date[i] = true;
        i_fix++;
      } else {
        is_fixing_date[i] = false;
      }

      //end date is condition date?
      if (
        i_cond < this.conditions_valid_until.length &&
        date_accrual_end[i].getTime() ===
          this.conditions_valid_until[i_cond].getTime()
      ) {
        is_condition_date[i] = true;
        i_cond++;
      } else {
        is_condition_date[i] = false;
      }

      if (
        i_int === this.schedule.length &&
        i_rep === this.repay_schedule.length &&
        i_fix === this.fixing_schedule.length
      )
        break; // done when all schedules have reached their end

      i++; //move to next date
    }
    //now, generate all other fields based on the dates generated above
    var date_pmt = new Array(date_accrual_start.length);
    var t_accrual_start = new Array(date_accrual_start.length);
    var t_accrual_end = new Array(date_accrual_start.length);
    var t_pmt = new Array(date_accrual_start.length);
    var accrual_factor = new Array(date_accrual_start.length);

    //populate rate-independent fields and adjust dates if necessary
    for (i = 0; i < date_accrual_start.length; i++) {
      if (this.adjust_accrual_periods) {
        date_accrual_start[i] = this.adj(date_accrual_start[i]);
        date_accrual_end[i] = this.adj(date_accrual_end[i]);
      }
      date_pmt[i] = this.adj(date_accrual_end[i]);
      t_pmt[i] = library.time_from_now(date_pmt[i]);
      t_accrual_start[i] = library.time_from_now(date_accrual_start[i]);
      t_accrual_end[i] = library.time_from_now(date_accrual_end[i]);
      accrual_factor[i] =
        i === 0
          ? 0
          : this.year_fraction_func(date_accrual_start[i], date_accrual_end[i]);
    }

    //returns pre-initialized cash flow table object
    return {
      //rate independent fields
      date_accrual_start: date_accrual_start,
      date_accrual_end: date_accrual_end,
      date_pmt: date_pmt,
      t_accrual_start: t_accrual_start,
      t_accrual_end: t_accrual_end,
      t_pmt: t_pmt,
      is_interest_date: is_interest_date,
      is_repay_date: is_repay_date,
      is_fixing_date: is_fixing_date,
      is_condition_date: is_condition_date,
      accrual_factor: accrual_factor,
      //rate dependent fields
      /*      
      current_principal: current_principal,
      interest_current_period: interest_current_period,
      accrued_interest: accrued_interest,
      pmt_principal: pmt_principal,
      pmt_interest: pmt_interest,
      pmt_total: pmt_total
      */
    };
  };

  /**
   * finalizes cash flow for internal fixed income instrument
   * @param {object} fwd_curve forward curve
   * @param {number} override_rate_or_spread
   * @returns {object} finalized cash flow
   * @memberof library
   * @public
   */
  library.fixed_income.prototype.finalize_cash_flows = function (
    fwd_curve,
    override_rate_or_spread,
  ) {
    library.require_vd(); //valuation date must be set

    var c = this.cash_flows;
    var n = c.date_accrual_start.length;
    var current_principal = new Array(n);
    var fwd_rate = new Array(n);
    var interest_current_period = new Array(n);
    var accrued_interest = new Array(n);
    var pmt_principal = new Array(n);
    var pmt_interest = new Array(n);
    var pmt_total = new Array(n);

    var sign = this.notional >= 0 ? 1 : -1;

    // initialize conditions
    var icond = 0;
    while (this.conditions_valid_until[icond] < c.date_accrual_start[0])
      icond++;

    var current_repay =
      this.repay_amount[Math.min(icond, this.repay_amount.length - 1)];
    var current_capitalization =
      this.interest_capitalization[
        Math.min(icond, this.interest_capitalization.length - 1)
      ];
    var current_cap_rate =
      this.cap_rate[Math.min(icond, this.cap_rate.length - 1)];
    var current_floor_rate =
      this.floor_rate[Math.min(icond, this.floor_rate.length - 1)];

    //initialize interest rate
    var current_rate, j;
    var r = this.is_float ? this.float_spread : this.fixed_rate;
    var get_rate_or_spread;

    //override rate if needed
    if (typeof override_rate_or_spread === "number") {
      get_rate_or_spread = function () {
        return override_rate_or_spread;
      };
    } else {
      get_rate_or_spread = function () {
        return r[Math.min(icond, r.length - 1)];
      };
    }

    //initialise first line of cash flow table (notional pay out)
    current_principal[0] = 0;
    fwd_rate[0] = 0;
    interest_current_period[0] = 0;
    accrued_interest[0] = 0;
    pmt_principal[0] = -this.notional;
    pmt_interest[0] = 0;
    pmt_total[0] = this.notional_exchange ? -this.notional : 0;
    var current_margin = 0;

    var i;
    for (i = 1; i < n; i++) {
      //update principal
      current_principal[i] = current_principal[i - 1] - pmt_principal[i - 1];

      //pay principal if repay date
      if (c.is_repay_date[i]) {
        pmt_principal[i] = current_repay * sign;
      } else {
        pmt_principal[i] = 0;
      }

      //update interest rate for the current period
      if (!this.is_float) {
        fwd_rate[i] = 0;
      } else {
        if (c.t_accrual_start[i] <= 0) {
          //period beginning in the past or now, use current rate
          fwd_rate[i] = this.float_current_rate;
        } else if (c.is_fixing_date[i - 1]) {
          //period beginning in the future, and start date is fixing date, use forward curve from now until next fixing date
          j = 0;
          while (!c.is_fixing_date[i + j] && i + j < c.is_fixing_date.length)
            j++;

          fwd_rate[i] = library.get_fwd_amount(
            fwd_curve,
            c.t_accrual_start[i],
            c.t_accrual_end[i + j],
          );
          fwd_rate[i] /= this.year_fraction_func(
            c.date_accrual_start[i],
            c.date_accrual_end[i + j],
          );
        } else {
          fwd_rate[i] = fwd_rate[i - 1];
        }
      }
      current_rate = fwd_rate[i] + get_rate_or_spread();

      //calculate interest amount for the current period
      interest_current_period[i] =
        current_principal[i] *
        (current_rate - this.excl_margin) *
        c.accrual_factor[i];
      if (this.excl_margin !== 0)
        current_margin +=
          current_principal[i] * this.excl_margin * c.accrual_factor[i];

      //accrue interest
      accrued_interest[i] =
        (i > 0 ? accrued_interest[i - 1] : 0) + interest_current_period[i];

      //pay or capitalize interest
      if (c.is_interest_date[i]) {
        pmt_interest[i] = accrued_interest[i];
        accrued_interest[i] = 0;
        if (current_capitalization) {
          pmt_principal[i] = pmt_principal[i] - pmt_interest[i];
          if (this.excl_margin !== 0)
            pmt_principal[i] = pmt_principal[i] - current_margin;
        }
        current_margin = 0;
      } else {
        pmt_interest[i] = 0;
      }

      //make sure principal is not overpaid and all principal is paid back in the end
      if (
        (i < n - 1 && pmt_principal[i] * sign > current_principal[i] * sign) ||
        i === n - 1
      ) {
        pmt_principal[i] = current_principal[i];
      }

      pmt_total[i] = pmt_interest[i];
      if (this.notional_exchange) {
        pmt_total[i] += pmt_principal[i];
      }

      //update conditions for next period
      if (c.is_condition_date[i]) {
        icond++;
        current_repay =
          this.repay_amount[Math.min(icond, this.repay_amount.length - 1)];
        current_capitalization =
          this.interest_capitalization[
            Math.min(icond, this.interest_capitalization.length - 1)
          ];
        current_cap_rate =
          this.cap_rate[Math.min(icond, this.cap_rate.length - 1)];
        current_floor_rate =
          this.floor_rate[Math.min(icond, this.floor_rate.length - 1)];
      }
    }

    //erase principal payments if notional_exchange is false
    if (false === this.notional_exchange) {
      for (i = 0; i < n; i++) pmt_principal[i] = 0;
    }

    //returns finalized cash flow table object
    return {
      //rate independent fields
      date_accrual_start: c.date_accrual_start,
      date_accrual_end: c.date_accrual_end,
      date_pmt: c.date_pmt,
      t_accrual_start: c.t_accrual_start,
      t_accrual_end: c.t_accrual_end,
      t_pmt: c.t_pmt,
      is_interest_date: c.is_interest_date,
      is_repay_date: c.is_repay_date,
      is_fixing_date: c.is_fixing_date,
      is_condition_date: c.is_condition_date,
      accrual_factor: c.accrual_factor,
      //rate dependent fields
      current_principal: current_principal,
      fwd_rate: fwd_rate,
      interest_current_period: interest_current_period,
      accrued_interest: accrued_interest,
      pmt_principal: pmt_principal,
      pmt_interest: pmt_interest,
      pmt_total: pmt_total,
    };
  };

  /**
   * returns the cash flow of the internal instrument
   * @param {object} fwd_curve forward curve
   * @returns {object} cash flow
   * @memberof library
   * @public
   */

  library.fixed_income.prototype.get_cash_flows = function (fwd_curve) {
    if (this.is_float) {
      if (typeof fwd_curve !== "object" || fwd_curve === null)
        throw new Error(
          "fixed_income.get_cash_flows: Must provide forward curve when evaluating floating rate interest stream",
        );
      return this.finalize_cash_flows(fwd_curve);
    }
    return this.cash_flows;
  };

  /**
   * calculates the present value for internal fixed income instrument (object)
   * @param {object} disc_curve discount curve
   * @param {object} spread_curve spread curve
   * @param {object} fwd_curve forward curve
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.fixed_income.prototype.present_value = function (
    disc_curve,
    spread_curve,
    fwd_curve,
  ) {
    if (typeof disc_curve !== "object" || disc_curve === null)
      throw new Error(
        "fixed_income.present value: Must provide discount curve when evaluating interest stream",
      );
    if (this.is_float && (typeof fwd_curve !== "object" || fwd_curve === null))
      throw new Error(
        "fixed_income.present value: Must provide forward curve when evaluating floating rate interest stream",
      );
    return library.dcf(
      this.get_cash_flows(library.get_safe_curve(fwd_curve) || null),
      library.get_safe_curve(disc_curve),
      spread_curve ? library.get_safe_curve(spread_curve) : null,
      this.residual_spread,
      this.settlement_date,
    );
  };
  /**
   * TODO
   * @param {object} disc_curve discount curve
   * @param {object} spread_curve spread curve
   * @param {object} fwd_curve forward curve
   * @returns {number} fair rate or spread
   * @memberof library
   * @public
   */
  library.fixed_income.prototype.fair_rate_or_spread = function (
    disc_curve,
    spread_curve,
    fwd_curve,
  ) {
    library.require_vd(); //valuation date must be set
    var fc = library.get_safe_curve(fwd_curve) || library.get_const_curve(0);
    var c = this.finalize_cash_flows(fc); // cash flow with zero interest or zero spread

    //retrieve outstanding principal on valuation date
    var outstanding_principal = 0;
    var i = 0;
    while (c.date_pmt[i] <= library.valuation_date) i++;
    outstanding_principal = c.current_principal[i];

    //build cash flow object with zero interest and (harder) zero spread
    var pmt = new Array(c.pmt_total.length);
    var accrued = 0;
    for (i = 0; i < pmt.length; i++) {
      pmt[i] = c.pmt_principal[i];
      //calculate interest amount for the current period
      accrued += c.current_principal[i] * c.accrual_factor[i] * c.fwd_rate[i];

      //pay interest
      if (c.is_interest_date[i]) {
        pmt[i] += accrued;
        accrued = 0;
      }
    }

    var res =
      outstanding_principal -
      library.dcf(
        {
          date_pmt: c.date_pmt,
          t_pmt: c.t_pmt,
          pmt_total: pmt,
        },
        library.get_safe_curve(disc_curve),
        library.get_safe_curve(spread_curve),
        this.residual_spread,
        this.settlement_date,
      );
    res /= this.annuity(disc_curve, spread_curve, fc);
    return res;
  };

  /**
   * returns the annuity of the fixed income stream, that is, the present value of all interest payments assuming the interest rate is 100%. In case of interest capitalizing instruments, this function uses the notional structure implied by the original fixed rate or, for floaters, uses the supplied forward curve plus spread
   * @param {object} disc_curve discount curve
   * @param {object} spread_curve spread curve
   * @param {object} fwd_curve forward curve
   * @returns {number} annuity
   * @memberof library
   * @public
   */
  library.fixed_income.prototype.annuity = function (
    disc_curve,
    spread_curve,
    fwd_curve,
  ) {
    var c = this.get_cash_flows(
      library.get_safe_curve(fwd_curve) || library.get_const_curve(0),
    );
    var pmt = new Array(c.pmt_total.length);
    var accrued = 0;
    var i;
    for (i = 0; i < pmt.length; i++) {
      pmt[i] = 0;
      //calculate interest amount for the current period based on 100% interest rate
      accrued += c.current_principal[i] * c.accrual_factor[i];

      //pay interest
      if (c.is_interest_date[i]) {
        pmt[i] += accrued;
        accrued = 0;
      }
    }
    return library.dcf(
      {
        date_pmt: c.date_pmt,
        t_pmt: c.t_pmt,
        pmt_total: pmt,
      },
      library.get_safe_curve(disc_curve),
      library.get_safe_curve(spread_curve),
      this.residual_spread,
      this.settlement_date,
    );
  };

  /**
   * calculates the present value for bonds
   * @param {object} bond instrument of type bond
   * @param {object} disc_curve discount curve
   * @param {object} spread_curve spread curve
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.pricer_bond = function (bond, disc_curve, spread_curve) {
    var bond_internal = new library.fixed_income(bond);
    return bond_internal.present_value(disc_curve, spread_curve, null);
  };
  /**
   * calculates the present value for floaters
   * @param {object} floater instrument of type floater
   * @param {object} disc_curve discount curve
   * @param {object} spread_curve spread curve
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.pricer_floater = function (
    floater,
    disc_curve,
    spread_curve,
    fwd_curve,
  ) {
    var floater_internal = new library.fixed_income(floater);
    return floater_internal.present_value(disc_curve, spread_curve, fwd_curve);
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * creates an internal fxterm object (including swap resp. bonds) from input data
   * @param {object} instrument instrument of type fxterm
   * @memberof library
   * @public
   */
  library.fxterm = function (instrument) {
    //the near payment of the swap
    this.near_leg = new library.fixed_income({
      notional: instrument.notional, // negative if first leg is pay leg
      maturity: instrument.maturity,
      fixed_rate: 0,
      tenor: 0,
    });

    //the far payment of the swap
    if (
      typeof instrument.notional_2 === "number" &&
      library.get_safe_date(instrument.maturity_2)
    ) {
      this.far_leg = new library.fixed_income({
        notional: instrument.notional_2, // negative if second leg is pay leg
        maturity: instrument.maturity_2,
        fixed_rate: 0,
        tenor: 0,
      });
    } else {
      this.far_leg = null;
    }
  };
  /**
   * calculates the present value for internal fxterm (object)
   * @param {object} disc_curve discount curve
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.fxterm.prototype.present_value = function (disc_curve) {
    var res = 0;
    res += this.near_leg.present_value(disc_curve, null, null);
    if (this.far_leg) res += this.far_leg.present_value(disc_curve, null, null);
    return res;
  };

  /**
   * calculates the present value for fxterm
   * @param {object} fxterm instrument of type fxterm
   * @param {object} disc_curve discount curve
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.pricer_fxterm = function (fxterm, disc_curve) {
    var fxterm_internal = new library.fxterm(fxterm);
    return fxterm_internal.present_value(disc_curve);
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * creates an internal swap object (including bonds fpr fixed leg and float leg) from input data
   * @param {object} instrument instrument (swap)
   * @memberof library
   * @public
   */
  library.swap = function (instrument) {
    this.phi = library.get_safe_bool(instrument.is_payer) ? -1 : 1;

    this.fixed_rate = instrument.fixed_rate;
    //the fixed leg of the swap
    this.fixed_leg = new library.fixed_income({
      notional: instrument.notional * this.phi,
      notional_exchange: false,
      maturity: instrument.maturity,
      fixed_rate: instrument.fixed_rate,
      tenor: instrument.tenor,
      effective_date: instrument.effective_date,
      calendar: instrument.calendar,
      bdc: instrument.bdc,
      dcc: instrument.dcc,
      adjust_accrual_periods: instrument.adjust_accrual_periods,
    });

    //the floating rate leg of the swap
    this.float_leg = new library.fixed_income({
      notional: -instrument.notional * this.phi,
      notional_exchange: false,
      maturity: instrument.maturity,
      float_spread: instrument.float_spread,
      tenor: instrument.float_tenor,
      effective_date: instrument.effective_date,
      calendar: instrument.calendar,
      bdc: instrument.float_bdc,
      dcc: instrument.float_dcc,
      float_current_rate: instrument.float_current_rate,
      adjust_accrual_periods: instrument.adjust_accrual_periods,
    });
  };
  /**
   * ...
   * @param {object} disc_curve discount curve
   * @param {object} fwd_curve forward curve
   * @returns {number} fair rate
   * @memberof library
   * @public
   */
  library.swap.prototype.fair_rate = function (disc_curve, fwd_curve) {
    //returns fair rate, that is, rate such that swap has zero present value
    var pv_float = this.float_leg.present_value(disc_curve, null, fwd_curve);
    if (0 === pv_float) return 0;
    return (-this.phi * pv_float) / this.annuity(disc_curve);
  };
  /**
   * ...
   * @param {object} disc_curve discount curve
   * @returns {number} annuity
   * @memberof library
   * @public
   */
  library.swap.prototype.annuity = function (disc_curve) {
    //returns always positive annuity regardless of payer/receiver flag
    return this.fixed_leg.annuity(disc_curve) * this.phi;
  };
  /**
   * calculates the present value for internal swap (object)
   * @param {object} disc_curve discount curve
   * @param {object} fwd_curve forward curve
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.swap.prototype.present_value = function (disc_curve, fwd_curve) {
    var res = 0;
    res += this.fixed_leg.present_value(disc_curve, null, null);
    res += this.float_leg.present_value(disc_curve, null, fwd_curve);
    return res;
  };
  /**
   * ...
   * @param {object} fwd_curve forward curve
   * @returns {object} cash flows
   * @memberof library
   * @public
   */
  library.swap.prototype.get_cash_flows = function (fwd_curve) {
    return {
      fixed_leg: this.fixed_leg.get_cash_flows(),
      float_leg: this.float_leg.get_cash_flows(fwd_curve),
    };
  };

  /**
   * ...
   * @param {object} swap Instrument
   * @param {object} disc_curve discount curve
   * @param {object} fwd_curve forward curve
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.pricer_swap = function (swap, disc_curve, fwd_curve) {
    var swap_internal = new library.swap(swap);
    return swap_internal.present_value(disc_curve, fwd_curve);
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * creates an internal swaption object (including swap) from input data
   * @param {object} instrument instrument
   * @memberof library
   * @public
   */
  library.swaption = function (instrument) {
    this.sign = library.get_safe_bool(instrument.is_short) ? -1 : 1;

    //maturity of the underlying swap
    this.maturity = library.get_safe_date(instrument.maturity);
    if (!this.maturity)
      throw new Error("swaption: must provide valid maturity date.");

    //first_exercise_date (a.k.a. expiry) of the swaption
    this.first_exercise_date = library.get_safe_date(
      instrument.first_exercise_date,
    );
    if (!this.first_exercise_date)
      throw new Error("swaption: must provide valid first_exercise_date date.");

    //underlying swap object
    this.swap = new library.swap({
      is_payer: instrument.is_payer,
      notional: instrument.notional,
      effective_date: this.first_exercise_date,
      maturity: instrument.maturity,
      fixed_rate: instrument.fixed_rate,
      tenor: instrument.tenor,
      calendar: instrument.calendar,
      bdc: instrument.bdc,
      dcc: instrument.dcc,
      float_spread: instrument.float_spread,
      float_tenor: instrument.float_tenor,
      float_bdc: instrument.float_bdc,
      float_dcc: instrument.float_dcc,
      float_current_rate: instrument.float_current_rate,
      adjust_accrual_periods: instrument.adjust_accrual_periods,
    });
  };
  /**
   * calculates the present value for internal swaption (object)
   * @param {object} disc_curve discount curve
   * @param {object} fwd_curve forward curve
   * @param {object} vol_surface volatility surface
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.swaption.prototype.present_value = function (
    disc_curve,
    fwd_curve,
    vol_surface,
  ) {
    library.require_vd();

    //obtain times
    var t_maturity = library.time_from_now(this.maturity);
    var t_first_exercise_date = library.time_from_now(this.first_exercise_date);
    var t_term = t_maturity - t_first_exercise_date;
    if (t_term < 1 / 512) {
      return 0;
    }
    //obtain fwd rate, that is, fair swap rate
    this.fair_rate = this.swap.fair_rate(disc_curve, fwd_curve);
    this.moneyness = this.swap.fixed_rate - this.fair_rate;

    //obtain time-scaled volatility
    if (typeof vol_surface !== "object" || vol_surface === null)
      throw new Error("swaption.present_value: must provide valid surface");
    this.vol = library.get_cube_rate(
      vol_surface,
      t_first_exercise_date,
      t_term,
      this.moneyness,
    );
    this.std_dev = this.vol * Math.sqrt(t_first_exercise_date);

    var res;
    if (t_first_exercise_date < 0) {
      //degenerate case where swaption has expired in the past
      return 0;
    } else if (t_first_exercise_date < 1 / 512 || this.std_dev < 0.000001) {
      //degenerate case where swaption is almost expiring or volatility is very low
      res = Math.max(this.swap.phi * this.moneyness, 0);
    } else {
      //bachelier formula
      var d1 = this.moneyness / this.std_dev;
      res =
        this.swap.phi * this.moneyness * library.cndf(this.swap.phi * d1) +
        this.std_dev * library.ndf(d1);
    }
    res *= this.swap.annuity(disc_curve);
    res *= this.sign;
    return res;
  };
  /**
   * ...
   * @param {object} swaption Instrument
   * @param {object} disc_curve discount curve
   * @param {object} fwd_curve forward curve
   * @param {object} vol_surface volatility surface
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.pricer_swaption = function (
    swaption,
    disc_curve,
    fwd_curve,
    vol_surface,
  ) {
    var swaption_internal = new library.swaption(swaption);
    return swaption_internal.present_value(disc_curve, fwd_curve, vol_surface);
  };
  /**
   * ...
   * @param {object} cf_obj cash flow object
   * @param {date} first_exercise_date first exercise date
   * @param {object} conventions conventions
   * @returns {object} ...
   * @memberof library
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
    library.require_vd(); //valuation date must be set
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
      var bond_internal = new library.fixed_income(bond);
      npv_up = bond_internal.present_value(cup);
      npv_up /= cup.get_df(tte);
      npv_down = bond_internal.present_value(cdown);
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
(function (library) {
  "use strict";
  const continuous = {
    df: function (t, zc) {
      return (1 + zc) ** -t;
    },
    zc: function (t, df) {
      if (t < 1 / 512) return 0.0;
      return df ** (-1 / t) - 1;
    },
  };

  const annual = {
    df: function (t, zc) {
      return (1 + zc) ** -t;
    },
    zc: function (t, df) {
      if (t < 1 / 512) return 0.0;
      return df ** (-1 / t) - 1;
    },
  };

  library.compounding_factory = function (str) {
    if (undefined === str) return annual;
    if (typeof str === "string") {
      switch (str.toLowerCase()) {
        case "annual":
        case "a":
          return annual;
        case "continuous":
        case "c":
          return continuous;

        default:
          //fail if invalid string was supplied
          throw new Error("compounding factory: invalid input " + str);
      }
    }
    throw new Error(
      "compounding factory: invalid input, string expected but " +
        typeof str +
        " supplied",
    );
  };
})(this.JsonRisk || module.exports);
(function (library) {
  "use strict";

  const find_index = function (x, s) {
    let index = 0;
    while (s > x[index + 1] && index < x.length - 2) {
      index++;
    }
    return index;
  };

  library.linear_interpolation_factory = function (x, y) {
    if (x.length !== y.length)
      throw new Error(
        "interpolation_factory: invalid input, x and y must have the same length",
      );
    if (0 === x.length)
      throw new Error(
        "interpolation_factory: invalid input, vectors have length zero",
      );
    if (1 === x.length)
      return function () {
        return x[0];
      };
    return function (s) {
      const index = find_index(x, s);
      const temp = 1 / (x[index + 1] - x[index]);
      return (
        (y[index] * (x[index + 1] - s) + y[index + 1] * (s - x[index])) * temp
      );
    };
  };

  library.linear_xy_interpolation_factory = function (x, y) {
    if (x.length !== y.length)
      throw new Error(
        "interpolation_factory: invalid input, x and y must have the same length",
      );
    let xy = new Array(x.length);
    for (let i = 0; i < x.length; i++) {
      if (x[i] <= 0)
        throw new Error(
          "interpolation_factory: linear xy interpolation requires x to be greater than zero",
        );
      xy[i] = x[i] * y[i];
    }
    const linear = library.linear_interpolation_factory(x, xy);
    return function (s) {
      if (s <= 0)
        throw new Error(
          "linear xy interpolation requires x to be greater than zero",
        );
      return linear(s) / s;
    };
  };
})(this.JsonRisk || module.exports);
(function (library) {
  "use strict";

  var RT2PI = Math.sqrt(4.0 * Math.acos(0.0));
  var SPLIT = 7.07106781186547;
  var N0 = 220.206867912376;
  var N1 = 221.213596169931;
  var N2 = 112.079291497871;
  var N3 = 33.912866078383;
  var N4 = 6.37396220353165;
  var N5 = 0.700383064443688;
  var N6 = 3.52624965998911e-2;
  var M0 = 440.413735824752;
  var M1 = 793.826512519948;
  var M2 = 637.333633378831;
  var M3 = 296.564248779674;
  var M4 = 86.7807322029461;
  var M5 = 16.064177579207;
  var M6 = 1.75566716318264;
  var M7 = 8.83883476483184e-2;
  /**
   * TODO
   * @param {number} n
   * @returns {number} number
   * @memberof library
   * @public
   */
  library.get_safe_number = function (n) {
    if (typeof n === "number") return n;
    if (typeof n === "string") {
      n = n.trim();
      var res = parseFloat(n);
      if (isNaN(res)) return null;
      if (n.charAt(n.length - 1) === "%") res *= 0.01;
      return res;
    }
    return null;
  };
  /**
   * TODO
   * @param {number} n
   * @returns {number} number
   * @memberof library
   * @public
   */
  library.get_safe_positive = function (n) {
    //returns positive number if a valid positive number is entered and null otherwise
    var res = library.get_safe_number(n);
    if (res <= 0) return null;
    return res;
  };
  /**
   * TODO
   * @param {natural} n
   * @returns {natural} natural vector
   * @memberof library
   * @public
   */
  library.get_safe_natural = function (n) {
    //returns natural number, zero allowed, if a valid natural number is entered and null otherwise
    var res = library.get_safe_number(n);
    if (res < 0 || res !== Math.floor(res)) return null;
    return res;
  };
  /**
   * TODO
   * @param {number} n
   * @returns {number} number vector
   * @memberof library
   * @public
   */
  library.get_safe_number_vector = function (n) {
    //vector of numbers when vector of numbers, vector of numeric strings or space sepatated string is entered. Returns null otherwise
    if (typeof n === "number") return [n];
    var res;
    if (typeof n === "string") {
      res = n.split(/\s+/);
    } else if (Array.isArray(n)) {
      res = n.slice();
    } else {
      return null;
    }
    for (var i = 0; i < res.length; i++) {
      res[i] = library.get_safe_number(res[i]);
      if (null === res[i])
        throw new Error("get_safe_number_vector: invalid input");
    }
    return res;
  };

  /**
   * TODO
   * @param {boolean} b
   * @returns {boolean} boolean vector
   * @memberof library
   * @public
   */
  library.get_safe_bool = function (b) {
    if (typeof b === "boolean") return b;
    if (typeof b === "number") return b !== 0;
    if (typeof b === "string") {
      var n = Number(b.trim()).valueOf();
      if (0 === n) return false;
      if (!isNaN(n)) return true;
      var s = b.trim().toLowerCase();
      if (s === "true" || s === "yes" || s === "t" || s === "y") return true;
      return false;
    }
    return false;
  };

  /**
   * TODO
   * @param {boolean} b
   * @returns {boolean} boolean vector
   * @memberof library
   * @public
   */
  library.get_safe_bool_vector = function (b) {
    //returns vector of booleans when input can be converted to booleans. Returns single-entry array [false] otherwise
    if (typeof b === "boolean") return [b];
    if (typeof b === "number") return [b !== 0];
    var res;
    if (typeof b === "string") {
      res = b.split(/\s+/);
    } else if (Array.isArray(b)) {
      res = b.slice();
    } else {
      return [false];
    }
    for (var i = 0; i < res.length; i++) {
      res[i] = library.get_safe_bool(res[i]);
    }
    return res;
  };

  /**
   * ...
   * @param {number} x
   * @returns {number} ...
   * @memberof library
   * @public
   */
  library.ndf = function (x) {
    return Math.exp((-x * x) / 2.0) / RT2PI;
  };

  /**
   * cumulative normal distribution function with double precision according to Graeme West, BETTER APPROXIMATIONS TO CUMULATIVE NORMAL FUNCTIONS, 2004
   * @param {number} x
   * @returns {number} ...
   * @memberof library
   * @public
   */
  library.cndf = function (x) {
    var z = Math.abs(x);
    var c;

    if (z <= 37.0) {
      var e = Math.exp((-z * z) / 2.0);
      if (z < SPLIT) {
        var n =
          (((((N6 * z + N5) * z + N4) * z + N3) * z + N2) * z + N1) * z + N0;
        var d =
          ((((((M7 * z + M6) * z + M5) * z + M4) * z + M3) * z + M2) * z + M1) *
            z +
          M0;
        c = (e * n) / d;
      } else {
        var f = z + 1.0 / (z + 2.0 / (z + 3.0 / (z + 4.0 / (z + 13.0 / 20.0))));
        c = e / (RT2PI * f);
      }
    } else if (z > 37.0) {
      c = 0;
    } else {
      throw new Error("cndf: invalid input.");
    }
    return x <= 0.0 ? c : 1 - c;
  };

  var D1 = 0.049867347;
  var D2 = 0.0211410061;
  var D3 = 0.0032776263;
  var D4 = 0.0000380036;
  var D5 = 0.0000488906;
  var D6 = 0.000005383;

  /**
   * fast cumulative normal distribution function according to Abramowitz and Stegun
   * @param {number} x
   * @returns {number} ...
   * @memberof library
   * @public
   */
  library.fast_cndf = function (x) {
    var z = x > 0 ? x : -x;
    var f = 1 + z * (D1 + z * (D2 + z * (D3 + z * (D4 + z * (D5 + z * D6)))));
    f *= f;
    f *= f;
    f *= f;
    f *= f; // raise to the power of -16
    f = 0.5 / f;
    return x >= 0 ? 1 - f : f;
  };

  /**
   * TODO
   * @param {} func
   * @param {number} start
   * @param {number} next
   * @param {number} max_iter
   * @param {number} threshold
   * @returns {number} ...
   * @memberof library
   * @public
   */
  library.find_root_secant = function (func, start, next, max_iter, threshold) {
    var x = start,
      xnext = next,
      temp = 0,
      iter = max_iter || 20,
      t = threshold || 0.00000001;
    var f = func(x),
      fnext = func(xnext);
    if (Math.abs(fnext) > Math.abs(f)) {
      //swap start values if start is better than next
      temp = x;
      x = xnext;
      xnext = temp;
      temp = f;
      f = fnext;
      fnext = temp;
    }
    while (Math.abs(fnext) > t && Math.abs(x - xnext) > t && iter > 0) {
      temp = ((x - xnext) * fnext) / (fnext - f);
      x = xnext;
      f = fnext;
      xnext = x + temp;
      fnext = func(xnext);

      iter--;
    }
    if (iter <= 0)
      throw new Error("find_root_secant: failed, too many iterations");
    if (isNaN(xnext)) {
      throw new Error("find_root_secant: failed, invalid result");
    }
    return xnext;
  };
  /**
   * signum function
   * @param {number} x
   * @returns {number} signum
   * @memberof library
   * @private
   */
  function signum(x) {
    if (x > 0) return 1;
    if (x < 0) return -1;
    return 0;
  }
  /**
   * TODO
   * @param {} func
   * @param {number} start
   * @param {number} next
   * @param {number} max_iter
   * @param {number} threshold
   * @returns {number} ...
   * @memberof library
   * @public
   */
  library.find_root_ridders = function (
    func,
    start,
    next,
    max_iter,
    threshold,
  ) {
    var x = start,
      y = next,
      z = 0,
      w = 0,
      r = 0,
      iter = max_iter || 20,
      t = threshold || 0.00000001;
    var fx = func(x),
      fy = func(y),
      fz,
      fw;
    if (fx * fy > 0)
      throw new Error(
        "find_root_ridders: start values do not bracket the root",
      );
    if (Math.abs(fx) < t) return x;
    if (Math.abs(fy) < t) return y;
    while (iter > 0) {
      iter--;
      z = (x + y) * 0.5;
      if (Math.abs(x - y) < 1e-15) return z;
      fz = func(z);
      if (Math.abs(fz) < t) return z;
      r = Math.sqrt(fz * fz - fy * fx);
      if (0 === r) return z;
      w = ((z - x) * signum(fx - fy) * fz) / r + z;
      if (isNaN(w)) w = z;
      fw = func(w);
      if (Math.abs(fw) < t) return w;
      if (fz * fw < 0) {
        x = w;
        fx = fw;
        y = z;
        fy = fz;
        continue;
      }
      if (fx * fw < 0) {
        y = w;
        fy = fw;
        continue;
      }
      if (fy * fw < 0) {
        x = w;
        fx = fw;
        continue;
      }
    }
    if (iter <= 0)
      throw new Error("find_root_ridders: failed, too many iterations");
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * discounts a cash flow
   * @param {object} cf_obj cash flow
   * @param {object} disc_curve discount curve
   * @param {object} spread_curve spread curve
   * @param {number} residual_spread residual spread
   * @param {date} settlement_date settlement date
   * @returns {object} discounted cash flow
   * @memberof library
   * @public
   */
  library.dcf = function (
    cf_obj,
    disc_curve,
    spread_curve,
    residual_spread,
    settlement_date,
  ) {
    /*
                requires cf_obj of type
                {
                        date_pmt: array(date),
                        t_pmt: array(double),
                        pmt_total: array(double)
                }
                requires safe curves (curves may be null)
                
                */

    library.require_vd(); //valuation date must be set
    //curve initialisation and fallbacks
    if (typeof residual_spread !== "number") residual_spread = 0;
    disc_curve = disc_curve || library.get_const_curve(0);
    var sd = library.get_safe_date(settlement_date);
    if (!sd) sd = library.valuation_date;
    var tset = library.time_from_now(sd);

    //sanity checks
    if (undefined === cf_obj.t_pmt || undefined === cf_obj.pmt_total)
      throw new Error("dcf: invalid cashflow object");
    if (cf_obj.t_pmt.length !== cf_obj.pmt_total.length)
      throw new Error("dcf: invalid cashflow object");

    var res = 0;
    var i = 0;
    var df, rate;
    var fast = !spread_curve && 0 === residual_spread;
    while (cf_obj.t_pmt[i] <= tset) i++; // only consider cashflows after settlement date
    while (i < cf_obj.t_pmt.length) {
      if (fast) {
        df = disc_curve.get_df(cf_obj.t_pmt[i]);
      } else {
        rate = residual_spread + disc_curve.get_rate(cf_obj.t_pmt[i]);
        if (spread_curve) rate += spread_curve.get_rate(cf_obj.t_pmt[i]);
        df = Math.pow(1 + rate, -cf_obj.t_pmt[i]);
      }
      res += cf_obj.pmt_total[i] * df;
      i++;
    }
    return res;
  };

  /**
   * TODO
   * @param {object} cf_obj cash flow
   * @param {date} settlement_date
   * @param {date} payment_on_settlement_date
   * @returns {object} ...
   * @memberof library
   * @public
   */
  library.irr = function (cf_obj, settlement_date, payment_on_settlement_date) {
    library.require_vd(); //valuation date must be set
    if (!payment_on_settlement_date) payment_on_settlement_date = 0;

    var tset = library.time_from_now(settlement_date);
    var func = function (x) {
      return (
        library.dcf(cf_obj, null, null, x, settlement_date) +
        payment_on_settlement_date * Math.pow(1 + x, -tset)
      );
    };

    var ret = library.find_root_secant(func, 0, 0.0001);
    return ret;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /*
    
            JsonRisk LGM (a.k.a. Hull-White) model
            Reference: Hagan, Patrick. (2019). EVALUATING AND HEDGING EXOTIC SWAP INSTRUMENTS VIA LGM.
            
    */

  "use strict";

  /**
   * Initial LGM H function representing a mean reversion of zero
   * @param {} t
   * @returns {} t
   * @private
   */
  var identity = function (t) {
    return t;
  };
  var h = identity;
  var int_h_prime_minus_2 = identity;

  /**
   * Set mean reversion by activating a corresponding h function
   * @param {} mean_rev
   * @returns {} undefined
   * @memberof library
   * @private
   */

  library.lgm_set_mean_reversion = function (mean_rev) {
    if (typeof mean_rev !== "number") return;
    if (mean_rev === 0) {
      h = identity;
      int_h_prime_minus_2 = identity;
    }
    if (mean_rev > 0) {
      h = function (t) {
        return (1 - Math.exp(-mean_rev * t)) / mean_rev;
      };
      int_h_prime_minus_2 = function (t) {
        return (0.5 / mean_rev) * (Math.exp(2 * mean_rev * t) - 1);
      };
    }
  };

  /**
   * Get a vector of xi values for a fixed constant hull white volatility. The xis depend on the mean reversion setting.
   * @param {} t_exercise the vector of exercise times
   * @params {} sigma the constant hull white volatility
   * @returns {} vector of xis for the LGM model
   * @memberof library
   * @private
   */

  library.get_xi_from_hull_white_volatility = function (t_exercise, sigma) {
    var xi = new Array(t_exercise.length);
    for (var i = 0; i < xi.length; i++) {
      xi[i] = sigma * sigma * int_h_prime_minus_2(t_exercise[i]);
    }
    return xi;
  };

  /**
   * precalculates discount factors for each cash flow and for t_exercise
   * @param {object} cf_obj cash flow
   * @param {object} t_exercise time when optionality can be exercised
   * @param {object} disc_curve discount curve
   * @param {object} spread_curve spread curve
   * @param {} residual_spread residual spread
   * @returns {object} discount factors
   * @memberof library
   * @private
   */
  function get_discount_factors(
    cf_obj,
    t_exercise,
    disc_curve,
    spread_curve,
    residual_spread,
  ) {
    var res = new Array(cf_obj.t_pmt.length + 1); //last item holds discount factor for t_exercise
    var i = 0,
      rate;
    if (typeof residual_spread !== "number") residual_spread = 0;
    var fast = !spread_curve && 0 === residual_spread;

    // move forward to first line after exercise date
    while (cf_obj.t_pmt[i] <= 0) i++;

    //discount factors for cash flows after t_exercise
    while (i < cf_obj.t_pmt.length) {
      if (fast) {
        res[i] = disc_curve.get_df(cf_obj.t_pmt[i]);
      } else {
        rate = disc_curve.get_rate(cf_obj.t_pmt[i]);
        if (spread_curve) rate += spread_curve.get_rate(cf_obj.t_pmt[i]);
        rate += residual_spread;
        res[i] = Math.pow(1 + rate, -cf_obj.t_pmt[i]);
      }
      i++;
    }

    //discount factor for t_exercise
    if (fast) {
      res[i] = disc_curve.get_df(t_exercise);
    } else {
      rate = disc_curve.get_rate(t_exercise);
      if (spread_curve) rate += spread_curve.get_rate(t_exercise);
      rate += residual_spread;
      res[i] = Math.pow(1 + rate, -t_exercise);
    }
    return res;
  }

  /**
   * calculated a strike adjustment reflecting the opportunity spread
   * @param {object} cf_obj
   * @param {} t_exercise
   * @param {object} discount_factors
   * @param {} opportunity_spread
   * @returns {object} ...
   * @memberof library
   * @private
   */
  function strike_adjustment(
    cf_obj,
    t_exercise,
    discount_factors,
    opportunity_spread,
  ) {
    if (!opportunity_spread) return 0;
    var i = 0,
      df;
    var res = 0;
    // move forward to first line after exercise date
    while (cf_obj.t_pmt[i] <= t_exercise) i++;

    // include all payments after exercise date

    while (i < cf_obj.t_pmt.length) {
      res +=
        cf_obj.current_principal[i] *
        discount_factors[i] *
        opportunity_spread *
        (cf_obj.t_pmt[i] - Math.max(cf_obj.t_pmt[i - 1], t_exercise));
      i++;
    }

    df = discount_factors[discount_factors.length - 1];
    res /= df;
    return res;
  }

  /**
   * Calculates the discounted cash flow present value for a given vector of states (reduced value according to formula 4.14b)
   * @param {object} cf_obj
   * @param {} t_exercise
   * @param {object} discount_factors
   * @param {} xi volatility parameters
   * @param {} state state vector
   * @param {} opportunity_spread opportunity spread
   * @returns {number} present value
   * @memberof library
   * @public
   */

  library.lgm_dcf = function (
    cf_obj,
    t_exercise,
    discount_factors,
    xi,
    state,
    opportunity_spread,
  ) {
    /*

        Calculates the discounted cash flow present value for a given vector of states (reduced value according to formula 4.14b)

        requires cf_obj of type
        {
            current_principal: array(double),
            t_pmt: array(double),
            pmt_total: array(double),
            pmt_interest: array(double)
        }

        state must be an array of numbers

        */
    if (!state.length)
      throw new Error("lgm_dcf: state variable must be an array of numbers");

    var i = 0,
      j,
      dh,
      temp,
      dh_dh_xi_2;
    var res = new Float64Array(state.length);
    var times = cf_obj.t_pmt;
    var amounts = cf_obj.pmt_total;
    // move forward to first line after exercise date
    while (times[i] <= t_exercise) i++;

    //include accrued interest if interest payment is part of the cash flow object
    var accrued_interest = 0;
    if (cf_obj.pmt_interest) {
      accrued_interest =
        i === 0
          ? 0
          : (cf_obj.pmt_interest[i] * (t_exercise - times[i - 1])) /
            (times[i] - times[i - 1]);
    }
    // include principal payment on exercise date
    var sadj = strike_adjustment(
      cf_obj,
      t_exercise,
      discount_factors,
      opportunity_spread,
    );
    temp =
      -(cf_obj.current_principal[i] + accrued_interest + sadj) *
      discount_factors[discount_factors.length - 1];
    dh = h(t_exercise);
    dh_dh_xi_2 = dh * dh * xi * 0.5;
    for (j = 0; j < state.length; j++) {
      res[j] = temp * Math.exp(-dh * state[j] - dh_dh_xi_2);
    }

    // include all payments after exercise date
    while (i < times.length) {
      dh = h(cf_obj.t_pmt[i]);
      temp = amounts[i] * discount_factors[i];
      if (temp !== 0) {
        dh_dh_xi_2 = dh * dh * xi * 0.5;
        for (j = 0; j < state.length; j++) {
          res[j] += temp * Math.exp(-dh * state[j] - dh_dh_xi_2);
        }
      }
      i++;
    }
    return res;
  };

  /**
   * Calculates the european call option price on a cash flow (closed formula 5.7b).
   * @param {object} cf_obj
   * @param {} t_exercise
   * @param {object} disc_curve
   * @param {} xi
   * @param {object} spread_curve spread curve
   * @param {} residual_spread residual spread
   * @param {} opportunity_spread opportunity spread
   * @param {object} discount_factors_precalc
   * @returns {object} cash flow
   * @memberof library
   * @public
   */
  library.lgm_european_call_on_cf = function (
    cf_obj,
    t_exercise,
    disc_curve,
    xi,
    spread_curve,
    residual_spread,
    opportunity_spread,
    discount_factors_precalc,
  ) {
    /*

        Calculates the european call option price on a cash flow (closed formula 5.7b).

        requires cf_obj of type
        {
            current_principal: array(double),
            t_pmt: array(double),
            pmt_total: array(double)
            pmt_interest: array(double)
        }

        */

    var discount_factors =
      discount_factors_precalc ||
      get_discount_factors(
        cf_obj,
        t_exercise,
        disc_curve,
        spread_curve,
        residual_spread,
      ); // if discount factors are not provided, get them

    if (t_exercise < 0) return 0; //expired option
    if (t_exercise < 1 / 512 || xi < 1e-10)
      return Math.max(
        0,
        library.lgm_dcf(
          cf_obj,
          t_exercise,
          discount_factors,
          0,
          [0],
          opportunity_spread,
        )[0],
      ); //very low volatility

    var std_dev = Math.sqrt(xi);
    var dh = h(t_exercise + 1 / 365) - h(t_exercise);
    var break_even;

    function func(x) {
      return library.lgm_dcf(
        cf_obj,
        t_exercise,
        discount_factors,
        xi,
        [x],
        opportunity_spread,
      )[0];
    }

    // if std_dev is very large, break_even/std_dev tends to -infinity and break_even/std_dev + dh*std_dev tends to +infinity for all possible values of dh.
    // cumulative normal distribution is practically zero if quantile is outside of -10 and +10.
    // in order for break_even/std_dev < -10 and break_even/std_dev + dh+std_dev > 10, dh*std_dev must be larger than 20
    // larger values for std_dev do not make any sense
    if (std_dev > 20 / dh) {
      std_dev = 20 / dh;
      break_even = -10 * std_dev;
    } else {
      //
      //find break even point and good initial guess for it
      //

      var lower, upper;

      if (func(0) >= 0) {
        lower = 0;
        upper = std_dev * STD_DEV_RANGE;
        if (func(upper) > 0) {
          //special case where payoff is always positive, return expectation
          return library.lgm_dcf(
            cf_obj,
            t_exercise,
            discount_factors,
            0,
            [0],
            opportunity_spread,
          )[0];
        }
      } else {
        upper = 0;
        lower = -std_dev * STD_DEV_RANGE;
        if (func(lower) < 0) {
          // special case where payoff value is always negative, return zero
          return 0;
        }
      }

      try {
        break_even = library.find_root_ridders(func, upper, lower, 20);
      } catch (e) {
        //fall back to numeric price
        return library.lgm_bermudan_call_on_cf(
          cf_obj,
          [t_exercise],
          disc_curve,
          [xi],
          spread_curve,
          residual_spread,
          opportunity_spread,
        );
      }
    }

    var i = 0;
    var one_std_dev = 1 / std_dev;

    // move forward to first line after exercise date
    while (cf_obj.t_pmt[i] <= t_exercise) i++;

    //include accrued interest if interest payment is part of the cash flow object
    var accrued_interest = 0;
    if (cf_obj.pmt_interest) {
      accrued_interest =
        i === 0
          ? 0
          : (cf_obj.pmt_interest[i] * (t_exercise - cf_obj.t_pmt[i - 1])) /
            (cf_obj.t_pmt[i] - cf_obj.t_pmt[i - 1]);
    }

    // include principal payment on or before exercise date
    dh = h(t_exercise);
    var sadj = strike_adjustment(
      cf_obj,
      t_exercise,
      discount_factors,
      opportunity_spread,
    );
    var res =
      -(cf_obj.current_principal[i] + accrued_interest + sadj) *
      discount_factors[discount_factors.length - 1] *
      library.cndf(break_even * one_std_dev + dh * std_dev);

    // include all payments after exercise date
    while (i < cf_obj.t_pmt.length) {
      dh = h(cf_obj.t_pmt[i]);
      res +=
        cf_obj.pmt_total[i] *
        discount_factors[i] *
        library.cndf(break_even * one_std_dev + dh * std_dev);
      i++;
    }
    return res;
  };

  /**
   * Calculates correction for multi curve valuation - move basis spread to fixed leg
   * @param {object} swaption Instrument
   * @param {object} disc_curve discount curve
   * @param {object} fwd_curve forward curve
   * @param {} fair_rate fair rate
   * @returns {object} cash flow
   * @memberof library
   * @public
   */
  library.lgm_european_swaption_adjusted_cashflow = function (
    swaption,
    disc_curve,
    fwd_curve,
    fair_rate,
  ) {
    //correction for multi curve valuation - move basis spread to fixed leg
    var swap_rate_singlecurve = swaption.swap.fair_rate(disc_curve, disc_curve);
    var fixed_rate;
    if (fair_rate) {
      fixed_rate = swap_rate_singlecurve;
    } else {
      var swap_rate_multicurve = swaption.swap.fair_rate(disc_curve, fwd_curve);
      fixed_rate =
        swaption.swap.fixed_rate - swap_rate_multicurve + swap_rate_singlecurve;
    }
    //recalculate cash flow amounts to account for new fixed rate
    var cf_obj = swaption.swap.fixed_leg.finalize_cash_flows(null, fixed_rate);
    cf_obj.pmt_total[0] -= cf_obj.current_principal[1];
    cf_obj.pmt_total[cf_obj.pmt_total.length - 1] +=
      cf_obj.current_principal[cf_obj.pmt_total.length - 1];

    return cf_obj;
  };

  /**
   * Evaluates european swaption under the LGM model based on multi curve adjusted cashflow
   * @param {object} swaption Instrument
   * @param {} t_exercise
   * @param {object} disc_curve discount curve
   * @param {} xi
   * @param {object} fwd_curve forward curve
   * @returns {object} cash flow
   * @memberof library
   * @public
   */
  library.lgm_european_swaption = function (
    swaption,
    t_exercise,
    disc_curve,
    xi,
    fwd_curve,
  ) {
    //retrieve adjusted cash flows
    var cf_obj = library.lgm_european_swaption_adjusted_cashflow(
      swaption,
      disc_curve,
      fwd_curve,
    );

    //now use lgm model on cash flows
    return library.lgm_european_call_on_cf(
      cf_obj,
      t_exercise,
      disc_curve,
      xi,
      null,
      null,
      null,
    );
  };

  /**
   * Calibrates LGM against the supplied basket of swaptions
   * @param {object} basket basket
   * @param {object} disc_curve discount curve
   * @param {object} fwd_curve forward curve
   * @param {object} surface surface
   * @returns {} xi_vec
   * @memberof library
   * @public
   */
  library.lgm_calibrate = function (basket, disc_curve, fwd_curve, surface) {
    library.require_vd();
    var xi,
      xi_vec = [];
    var cf_obj,
      discount_factors,
      std_dev_bachelier,
      tte,
      deno,
      target,
      approx,
      i,
      j,
      min_value,
      max_value,
      accuracy;

    var func = function (xi) {
      var val = library.lgm_european_call_on_cf(
        cf_obj,
        tte,
        disc_curve,
        xi,
        null,
        null,
        null,
        discount_factors,
      );
      return val - target;
    };
    for (i = 0; i < basket.length; i++) {
      if (library.time_from_now(basket[i].first_exercise_date) > 1 / 512) {
        tte = library.time_from_now(basket[i].first_exercise_date);
        //first step: derive initial guess based on Hagan formula 5.16c
        //get swap fixed cash flow adjusted for basis spread
        cf_obj = library.lgm_european_swaption_adjusted_cashflow(
          basket[i],
          disc_curve,
          fwd_curve,
          false,
        );
        discount_factors = get_discount_factors(
          cf_obj,
          tte,
          disc_curve,
          null,
          null,
        );
        deno = 0;
        for (j = 0; j < cf_obj.t_pmt.length; j++) {
          deno +=
            cf_obj.pmt_total[j] * discount_factors[j] * h(cf_obj.t_pmt[j]);
        }
        //bachelier swaption price and std deviation
        target = basket[i].present_value(disc_curve, fwd_curve, surface);
        std_dev_bachelier = basket[i].std_dev;

        //initial guess
        xi = Math.pow(
          (std_dev_bachelier * basket[i].swap.annuity(disc_curve)) / deno,
          2,
        );

        //second step: calibrate, but be careful with infeasible bachelier prices below min and max
        min_value = library.lgm_dcf(
          cf_obj,
          tte,
          discount_factors,
          0,
          [0],
          null,
        )[0];

        //max value is value of the payoff without redemption payment
        max_value =
          min_value +
          basket[i].swap.fixed_leg.notional *
            discount_factors[discount_factors.length - 1];
        //min value (attained at vola=0) is maximum of zero and current value of the payoff
        if (min_value < 0) min_value = 0;

        target = basket[i].present_value(disc_curve, fwd_curve, surface);
        accuracy = target * 1e-7 + 1e-7;

        if (target <= min_value + accuracy || 0 === xi) {
          xi = 0;
        } else {
          if (target > max_value) target = max_value;
          approx = func(xi);
          j = 10;
          while (approx < 0 && j > 0) {
            j--;
            xi *= 2;
            approx = func(xi);
          }
          try {
            xi = library.find_root_ridders(func, 0, xi, 20, accuracy);
          } catch (e) {
            //use initial guess or zero as fallback, whichever is better
            if (Math.abs(target - min_value) < Math.abs(approx)) xi = 0;
          }
        }
        if (xi_vec.length > 0 && xi_vec[xi_vec.length - 1] > xi)
          xi = xi_vec[xi_vec.length - 1]; //fallback if monotonicity is violated
        xi_vec.push(xi);
      }
    }
    return xi_vec;
  };

  var STD_DEV_RANGE = 6;
  var RESOLUTION = 12;
  /**
   * Calculates the bermudan call option price on a cash flow (numeric integration according to martingale formula 4.14a).
   * @param {object} cf_obj
   * @param {} exercise_vec
   * @param {object} disc_curve discount curve
   * @param {} xi_vec
   * @param {object} spread_curve spread curve
   * @param {} residual_spread
   * @param {} opportunity_spread
   * @returns {object} cash flow
   * @memberof library
   * @public
   */
  library.lgm_bermudan_call_on_cf = function (
    cf_obj,
    t_exercise_vec,
    disc_curve,
    xi_vec,
    spread_curve,
    residual_spread,
    opportunity_spread,
  ) {
    /*

        requires cf_obj of type
        {
                current_principal: array(double),
                t_pmt: array(double),
                pmt_total: array(double)
        }

        state must be an array of numbers
        
        */

    if (t_exercise_vec[t_exercise_vec.length - 1] < 0) return 0; //expired option
    if (t_exercise_vec[t_exercise_vec.length - 1] < 1 / 512) {
      return library.lgm_european_call_on_cf(
        cf_obj,
        t_exercise_vec[t_exercise_vec.length - 1],
        disc_curve,
        0,
        spread_curve,
        residual_spread,
        opportunity_spread,
      ); //expiring option
    }

    /**
     * Creates a new state vector
     * @returns {number} ...
     * @memberof library
     * @private
     */
    function make_state_vector() {
      //repopulates state vector and ds measure
      var res = new Float64Array(2 * STD_DEV_RANGE * RESOLUTION + 1);
      res[0] = -STD_DEV_RANGE * std_dev;
      for (i = 1; i < n; i++) {
        res[i] = res[i - 1] + ds;
      }
      return res;
    }
    /**
     * updates the value vector with the maximum of payof and hold for each state, inserts a discontinuity adjustment
     * @memberof library
     * @private
     */
    function update_value() {
      //take maximum of payoff and hold values
      var i_d = 0;
      for (i = 0; i < n; i++) {
        value[i] = Math.max(hold[i], payoff[i], 0);
        if (!i_d && i > 0) {
          if ((payoff[i] - hold[i]) * (payoff[i - 1] - hold[i - 1]) < 0) {
            i_d = i; //discontinuity where payoff-hold changes sign
          }
        }
      }
      //account for discontinuity if any
      if (i_d) {
        var max_0 = value[i_d - 1],
          max_1 = value[i_d];
        var min_0 = Math.min(payoff[i_d - 1], hold[i_d - 1]),
          min_1 = Math.min(payoff[i_d], hold[i_d]);
        var cross = (max_0 - min_0) / (max_1 - min_1 + max_0 - min_0);
        var err =
          0.25 * (cross * (max_1 - min_1) + (1 - cross) * (max_0 - min_0));
        value[i_d] -= cross * err;
        value[i_d - 1] -= (1 - cross) * err;
      }
    }

    /**
     * Performs numeric integration according to the LGM martingale formula
     * @param {} j state index
     * @returns {} ...
     * @memberof library
     * @private
     */
    function numeric_integration(j) {
      if (xi_last - xi < 1e-12) return value[j];
      var temp = 0,
        dp_lo = 0,
        dp_hi,
        norm_scale = 1 / Math.sqrt(xi_last - xi),
        increment = ds_last * norm_scale,
        i = 0,
        x = (state_last[0] - state[j] + 0.5 * ds_last) * norm_scale;
      while (x < -STD_DEV_RANGE) {
        x += increment;
        i += 1;
      }
      while (x < STD_DEV_RANGE) {
        if (i >= n) break;
        dp_hi = library.fast_cndf(x);
        temp += value[i] * (dp_hi - dp_lo);
        dp_lo = dp_hi; // for next iteration
        x += increment;
        i++;
      }
      return temp;
    }

    var n = 2 * STD_DEV_RANGE * RESOLUTION + 1;
    var j, i, n_ex;
    var xi,
      xi_last = 0,
      std_dev,
      ds,
      ds_last;
    var state, state_last;
    var payoff;
    var value = new Float64Array(n);
    var hold = new Float64Array(n);
    var discount_factors;

    //n_ex starts at last exercise date
    n_ex = xi_vec.length - 1;

    //iterate backwards through call dates if at least one call date is left
    while (n_ex >= 0) {
      //set volatility and state parameters
      xi = xi_vec[n_ex];
      std_dev = Math.sqrt(xi);
      ds = std_dev / RESOLUTION;
      state = make_state_vector();

      //payoff is what option holder obtains when exercising
      discount_factors = get_discount_factors(
        cf_obj,
        t_exercise_vec[n_ex],
        disc_curve,
        spread_curve,
        residual_spread,
      );
      payoff = library.lgm_dcf(
        cf_obj,
        t_exercise_vec[n_ex],
        discount_factors,
        xi,
        state,
        opportunity_spread,
      );

      //hold is what option holder obtains when not exercising
      if (n_ex < xi_vec.length - 1) {
        for (j = 0; j < n; j++) {
          hold[j] = numeric_integration(j); //hold value is determined by martingale formula
        }
      } else {
        for (j = 0; j < n; j++) {
          hold[j] = 0; //on last exercise date, hold value is zero (no more option left to hold).
        }
      }

      //value is maximum of payoff and hold
      update_value();

      //prepare next iteration
      xi_last = xi;
      state_last = state;
      ds_last = ds;
      n_ex--;
    }

    //last integration for time zero, state zero
    state = [0];

    xi = 0;
    hold = numeric_integration(0); //last integration according to martingale formula
    return hold;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * @memberof library
   */
  var default_yf = null;
  /**
   * converts rate of a curve to zero rates
   * @param {number} value rate of curve
   * @param {string} type type of curve e.g. yield
   * @returns {object} constant curve with discount factors {type, times, dfs}
   * @memberof library
   * @public
   */
  library.get_const_curve = function (value, type) {
    if (typeof value !== "number")
      throw new Error("get_const_curve: input must be number.");
    if (value <= -1) throw new Error("get_const_curve: invalid input.");
    return library.get_safe_curve({
      type: type || "yield",
      times: [1],
      dfs: [1 / (1 + value)], //zero rates are act/365 annual compounding
    });
  };

  /**
   * get i-th time entry of a curve
   * @param {object} curve curve
   * @param {number} i time
   * @returns {number} time
   * @memberof library
   * @private
   */
  function get_time_at(curve, i) {
    if (!curve.times) {
      //construct times from other parameters in order of preference
      //curve times are always act/365
      if (curve.days) return curve.days[i] / 365;
      if (curve.dates) {
        default_yf = default_yf || library.year_fraction_factory("a/365");
        return default_yf(
          library.get_safe_date(curve.dates[0]),
          library.get_safe_date(curve.dates[i]),
        );
      }
      if (curve.labels) return library.period_str_to_time(curve.labels[i]);
      throw new Error("get_time_at: invalid curve, cannot derive times");
    }
    return curve.times[i];
  }
  /**
   * get time-array of a curve
   * @param {object} curve curve
   * @returns {array} times in days of given curve
   * @memberof library
   * @public
   */
  library.get_curve_times = function (curve) {
    var i = (curve.times || curve.days || curve.dates || curve.labels || [])
      .length;
    if (!i)
      throw new Error(
        "get_curve_times: invalid curve, need to provide valid times, days, dates, or labels",
      );
    var times = new Array(i);
    while (i > 0) {
      i--;
      times[i] = get_time_at(curve, i);
    }
    return times;
  };

  const get_values = function (curve, compounding) {
    // extract times, rates and discount factors from curve and store in hidden function scope
    let times = library.get_curve_times(curve);
    let size = times.length;
    let zcs = library.get_safe_number_vector(curve.zcs);
    let dfs = library.get_safe_number_vector(curve.dfs);

    if (null === zcs) {
      if (null === dfs)
        throw new Error(
          "get_safe_curve: invalid curve, must provide numeric zcs or dfs",
        );
      zcs = new Array(size);
      for (let i = 0; i < size; i++) {
        zcs[i] = compounding.zc(times[i], dfs[i]);
      }
    }
    return [size, times, zcs];
  };

  /**
   * attaches get_rate and other function to curve. If curve is null or falsy, create valid constant curve
   * @param {object} curve curve
   * @returns {object} curve
   * @memberof library
   * @public
   */
  library.get_safe_curve = function (curve) {
    //if null or other falsy argument is given, returns constant curve
    if (!curve)
      curve = {
        times: [1],
        zcs: [0.0],
      };

    // do not call this twice on a curve. If curve already has get_rate, just return
    if (curve.get_rate instanceof Function) return curve;

    // compounding
    var _compounding = library.compounding_factory(curve.compounding);

    // delete invalid members
    for (const member of ["dfs", "zcs", "times", "days", "dates", "labels"]) {
      if (!Array.isArray(curve[member])) delete curve[member];
    }

    // extract times, rates and discount factors from curve and store in hidden function scope
    var [_size, _times, _zcs] = get_values(curve, _compounding);

    var _get_interpolated_rate;

    switch (curve.intp || "".toLowerCase()) {
      case "linear_zc":
        // interpolation on zcs
        _get_interpolated_rate = library.linear_interpolation_factory(
          _times,
          _zcs,
        );
        break;
      case "linear_rt":
        // interpolation on zcs
        _get_interpolated_rate = library.linear_xy_interpolation_factory(
          _times,
          _zcs,
        );
        break;
      default: {
        // interpolation on dfs
        let _dfs = new Array(_size);
        for (let i = 0; i < _size; i++) {
          _dfs[i] = _compounding.df(_times[i], _zcs[i]);
        }

        const _interpolation = library.linear_interpolation_factory(
          _times,
          _dfs,
        );

        _get_interpolated_rate = function (t) {
          return _compounding.zc(t, _interpolation(t));
        };
      }
    }

    // extrapolation
    var _get_rate = function (t) {
      if (t <= _times[0]) return _zcs[0];
      if (t >= _times[_size - 1]) return _zcs[_size - 1];
      return _get_interpolated_rate(t);
    };

    // attach get_rate function with scenario rule if present

    if (typeof curve._rule === "object") {
      var scenario = {
        labels: curve._rule.labels_x,
        zcs: curve._rule.values[0],
        intp: curve._rule.model === "absolute" ? curve.intp : "linear_zc",
      };
      scenario = library.get_safe_curve(scenario);
      if (curve._rule.model === "multiplicative")
        curve.get_rate = function (t) {
          return _get_rate(t) * scenario.get_rate(t);
        };
      if (curve._rule.model === "additive")
        curve.get_rate = function (t) {
          return _get_rate(t) + scenario.get_rate(t);
        };
      if (curve._rule.model === "absolute")
        curve.get_rate = function (t) {
          return scenario.get_rate(t);
        };
    } else {
      curve.get_rate = _get_rate;
    }

    // define get_df based on zcs
    curve.get_df = function (t) {
      return _compounding.df(t, this.get_rate(t));
    };

    // attach get_fwd_amount based on get_df
    curve.get_fwd_amount = function (tstart, tend) {
      if (tend - tstart < 1 / 512) return 0.0;
      return this.get_df(tstart) / this.get_df(tend) - 1;
    };

    // attach get_times closure in order to reobtain hidden times when needed
    curve.get_times = function () {
      return _times;
    };

    // attach get_zcs closure in order to reobtain hidden zcs when needed
    curve.get_zcs = function () {
      return _zcs;
    };

    return curve;
  };

  /**
   * Get discount factor from curve, calling get_safe_curve in case curve.get_df is not defined
   * @param {object} curve curve
   * @param {number} t
   * @param {number} imin
   * @param {number} imax
   * @returns {number} discount factor
   * @memberof library
   * @public
   */
  library.get_df = function (curve, t) {
    if (curve.get_df instanceof Function) return curve.get_df(t);
    return library.get_safe_curve(curve).get_df(t);
  };

  /**
   * TODO
   * @param {object} curve curve
   * @param {number} t
   * @returns {number} ...
   * @memberof library
   * @public
   */
  library.get_rate = function (curve, t) {
    if (curve.get_rate instanceof Function) return curve.get_rate(t);
    return library.get_safe_curve(curve).get_rate(t);
  };

  /**
   * TODO
   * @param {object} curve curve
   * @param {number} tstart
   * @param {number} tend
   * @returns {number} ...
   * @memberof library
   * @public
   */
  library.get_fwd_amount = function (curve, tstart, tend) {
    if (curve.get_fwd_amount instanceof Function)
      return curve.get_fwd_amount(tstart, tend);
    return library.get_safe_curve(curve).get_fwd_amount(tstart, tend);
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * attaches get_value and other function to scalar object, handle scenario rule if present
   * @param {object} scalar scalar object
   * @returns {object} curve
   * @memberof library
   * @public
   */
  library.get_safe_scalar = function (scalar) {
    //if non-object is given, throw error
    if ("object" !== typeof scalar)
      throw new Error("get_safe_scalar: must provide object");

    // extract value and store in hidden function scope
    var _value = library.get_safe_number(scalar.value);
    if (null === _value)
      throw new Error(
        "get_safe_scalar: must provide object with scalar value property",
      );

    // apply scenario rule if present
    if (typeof scalar._rule === "object") {
      var scenval = scalar._rule.values[0][0];
      if (scalar._rule.model === "multiplicative") _value *= scenval;
      if (scalar._rule.model === "additive") _value += scenval;
      if (scalar._rule.model === "absolute") _value = scenval;
    }

    // atttach get_value function
    scalar.get_value = function () {
      return _value;
    };

    return scalar;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * ...
   * @param {number} value
   * @param {string} type
   * @returns {object} surface
   * @memberof library
   * @public
   */
  library.get_const_surface = function (value, type) {
    if (typeof value !== "number")
      throw new Error("get_const_surface: input must be number.");
    return library.get_safe_surface({
      type: type || "",
      expiries: [1],
      terms: [1],
      values: [[value]],
    });
  };
  /**
   * ...
   * @param {object} surface surface
   * @param {number} i
   * @returns {number} term at time i
   * @memberof library
   * @private
   */
  function get_term_at(surface, i) {
    //construct terms from labels_term if terms are not defined
    if (surface.terms) return surface.terms[i];
    if (surface.labels_term)
      return library.period_str_to_time(surface.labels_term[i]);
    throw new Error("get_term_at: invalid surface, cannot derive terms");
  }
  /**
   * ...
   * @param {object} surface surface
   * @param {number} i
   * @returns {number} expiry at time i
   * @memberof library
   * @private
   */
  function get_expiry_at(surface, i) {
    //construct expiries from labels_expiry if expiries are not defined
    if (surface.expiries) return surface.expiries[i];
    if (surface.labels_expiry)
      return library.period_str_to_time(surface.labels_expiry[i]);
    throw new Error("get_expiry_at: invalid surface, cannot derive expiries");
  }
  /**
   * ...
   * @param {object} surface surface
   * @returns {object} surface
   * @memberof library
   * @public
   */
  library.get_safe_surface = function (surface) {
    //if valid surface is given, attach get_rate function and handle scenarios
    //if null or other falsy argument is given, returns constant zero surface
    if (!surface) return library.get_const_surface(0.0);

    // apply scenario rule if present
    var scen = null;
    if (typeof surface._rule === "object") {
      scen = {
        labels_expiry: surface._rule.labels_y,
        labels_term: surface._rule.labels_x,
        values: surface._rule.values,
      };
      if (scen.labels_expiry.length !== scen.values.length)
        throw new Error(
          "get_safe_surface: length of scenario labels_y must match length of scenario values outer array",
        );
      if (scen.labels_term.length !== scen.values[0].length)
        throw new Error(
          "get_safe_surface: length of scenario labels_x must match length of scenario values inner arrays",
        );

      if (surface._rule.model === "multiplicative")
        surface.get_rate = function (t_expiry, t_term) {
          return (
            get_surface_rate(surface, t_expiry, t_term) *
            get_surface_rate(scen, t_expiry, t_term)
          );
        };
      if (surface._rule.model === "additive")
        surface.get_rate = function (t_expiry, t_term) {
          return (
            get_surface_rate(surface, t_expiry, t_term) +
            get_surface_rate(scen, t_expiry, t_term)
          );
        };
      if (surface._rule.model === "absolute")
        surface.get_rate = function (t_expiry, t_term) {
          return get_surface_rate(scen, t_expiry, t_term);
        };
    } else {
      // no scenario
      surface.get_rate = function (t_expiry, t_term) {
        return get_surface_rate(surface, t_expiry, t_term);
      };
    }

    if (surface.moneyness && surface.smile) {
      if (!surface.moneyness.length || !surface.smile.length)
        throw new Error(
          "get_cube_rate: invalid cube, moneyness and smile must be arrays",
        );
      for (var i = 0; i < surface.smile.length; i++) {
        library.get_safe_surface(surface.smile[i]);
      }
    }

    return surface;
  };
  /**
   * ...
   * @param {object} surface
   * @param {date} i_expiry
   * @param {} t_term
   * @param {} imin
   * @param {} imax
   * @returns {number} slice rate
   * @memberof library
   * @privat
   */
  function get_slice_rate(surface, i_expiry, t_term) {
    var imin = 0;
    var imax = (surface.terms || surface.labels_term || []).length - 1;

    var sl = surface.values[i_expiry];
    if (!Array.isArray(sl))
      throw new Error(
        "get_slice_rate: invalid surface, values property must be an array of arrays",
      );
    //slice only has one value left
    if (imin === imax) return sl[imin];
    var tmin = get_term_at(surface, imin);
    var tmax = get_term_at(surface, imax);
    //extrapolation (constant)
    if (t_term < get_term_at(surface, imin)) return sl[imin];
    if (t_term > get_term_at(surface, imax)) return sl[imax];
    // binary search
    var imed, tmed;
    while (imin + 1 !== imax) {
      imed = ((imin + imax) / 2.0) | 0; // truncate the mean time down to the closest integer
      tmed = get_term_at(surface, imed);
      if (t_term > tmed) {
        tmin = tmed;
        imin = imed;
      } else {
        tmax = tmed;
        imax = imed;
      }
    }
    //interpolation (linear)
    if (tmax - tmin < 1 / 512)
      throw new Error(
        "get_slice_rate: invalid surface, support points must be increasing and differ at least one day",
      );
    var temp = 1 / (tmax - tmin);
    return (sl[imin] * (tmax - t_term) + sl[imax] * (t_term - tmin)) * temp;
  }
  /**
   * ...
   * @param {object} surface
   * @param {date} t_expiry
   * @param {} t_term
   * @returns {number} surface rate
   */
  function get_surface_rate(surface, t_expiry, t_term) {
    var imin = 0;
    var imax = (surface.expiries || surface.labels_expiry || []).length - 1;

    // surface only has one slice left
    if (imin === imax) return get_slice_rate(surface, imin, t_term);
    var tmin = get_expiry_at(surface, imin);
    var tmax = get_expiry_at(surface, imax);
    // extrapolation (constant)
    if (t_expiry < tmin) return get_slice_rate(surface, imin, t_term);
    if (t_expiry > tmax) return get_slice_rate(surface, imax, t_term);
    // binary search
    var imed, tmed;
    while (imin + 1 !== imax) {
      // truncate the mean time down to the closest integer
      imed = ((imin + imax) / 2.0) | 0;
      tmed = get_expiry_at(surface, imed);
      if (t_expiry > tmed) {
        tmin = tmed;
        imin = imed;
      } else {
        tmax = tmed;
        imax = imed;
      }
    }
    // interpolation (linear)
    if (tmax - tmin < 1 / 512)
      throw new Error(
        "get_surface_rate: invalid surface, support points must be increasing and differ at least one day",
      );
    var temp = 1 / (tmax - tmin);
    return (
      (get_slice_rate(surface, imin, t_term) * (tmax - t_expiry) +
        get_slice_rate(surface, imax, t_term) * (t_expiry - tmin)) *
      temp
    );
  }

  /**
   * ...
   * @param {object} surface
   * @param {date} t_expiry
   * @param {} t_term
   * @returns {number} surface rate
   */
  library.get_surface_rate = function (surface, t_expiry, t_term) {
    if (surface.get_rate instanceof Function)
      return surface.get_rate(t_expiry, t_term);
    return library.get_safe_surface(surface).get_rate(t_expiry, t_term);
  };

  library.get_cube_rate = function (cube, t_expiry, t_term, m) {
    var atm = library.get_surface_rate(cube, t_expiry, t_term);
    if (cube.moneyness && cube.smile) {
      if (!cube.moneyness.length || !cube.smile.length)
        throw new Error(
          "get_cube_rate: invalid cube, moneyness and smile must be arrays",
        );
      var imin = 0;
      var imax = cube.moneyness.length - 1;

      //surface only has one slice left
      if (imin === imax)
        return (
          atm + library.get_surface_rate(cube.smile[imin], t_expiry, t_term)
        );
      var mmin = cube.moneyness[imin];
      var mmax = cube.moneyness[imax];
      //extrapolation (constant)
      if (m < mmin)
        return (
          atm + library.get_surface_rate(cube.smile[imin], t_expiry, t_term)
        );
      if (m > mmax)
        return (
          atm + library.get_surface_rate(cube.smile[imax], t_expiry, t_term)
        );
      // binary search
      var imed, mmed;
      while (imin + 1 !== imax) {
        imed = ((imin + imax) / 2.0) | 0; // truncate the mean time down to the closest integer
        mmed = cube.moneyness[imed];
        if (m > mmed) {
          mmin = mmed;
          imin = imed;
        } else {
          mmax = mmed;
          imax = imed;
        }
      }
      //interpolation (linear)
      if (mmax - mmin < 1e-15)
        throw new Error(
          "get_cube_rate: invalid cube, moneyness must be nondecreasing",
        );
      var temp = 1 / (mmax - mmin);
      return (
        atm +
        (library.get_surface_rate(cube.smile[imin], t_expiry, t_term) *
          (mmax - m) +
          library.get_surface_rate(cube.smile[imax], t_expiry, t_term) *
            (m - mmin)) *
          temp
      );
    }
    return atm;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /*
        
                JsonRisk vector pricing
                
                
        */

  var stored_params = null; //hidden variable for parameter storage

  /**
   * ...
   * @param {object} obj
   * @returns {number} scalar
   * @memberof library
   * @private
   */
  var normalise_scalar = function (obj, name) {
    //makes value an array of length one if it is not an array
    var val = Array.isArray(obj.value) ? obj.value : [obj.value];
    return { value: val, tags: obj.tags || null, name: name || null };
  };

  /**
   * ...
   * @param {object} obj
   * @returns {object} curve
   * @memberof library
   * @private
   */
  var normalise_curve = function (obj, name) {
    // constructs times from days, dates or labels and makes dfs and zcs an array of length one if it is not an array
    var times = library.get_curve_times(obj),
      dfs = obj.dfs ? (Array.isArray(obj.dfs[0]) ? obj.dfs : [obj.dfs]) : null,
      zcs = obj.zcs ? (Array.isArray(obj.zcs[0]) ? obj.zcs : [obj.zcs]) : null;

    if (!dfs) {
      dfs = new Array(zcs.length);
      for (var i = 0; i < zcs.length; i++) {
        dfs[i] = new Array(zcs[i].length);
        for (var j = 0; j < zcs[i].length; j++) {
          dfs[i][j] = Math.pow(1 + zcs[i][j], -times[j]);
        }
      }
    }

    return {
      name: name || null,
      tags: obj.tags || null,
      times: times,
      dfs: dfs,
    };
  };

  /**
   * ...
   * @param {object} obj
   * @returns {object} surface
   * @memberof library
   * @private
   */
  var normalise_surface = function (obj, name) {
    // constructs terms from labels_term, expiries from labels_expiry and makes value an array of length one if it is not an array
    return Object.assign({}, obj, {
      name: name || null,
      values: Array.isArray(obj.values[0][0]) ? obj.values : [obj.values],
    });
  };

  /**
   * ...
   * @param {object} len length
   * @returns {number} ...
   * @memberof library
   * @private
   */
  var update_vector_length = function (len) {
    if (1 === len) return;
    if (1 === stored_params.vector_length) {
      stored_params.vector_length = len;
      return;
    }
    if (len !== stored_params.vector_length)
      throw new Error(
        "vector_pricing: provided parameters need to have the same length or length one",
      );
  };

  /**
   * attaches the first matching rule in the n-th scenario from the stored scenario groups to the object
   * @param {number} n number indicating which scenario to attach, zero means no scenario
   * @param {object} obj scalar, curve, or surface object
   * @returns {number} ...
   * @memberof library
   * @private
   */
  var attach_scenario = function (n, obj) {
    var risk_factor = obj.name || null;
    var tags = obj.tags || [];

    // unset scenario rule
    delete obj._rule;

    // return if n is zero
    if (n === 0) return false;

    // return if there are no scenario groups
    var sg = stored_params.scenario_groups;
    if (0 === sg.length) return false;

    // find n-th scenario
    var i = 1,
      i_group = 0,
      i_scen = 0;
    while (i < n) {
      i++;
      if (i_scen < sg[i_group].length - 1) {
        // next scenario
        i_scen++;
      } else if (i_group < sg.length - 1) {
        // next scenario group
        i_scen = 0;
        i_group++;
      } else {
        // there are less than n scenarios, just return
        return false;
      }
    }

    // attach scenario if one of the rules match
    var rules = sg[i_group][i_scen].rules;
    var rule;
    for (var i_rule = 0; i_rule < rules.length; i_rule++) {
      rule = rules[i_rule];
      if (Array.isArray(rule.risk_factors)) {
        // match by risk factors
        if (rule.risk_factors.indexOf(risk_factor) > -1) {
          obj._rule = rule;
          return true;
        }
      }
      if (Array.isArray(rule.tags)) {
        // if no exact match by risk factors, all tags of that rule must match
        var found = true;
        for (i = 0; i < rule.tags.length; i++) {
          if (tags.indexOf(rule.tags[i]) === -1) found = false;
        }
        // if tag list is empty, no matching by tags at all
        if (rule.tags.length === 0) found = false;
        if (found) {
          obj._rule = rule;
          return true;
        }
      }
    }
    return false;
  };

  /**
   * ...
   * @param {object} params parameter
   * @memberof library
   * @public
   */
  function name_to_moneyness(str) {
    var s = str.toLowerCase();
    if (s.endsWith("atm")) return 0; //ATM surface
    var n = s.match(/([+-][0-9]+)bp$/); //find number in name, convention is NAME+100BP, NAME-50BP
    if (n.length < 2) return null;
    return n[1] / 10000;
  }

  /**
   * ...
   * @param {object} params parameter
   * @memberof library
   * @public
   */
  function find_smile(name, list) {
    var res = [],
      moneyness;
    for (var i = 0; i < list.length; i++) {
      if (!list[i].startsWith(name)) continue; //not a smile section of surface name
      if (list[i].length === name.length) continue; //this is the surface itself
      moneyness = name_to_moneyness(list[i]);
      if (null === moneyness) continue;
      res.push({ name: list[i], moneyness: moneyness });
    }
    res.sort(function (a, b) {
      return a.moneyness - b.moneyness;
    });
    return res;
  }

  library.store_params = function (params) {
    stored_params = {
      vector_length: 1,
      scalars: {},
      curves: {},
      surfaces: {},
      scenario_groups: [],
    };

    var keys, i;
    //valuation date
    stored_params.valuation_date = library.get_safe_date(params.valuation_date);
    //scalars
    if (typeof params.scalars === "object") {
      keys = Object.keys(params.scalars);
      for (i = 0; i < keys.length; i++) {
        stored_params.scalars[keys[i]] = normalise_scalar(
          params.scalars[keys[i]],
          keys[i],
        );
        update_vector_length(stored_params.scalars[keys[i]].value.length);
      }
    }
    //curves
    if (typeof params.curves === "object") {
      keys = Object.keys(params.curves);
      var obj, len;
      for (i = 0; i < keys.length; i++) {
        obj = normalise_curve(params.curves[keys[i]], keys[i]);
        stored_params.curves[keys[i]] = obj;
        len = obj.dfs ? obj.dfs.length : obj.zcs.length;
        update_vector_length(len);
      }
    }

    //surfaces
    var smile, j;
    if (typeof params.surfaces === "object") {
      keys = Object.keys(params.surfaces);
      for (i = 0; i < keys.length; i++) {
        stored_params.surfaces[keys[i]] = normalise_surface(
          params.surfaces[keys[i]],
          keys[i],
        );
        update_vector_length(stored_params.surfaces[keys[i]].values.length);
      }
      //link smile surfaces to their atm surface
      for (i = 0; i < keys.length; i++) {
        smile = find_smile(keys[i], keys);
        if (smile.length > 0) {
          stored_params.surfaces[keys[i]].smile = [];
          stored_params.surfaces[keys[i]].moneyness = [];
          for (j = 0; j < smile.length; j++) {
            stored_params.surfaces[keys[i]].smile.push(
              stored_params.surfaces[smile[j].name],
            );
            stored_params.surfaces[keys[i]].moneyness.push(smile[j].moneyness);
          }
        }
      }
    }

    //calendars
    var cal;
    if (typeof params.calendars === "object") {
      keys = Object.keys(params.calendars);
      for (i = 0; i < keys.length; i++) {
        cal = params.calendars[keys[i]];
        library.add_calendar(keys[i], cal.dates);
      }
    }

    //scenario groups
    if (Array.isArray(params.scenario_groups)) {
      stored_params.scenario_groups = params.scenario_groups;
      var l = 0;
      for (i = 0; i < params.scenario_groups.length; i++) {
        if (!Array.isArray(params.scenario_groups[i]))
          throw new Error(
            "vector_pricing: invalid parameters, scenario groups must be arrays.",
          );
        l += params.scenario_groups[i].length;
      }
      // scenarios do not include base scenario, so length is sum of array lenghts plus one
      update_vector_length(l + 1);
    }
  };

  /**
   * ...
   * @returns {object} parameter
   * @memberof library
   * @public
   */
  library.get_params = function () {
    return stored_params;
  };

  /**
   * ...
   * @param {object} params parameter
   * @returns {object} ...
   * @memberof library
   * @public
   */
  library.set_params = function (params) {
    if (typeof params !== "object")
      throw new Error(
        "vector_pricing: try to hard set invalid parameters. Use store_params to normalize and store params.",
      );
    if (typeof params.vector_length !== "number")
      throw new Error(
        "vector_pricing: try to hard set invalid parameters. Use store_params to normalize and store params.",
      );
    stored_params = params;
  };

  /**
   * ...
   * @param {object} vec_scalar
   * @param {object} i
   * @returns {object} scalar
   * @memberof library
   * @private
   */
  var get_scalar_scalar = function (vec_scalar, i) {
    if (!vec_scalar) return null;
    return {
      name: vec_scalar.name || null,
      tags: vec_scalar.tags || null,
      value: vec_scalar.value[vec_scalar.value.length > 1 ? i : 0],
    };
  };

  /**
   * ...
   * @param {object} vec_curve
   * @param {object} i
   * @returns {object} curve
   * @memberof library
   * @private
   */
  var get_scalar_curve = function (vec_curve, i) {
    if (!vec_curve) return null;
    var times = vec_curve.times;
    var dfs = vec_curve.dfs
      ? vec_curve.dfs[vec_curve.dfs.length > 1 ? i : 0]
      : null;

    return {
      name: vec_curve.name || null,
      tags: vec_curve.tags || null,
      times: times,
      dfs: dfs,
    };
  };

  /**
   * ...
   * @param {object} vec_surface
   * @param {object} i
   * @returns {object} surface
   * @memberof library
   * @private
   */
  var get_scalar_surface = function (vec_surface, i, nosmile) {
    if (!vec_surface) return null;
    var values = vec_surface.values[vec_surface.values.length > 1 ? i : 0];
    var smile = null,
      moneyness = null,
      j;
    if (
      nosmile !== true &&
      Array.isArray(vec_surface.smile) &&
      Array.isArray(vec_surface.moneyness)
    ) {
      moneyness = vec_surface.moneyness;
      smile = [];
      for (j = 0; j < vec_surface.smile.length; j++) {
        smile.push(get_scalar_surface(vec_surface.smile[j], i, true));
      }
    }
    return Object.assign({}, vec_surface, {
      values: values,
      moneyness: moneyness,
      smile: smile,
    });
  };

  /**
   * read instrument type for given instrument and create internal instrument
   * @param {object} instrument any instrument
   * @returns {object} internal instrument
   * @memberof library
   * @public
   */
  library.get_internal_object = function (instrument) {
    switch (instrument.type.toLowerCase()) {
      case "bond":
      case "floater":
        return new library.fixed_income(instrument);
      case "swap":
        return new library.swap(instrument);
      case "swaption":
        return new library.swaption(instrument);
      case "fxterm":
        return new library.fxterm(instrument);
      case "callable_bond":
        return new library.callable_fixed_income(instrument);
      case "equity":
        return new library.equity(instrument);
      default:
        throw new Error("get_internal_object: invalid instrument type");
    }
  };

  /**
   * calculates the present value for any given supported instrument (bond, floater, fxterm, swap, swaption, callable_bond)
   * @param {object} instrument any instrument
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.vector_pricer = function (instrument) {
    var simulation_once = function () {
      this.results.present_value = new Array(this.num_scenarios);
    };

    var simulation_scenario = function () {
      var i = this.idx_scen;
      var dc = this.dc;
      var sc = this.sc;
      var fc = this.fc;
      var su = this.su;
      var qu = this.qu;
      switch (this.instrument.type.toLowerCase()) {
        case "bond":
        case "floater":
        case "fxterm":
        case "irregular_bond":
          this.results.present_value[i] = this.object.present_value(dc, sc, fc);
          break;
        case "swap":
        case "swaption":
          this.results.present_value[i] = this.object.present_value(dc, fc, su);
          break;
        case "callable_bond":
          this.results.present_value[i] = this.object.present_value(
            dc,
            sc,
            fc,
            su,
          );
          break;
        case "equity":
          this.results.present_value[i] = this.object.present_value(qu);
          break;
      }
      // if currency is provided and not EUR, convert or throw error
      if (!this.instrument.currency) return;
      if (this.instrument.currency === "EUR") return;
      this.results.present_value[i] /= library
        .get_safe_scalar(this.fx)
        .get_value();
    };

    var module = {
      simulation_once: simulation_once,
      simulation_scenario: simulation_scenario,
    };

    return library.simulation(instrument, [module]).present_value;
  };

  /**
   * runs a generic simulation on an instrument
   * @param {object} instrument any instrument
   * @param {array} modules an array of modules, i.e. objects that define either the simulation_once or simulation_scenario function, or both
   * @returns {object} results object
   * @memberof library
   * @public
   */
  library.simulation = function (instrument, modules) {
    if (typeof instrument.type !== "string")
      throw new Error(
        "vector_pricer: instrument object must contain valid type",
      );
    library.valuation_date = stored_params.valuation_date;

    // create context for module execution
    var context = {
      instrument: instrument,
      object: library.get_internal_object(instrument),
      params: stored_params,
      num_scen: stored_params.vector_length,
      idx_scen: 0,
      dc: null,
      sc: null,
      fc: null,
      su: null,
      qu: null,
      fx: null,
      results: {},
    };

    var vec_dc = stored_params.curves[instrument.disc_curve || ""] || null;
    var vec_sc = stored_params.curves[instrument.spread_curve || ""] || null;
    var vec_fc = stored_params.curves[instrument.fwd_curve || ""] || null;
    var vec_surface = stored_params.surfaces[instrument.surface || ""] || null;
    var vec_qu = stored_params.scalars[instrument.quote || ""] || {
      value: [1],
    };
    var vec_fx = stored_params.scalars[instrument.currency || ""] || {
      value: [1],
    };
    var j;
    for (var i = 0; i < stored_params.vector_length; i++) {
      // update context with curves
      context.dc = get_scalar_curve(vec_dc, i);
      context.sc = get_scalar_curve(vec_sc, i);
      context.fc = get_scalar_curve(vec_fc, i);
      context.su = get_scalar_surface(vec_surface, i);
      context.qu = get_scalar_scalar(vec_qu, i);
      context.fx = get_scalar_scalar(vec_fx, i);
      context.idx_scen = i;

      // attach scenarios to curves
      if (context.dc) attach_scenario(i, context.dc);
      if (context.sc) attach_scenario(i, context.sc);
      if (context.fc) attach_scenario(i, context.fc);
      if (context.su) attach_scenario(i, context.su);
      if (context.qu) attach_scenario(i, context.qu);
      if (context.fx) attach_scenario(i, context.fx);

      // call simulation_once for all modules for i=0
      for (j = 0; j < modules.length; j++) {
        if (0 === i && "function" === typeof modules[j].simulation_once)
          modules[j].simulation_once.call(context);
      }

      // call simulation_scenario for all modules for i=0
      for (j = 0; j < modules.length; j++) {
        if ("function" === typeof modules[j].simulation_scenario)
          modules[j].simulation_scenario.call(context);
      }
    }
    return context.results;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  "use strict";
  /*
        
        Schedule functions used by simple and irregular fixed income instruments.
        
        */
  /**
   * creates a forward schedule from start up to but excluding end, using tenor as frequency
   * @param {date} start start date
   * @param {date} end end date
   * @param {number} tenor tenor
   * @param {} adjust_func
   * @returns {object} schedule
   * @memberof library
   * @private
   */
  var forward_rollout = function (start, end, tenor, adjust_func) {
    var res = [start];
    var i = 1,
      dt = library.add_months(start, tenor);
    while (dt.getTime() < end.getTime()) {
      res.push(dt);
      i++;
      dt = library.add_months(start, i * tenor);
    }
    if (
      adjust_func(end).getTime() <= adjust_func(res[res.length - 1]).getTime()
    )
      res.pop(); //make sure end is excluded after adjustments
    return res;
  };
  /**
   * creates a backward schedule from end down to but excluding start, using tenor as frequency
   * @param {date} start start date
   * @param {date} end end date
   * @param {number} tenor tenor
   * @param {} adjust_func
   * @returns {object} schedule
   * @memberof library
   * @private
   */
  var backward_rollout = function (start, end, tenor, adjust_func) {
    var res = [end];
    var i = 1,
      dt = library.add_months(end, -tenor);
    while (dt.getTime() > start.getTime()) {
      res.unshift(dt);
      i++;
      dt = library.add_months(end, -i * tenor);
    }
    if (adjust_func(start).getTime() >= adjust_func(res[0]).getTime())
      res.shift(); //make sure start is excluded after adjustments
    return res;
  };

  /**
   * TODO
   * @param {date} eff_dt effective date
   * @param {date} maturity maturity
   * @param {number} tenor tenor
   * @param {} adjust_func
   * @param {date} first_dt first date
   * @param {date} next_to_last_dt next to last date
   * @param {} stub_end
   * @param {} stub_long
   * @returns {} ...
   * @memberof library
   * @public
   */
  library.schedule = function (
    eff_dt,
    maturity,
    tenor,
    adjust_func,
    first_dt,
    next_to_last_dt,
    stub_end,
    stub_long,
  ) {
    if (!(maturity instanceof Date))
      throw new Error("schedule: maturity must be provided");
    if (isNaN(maturity))
      throw new Error("schedule: invalid date provided for maturity");

    if (!(eff_dt instanceof Date)) {
      //effective date is strictly needed if valuation date is not set
      if (null === library.valuation_date)
        throw new Error(
          "schedule: if valuation_date is unset, effective date must be provided",
        );
      //effective date is strictly needed if first date is given (explicit stub at beginning)
      if (first_dt instanceof Date)
        throw new Error(
          "schedule: if first date is provided, effective date must be provided",
        );
      //effective date is strictly needed if next_to_last_date is not given and stub_end is true (implicit stub in the end)
      if (!(next_to_last_dt instanceof Date) && stub_end)
        throw new Error(
          "schedule: if next to last date is not provided and stub in the end is specified, effective date must be provided",
        );
    }
    if (eff_dt instanceof Date && isNaN(eff_dt))
      throw new Error("schedule: invalid date provided for effective date");
    if (maturity <= (eff_dt instanceof Date ? eff_dt : library.valuation_date))
      throw new Error(
        "schedule: maturity is before valuation date or effective date.",
      );
    if (typeof tenor !== "number")
      throw new Error(
        "schedule: tenor must be a nonnegative integer, e.g., 6 for semiannual schedule, 0 for zerobond/iam schedule",
      );
    if (tenor < 0 || Math.floor(tenor) !== tenor)
      throw new Error(
        "schedule: tenor must be a nonnegative integer, e.g., 6 for semiannual schedule, 0 for zerobond/iam schedule",
      );
    if (0 === tenor)
      return [
        eff_dt instanceof Date ? eff_dt : library.valuation_date,
        maturity,
      ];

    var res;
    if (first_dt instanceof Date && !(next_to_last_dt instanceof Date)) {
      // forward generation with explicit stub at beginning
      res = forward_rollout(first_dt, maturity, tenor, adjust_func);
      //add maturity date
      res.push(maturity);
      //add effective date
      if (eff_dt.getTime() !== first_dt.getTime()) res.unshift(eff_dt);
    } else if (next_to_last_dt instanceof Date && !(first_dt instanceof Date)) {
      // backward generation with explicit stub at end
      res = backward_rollout(
        eff_dt instanceof Date ? eff_dt : library.valuation_date,
        next_to_last_dt,
        tenor,
        adjust_func,
      );
      //add maturity date
      if (maturity.getTime() !== next_to_last_dt.getTime()) res.push(maturity);
      //add effective date if given
      if (eff_dt instanceof Date) res.unshift(eff_dt);
      //if effective date is not given, add another period
      if (!(eff_dt instanceof Date))
        res.unshift(library.add_months(res[0], -tenor));
    } else if (first_dt instanceof Date && next_to_last_dt instanceof Date) {
      // backward generation with both explicit stubs
      res = backward_rollout(first_dt, next_to_last_dt, tenor, adjust_func);
      //add maturity date
      if (maturity.getTime() !== next_to_last_dt.getTime()) res.push(maturity);
      //add first date
      res.unshift(first_dt);
      //add effective date
      res.unshift(eff_dt);
    } else if (stub_end) {
      // forward generation with implicit stub, effective date always given
      res = forward_rollout(eff_dt, maturity, tenor, adjust_func);
      //remove last item if long stub and more than one date present
      if (stub_long && res.length > 1) res.pop();
      //add maturity date if not already included (taking into account adjustments)
      res.push(maturity);
    } else {
      // backward generation with implicit stub
      res = backward_rollout(
        eff_dt instanceof Date ? eff_dt : library.valuation_date,
        maturity,
        tenor,
        adjust_func,
      );
      //remove first item if long stub and more than one date present
      if (stub_long && res.length > 1) res.shift();
      //add effective date if given
      if (eff_dt instanceof Date) res.unshift(eff_dt);
      //if effective date is not given and beginning of schedule is still after valuation date, add another period
      if (!(eff_dt instanceof Date))
        res.unshift(library.add_months(res[0], -tenor));
    }
    return res;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * @memberof library
   */

  /*
    
            JsonRisk date and time functions
            
            
    */

  "use strict";

  var dl = 1000 * 60 * 60 * 24; // length of one day in milliseconds
  var one_over_dl = 1.0 / dl;

  /**
   * checks if a year is a leap year
   * @param {number} y year
   * @returns {boolean} true, if leap year
   * @memberof library
   * @private
   */
  function is_leap_year(y) {
    if (y % 4 !== 0) return false;
    if (y === 2000) return true;
    return y % 100 !== 0;
  }

  /**
   * returns the number of days in a given month, i.e., 28,29,30, or 31
   * @param {number} y year
   * @param {number} m month
   * @returns {number} number of days in month
   * @memberof library
   * @private
   */
  function days_in_month(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }

  /**
   * calculates the time in years from a given period string
   * @param {string} str time string (xY, xM, xW, xD)
   * @returns {number} time in years
   * @memberof library
   * @public
   */
  library.period_str_to_time = function (str) {
    var num = parseInt(str, 10);
    if (isNaN(num))
      throw new Error(
        "period_str_to_time(str) - Invalid time period string: " + str,
      );
    var unit = str.charAt(str.length - 1);
    if (unit === "Y" || unit === "y") return num;
    if (unit === "M" || unit === "m") return num / 12;
    if (unit === "W" || unit === "w") return num / 52;
    if (unit === "D" || unit === "d") return num / 365;
    throw new Error(
      "period_str_to_time(str) - Invalid time period string: " + str,
    );
  };

  /**
   * constructs a javascript date object from a JSON risk conformant date string
   * @param {string} str date string
   * @returns {date} javascript date object
   * @memberof library
   * @public
   */
  library.date_str_to_date = function (str) {
    var rr = null,
      d,
      m,
      y;
    if (
      (rr = /^([1-2][0-9]{3})[/-]([0-9]{1,2})[/-]([0-9]{1,2})/.exec(str)) !==
      null
    ) {
      // YYYY/MM/DD or YYYY-MM-DD
      y = parseInt(rr[1], 10);
      m = parseInt(rr[2], 10) - 1;
      d = parseInt(rr[3], 10);
    } else if (
      (rr = /^([0-9]{1,2})\.([0-9]{1,2})\.([1-2][0-9]{3})/.exec(str)) !== null
    ) {
      // DD.MM.YYYY
      y = parseInt(rr[3], 10);
      m = parseInt(rr[2], 10) - 1;
      d = parseInt(rr[1], 10);
    }
    if (null === rr)
      throw new Error("date_str_to_time(str) - Invalid date string: " + str);
    if (m < 0 || m > 11)
      throw new Error(
        "date_str_to_time(str) - Invalid month in date string: " + str,
      );
    if (d < 0 || d > days_in_month(y, m))
      throw new Error(
        "date_str_to_time(str) - Invalid day in date string: " + str,
      );
    return new Date(Date.UTC(y, m, d));
  };

  /**
   * constructs a JSON risk conformant date string YYYY-MM-DD from a javascript date object or another JSON risk conformant date string
   * @param {date} date object
   * @returns {string} date string
   * @memberof library
   * @public
   */
  library.date_to_date_str = function (d) {
    var dobj = library.get_safe_date(d);
    if (null === dobj) throw new Error("date_to_date_str: invalid input.");
    return dobj.toISOString().slice(0, 10);
  };

  /**
   * takes a valid date string, a javascript date object, or an undefined value and returns a javascript date object or null
   * @param {date} d
   * @returns {date} javascript date object
   * @memberof library
   * @public
   */
  library.get_safe_date = function (d) {
    if (!d) return null;
    if (d instanceof Date) {
      var h = d.getUTCHours();
      if (0 === h) return d; // valid UTC 0:00 date
      var y = d.getUTCFullYear();
      var m = d.getUTCMonth();
      var t = d.getUTCDate();
      if (h > 11) t++; // advance to next day UTC 0:00 date
      return new Date(Date.UTC(y, m, t));
    }
    if (d instanceof String || typeof d === "string")
      return library.date_str_to_date(d);
    throw new Error("get_safe_date: invalid input.");
  };

  /**
   * get a vector of dates when vector of dates, vector of date strings or space sepatated list of date strings is entered. Returns null otherwise
   * @param {date} d
   * @returns {number} array of javascript date objects
   * @memberof library
   * @public
   */
  library.get_safe_date_vector = function (d) {
    if (d instanceof Date) return [d];
    var res;
    if (typeof d === "string") {
      res = d.split(/\s+/);
    } else if (Array.isArray(d)) {
      res = d.slice();
    } else {
      return null;
    }
    for (var i = 0; i < res.length; i++) {
      res[i] = library.get_safe_date(res[i]);
      if (null === res[i])
        throw new Error("get_safe_date_vector: invalid input");
    }
    return res;
  };

  /*!
    
            Year Fractions
    
    */
  /**
   * counts days between to dates
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} days between from and to date
   * @memberof library
   * @private
   */
  function days_between(from, to) {
    return Math.round((to.getTime() - from.getTime()) * one_over_dl);
  }

  /**
   * year fraction act365 according to the ISDA 2006 rules, section 4.16 (d)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (act365)
   * @memberof library
   * @private
   */
  function yf_act365(from, to) {
    return days_between(from, to) / 365;
  }

  /**
   * year fraction act360  according to the ISDA 2006 rules, section 4.16 (e)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (act360)
   * @memberof library
   * @private
   */
  function yf_act360(from, to) {
    return days_between(from, to) / 360;
  }

  /**
   * year fraction 30/360 according to the ISDA 2006 rules, section 4.16 (f)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (30/360)
   * @memberof library
   * @private
   */
  function yf_30U360(from, to) {
    var y1 = from.getUTCFullYear();
    var y2 = to.getUTCFullYear();
    var m1 = from.getUTCMonth();
    var m2 = to.getUTCMonth();
    var d1 = Math.min(from.getUTCDate(), 30);
    var d2 = to.getUTCDate();
    if (29 < d1 && 31 == d2) d2 = 30;
    return ((y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1)) / 360;
  }

  /**
   * year fraction 30E/360 according to the ISDA 2006 rules, section 4.16 (g)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (30E/360)
   * @memberof library
   * @private
   */
  function yf_30E360(from, to) {
    var y1 = from.getUTCFullYear();
    var y2 = to.getUTCFullYear();
    var m1 = from.getUTCMonth();
    var m2 = to.getUTCMonth();
    var d1 = Math.min(from.getUTCDate(), 30);
    var d2 = Math.min(to.getUTCDate(), 30);
    return ((y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1)) / 360;
  }

  /**
   * year fraction 30E/360 (ISDA) according to the ISDA 2006 rules, section 4.16 (h)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (30E/360 ISDA)
   * @memberof library
   * @private
   */
  function yf_30G360(from, to) {
    var y1 = from.getUTCFullYear();
    var y2 = to.getUTCFullYear();
    var m1 = from.getUTCMonth();
    var m2 = to.getUTCMonth();
    var d1 = Math.min(from.getUTCDate(), 30);
    var d2 = Math.min(to.getUTCDate(), 30);
    if (1 == m1 && d1 == days_in_month(y1, m1)) d1 = 30;
    if (1 == m2 && d2 == days_in_month(y2, m2)) d2 = 30;
    return ((y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1)) / 360;
  }

  /**
   * year fraction act/act  according to the ISDA 2006 rules, section 4.16 (b)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (act/act)
   * @memberof library
   * @private
   */
  function yf_actact(from, to) {
    if (from - to === 0) return 0;
    if (from > to) return -yf_actact(to, from);
    var yfrom = from.getUTCFullYear();
    var yto = to.getUTCFullYear();
    if (yfrom === yto)
      return days_between(from, to) / (is_leap_year(yfrom) ? 366 : 365);
    var res = yto - yfrom - 1;
    res +=
      days_between(from, new Date(Date.UTC(yfrom + 1, 0, 1))) /
      (is_leap_year(yfrom) ? 366 : 365);
    res +=
      days_between(new Date(Date.UTC(yto, 0, 1)), to) /
      (is_leap_year(yto) ? 366 : 365);
    return res;
  }

  /**
   * returns day count convention of param (multiple possibilities to deliver day count conventions)
   * @param {string} str
   * @returns {number} day count convention in library format
   * @memberof library
   * @public
   */
  library.year_fraction_factory = function (str) {
    if (!(str instanceof String) && typeof str !== "string") return yf_act365; //default dcc
    if ("" === str) return yf_act365; // default dcc

    switch (str.toLowerCase()) {
      case "actual/365":
      case "act/365":
      case "a/365":
      case "act/365 (fixed)":
      case "actual/365 (fixed)":
        return yf_act365;

      case "actual/360":
      case "act/360":
      case "a/360":
      case "french":
        return yf_act360;

      case "actual/actual":
      case "act/act":
      case "a/a":
        return yf_actact;

      case "30/360":
      case "30u/360":
      case "bond":
      case "bond basis":
        return yf_30U360;

      case "30e/360":
      case "eurobond":
      case "eurobond basis":
        return yf_30E360;

      case "30g/360":
      case "30e/360 (isda)":
      case "30/360 german":
        return yf_30G360;

      default:
        //fail if invalid string was supplied
        throw new Error("year fraction factory: invalid input " + str);
    }
  };

  /**
   * Returns the time in years from library.valuation_date until the given date
   * @param {date} d
   * @returns {number} time in years from library.valuation_date until d
   * @memberof library
   * @public
   */
  library.time_from_now = function (d) {
    library.require_vd();
    return yf_act365(library.valuation_date, d);
  };

  /*!
    
            Date rolling
    
    */
  /**
   * adds days
   * @param {date} from from date
   * @param {number} ndays days to be added
   * @returns {date} from date plus ndays
   * @memberof library
   * @public
   */
  library.add_days = function (from, ndays) {
    return new Date(from.getTime() + ndays * dl);
  };

  /**
   * Adds months
   * @param {date} from from date
   * @param {number} nmonths number of months to be added
   * @param {object} roll_day
   * @returns {date} the date that is nmonths months from the from date.
   * @memberof library
   * @public
   */
  library.add_months = function (from, nmonths, roll_day) {
    var y = from.getUTCFullYear(),
      m = from.getUTCMonth() + nmonths,
      d;
    while (m >= 12) {
      m = m - 12;
      y = y + 1;
    }
    while (m < 0) {
      m = m + 12;
      y = y - 1;
    }
    if (!roll_day) {
      d = from.getUTCDate();
    } else {
      d = roll_day;
    }
    return new Date(Date.UTC(y, m, Math.min(d, days_in_month(y, m))));
  };

  /**
   * add period (like Years, Months, Days, Weeks)
   * @param {date} from
   * @param {string} str
   * @returns {date} from date plus the period given in the period string
   * @memberof library
   * @public
   */
  library.add_period = function (from, str) {
    var num = parseInt(str, 10);
    if (isNaN(num))
      throw new Error(
        "period_str_to_time(str) - Invalid time period string: " + str,
      );
    var unit = str.charAt(str.length - 1);
    if (unit === "Y" || unit === "y") return library.add_months(from, 12 * num);
    if (unit === "M" || unit === "m") return library.add_months(from, num);
    if (unit === "W" || unit === "w") return library.add_days(from, 7 * num);
    if (unit === "D" || unit === "d") return library.add_days(from, num);
    throw new Error(
      "period_str_to_time(str) - Invalid time period string: " + str,
    );
  };

  /*!
    
            Calendars
    
    */
  /**
   * determine easter sunday for a year
   * @param {number} y year
   * @returns {date} easter sunday for given year
   * @memberof library
   * @private
   */
  function easter_sunday(y) {
    var f = Math.floor,
      c = f(y / 100),
      n = y - 19 * f(y / 19),
      k = f((c - 17) / 25);
    var i = c - f(c / 4) - f((c - k) / 3) + 19 * n + 15;
    i = i - 30 * f(i / 30);
    i = i - f(i / 28) * (1 - f(i / 28) * f(29 / (i + 1)) * f((21 - n) / 11));
    var j = y + f(y / 4) + i + 2 - c + f(c / 4);
    j = j - 7 * f(j / 7);
    var l = i - j,
      m = 3 + f((l + 40) / 44),
      d = l + 28 - 31 * f(m / 4);
    return new Date(Date.UTC(y, m - 1, d));
  }

  /**
   * determine if a date is a saturday or sunday
   * @param {date} dt
   * @returns {boolean} true, if saturday or sunday
   * @memberof library
   * @private
   */
  function is_holiday_default(dt) {
    var wd = dt.getUTCDay();
    if (0 === wd) return true;
    if (6 === wd) return true;
    return false;
  }

  /**
   * determine, if date is a holiday according to the TARGET calendar
   * @param {date} dt
   * @returns {boolean} true, if holiday
   * @memberof library
   * @private
   */
  function is_holiday_target(dt) {
    if (is_holiday_default(dt)) return true;

    var d = dt.getUTCDate();
    var m = dt.getUTCMonth();
    if (1 === d && 0 === m) return true; //new year
    if (25 === d && 11 === m) return true; //christmas

    var y = dt.getUTCFullYear();
    if (1998 === y || 1999 === y || 2001 === y) {
      if (31 === d && 11 === m) return true; // December 31
    }
    if (y > 2000) {
      if ((1 === d && 4 === m) || (26 === d && 11 === m)) return true; //labour and goodwill
      var es = easter_sunday(y);
      if (dt.getTime() === library.add_days(es, -2).getTime()) return true; //Good Friday
      if (dt.getTime() === library.add_days(es, 1).getTime()) return true; //Easter Monday
    }
    return false;
  }

  var calendars = {};

  /**
   * add additional holidays that are no default holidays, i.e., weekend days
   * @param {string} name
   * @param {object} dates
   * @returns {object} the size of the hash table for holidays
   * @memberof library
   * @public
   */
  library.add_calendar = function (name, dates) {
    if (!(name instanceof String || typeof name === "string"))
      throw new Error("add_calendar: invalid input.");
    if (!Array.isArray(dates)) throw new Error("add_calendar: invalid input.");
    var n = dates.length,
      i,
      ht_size;
    var holidays = [];
    var dt;
    //only consider array items that are valid dates or date strings and that are no default holidays, i.e., weekend days
    for (i = 0; i < n; i++) {
      dt = library.get_safe_date(dates[i]);
      if (!dt) continue;
      if (is_holiday_default(dt)) continue;
      holidays.push(dt);
    }
    n = holidays.length;
    /*
                Determine hash table size, must be prime number greater than number of holidays.
                According to one of euclid's formulae, i*i - i + 41 is prime when i<41.
                Max size is 1601 which is way enough for all reasonable calendars.
                
        */
    i = 1;
    while (i < 41) {
      ht_size = i * i - i + 41;
      if (ht_size >= n / 10) break;
      i++;
    }

    //populate hash table
    var hash_table = new Array(ht_size);
    for (i = 0; i < ht_size; i++) {
      hash_table[i] = [];
    }
    var ht_index;
    for (i = 0; i < n; i++) {
      ht_index = Math.floor(holidays[i].getTime() * one_over_dl) % ht_size;
      hash_table[ht_index].push(holidays[i].getTime());
    }

    //tie new hash table to calendars list and return size for informational purposes
    calendars[name.toLowerCase()] = hash_table;
    return ht_size;
  };

  /**
   * factory function for calendar functionality
   * @param {string} str a string representing a holiday calendar
   * @returns {function} a function that takes a date as input argument and returns true if that date is a holiday according to the supplied calendar and false otherwise
   * @memberof library
   * @public
   */
  library.is_holiday_factory = function (str) {
    var sl = str.toLowerCase();
    //builtin target calendar
    if (sl === "target") return is_holiday_target;
    //generic hash lookup function for stored calendars
    if (Array.isArray(calendars[sl])) {
      var cal = calendars[sl];
      return function (dt) {
        if (is_holiday_default(dt)) return true;
        var ms = dt.getTime();
        var ht_index = Math.floor(ms * one_over_dl) % cal.length;
        for (var i = 0; i < cal[ht_index].length; i++) {
          if (ms === cal[ht_index][i]) return true;
        }
        return false;
      };
    }
    //fallback
    if (sl === "") return is_holiday_default;
    throw new Error("is_holiday_factory: calendar not found: " + sl);
  };

  /*!
    
            Business Day Conventions
    
    */

  /**
   * Adjust dates according to a calendar and a business day convention
   * @param {date} dt
   * @param {string} bdc business day convention, can be "unadjusted", "following", "modified following" or "preceding". Only the first character of the string is actually evaluated
   * @param {function} is_holiday_function a function that takes a date as input argument and returns true if that date is a holiday and false otherwise
   * @returns {date} adjusted date
   * @memberof library
   * @public
   */
  library.adjust = function (dt, bdc, is_holiday_function) {
    if (!(bdc instanceof String) && typeof bdc !== "string") return dt; // no business day convention specified
    var s = (bdc || "u").charAt(0).toLowerCase();
    var adj = new Date(dt);
    if (s === "u") return adj; //unadjusted

    var m;
    if (s === "m") m = adj.getUTCMonth(); //save month for modified following
    if (s === "m" || s === "f") {
      while (is_holiday_function(adj)) adj = library.add_days(adj, 1);
    }
    if (s === "f") return adj; //following
    if (s === "m" && m === adj.getUTCMonth()) return adj; //modified following, still in same month
    if (s === "m") adj = library.add_days(adj, -1); //modified following, in next month
    while (is_holiday_function(adj)) adj = library.add_days(adj, -1); //modified following or preceding
    return adj;
  };

  /**
   * add business days
   * @param {date} from from date
   * @param {number} n days to be added
   * @param {boolean} is_holiday_function a function that takes a date as input argument and returns true if that date is a holiday and false otherwise
   * @returns {date} date + n business days
   * @memberof library
   * @public
   */
  library.add_business_days = function (from, n, is_holiday_function) {
    var res = from,
      i = n;
    while (i > 0) {
      res = library.adjust(library.add_days(res, 1), "f", is_holiday_function);
      i--;
    }
    return res;
  };
})(this.JsonRisk || module.exports);
