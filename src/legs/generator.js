(function (library) {
  let specs = null;
  let conditions = null;
  let schedule = null;
  let repay_schedule = null;
  let fixing_schedule = null;
  let timeline = null;

  //
  //
  // time-independent terms and conditions
  //
  //
  function make_specs(obj) {
    specs = {};

    specs.maturity = library.date_or_null(obj.maturity);
    if (!specs.maturity)
      throw new Error("fixed_income: must provide maturity date.");

    specs.effective_date = library.date_or_null(obj.effective_date); //null allowed

    specs.notional = library.number_or_null(obj.notional);
    if (null === specs.notional)
      throw new Error("cashflow_generator: must provide valid notional.");

    //include notional exchange unless explicitly set to false (e.g., for swaps)
    specs.notional_exchange = library.make_bool(obj.notional_exchange);
    if (
      null === obj.notional_exchange ||
      "" === obj.notional_exchange ||
      undefined === obj.notional_exchange
    )
      specs.notional_exchange = true;

    specs.tenor = library.natural_number_or_null(obj.tenor);
    if (null === specs.tenor)
      throw new Error("cashflow_generator: must provide valid tenor.");

    specs.first_date = library.date_or_null(obj.first_date); //null allowed
    specs.next_to_last_date = library.date_or_null(obj.next_to_last_date); //null allowed
    specs.stub_end = library.make_bool(obj.stub_end); // defaults to false
    specs.stub_long = library.make_bool(obj.stub_long); // defaults to false

    specs.dcc = library.string_or_empty(obj.dcc);
    const is_holiday_func = library.is_holiday_factory(obj.calendar || "");
    const bdc = library.string_or_empty(obj.bdc);

    specs.adj = function (d) {
      return library.adjust(d, bdc, is_holiday_func);
    };

    specs.adjust_accrual_periods = library.make_bool(
      obj.adjust_accrual_periods,
    );

    // fixed or floating
    specs.is_float = !(obj.fixed_rate || obj.fixed_rate === 0.0);

    specs.float_current_rate = library.number_or_null(obj.float_current_rate);

    if (specs.is_float && specs.float_current_rate === null)
      throw new Error(
        "cashflow_generator: must provide valid float_current_rate.",
      );

    // linear amortization flag
    specs.linear_amortization = library.make_bool(obj.linear_amortization);

    // use forward curve as index name
    specs.index_name = library.string_or_empty(obj.fwd_curve);
  }

  //
  //
  // time-dependent terms and conditions
  //
  //
  function make_conditions(obj) {
    //condition dates
    let conditions_valid_until = library.date_vector_or_null(
      obj.conditions_valid_until,
    );
    if (
      conditions_valid_until &&
      conditions_valid_until[conditions_valid_until.length - 1].getTime() !==
        specs.maturity.getTime()
    ) {
      throw new Error(
        "cashflow_generator: last date provided under conditions_valid_until must match maturity",
      );
    }

    if (!conditions_valid_until) {
      conditions_valid_until = [specs.maturity];
    }
    const fixed_rate = library.number_vector_or_null(obj.fixed_rate) || [0.0]; //array valued
    const float_spread = library.number_vector_or_null(obj.float_spread) || [0];
    const cap_rate = library.number_vector_or_null(obj.cap_rate) || [Infinity];
    const floor_rate = library.number_vector_or_null(obj.floor_rate) || [
      -Infinity,
    ];

    const repay_amount = library.number_vector_or_null(obj.repay_amount) || [0]; //array valued

    const interest_capitalization = library.make_bool_vector(
      obj.interest_capitalization,
    );

    conditions = new Array(conditions_valid_until.length);
    for (let i = 0; i < conditions_valid_until.length; i++) {
      conditions[i] = {
        valid_until: conditions_valid_until[i],
        fixed_rate: fixed_rate[Math.min(i, fixed_rate.length - 1)],
        float_spread: float_spread[Math.min(i, float_spread.length - 1)],
        cap_rate: cap_rate[Math.min(i, cap_rate.length - 1)],
        floor_rate: floor_rate[Math.min(i, floor_rate.length - 1)],
        repay_amount: repay_amount[Math.min(i, repay_amount.length - 1)],
        interest_capitalization:
          interest_capitalization[
            Math.min(i, interest_capitalization.length - 1)
          ],
      };
    }
  }

  //
  //
  // main interest rate schedule
  //
  //
  function make_schedule() {
    schedule = library.schedule(
      specs.effective_date,
      specs.maturity,
      specs.tenor,
      specs.adj,
      specs.first_date,
      specs.next_to_last_date,
      specs.stub_end,
      specs.stub_long,
    );
  }

  //
  //
  // repay schedule
  //
  //
  function make_repay_schedule(obj) {
    // check if instrument is amortizing at all
    let is_amortizing = specs.linear_amortization;
    for (const c of conditions) {
      if (c.repay_amount !== 0 || c.interest_capitalization === true) {
        is_amortizing = true;
        break;
      }
    }

    // trivial schedule for non amortizing instruments
    if (!is_amortizing) {
      repay_schedule = [schedule[0], specs.maturity];
      return;
    }

    // construct repay schedule
    let repay_tenor = library.natural_number_or_null(obj.repay_tenor);
    if (null === repay_tenor) repay_tenor = specs.tenor;

    const repay_first_date =
      library.date_or_null(obj.repay_first_date) || specs.first_date;
    const repay_next_to_last_date =
      library.date_or_null(obj.repay_next_to_last_date) ||
      specs.next_to_last_date;
    const repay_stub_end = specs.stub_end || false;
    const repay_stub_long = specs.stub_long || false;

    repay_schedule = library.schedule(
      schedule[0],
      specs.maturity,
      repay_tenor,
      specs.adj,
      repay_first_date,
      repay_next_to_last_date,
      repay_stub_end,
      repay_stub_long,
    );

    // calculate repay amount in case of linear amortization
    if (specs.linear_amortization) {
      const repay_amount =
        Math.abs(specs.notional) / (repay_schedule.length - 1);

      for (const c of conditions) c.repay_amount = repay_amount;
    }
  }
  //
  //
  // fixing schedule
  //
  //
  function make_fixing_schedule(obj) {
    if (!specs.is_float) {
      fixing_schedule = [schedule[0], specs.maturity];
    }
    let fixing_tenor = library.natural_number_or_null(obj.fixing_tenor);
    if (null === fixing_tenor) fixing_tenor = specs.tenor;

    const fixing_first_date =
      library.date_or_null(obj.fixing_first_date) || specs.first_date;
    const fixing_next_to_last_date =
      library.date_or_null(obj.fixing_next_to_last_date) ||
      specs.next_to_last_date;
    const fixing_stub_end = obj.fixing_stub_end || false;
    const fixing_stub_long = obj.fixing_stub_long || false;

    fixing_schedule = library.schedule(
      schedule[0],
      specs.maturity,
      fixing_tenor,
      specs.adj,
      fixing_first_date,
      fixing_next_to_last_date,
      fixing_stub_end,
      fixing_stub_long,
    );
  }

  //
  //
  // timeline of all dates
  //
  //
  function make_timeline() {
    const result = new Set();
    for (const dt of schedule) result.add(dt.getTime());
    for (const dt of repay_schedule) result.add(dt.getTime());
    for (const dt of fixing_schedule) result.add(dt.getTime());
    for (const c of conditions) result.add(c.valid_until.getTime());
    timeline = Array.from(result);
    timeline.sort((a, b) => a - b);
    timeline = timeline.map((t) => new Date(t));
  }

  //
  //
  // helper functions
  //
  //
  function pay_notional(date_pmt, notional) {
    const type = "notional";
    const date_value = date_pmt;
    return { date_pmt, date_value, notional, type };
  }

  function pay_interest(
    notional,
    date_start,
    date_end,
    date_pmt,
    reset_start,
    reset_end,
    current_conditions,
  ) {
    const date_value = date_pmt;
    const dcc = specs.dcc;
    const res = { notional, date_start, date_end, date_pmt, date_value, dcc };
    if (current_conditions.interest_capitalization) res.capitalize = true;
    if (!specs.is_float) {
      // fixed payment
      res.type = "fixed";
      res.rate = current_conditions.fixed_rate;
      return res;
    }
    // float payment
    const { float_spread, cap_rate, floor_rate } = current_conditions;
    res.reset_start = reset_start;
    res.reset_end = reset_end;
    res.spread = float_spread;
    res.index = "index";

    // fixing
    if (reset_start <= library.valuation_date) {
      res.is_fixed = true;
      res.rate = specs.float_current_rate + float_spread;
    } else {
      res.is_fixed = false;
    }

    // cap and floor
    if (cap_rate === Infinity && floor_rate === -Infinity) {
      res.type = "float";
    } else {
      res.type = "float_cap_floor";
      res.cap_rate = cap_rate;
      res.floor_rate = floor_rate;
    }

    return res;
  }

  //
  //
  // main cash flow generation routine
  //
  //
  library.cashflow_generator = function (obj) {
    // initialise
    make_specs(obj);
    make_conditions(obj);
    make_schedule();
    make_repay_schedule(obj);
    make_fixing_schedule(obj);
    make_timeline();

    // start generating the leg
    const cashflows = [];
    let date_start = timeline.shift();
    let date_last_fixing = date_start;
    // add outflow in the beginning
    let notional = specs.notional;
    if (specs.notional_exchange)
      cashflows.push(pay_notional(date_start, -notional));

    // loop through timeline
    while (timeline.length >= 1) {
      // erase dates as soon as we reach them
      if (schedule[0].getTime() <= date_start.getTime()) schedule.shift();
      if (repay_schedule[0].getTime() <= date_start.getTime())
        repay_schedule.shift();
      if (fixing_schedule[0].getTime() <= date_start.getTime())
        date_last_fixing = fixing_schedule.shift();
      if (conditions[0].valid_until.getTime() <= date_start.getTime())
        conditions.shift();

      // get next dates and current conditions
      const date_end = timeline[0];
      const date_next_int = schedule[0];
      const date_next_repay = repay_schedule[0];
      const date_next_fixing = fixing_schedule[0];
      const current_conditions = conditions[0];

      // make interest rate payment
      cashflows.push(
        pay_interest(
          notional,
          date_start,
          date_end,
          date_next_int,
          date_last_fixing,
          date_next_fixing,
          current_conditions,
        ),
      );

      // make notional payments if needed. Do not worry about overpayments with capitalization. This is handled by the leg class.
      let n = 0;
      if (
        specs.notional_exchange &&
        date_end.getTime() === date_next_repay.getTime()
      ) {
        if (timeline.length === 1) {
          // pay full outstanding notional on the last date of the timeline.
          n = notional;
        } else {
          // pay according to current repayment conditions
          n = current_conditions.repay_amount;
        }
      }

      if (n != 0) {
        cashflows.push(pay_notional(date_next_repay, n));
        notional -= n;
      }

      // move to next date
      date_start = timeline.shift();
    }

    // adjust dates
    for (const c of cashflows) {
      c.date_pmt = specs.adj(c.date_pmt);
      if (specs.adjust_accrual_periods) {
        c.date_value = specs.adj(c.date_value);
        if (c.date_start) c.date_start = specs.adj(c.date_start);
        if (c.date_end) c.date_end = specs.adj(c.date_end);
        if (c.reset_start) c.reset_start = specs.adj(c.reset_start);
        if (c.reset_end) c.reset_end = specs.adj(c.reset_end);
      }
    }

    return {
      payments: cashflows,
      disc_curve: library.string_or_empty(obj.disc_curve),
      spread_curve: library.string_or_empty(obj.spread_curve),
      residual_spread: library.number_or_null(obj.residual_spread) || 0.0,
    };
  };
})(this.JsonRisk || module.exports);
