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

    this.disc_curve = instrument.disc_curve || "";
    this.spread_curve = instrument.spread_curve || "";
    this.fwd_curve = instrument.fwd_curve || "";
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

          fwd_rate[i] = fwd_curve.get_fwd_amount(
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
    if (!(disc_curve instanceof library.Curve))
      disc_curve = new library.Curve(disc_curve);

    if (this.is_float) {
      if (!(fwd_curve instanceof library.Curve))
        fwd_curve = new library.Curve(fwd_curve);
    } else {
      fwd_curve = null;
    }

    if (spread_curve) {
      if (!(spread_curve instanceof library.Curve))
        spread_curve = new library.Curve(spread_curve);
    } else {
      spread_curve = null;
    }

    return library.dcf(
      this.get_cash_flows(fwd_curve),
      disc_curve,
      spread_curve,
      this.residual_spread,
      this.settlement_date,
    );
  };

  library.fixed_income.prototype.add_deps = function (deps) {
    if ((!deps) instanceof library.Deps)
      throw new Error("add_deps: deps must be of type Deps");
    deps.addCurve(this.disc_curve);
    if (this.spread_curve != "") deps.addCurve(this.spread_curve);
    if (this.is_float) deps.addCurve(this.fwd_curve);
  };

  library.fixed_income.prototype.evaluate = function (params) {
    if ((!params) instanceof library.Params)
      throw new Error("evaluate: params must be of type Params");
    const disc_curve = params.getCurve(this.disc_curve);
    const spread_curve =
      this.spread_curve != "" ? params.getCurve(this.spread_curve) : null;
    const fwd_curve = this.is_float ? params.getCurve(this.fwd_curve) : null;
    return this.present_value(disc_curve, spread_curve, fwd_curve);
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

    if (!(disc_curve instanceof library.Curve))
      disc_curve = new library.Curve(disc_curve);

    if (spread_curve) {
      if (!(spread_curve instanceof library.Curve))
        spread_curve = new library.Curve(spread_curve);
    } else {
      spread_curve = null;
    }

    if (fwd_curve) {
      if (!(fwd_curve instanceof library.Curve))
        fwd_curve = new library.Curve(fwd_curve);
    } else {
      fwd_curve = library.get_const_curve(0);
    }

    const c = this.finalize_cash_flows(fwd_curve); // cash flow with zero interest or zero spread

    //retrieve outstanding principal on valuation date
    var outstanding_principal = 0;
    let i = 0;
    while (c.date_pmt[i] <= library.valuation_date) i++;
    outstanding_principal = c.current_principal[i];

    //build cash flow object with zero interest and (harder) zero spread
    const pmt = new Array(c.pmt_total.length);
    let accrued = 0;
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

    let res =
      outstanding_principal -
      library.dcf(
        {
          date_pmt: c.date_pmt,
          t_pmt: c.t_pmt,
          pmt_total: pmt,
        },
        disc_curve,
        spread_curve,
        this.residual_spread,
        this.settlement_date,
      );
    res /= this.annuity(disc_curve, spread_curve, fwd_curve);
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
    var c = this.get_cash_flows(fwd_curve);
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
      disc_curve,
      spread_curve,
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
