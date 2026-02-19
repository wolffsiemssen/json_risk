/*!
	JSON Risk
	v1.0.1
	https://github.com/wolffsiemssen/json_risk
	License: MIT
*/

/**
 * @namespace JsonRisk
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
  let valuation_date = null;
  const JsonRisk = {
    /**
     * @type {Date}
     * @description Gets the library's current valution date if set.
     * @memberof JsonRisk
     */
    get valuation_date() {
      if (!(valuation_date instanceof Date))
        throw new Error("JsonRisk: valuation_date must be set");
      return valuation_date;
    },
  };

  /**
   * @function
   * @description Sets the library's valuation date.
   * @param {Date|string} d - The Date to set, if a string is supplied, it is converted to a date if possible.
   * @memberof JsonRisk
   */
  JsonRisk.set_valuation_date = function (d) {
    valuation_date = JsonRisk.date_or_null(d);
    if (null === valuation_date)
      throw new Error("JsonRisk: trying to set invalid valuation_date");
  };

  return JsonRisk;
});
(function (library) {
  /**
   * @function
   * @desc Takes any value and turns it into a boolean. When a string is entered, returns true if it can be converted into a number other than zero or if it contains "true", "yes", "t" or "y", each case insensitive. Returns false otherwise. Does not throw.
   * @param {boolean} b
   * @returns {boolean} boolean vector
   * @memberof JsonRisk
   */
  library.make_bool = function (b) {
    if (typeof b === "boolean") return b;
    if (typeof b === "number") return b !== 0;
    if (typeof b === "string") {
      const n = Number(b.trim()).valueOf();
      if (0 === n) return false;
      if (!isNaN(n)) return true;
      const s = b.trim().toLowerCase();
      if (s === "true" || s === "yes" || s === "t" || s === "y") return true;
      return false;
    }
    return false;
  };

  /**
   * @function
   * @desc Takes any value and converts it into a vector of booleans without throwing. Strings like "true true false" are split by spaces. If the value cannot be converted, returns single-entry array [false].
   * @param {boolean} b
   * @returns {boolean} boolean vector
   * @memberof JsonRisk
   */
  library.make_bool_vector = function (b) {
    if (typeof b === "boolean") return [b];
    if (typeof b === "number") return [b !== 0];
    let res;
    if (typeof b === "string") {
      res = b.split(/\s+/);
    } else if (Array.isArray(b)) {
      res = b.slice();
    } else {
      return [false];
    }
    for (let i = 0; i < res.length; i++) {
      res[i] = library.make_bool(res[i]);
    }
    return res;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * @desc calculates the time in years from a given period string
   * @param {string} str time string (xY, xM, xW, xD)
   * @returns {number} time in years
   * @memberof JsonRisk
   */
  library.period_str_to_time = function (str) {
    const num = parseInt(str, 10);
    if (isNaN(num))
      throw new Error(
        "period_str_to_time - Invalid time period string: " + str,
      );
    const unit = str.charAt(str.length - 1);
    if (unit === "Y" || unit === "y") return num;
    if (unit === "M" || unit === "m") return num / 12;
    if (unit === "W" || unit === "w") return num / 52;
    if (unit === "D" || unit === "d") return num / 365;
    throw new Error("period_str_to_time - Invalid time period string: " + str);
  };

  /**
   * @desc constructs a javascript date object from a JSON risk conformant date string
   * @param {string} str date string
   * @returns {date} javascript date object
   * @memberof JsonRisk
   */
  library.date_str_to_date = function (str) {
    let rr = null,
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
      throw new Error("date_str_to_time - Invalid date string: " + str);
    if (m < 0 || m > 11)
      throw new Error(
        "date_str_to_time - Invalid month in date string: " + str,
      );
    const days_in_month = new Date(y, m + 1, 0).getDate();
    if (d < 0 || d > days_in_month)
      throw new Error("date_str_to_time - Invalid day in date string: " + str);
    return new Date(Date.UTC(y, m, d));
  };

  /**
   * @desc constructs a JSON risk conformant date string YYYY-MM-DD from a javascript date object or another JSON risk conformant date string
   * @param {date} date object
   * @returns {string} date string
   * @memberof JsonRisk
   */
  library.date_to_date_str = function (d) {
    const dobj = library.date_or_null(d);
    if (null === dobj) throw new Error("date_to_date_str: invalid input.");
    return dobj.toISOString().slice(0, 10);
  };

  /**
   * @desc takes a valid date string, a javascript date object, or a falsy value and returns a javascript date object or null. Normalises non-utc dates. Throws on invalid types (if not falsy) and nonempty date strings
   * @param {date} d
   * @returns {date} javascript date object
   * @memberof JsonRisk
   */
  library.date_or_null = function (d) {
    if (!d) return null;
    if (d instanceof Date) {
      const h = d.getUTCHours();
      if (h === 0) return d;
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      let t = d.getUTCDate();
      if (h > 11) t++; // advance to next day UTC 0:00 date
      return new Date(Date.UTC(y, m, t));
    }
    if (d instanceof String || typeof d === "string")
      return library.date_str_to_date(d);
    throw new Error("date_or_null: invalid input.");
  };

  /**
   * @desc takes a valid date string, or a javascript date object and returns a javascript date object or null. Normalises non-utc dates. Throws on invalid input
   * @param {date} d
   * @returns {date} javascript date object
   * @memberof JsonRisk
   */
  library.date_or_throw = function (d) {
    const date_or_null = library.date_or_null(d);
    if (null === date_or_null) throw new Error("date_or_throw: invalid input");
    return date_or_null;
  };

  /**
   * get a vector of dates when vector of dates, vector of date strings or space sepatated list of date strings is entered. Returns null otherwise but throws on invalid or empty date strings
   * @param {date} d
   * @returns {number} array of javascript date objects
   * @memberof JsonRisk
   */
  library.date_vector_or_null = function (d) {
    if (d instanceof Date) return [library.date_or_throw(d)];
    let res;
    if (typeof d === "string") {
      res = d.split(/\s+/);
    } else if (Array.isArray(d) && d.length > 0) {
      res = d.slice();
    } else {
      return null;
    }
    for (let i = 0; i < res.length; i++) {
      res[i] = library.date_or_null(res[i]);
      if (null === res[i])
        throw new Error("date_vector_or_null: invalid input");
    }
    return res;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * @desc read instrument type for given instrument and create instrument object
   * @param {object} obj any instrument JSON
   * @returns {object} instrument class object
   * @memberof JsonRisk
   */
  library.make_instrument = function (obj) {
    switch (obj.type.toLowerCase()) {
      case "bond":
        return new library.Bond(obj);
      case "floater":
        return new library.Floater(obj);
      case "swap":
        return new library.Swap(obj);
      case "swaption":
        return new library.Swaption(obj);
      case "fxterm":
        return new library.FxTerm(obj);
      case "callable_bond":
        return new library.CallableBond(obj);
      case "equity":
        return new library.Equity(obj);
      case "equity_future":
        return new library.EquityFuture(obj);
      case "equity_forward":
        return new library.EquityForward(obj);
      case "equity_option":
        return new library.EquityOption(obj);
      case "cds":
        return new library.CreditDefaultSwap(obj);
      default:
        throw new Error("make_instrument: invalid instrument type");
    }
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * @desc Returns a number if a valid number or numeric string is entered and null otherwise, does not throw
   * @param {number} n
   * @returns {number} number
   * @memberof JsonRisk
   */
  library.number_or_null = function (n) {
    if (typeof n === "number") return n;
    if (typeof n === "string") {
      n = n.trim();
      let res = parseFloat(n);
      if (isNaN(res)) return null;
      if (n.charAt(n.length - 1) === "%") res *= 0.01;
      return res;
    }
    return null;
  };
  /**
   * @desc Returns positive number if a valid positive number or numeric string is entered and null otherwise, does not throw
   * @param {number} n
   * @returns {number} number
   * @memberof JsonRisk
   */
  library.positive_number_or_null = function (n) {
    const res = library.number_or_null(n);
    if (res <= 0) return null;
    return res;
  };
  /**
   * @desc Returns natural number, zero allowed, if a valid natural number or numeric string is entered and null otherwise, does not throw
   * @param {natural} n
   * @returns {natural} natural vector
   * @memberof JsonRisk
   */
  library.natural_number_or_null = function (n) {
    const res = library.number_or_null(n);
    if (res < 0 || res !== Math.floor(res)) return null;
    return res;
  };
  /**
   * @desc Returns vector of numbers when vector of numbers, vector of numeric strings or space sepatated string is entered. Returns null otherwise
   * @param {number} n
   * @returns {number} number vector
   * @memberof JsonRisk
   */
  library.number_vector_or_null = function (n) {
    if (typeof n === "number") return [n];
    let res;
    if (typeof n === "string") {
      res = n.split(/\s+/);
    } else if (Array.isArray(n)) {
      res = n.slice();
    } else {
      return null;
    }
    for (let i = 0; i < res.length; i++) {
      res[i] = library.number_or_null(res[i]);
      if (null === res[i])
        throw new Error("number_vector_or_null: invalid input");
    }
    return res;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * @desc read surface type for given surface and create surface object
   * @param {object} obj any surface JSON
   * @returns {object} surface class object
   * @memberof JsonRisk
   */
  library.make_surface = function (obj) {
    switch (obj.type.toLowerCase()) {
      case "expiry_rel_strike":
        return new library.ExpiryRelStrikeSurface(obj);
      case "expiry_abs_strike":
        return new library.ExpiryAbsStrikeSurface(obj);
      default:
        return new library.Surface(obj);
    }
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * read payment type for given payment and create payment object
   * @param {object} obj any payment JSON
   * @returns {object} payment class object
   * @memberof JsonRisk
   */
  library.make_payment = function (obj) {
    if (obj instanceof library.NotionalPayment) return obj; // all leg payment types inherit from NotionalPayment
    switch (obj.type.toLowerCase()) {
      case "notional":
        return new library.NotionalPayment(obj);
      case "fixed":
        return new library.FixedRatePayment(obj);
      case "float":
        return new library.FloatRatePayment(obj);
      default:
        throw new Error("make_payment: invalid payment type");
    }
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * @desc Returns a reference to the argument if the argument is a string, and an empty string otherwise
   * @param {any} input argument that is typically expected to be a string
   * @returns {string} the argument itself, or an empty string
   * @memberof JsonRisk
   */
  library.string_or_empty = function (input) {
    if (typeof input === "string") return input;
    return "";
  };

  /**
   * @desc Returns a reference to the argument if the argument is a string, and fallback string otherwise
   * @param {any} input that is typically expected to be a string
   * @param {string} fallback the fallback to return
   * @returns {string} the argument itself, or the fallback
   * @memberof JsonRisk
   */
  library.string_or_fallback = function (input, fallback) {
    if (typeof input === "string") return input;
    if (typeof fallback !== "string")
      throw new Error("string_or_fallback: fallback must be a string");
    return fallback;
  };

  /**
   * @desc Returns a reference to the argument if the argument is a string, and throws the supplied error message otherwise
   * @param {any} input that is typically expected to be a string
   * @param {string} message the message to throw
   * @returns {string} the argument supplied if it is a string
   * @memberof JsonRisk
   */
  library.string_or_throw = function (input, message) {
    if (typeof input !== "string") throw new Error(message);
    return input;
  };

  /**
   * @desc Returns a reference to the argument if the argument is a nonempty string, and throws the supplied error message otherwise
   * @param {any} input that is typically expected to be a string
   * @param {string} message the message to throw
   * @returns {string} the argument supplied if it is a nonempty string
   * @memberof JsonRisk
   */
  library.nonempty_string_or_throw = function (input, message) {
    if (typeof input !== "string") throw new Error(message);
    if ("" === input) throw new Error(message);
    return input;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  class Instrument {
    static type = "Instrument";
    #currency = "";
    #quantity = 1.0;

    constructor(obj) {
      this.#currency = library.string_or_empty(obj.currency);

      if ("quantity" in obj) {
        let q = library.number_or_null(obj.quantity);
        if (null != q) this.#quantity = q;
      }
    }

    get currency() {
      return this.#currency;
    }

    get quantity() {
      return this.#quantity;
    }

    add_deps_impl(deps_not_used) {
      throw new Error("add_deps_impl: not implemented for class Instrument");
    }

    add_deps(deps) {
      if (!(deps instanceof library.Deps))
        throw new Error("add_deps: deps must be of type Deps");
      if (this.#currency != "") deps.add_currency(this.#currency);
      this.add_deps_impl(deps);
    }

    value_impl(params_not_used, extras_not_used) {
      throw new Error("value_impl: not implemented for class Instrument");
    }

    value(params, extras) {
      const p =
        params instanceof library.Params ? params : new library.Params(params);

      // call sub-class valuation function
      let val = this.value_impl(p, extras);

      // apply instument quantity
      val *= this.quantity;

      // apply fx rate if applicable
      if ("" != this.#currency) {
        const fx = p.get_fx_rate(this.#currency, p.main_currency);
        val *= fx;
      }

      return val;
    }
  }

  library.Instrument = Instrument;
})(this.JsonRisk || module.exports);
(function (library) {
  class LegInstrument extends library.Instrument {
    #legs = [];
    #acquire_date = new Date(Date.UTC(0, 0, 1));

    constructor(obj) {
      super(obj);

      if ("legs" in obj && Array.isArray(obj.legs)) {
        this.#legs = obj.legs.map((legobj) => {
          return new library.Leg(legobj);
        });
        Object.freeze(this.#legs);
      }

      const ad = library.date_or_null(obj.acquire_date);
      if (null !== ad) this.#acquire_date = ad;
    }

    get legs() {
      return this.#legs;
    }

    get acquire_date() {
      return this.#acquire_date;
    }

    add_deps_impl(deps) {
      for (const leg of this.#legs) {
        leg.add_deps(deps);
      }
    }

    value_impl(params, extras_not_used) {
      let res = 0;
      for (const leg of this.#legs) {
        let lv = leg.value(params, this.#acquire_date);
        if ("" != this.currency && "" != leg.currency) {
          const fx = params.get_fx_rate(leg.currency, this.currency);
          lv *= fx;
        }
        res += lv;
      }
      return res;
    }
  }

  library.LegInstrument = LegInstrument;
})(this.JsonRisk || module.exports);
(function (library) {
  class Bond extends library.LegInstrument {
    constructor(obj) {
      if (!Array.isArray(obj.legs)) {
        // fixed rate must be set either as a number or as a vector
        const f = library.number_vector_or_null(obj.fixed_rate);
        if (null === f) throw new Error("Bond: must have fixed rate set");

        // generate leg from terms and conditions
        const leg = library.cashflow_generator(obj);

        // create shallow copy and leave original object unchanged
        const tempobj = Object.assign({ legs: [leg] }, obj);
        super(tempobj);

        // update notionals
        this.legs[0].update_notionals();
      } else {
        super(obj);
      }

      // sanity checks
      if (1 !== this.legs.length)
        throw new Error("Bond: must have exactly one leg");

      const leg = this.legs[0];
      if (leg.has_float_rate_payments)
        throw new Error("Bond: cannot have float rate payments");
      if (false === leg.has_notional_payments)
        throw new Error("Bond: must have notional payments");
    }

    get fixed_rate() {
      //returns first rate on the leg
      for (const p of this.legs[0].payments) {
        if (p instanceof library.FixedRatePayment) {
          return p.rate;
        }
      }
      throw new Error(
        "Bond: cannot retrieve fixed rate, bond has no rate payments",
      );
    }

    fair_rate_or_spread(params) {
      // returns the rate this bond would have to carry in order to have a par valuation
      return this.legs[0].fair_rate_or_spread(params);
    }

    annuity(params) {
      // returns fixed rate annuity
      return this.legs[0].annuity(params);
    }
  }

  library.Bond = Bond;
})(this.JsonRisk || module.exports);
(function (library) {
  class CallableBond extends library.Bond {
    #call_schedule = null;
    #mean_reversion = 0.0;
    #hull_white_volatility = null;
    #opportunity_spread = 0.0;
    #exclude_base = false;
    #basket = null;
    #surface = "";
    #fwd_curve = "";
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
(function (library) {
  class CreditDefaultSwap extends library.LegInstrument {
    #survival_curve = "";
    #accrual_on_default = false;
    #recovery_rate = 0.0;

    constructor(obj) {
      if (!Array.isArray(obj.legs)) {
        // generate leg from terms and conditions
        const fixed_rate = library.number_or_null(obj.fixed_rate);
        if (null === fixed_rate)
          throw new Error("CreditDefaultSwap: must provide fixed rate");
        const leg = library.cashflow_generator({
          notional: obj.notional,
          notional_exchange: false, // no notional exchange
          maturity: obj.maturity,
          effective_date: obj.effective_date,
          first_date: obj.first_date,
          next_to_last_date: obj.next_to_last_date,
          fixed_rate: fixed_rate,
          tenor: obj.tenor,
          calendar: obj.calendar,
          bdc: obj.bdc,
          dcc: obj.dcc,
          adjust_accrual_periods: obj.adjust_accrual_periods,
          disc_curve: obj.disc_curve,
        });

        // for standard CDS, the last accrual period extends one day longer
        const last_payment = leg.payments[leg.payments.length - 1];
        if (last_payment.date_end) {
          last_payment.date_end = library.add_days(last_payment.date_end, 1);
        }

        // create shallow copy and leave original object unchanged
        const tempobj = Object.assign({ legs: [leg] }, obj);
        super(tempobj);
      } else {
        super(obj);
      }
      if (1 !== this.legs.length)
        throw new Error("CreditDefaultSwap: must have exactly one leg");

      this.#survival_curve = library.string_or_empty(obj.survival_curve);
      this.#accrual_on_default = library.make_bool(obj.accrual_on_default);
      this.#recovery_rate = library.number_or_null(obj.recovery_rate);
      if (this.#recovery_rate === null)
        throw new Error("CreditDefaultSwap: must specify recovery rate");
      if (this.#recovery_rate < 0 || this.#recovery_rate > 1)
        throw new Error("CreditDefaultSwap: invalid recovery rate");
    }

    add_deps_impl(deps) {
      super.add_deps_impl(deps);
      if ("" != this.#survival_curve) deps.add_curve(this.#survival_curve);
    }

    value_impl(params, extras_not_used) {
      const dc = params.get_curve(this.legs[0].disc_curve);
      const sc = params.get_curve(this.#survival_curve);
      const isda = new library.IsdaCdsModel(dc, sc);

      let pv_premium = 0;
      let n = this.legs[0].payments.length;
      for (let i = 0; i < n; i++) {
        const p = this.legs[0].payments[i];
        if (!(p instanceof library.FixedRatePayment)) continue;
        const { date_pmt, date_end, date_value } = p;
        if (date_pmt <= library.valuation_date) continue;

        const t_pmt = library.time_from_now(date_pmt);
        const t_end =
          (i === n
            ? library.time_from_now(date_end)
            : library.time_from_now(date_value)) -
          1.0 / 365.0;

        const disc_factor = dc.get_df(t_pmt);
        const survival_prob = t_end > 0 ? sc.get_df(t_end) : 1.0;

        pv_premium += p.amount * disc_factor * survival_prob;

        if (this.#accrual_on_default) {
          const aod = isda.accrual_on_default_pv(p);
          pv_premium += aod;
        }
      }

      const notional = this.legs[0].payments[0].notional;
      const recovery_rate = this.#recovery_rate;
      let date_start = this.legs[0].payments[0].date_start;
      if (date_start < library.valuation_date)
        date_start = library.valuation_date;
      const date_end =
        this.legs[0].payments[this.legs[0].payments.length - 1].date_end;
      const pv_protection = isda.protection_pv({
        notional,
        recovery_rate,
        date_start,
        date_end,
      });

      return pv_protection - pv_premium;
    }
  }

  library.CreditDefaultSwap = CreditDefaultSwap;
})(this.JsonRisk || module.exports);
(function (library) {
  class Equity extends library.Instrument {
    #quote = "";
    #disc_curve = "";
    #spot_days = 0;
    #calendar = null;
    #is_holiday_func = null;
    constructor(obj) {
      super(obj);
      this.#quote = library.string_or_empty(obj.quote);
      this.#disc_curve = library.string_or_empty(obj.disc_curve);
      this.#spot_days = library.natural_number_or_null(obj.spot_days) || 0;
      this.#calendar = library.string_or_empty(obj.calendar);
      this.#is_holiday_func = library.is_holiday_factory(this.#calendar);
    }

    get quote() {
      return this.#quote;
    }

    get disc_curve() {
      return this.#disc_curve;
    }

    get spot_days() {
      return this.#spot_days;
    }

    spot_date() {
      return library.add_business_days(
        library.valuation_date,
        this.#spot_days,
        this.#is_holiday_func,
      );
    }

    forward(spot, fwd_date, disc_curve, repo_curve) {
      const tspot = library.time_from_now(this.spot_date());
      const tfwd = library.time_from_now(fwd_date);
      const discounted_spot = spot * disc_curve.get_df(tspot);
      const res = discounted_spot / repo_curve.get_df(tfwd);
      return res;
    }

    add_deps_impl(deps) {
      deps.add_scalar(this.#quote);
      if ("" != this.#disc_curve) deps.add_curve(this.#disc_curve);
    }

    value_impl(params, extras_not_used) {
      const quote = params.get_scalar(this.#quote);
      if ("" == this.#disc_curve) return quote.get_value();
      const spot_date = this.spot_date();

      const dc = params.get_curve(this.#disc_curve);
      const discounted_quote =
        quote.get_value() * dc.get_df(library.time_from_now(spot_date));
      return discounted_quote;
    }
  }

  library.Equity = Equity;
})(this.JsonRisk || module.exports);
(function (library) {
  class EquityForward extends library.Equity {
    #expiry = null;
    #repo_curve = "";
    #price = 0.0;
    constructor(obj) {
      super(obj);
      this.#expiry = library.date_or_null(obj.expiry);
      this.#repo_curve = library.string_or_empty(obj.repo_curve);
      this.#price = library.number_or_null(obj.price) || 0.0;
    }

    get repo_curve() {
      return this.#repo_curve;
    }

    add_deps_impl(deps) {
      super.add_deps_impl(deps);
      if ("" != this.#repo_curve) deps.add_curve(this.#repo_curve);
    }

    value_impl(params, extras_not_used) {
      if (library.valuation_date >= this.#expiry) return 0.0;
      const quote = params.get_scalar(this.quote);
      const dc = params.get_curve(this.disc_curve);
      const rc = this.#repo_curve ? params.get_curve(this.#repo_curve) : dc;

      const forward = this.forward(quote.get_value(), this.#expiry, dc, rc);
      return (
        (forward - this.#price) * dc.get_df(library.time_from_now(this.#expiry))
      );
    }
  }

  library.EquityForward = EquityForward;
})(this.JsonRisk || module.exports);
(function (library) {
  class EquityFuture extends library.Equity {
    #expiry = null;
    #repo_curve = "";
    #price = 0.0;
    constructor(obj) {
      super(obj);
      this.#expiry = library.date_or_null(obj.expiry);
      this.#repo_curve = library.string_or_empty(obj.repo_curve);
      this.#price = library.number_or_null(obj.price) || 0.0;
    }

    get repo_curve() {
      return this.#repo_curve;
    }

    add_deps_impl(deps) {
      super.add_deps_impl(deps);
      if ("" != this.#repo_curve) deps.add_curve(this.#repo_curve);
    }

    value_impl(params, extras_not_used) {
      if (library.valuation_date >= this.#expiry) return 0.0;
      const quote = params.get_scalar(this.quote);
      const dc = params.get_curve(this.disc_curve);
      const rc = this.#repo_curve ? params.get_curve(this.#repo_curve) : dc;

      const forward = this.forward(quote.get_value(), this.#expiry, dc, rc);
      return forward - this.#price;
    }
  }

  library.EquityFuture = EquityFuture;
})(this.JsonRisk || module.exports);
(function (library) {
  class EquityOption extends library.Equity {
    #expiry = null;
    #repo_curve = "";
    #surface = "";
    #strike = 0.0;
    #is_call = true;
    constructor(obj) {
      super(obj);
      this.#expiry = library.date_or_null(obj.expiry);
      this.#repo_curve = library.string_or_empty(obj.repo_curve);
      this.#surface = library.string_or_empty(obj.surface);
      this.#strike = library.number_or_null(obj.strike) || 0.0;
      this.#is_call = library.make_bool(obj.is_call);
    }

    get repo_curve() {
      return this.#repo_curve;
    }

    add_deps_impl(deps) {
      super.add_deps_impl(deps);
      if ("" != this.#repo_curve) deps.add_curve(this.#repo_curve);
      if ("" != this.#surface) deps.add_surface(this.#surface);
    }

    value_impl(params, extras_not_used) {
      if (library.valuation_date >= this.#expiry) return 0.0;
      const quote = params.get_scalar(this.quote);
      const dc = params.get_curve(this.disc_curve);
      const rc = this.#repo_curve ? params.get_curve(this.#repo_curve) : dc;
      const surface = params.get_surface(this.#surface);

      const forward = this.forward(quote.get_value(), this.#expiry, dc, rc);
      const t = library.time_from_now(this.#expiry);
      const vol = surface.get_rate(t, null, forward, this.#strike);

      const model = new library.BlackModel(t, vol);
      const val = this.#is_call
        ? model.call_price(forward, this.#strike)
        : model.put_price(forward, this.#strike);
      return val * dc.get_df(t);
    }
  }

  library.EquityOption = EquityOption;
})(this.JsonRisk || module.exports);
(function (library) {
  class Floater extends library.LegInstrument {
    constructor(obj) {
      if (!Array.isArray(obj.legs)) {
        // create shallow copy and leave original object unchanged
        const tempobj = Object.assign({}, obj);

        // remove fixed_rate so cash flow generator generates floating leg
        delete tempobj.fixed_rate;

        // generate leg from terms and conditions
        const leg = library.cashflow_generator(tempobj);

        // make simple index
        const index = {
          fwd_curve: obj.fwd_curve,
          surface: obj.surface,
          dcc: obj.dcc,
        };

        // attach index to leg json
        leg.indices = { index: index };

        // attach leg to instrument json
        tempobj.legs = [leg];

        super(tempobj);

        // update notionals
        this.legs[0].update_notionals();
      } else {
        super(obj);
      }

      // sanity checks
      if (1 !== this.legs.length)
        throw new Error("Floater: must have exactly one leg");

      const leg = this.legs[0];
      if (leg.has_fixed_rate_payments)
        throw new Error("Floater: cannot have fixed rate payments");

      if (false === leg.has_notional_payments)
        throw new Error("Floater: must have notional payments");
    }

    fair_rate_or_spread(params) {
      // returns the spread rate this bond would have to carry in order to have a par valuation
      return this.legs[0].fair_rate_or_spread(params);
    }

    annuity(params) {
      // returns spread rate annuity
      return this.legs[0].annuity(params);
    }
  }

  library.Floater = Floater;
})(this.JsonRisk || module.exports);
(function (library) {
  class FxTerm extends library.LegInstrument {
    constructor(obj) {
      if (!Array.isArray(obj.legs)) {
        // generate leg from terms and conditions, only one single currency leg with near and optonally far payment supported
        const leg = {
          currency: obj.currency,
          disc_curve: obj.disc_curve,
          payments: [],
        };

        // near payment
        leg.payments.push({
          type: "notional",
          notional: obj.notional,
          date_pmt: obj.maturity,
        });

        // far payment
        if (
          typeof obj.notional_2 === "number" &&
          library.date_or_null(obj.maturity_2)
        ) {
          leg.payments.push({
            type: "notional",
            notional: obj.notional_2,
            date_pmt: obj.maturity_2,
          });
        }

        // create shallow copy with leg and call constructor
        const tempobj = Object.assign({ legs: [leg] }, obj);
        super(tempobj);
      } else {
        super(obj);
      }

      // consistency checks
      if (1 !== this.legs.length && 2 !== this.legs.length)
        throw new Error("FxTerm: must have one or two legs");

      if (
        2 === this.legs.length &&
        this.legs[0].currency === this.legs[1].currency
      ) {
        throw new Error("FxTerm: Legs must have different currencies.");
      }
    }
  }

  library.FxTerm = FxTerm;
})(this.JsonRisk || module.exports);
(function (library) {
  class Swap extends library.LegInstrument {
    #fixed_leg = null;
    #float_leg = null;
    constructor(obj) {
      if (!Array.isArray(obj.legs)) {
        // generate legs from terms and conditions
        const phi = library.make_bool(obj.is_payer) ? -1 : 1;
        const fixed_leg = library.cashflow_generator({
          notional: obj.notional * phi,
          notional_exchange: false,
          maturity: obj.maturity,
          fixed_rate: obj.fixed_rate,
          tenor: obj.tenor,
          effective_date: obj.effective_date,
          calendar: obj.calendar,
          bdc: obj.bdc,
          dcc: obj.dcc,
          adjust_accrual_periods: obj.adjust_accrual_periods,
          disc_curve: obj.disc_curve || "",
        });

        const float_leg = library.cashflow_generator({
          notional: -obj.notional * phi,
          notional_exchange: false,
          maturity: obj.maturity,
          float_spread: obj.float_spread,
          tenor: obj.float_tenor,
          effective_date: obj.effective_date,
          calendar: obj.calendar,
          bdc: obj.float_bdc,
          dcc: obj.float_dcc,
          float_current_rate: obj.float_current_rate,
          adjust_accrual_periods: obj.adjust_accrual_periods,
          disc_curve: obj.disc_curve || "",
          fwd_curve: obj.fwd_curve || "",
        });

        const index = {
          fwd_curve: obj.fwd_curve,
          surface: obj.surface,
          dcc: obj.dcc,
        };

        float_leg.indices = { index: index };

        // create shallow copy and leave original object unchanged
        const tempobj = Object.assign({ legs: [fixed_leg, float_leg] }, obj);
        super(tempobj);
      } else {
        super(obj);
      }

      if (2 !== this.legs.length)
        throw new Error("Swap: must have exactly two legs");

      // inspect legs and decide if this is a fix-float-swap (one purely fixed leg, one purely floating leg) which allows derivation of a fair rate
      for (const leg of this.legs) {
        if (leg.has_capitalization)
          throw new Error("Swap: Cannot have capitalizing rate payments");
        const is_fix = leg.has_fixed_rate_payments;
        const is_float = leg.has_float_rate_payments;
        if (is_fix === true && is_float === false) this.#fixed_leg = leg;
        if (is_fix === false && is_float === true) this.#float_leg = leg;
      }

      if (null === this.#fixed_leg || null === this.#float_leg) {
        throw new Error(
          "Swap: must have one purely fix and one purely float leg.",
        );
      }
    }

    // getter functions
    get fixed_leg() {
      return this.#fixed_leg;
    }
    get float_leg() {
      return this.#float_leg;
    }

    fair_rate(disc_curve, fwd_curve) {
      //returns fair rate, that is, rate such that swap has zero present value
      const pv_float = this.#float_leg.value_with_curves(disc_curve, fwd_curve);
      const annuity = this.annuity(disc_curve);
      if (0 === annuity) {
        if (0 === pv_float) return 0.0;
        throw new Error(
          "Swap: Cannot determine fair rate for swap with zero annuity",
        );
      }
      return -pv_float / annuity;
    }

    get fixed_rate() {
      //returns first rate on the fixed leg
      for (const p of this.#fixed_leg.payments) {
        if (p instanceof library.FixedRatePayment) {
          return p.rate;
        }
      }
      throw new Error(
        "Swap: cannot determine fixed rate, fixed leg has no rate payments",
      );
    }

    annuity(disc_curve) {
      // returns fixed rate annuity
      return this.#fixed_leg.annuity(disc_curve);
    }
  }

  library.Swap = Swap;
})(this.JsonRisk || module.exports);
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
(function (library) {
  class Leg {
    #currency = "";
    #disc_curve = "";
    #spread_curve = "";
    #residual_spread = 0.0;
    #payments = [];
    #indices = {};
    #update_notionals_if_needed = function () {
      return;
    };
    constructor(obj) {
      this.#disc_curve = library.string_or_empty(obj.disc_curve);
      this.#spread_curve = library.string_or_empty(obj.spread_curve);
      this.#residual_spread =
        library.number_or_null(obj.residual_spread) || 0.0;
      this.#currency = library.string_or_empty(obj.currency);

      if ("payments" in obj && Array.isArray(obj.payments)) {
        this.#payments = obj.payments.map((pobj) => library.make_payment(pobj));
      }

      // all payments must have the same or no currency
      for (const p of this.#payments) {
        if ("" === p.currency) continue;
        if ("" === this.#currency) {
          this.#currency = p.currency;
          continue;
        }
        if (p.currency !== this.#currency) {
          throw new Error(
            "Leg: all payments in a leg must have the same currency",
          );
        }
      }

      // check if updating notionals is needed for each valuation (needed in case of capitalizing float rate payments, not unusual in banking book applications)
      for (const p of this.#payments) {
        if (p.capitalize && !p.is_fixed) {
          this.#update_notionals_if_needed = this.update_notionals;
          break;
        }
      }

      // sort payments
      this.#payments.sort(library.payment_compare);
      Object.freeze(this.#payments);

      if ("indices" in obj) {
        for (const [key, value] of Object.entries(obj.indices)) {
          this.#indices[key] = new library.SimpleIndex(value);
        }
      }
      Object.freeze(this.#indices);
    }

    // getter functions
    get currency() {
      return this.#currency;
    }
    get disc_curve() {
      return this.#disc_curve;
    }
    get spread_curve() {
      return this.#spread_curve;
    }
    get residual_spread() {
      return this.#residual_spread;
    }
    get payments() {
      return this.#payments;
    }
    get indices() {
      return this.#indices;
    }

    get has_notional_payments() {
      for (const p of this.#payments) {
        if (p.constructor === library.NotionalPayment) return true;
      }
      return false;
    }
    get has_capitalization() {
      for (const p of this.#payments) {
        if (p.capitalize) return true;
      }
      return false;
    }
    get has_fixed_rate_payments() {
      for (const p of this.#payments) {
        if (p instanceof library.FixedRatePayment) return true;
      }
      return false;
    }
    get has_float_rate_payments() {
      for (const p of this.#payments) {
        if (p instanceof library.FloatRatePayment) return true;
      }
      return false;
    }
    get has_embedded_options() {
      // not supported yet
      return false;
    }
    get has_constant_notional() {
      if (!this.#payments.length) return true;
      let notional = Math.abs(this.#payments[0].notional);
      for (const p of this.#payments) {
        if (Math.abs(p.notional) != notional) return false;
      }
      return true;
    }
    get has_constant_rate() {
      let rate = null;
      for (const p of this.#payments) {
        if (p.constructor != library.FixedRatePayment) continue;
        if (rate === null) {
          rate = p.rate;
          continue;
        }
        if (rate !== p.rate) return false;
      }
      return true;
    }

    // valuation functions
    add_deps(deps) {
      if ("" != this.#disc_curve) deps.add_curve(this.#disc_curve);
      if ("" != this.#spread_curve) deps.add_curve(this.#spread_curve);
      if ("" != this.#currency) deps.add_currency(this.#currency);

      for (const idx of Object.values(this.#indices)) {
        idx.add_deps(deps);
      }
    }

    #dcf(disc_curve, acquire_date = new Date(0.0)) {
      let res = 0;
      const cutoff = Math.max(library.time_from_now(acquire_date), 0.0);
      for (const p of this.#payments) {
        const d = p.date_pmt;
        const t = library.time_from_now(d);

        // exclude payments in the past and that occur on or before the date of acquisition
        if (t <= cutoff) continue;

        // get amount and discount
        const amount = p.amount;
        const df = disc_curve.get_df(t);
        res += amount * df;
      }
      return res;
    }

    #discounter(params) {
      const disc_curve = params.get_curve(this.#disc_curve);
      const spread_curve =
        this.#spread_curve !== "" ? params.get_curve(this.#spread_curve) : null;
      if (spread_curve === null && this.#residual_spread === 0.0) {
        // standard valuation
        return disc_curve;
      } else {
        // valuation with spreads, return an object with a get_df method, simulating a yield curve
        const compounding = library.compounding_factory("annual");
        const residual_spread = this.#residual_spread;
        return {
          get_df: function (t) {
            let df = disc_curve.get_df(t);
            let zc = compounding.zc(t, df);
            if (spread_curve) zc += spread_curve.get_rate(t);
            zc += residual_spread;
            return compounding.df(t, zc);
          },
        };
      }
    }

    value(params, acquire_date) {
      for (const idx of Object.values(this.#indices)) {
        idx.link_curve(params);
      }
      for (const p of this.#payments) {
        // make projection for unfixed payments
        if (!p.is_fixed) p.project(this.#indices);
      }

      this.#update_notionals_if_needed();

      const discounter = this.#discounter(params);
      return this.#dcf(discounter, acquire_date);
    }

    value_with_curves(disc_curve, fwd_curve) {
      for (const idx of Object.values(this.#indices)) {
        idx.link_curve(fwd_curve);
      }
      for (const p of this.#payments) {
        // make projection for unfixed payments
        if (!p.is_fixed) p.project(this.#indices);
      }

      this.#update_notionals_if_needed();

      return this.#dcf(disc_curve);
    }

    // argument must be either a valid params object or a curve object
    annuity(params_or_curve) {
      const discounter =
        params_or_curve instanceof library.Params
          ? this.#discounter(params_or_curve)
          : params_or_curve;
      let res = 0;
      for (const p of this.#payments) {
        if (
          p.constructor !== library.FixedRatePayment &&
          p.constructor !== library.FloatRatePayment
        )
          continue;

        let t = library.time_from_now(p.date_pmt);
        if (t < 0) continue;

        // get amount based on 100 percent interest and discount
        let amount = p.notional * p.yf;
        let df = discounter.get_df(t);
        res += amount * df;
      }
      return res;
    }

    // get outstanding balance  - all floating capitalizing payments must have been projected before by e.g. calling the value method
    balance(d = library.valuation_date) {
      let res = 0;
      for (const p of this.#payments) {
        if (p.date_value <= d) continue;
        res += p.amount_notional;
      }
      return res;
    }

    // compute irr for some date
    irr(d) {
      const balance = this.balance(d);
      const tset = library.time_from_now(d);
      const payments = this.#payments;
      const func = function (x) {
        let res = -balance * Math.pow(1 + x, -tset);
        for (const p of payments) {
          if (p.date_value <= d) continue;
          const t = library.time_from_now(p.date_pmt);
          res += p.amount * Math.pow(1 + x, -t);
        }
        return res;
      };

      const res = library.find_root_secant(func, 0, 0.0001);
      return res;
    }

    // get fair rate or spread
    fair_rate_or_spread(params) {
      for (const idx of Object.values(this.#indices)) {
        idx.link_curve(params);
      }
      for (const p of this.#payments) {
        // make projection for unfixed payments
        if (!p.is_fixed) p.project(this.#indices);
      }

      this.#update_notionals_if_needed();

      const discounter = this.#discounter(params);

      let res = 0; // res is present value without rates or spreads
      for (const p of this.#payments) {
        // exclude past payments
        const d = p.date_pmt;
        const t = library.time_from_now(d);
        if (t <= 0) continue;

        const df = discounter.get_df(t);

        // include only notional and float rate payments
        if (p.constructor === library.NotionalPayment) {
          res += df * p.amount;
        } else if (p.constructor === library.FloatRatePayment) {
          // exclude spread for float rate payments
          const spread = p.notional * p.yf * p.spread;
          res += df * (p.amount - spread);
        } else {
          continue;
        }
      }

      const annuity = this.annuity(params);
      const balance = this.balance();
      // fair rate means rate*annuity + res = balance, since res was value without rates or spreads. Equivalently, rat=(balance - res) / annuity
      if (0 === annuity)
        throw new Error(
          "Leg: Could not determine fair rate or spread since annuity is zero",
        );
      return (balance - res) / annuity;
    }

    // update notionals - all floating capitalizing payments must have been projected before by e.g. calling the value method
    update_notionals() {
      // no amortization or capitalization if there is no or just one payment
      const n = this.#payments.length;
      if (n < 2) return;

      // without any initial and final notional payments, no amortization or capitalization is supported
      const p0 = this.#payments[0];
      const pn1 = this.#payments[n - 1];
      if (
        p0.constructor !== library.NotionalPayment ||
        pn1.constructor !== library.NotionalPayment
      )
        return;

      // keep track of balance and payments with value date in the future
      let balance = -p0.amount_notional;
      const open_payments = new Set();

      for (let i = 1; i < n; i++) {
        const p = this.#payments[i];
        const start = p.date_start;

        // update balance for each payment by including all open payments with value date on or before start
        for (const pp of open_payments) {
          if (pp.date_value.getTime() > start.getTime()) continue;
          balance -= pp.amount_notional;
          open_payments.delete(pp);
        }

        if (p.constructor === library.NotionalPayment) {
          // notional payments cannot change sign of balance, and final notional payment must clear balance
          if (
            (balance > 0 && p.notional > balance) ||
            (balance < 0 && p.notional < balance) ||
            i === n - 1
          )
            p.set_notional(balance);
        } else {
          // update notional on p for interest rate payments
          p.set_notional(balance);
        }

        // add this payment to the list if it pays notional
        if (p.amount_notional != 0) {
          if (p.date_value.getTime() <= start.getTime()) {
            // immediately reduce balance
            balance -= p.amount_notional;
          } else {
            // payment reduces balance later
            open_payments.add(p);
          }
        }
      }
    }

    // get simple cash flow table
    get_cash_flows() {
      const pmap = new Map();
      for (const p of this.#payments) {
        const tpay = library.time_from_now(p.date_pmt);
        const total = p.amount;
        const notional = p.amount_notional;
        let entry = pmap.get(tpay);
        if (entry) {
          // entry for this payment time exists already
          entry[0] += total;
          entry[1] += notional;
        } else {
          // create new entry
          pmap.set(tpay, [total, notional, p.date_pmt]);
        }
      }
      const times = Array.from(pmap.keys()).sort(function (a, b) {
        return a - b;
      });
      const n = times.length;

      const t_pmt = new Float64Array(n);
      const pmt_total = new Float64Array(n);
      const pmt_interest = new Float64Array(n);
      const pmt_principal = new Float64Array(n);
      const current_principal = new Float64Array(n);
      const date_pmt = new Array(n);

      let cp = 0;
      for (let i = 0; i < n; i++) {
        const t = times[i];
        const [total, notional, dt] = pmap.get(t);

        t_pmt[i] = t;
        pmt_total[i] = total;
        pmt_principal[i] = notional;
        pmt_interest[i] = total - notional;
        current_principal[i] = cp;
        date_pmt[i] = dt;
        cp -= notional;
      }

      return {
        t_pmt,
        date_pmt,
        pmt_total,
        pmt_principal,
        pmt_interest,
        current_principal,
      };
    }
  }

  library.Leg = Leg;
})(this.JsonRisk || module.exports);
(function (library) {
  // function that checks for valid notional
  function check_notional(unsafe_notional) {
    const res = library.number_or_null(unsafe_notional);
    if (res === null)
      throw new Error("Payment: notional must be a valid number");
    return res;
  }

  class NotionalPayment {
    #date_pmt = null;
    #date_value = null;
    #notional = 0.0;
    #currency = "";
    constructor(obj) {
      // notional
      this.#notional = check_notional(obj.notional);

      //payment date
      this.#date_pmt = library.date_or_null(obj.date_pmt);
      if (this.#date_pmt === null)
        throw new Error("Payment: date_pmt must be a valid date");

      // value date
      this.#date_value = library.date_or_null(obj.date_value) || this.#date_pmt;

      //currency
      this.#currency = library.string_or_empty(obj.currency);
    }

    set_notional(n) {
      this.#notional = check_notional(n);
    }

    // getter functions
    get is_fixed() {
      return true;
    }
    get date_pmt() {
      return this.#date_pmt;
    }
    get date_value() {
      return this.#date_value;
    }
    get date_start() {
      return this.#date_value;
    }
    get date_end() {
      return this.#date_value;
    }
    get notional() {
      return this.#notional;
    }
    get currency() {
      return this.#currency;
    }
    get amount() {
      return this.#notional;
    }
    get amount_interest() {
      return 0.0;
    }
    get amount_notional() {
      return this.#notional;
    }
    get amount_option() {
      return 0.0;
    }
  }

  class RatePayment extends NotionalPayment {
    #date_start = null;
    #date_end = null;
    #ref_start = null;
    #ref_end = null;
    #dcc = "";
    #yf = null;
    #yffunc = null;
    #capitalize = false;
    constructor(obj) {
      super(obj);
      // start and end dates
      this.#date_start = library.date_or_null(obj.date_start);
      if (this.#date_start === null)
        throw new Error("RatePayment: date_start must be a valid date");

      this.#date_end = library.date_or_null(obj.date_end);
      if (this.#date_end === null)
        throw new Error("RatePayment: date_end must be a valid date");

      // reference periods
      this.#ref_start = library.date_or_null(obj.ref_start) || this.#date_start;
      this.#ref_end = library.date_or_null(obj.ref_end) || this.#date_end;

      // sanity checks
      if (this.#date_start.getTime() >= this.#date_end.getTime())
        throw new Error("RatePayment: date_start must be before date_end");
      if (this.#ref_start.getTime() >= this.#ref_end.getTime())
        throw new Error("RatePayment: ref_start must be before ref_end");
      if (this.#date_start.getTime() >= this.date_value.getTime())
        throw new Error("RatePayment: date_start must be before date_value");

      // dcc and year fraction
      this.#dcc = library.string_or_empty(obj.dcc);
      this.#yffunc = library.year_fraction_factory(this.#dcc);
      this.#yf = this.#yffunc(this.#date_start, this.#date_end);

      // capitalization
      this.#capitalize = library.make_bool(obj.capitalize);
    }

    //getter functions
    get date_start() {
      return this.#date_start;
    }
    get date_end() {
      return this.#date_end;
    }
    get ref_start() {
      return this.#ref_start;
    }
    get ref_end() {
      return this.#ref_end;
    }
    get yf() {
      return this.#yf;
    }
    get capitalize() {
      return this.#capitalize;
    }
  }

  class FixedRatePayment extends RatePayment {
    #rate = null;
    #amount = 0.0;
    constructor(obj) {
      super(obj);
      // rate
      this.#rate = library.number_or_null(obj.rate);
      if (this.#rate === null)
        throw new Error("FixedRatePayment: rate must be a valid number");

      // amount
      this.#amount = this.notional * this.#rate * this.yf;
    }

    //getter functions
    get rate() {
      return this.#rate;
    }
    get amount() {
      return this.capitalize ? 0.0 : this.#amount;
    }
    get amount_interest() {
      return this.#amount;
    }
    get amount_notional() {
      return this.capitalize ? -this.#amount : 0.0;
    }

    // set notional must update amount as well
    set_notional(n) {
      super.set_notional(n);
      this.#amount = this.notional * this.#rate * this.yf;
    }
  }

  class FloatRatePayment extends RatePayment {
    #index = "";
    #is_fixed = false;
    #spread = 0.0;
    #rate = 0.0;
    #reset_start = null;
    #reset_end = null;
    constructor(obj) {
      super(obj);

      // index
      this.#index = library.string_or_empty(obj.index);

      // is fixed
      this.#is_fixed = library.make_bool(obj.is_fixed);

      // fixing
      if (this.#is_fixed) {
        this.#rate = library.number_or_null(obj.rate);
        if (null === this.#rate)
          throw new Error(
            "FloatRatePayment: rate missing on payment that is already fixed",
          );
      }

      // spread
      this.#spread = library.number_or_null(obj.spread) || 0.0;

      // optional dates
      this.#reset_start =
        library.date_or_null(obj.reset_start) || this.date_start;
      this.#reset_end = library.date_or_null(obj.reset_end) || this.date_end;

      // sanity checks
      if (this.#reset_start >= this.#reset_end)
        throw new Error("RatePayment: reset_start must be before reset_end");
    }

    // getter functions
    get is_fixed() {
      return this.#is_fixed;
    }
    get index() {
      return this.#index;
    }
    get rate() {
      return this.#rate;
    }
    get spread() {
      return this.#spread;
    }
    get amount() {
      return this.capitalize ? 0.0 : this.amount_interest;
    }
    get amount_interest() {
      return this.#rate * this.notional * this.yf;
    }
    get amount_notional() {
      return this.capitalize ? -this.amount_interest : 0.0;
    }

    // project rate
    project(indices) {
      if (this.#is_fixed) return this.#rate;
      if ("" === this.#index)
        throw new Error("FloatRatePayment: no index defined");
      const idx = indices[this.#index];
      if (undefined === idx)
        throw new Error(
          `FloatRatePayment: index ${this.#index} was not supplied`,
        );
      if (!(idx instanceof library.SimpleIndex))
        throw new Error(`FloatRatePayment: invalid index ${this.#index}`);
      this.#rate = idx.fwd_rate(this.#reset_start, this.#reset_end);
      this.#rate += this.#spread;
      return this.#rate;
    }
  }

  // FloatRatePaymentCapFloor(index_name, is_fixed, spread, rate_cap, rate_floor)

  // CapFloorPayment()
  library.NotionalPayment = NotionalPayment;
  library.FixedRatePayment = FixedRatePayment;
  library.FloatRatePayment = FloatRatePayment;

  library.payment_compare = function (a, b) {
    // sort by start date first while notional payments use date_value instead
    const astart = a.date_start.getTime();
    const bstart = b.date_start.getTime();
    if (astart != bstart) return astart - bstart;

    // sort by end date first while notional payments use date_value instead
    const aend = a.date_end.getTime();
    const bend = b.date_end.getTime();
    if (aend != bend) return aend - bend;

    // sort by value date
    if (a.date_value.getTime() != b.date_value.getTime())
      return a.date_value < b.date_value;

    // sort the remaining payments by their type
    const na = a.constructor.name;
    const nb = b.constructor.name;
    return na < nb ? 1 : na > nb ? -1 : 0;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  class SimpleIndex {
    #fwd_curve = "";
    #surface = "";
    #dcc = "";
    #yffunc = null;
    #linked_curve = null;
    constructor(obj) {
      // fwd_curve
      this.#fwd_curve = library.string_or_empty(obj.fwd_curve);

      // surface
      this.#surface = library.string_or_empty(obj.surface);

      // dcc and year fraction
      this.#dcc = library.string_or_empty(obj.dcc);
      this.#yffunc = library.year_fraction_factory(this.#dcc);
    }

    // getter functions
    get fwd_curve() {
      return this.#fwd_curve;
    }

    get surface() {
      return this.#surface;
    }

    get dcc() {
      return this.#dcc;
    }

    // link curve
    link_curve(params_or_curve) {
      if (params_or_curve instanceof library.Curve) {
        this.#linked_curve = params_or_curve;
        return;
      }
      if (params_or_curve instanceof library.Params) {
        this.#linked_curve = params_or_curve.get_curve(this.#fwd_curve);
        return;
      }
      throw new Error(
        "SimpleIndex: Try to link curve with an invalid argument",
      );
    }

    // forward rate
    fwd_rate(start, end) {
      if (start <= library.valuation_date)
        throw new Error("SimpleIndex: Cannot project past fixings");
      const tstart = library.time_from_now(start);
      const tend = library.time_from_now(end);

      if (!(this.#linked_curve instanceof library.Curve))
        throw new Error(
          "SimpleIndex: No curve linked, call link_curve before calling fwd_rate",
        );

      // economically implied forward amount from curve
      const amount = this.#linked_curve.get_fwd_amount(tstart, tend);

      const yf = this.#yffunc(start, end);
      if (yf <= 0.0)
        throw new Error("SimpleIndex: Positive year fraction required");

      // amount converted to a rate with the index day count method
      return amount / yf;
    }

    // deps
    add_deps(deps) {
      if ("" != this.#fwd_curve) deps.add_curve(this.#fwd_curve);
      if ("" != this.#surface) deps.add_surface(this.#surface);
    }

    // serialisation
    toJSON() {
      return {
        fwd_curve: this.#fwd_curve,
        surface: this.#surface,
        dcc: this.#dcc,
      };
    }
  }

  library.SimpleIndex = SimpleIndex;
})(this.JsonRisk || module.exports);
(function (library) {
  "use strict";
  const continuous = {
    name: "c",
    df: function (t, zc) {
      return Math.exp(-t * zc);
    },
    zc: function (t, df) {
      if (t < 1 / 512) return 0.0;
      return -Math.log(df) / t;
    },
  };

  const annual = {
    name: "a",
    df: function (t, zc) {
      return (1 + zc) ** -t;
    },
    zc: function (t, df) {
      if (t < 1 / 512) return 0.0;
      return df ** (-1 / t) - 1;
    },
  };

  /**
   * get a compounding method from string
   * @param {string} str any string identifying a compounding method, valid values are "a", "annual" for annual compounding and "c", "continuous" for continuous compounding, case insensitive.
   * @returns {object} compounding class object
   * @memberof JsonRisk
   */
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

  const find_index = function (x, s, guess = 0) {
    let index = guess;
    // find index such that x[index] <= s <= x[index+1]
    while (s > x[index + 1] && index < x.length - 2) {
      index++;
    }
    while (s < x[index] && index > 0) {
      index--;
    }
    return index;
  };

  library.find_index = find_index;

  const copy_and_check_arrays = function (x, y) {
    const n = x.length;
    if (y.length !== n)
      throw new Error(
        "interpolation_factory: invalid input, x and y must have the same length",
      );
    if (0 === n)
      throw new Error(
        "interpolation_factory: invalid input, vectors have length zero",
      );
    const x_ = new Float64Array(n);
    const y_ = new Float64Array(n);
    x_[0] = x[0];
    y_[0] = y[0];
    for (let i = 1; i < n; i++) {
      if (x[i] <= x[i - 1])
        throw new Error(
          "interpolation_factory: invalid input, x must be increasing",
        );
      x_[i] = x[i];
      y_[i] = y[i];
    }
    return [x_, y_];
  };

  library.linear_interpolation = function (x, y) {
    // function that makes no more checks and copies
    if (1 === x.length) {
      const y0 = y[0];
      return function (s_not_used) {
        return y0;
      };
    }
    let index = 0;
    return function (s) {
      index = find_index(x, s, index);
      const temp = 1 / (x[index + 1] - x[index]);
      return (
        (y[index] * (x[index + 1] - s) + y[index + 1] * (s - x[index])) * temp
      );
    };
  };

  library.linear_interpolation_factory = function (x, y) {
    const [x_, y_] = copy_and_check_arrays(x, y);
    return library.linear_interpolation(x_, y_);
  };

  library.linear_xy_interpolation_factory = function (x, y) {
    const [x_, y_] = copy_and_check_arrays(x, y);

    if (x_[0] <= 0)
      throw new Error(
        "interpolation_factory: linear xy interpolation requires all x to be greater than zero",
      );

    const xy_ = new Float64Array(x_.length);
    for (let i = 0; i < x_.length; i++) {
      xy_[i] = x_[i] * y_[i];
    }
    const linear = library.linear_interpolation(x_, xy_);
    return function (s) {
      if (s <= 0)
        throw new Error(
          "linear xy interpolation requires x to be greater than zero",
        );
      return linear(s) / s;
    };
  };

  library.bessel_hermite_interpolation_factory = function (x, y) {
    const [x_, y_] = copy_and_check_arrays(x, y);
    const n = x_.length;
    // need at least three support points, otherwise fall back to linear
    if (n < 3) {
      return library.linear_interpolation(x_, y_);
    }

    const dx = new Float64Array(n);
    const dy = new Float64Array(n);
    dx[0] = 0;
    dy[0] = 0;
    for (let i = 1; i < n; i++) {
      dx[i] = x_[i] - x_[i - 1];
      dy[i] = y_[i] - y_[i - 1];
    }

    let b = new Float64Array(n);

    // left boundary
    b[0] =
      (((x_[2] + x_[1] - 2 * x_[0]) * dy[1]) / dx[1] -
        (dx[1] * dy[2]) / dx[2]) /
      (x_[2] - x_[0]);

    // inner points
    for (let i = 1; i < n - 1; i++) {
      b[i] =
        ((dx[i + 1] * dy[i]) / dx[i] + (dx[i] * dy[i + 1]) / dx[i + 1]) /
        (x_[i + 1] - x_[i - 1]);
    }

    // right boundary
    b[n - 1] =
      (((2 * x_[n - 1] - x_[n - 2] - x_[n - 3]) * dy[n - 1]) / dx[n - 1] -
        (dx[n - 1] * dy[n - 2]) / dx[n - 2]) /
      (x_[n - 1] - x_[n - 3]);

    let c = new Float64Array(n - 1);
    let d = new Float64Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      let m = dy[i + 1] / dx[i + 1];
      c[i] = (3 * m - b[i + 1] - 2 * b[i]) / dx[i + 1];
      d[i] = (b[i + 1] + b[i] - 2 * m) / dx[i + 1] / dx[i + 1];
    }

    let i = 0;
    return function (s) {
      i = find_index(x_, s, i);
      const ds = s - x_[i];
      return y_[i] + ds * (b[i] + ds * (c[i] + ds * d[i]));
    };
  };
})(this.JsonRisk || module.exports);
(function (library) {
  "use strict";

  const copy_and_check_arrays = function (x1, x2, y) {
    if (!Array.isArray(x1) || !Array.isArray(x2) || !Array.isArray(y))
      throw new Error(
        "interpolation2d_factory: invalid input, input must be arrays.",
      );
    const n1 = x1.length;
    const n2 = x2.length;
    if (0 === n1 || 0 === n2)
      throw new Error(
        "interpolation2d_factory: invalid input, x1 and x2 cannot be empty.",
      );
    if (y.length !== n1)
      throw new Error(
        "interpolation2d_factory: invalid input, y must have the same length as x1",
      );
    const x1_ = new Float64Array(n1);
    const x2_ = new Float64Array(n2);
    const y_ = new Float64Array(n1 * n2);

    for (let i1 = 0; i1 < n1; i1++) {
      if (i1 > 0 && x1[i1] <= x1[i1 - 1])
        throw new Error(
          "interpolation2d_factory: invalid input, x1 must be increasing",
        );
      x1_[i1] = x1[i1];
      if (!Array.isArray(y[i1]) || n2 !== y[i1].length)
        throw new Error(
          "interpolation2d_factory: invalid input, each element of y must be an array and have the same length as x1",
        );

      for (let i2 = 0; i2 < n2; i2++) {
        if (i1 === 0) {
          x2_[i2] = x2[i2];
          if (i2 > 0 && x2[i2] <= x2[i2 - 1])
            throw new Error(
              "interpolation2d_factory: invalid input, x2 must be increasing",
            );
        }
        if (typeof y[i1][i2] !== "number")
          throw new Error(
            "interpolation2d_factory: invalid input, each element of each array in y must be a number.",
          );
        y_[i1 * n2 + i2] = y[i1][i2];
      }
    }
    return [x1_, x2_, y_, n1, n2];
  };

  library.interpolation2d_factory = function (x1, x2, y) {
    const [x1_, x2_, y_, n1, n2] = copy_and_check_arrays(x1, x2, y);

    // 1xN, covers 1x1 as well
    if (n1 === 1) {
      const interpolation = library.linear_interpolation(x2_, y_);
      return function (s1_not_used, s2) {
        if (s2 <= x2_[0]) return y_[0];
        if (s2 >= x2_[n2 - 1]) return y_[n2 - 1];
        return interpolation(s2);
      };
    }
    // Nx1
    if (n2 === 1) {
      const interpolation = library.linear_interpolation(x1_, y_);
      return function (s1, s2_not_used) {
        if (s1 <= x1_[0]) return y_[0];
        if (s1 >= x1_[n1 - 1]) return y_[n1 - 1];
        return interpolation(s1);
      };
    }
    // NxN
    return function (s1, s2) {
      if (s1 < x1_[0]) s1 = x1_[0];
      else if (s1 > x1_[n1 - 1]) s1 = x1_[n1 - 1];

      if (s2 < x2_[0]) s2 = x2_[0];
      else if (s2 > x2_[n2 - 1]) s2 = x2_[n2 - 1];

      const i1 = library.find_index(x1_, s1);
      const i2 = library.find_index(x2_, s2);
      const v11 = y_[i1 * n2 + i2];
      const v12 = y_[i1 * n2 + n2 + i2];
      const v21 = y_[i1 * n2 + i2 + 1];
      const v22 = y_[i1 * n2 + n2 + i2 + 1];

      const w1 = (s1 - x1_[i1]) / (x1_[i1 + 1] - x1_[i1]);
      const w2 = (s2 - x2_[i2]) / (x2_[i2 + 1] - x2_[i2]);

      return (
        (1 - w1) * (1 - w2) * v11 +
        (1 - w1) * w2 * v21 +
        w1 * (1 - w2) * v12 +
        w1 * w2 * v22
      );
    };
  };
})(this.JsonRisk || module.exports);
(function (library) {
  "use strict";

  const RT2PI = Math.sqrt(4.0 * Math.acos(0.0));
  const SPLIT = 7.07106781186547;
  const N0 = 220.206867912376;
  const N1 = 221.213596169931;
  const N2 = 112.079291497871;
  const N3 = 33.912866078383;
  const N4 = 6.37396220353165;
  const N5 = 0.700383064443688;
  const N6 = 3.52624965998911e-2;
  const M0 = 440.413735824752;
  const M1 = 793.826512519948;
  const M2 = 637.333633378831;
  const M3 = 296.564248779674;
  const M4 = 86.7807322029461;
  const M5 = 16.064177579207;
  const M6 = 1.75566716318264;
  const M7 = 8.83883476483184e-2;

  /**
   * ...
   * @param {number} x
   * @returns {number} ...
   * @memberof JsonRisk
   * @public
   */
  library.ndf = function (x) {
    return Math.exp((-x * x) / 2.0) / RT2PI;
  };

  /**
   * cumulative normal distribution function with double precision according to Graeme West, BETTER APPROXIMATIONS TO CUMULATIVE NORMAL FUNCTIONS, 2004
   * @param {number} x
   * @returns {number} ...
   * @memberof JsonRisk
   * @public
   */
  library.cndf = function (x) {
    const z = Math.abs(x);
    let c;

    if (z <= 37.0) {
      const e = Math.exp((-z * z) / 2.0);
      if (z < SPLIT) {
        const n =
          (((((N6 * z + N5) * z + N4) * z + N3) * z + N2) * z + N1) * z + N0;
        const d =
          ((((((M7 * z + M6) * z + M5) * z + M4) * z + M3) * z + M2) * z + M1) *
            z +
          M0;
        c = (e * n) / d;
      } else {
        const f =
          z + 1.0 / (z + 2.0 / (z + 3.0 / (z + 4.0 / (z + 13.0 / 20.0))));
        c = e / (RT2PI * f);
      }
    } else if (z > 37.0) {
      c = 0;
    } else {
      throw new Error("cndf: invalid input.");
    }
    return x <= 0.0 ? c : 1 - c;
  };

  const D1 = 0.049867347;
  const D2 = 0.0211410061;
  const D3 = 0.0032776263;
  const D4 = 0.0000380036;
  const D5 = 0.0000488906;
  const D6 = 0.000005383;

  /**
   * fast cumulative normal distribution function according to Abramowitz and Stegun
   * @param {number} x
   * @returns {number} ...
   * @memberof JsonRisk
   * @public
   */
  library.fast_cndf = function (x) {
    const z = x > 0 ? x : -x;
    let f = 1 + z * (D1 + z * (D2 + z * (D3 + z * (D4 + z * (D5 + z * D6)))));
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
   * @memberof JsonRisk
   * @public
   */
  library.find_root_secant = function (func, start, next, max_iter, threshold) {
    let x = start,
      xnext = next,
      temp = 0,
      iter = max_iter || 20,
      f = func(x),
      fnext = func(xnext);
    const t = threshold || 0.00000001;

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
   * @memberof JsonRisk
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
   * @memberof JsonRisk
   * @public
   */
  library.find_root_ridders = function (
    func,
    start,
    next,
    max_iter,
    threshold,
  ) {
    let x = start,
      y = next,
      z = 0,
      w = 0,
      r = 0,
      iter = max_iter || 20,
      fx = func(x),
      fy = func(y),
      fz,
      fw;
    const t = threshold || 0.00000001;
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
  class BachelierModel {
    #impl = null;
    #std_dev = 0.0;
    constructor(time, volatility) {
      this.#std_dev = volatility * Math.sqrt(time);
      if (time < 0) {
        this.#impl = function (
          phi_not_used,
          forward_not_used,
          strike_not_used,
        ) {
          // expired option
          return 0.0;
        };
      } else if (time < 1 / 512 || this.#std_dev < 0.000001) {
        this.#impl = function (phi, forward, strike) {
          // expiring option or very lw volatility, return inner value
          return Math.max(phi * (forward - strike), 0);
        };
      } else {
        // regular case - bachelier formula
        this.#impl = this.#bachelier_formula;
      }
    }

    #bachelier_formula(phi, forward, strike) {
      const d1 = (forward - strike) / this.#std_dev;
      return (
        phi * (forward - strike) * library.cndf(phi * d1) +
        this.#std_dev * library.ndf(d1)
      );
    }

    put_price(forward, strike) {
      return this.#impl(-1, forward, strike);
    }

    call_price(forward, strike) {
      return this.#impl(1, forward, strike);
    }
  }
  library.BachelierModel = BachelierModel;
})(this.JsonRisk || module.exports);
(function (library) {
  class BlackModel {
    #impl = null;
    #std_dev = 0.0;
    constructor(time, volatility) {
      this.#std_dev = volatility * Math.sqrt(time);
      if (time <= 0) {
        this.#impl = function (
          phi_not_used,
          forward_not_used,
          strike_not_used,
        ) {
          // expired option
          return 0.0;
        };
      } else if (time < 1 / 512 || this.#std_dev < 0.000001) {
        this.#impl = function (phi, forward, strike) {
          // expiring option or very lw volatility, return inner value
          return Math.max(phi * (forward - strike), 0);
        };
      } else {
        // regular case - black formula
        this.#impl = this.#black_formula;
      }
    }

    #black_formula(phi, forward, strike) {
      if (!(forward > 0.0))
        throw new Error("Black76 model: forward must be positive");
      if (!(strike > 0.0))
        throw new Error("Black76 model: strike must be positive");
      const temp = Math.log(forward / strike) / this.#std_dev;
      const d1 = temp + 0.5 * this.#std_dev;
      const d2 = temp - 0.5 * this.#std_dev;
      return (
        phi * forward * library.cndf(phi * d1) -
        phi * strike * library.cndf(phi * d2)
      );
    }

    put_price(forward, strike) {
      return this.#impl(-1, forward, strike);
    }

    call_price(forward, strike) {
      return this.#impl(1, forward, strike);
    }
  }
  library.BlackModel = BlackModel;
})(this.JsonRisk || module.exports);
(function (library) {
  class IsdaCdsModel {
    #disc_curve = null;
    #survival_curve = null;
    #timeline = null;
    constructor(disc_curve, survival_curve) {
      this.#disc_curve = disc_curve;
      this.#survival_curve = survival_curve;

      const times = new Set();
      for (const t of this.#disc_curve.times) times.add(t);
      for (const t of this.#survival_curve.times) times.add(t);
      this.#timeline = Array.from(times);
      this.#timeline.sort();
      Object.freeze(this.#timeline);
    }

    timeline(t_start, t_end) {
      const res = [t_start];
      for (const t of this.#timeline) {
        if (t <= t_start) continue;
        if (t >= t_end) continue;
        res.push(t);
      }
      res.push(t_end);
      return res;
    }

    accrual_on_default_pv(pmt) {
      const { date_start, date_end, date_pmt, amount } = pmt;
      const t_pmt = library.time_from_now(date_pmt);
      if (t_pmt <= 0) return 0.0;
      const t_start = library.time_from_now(date_start);
      const t_end = library.time_from_now(date_end);

      // accrual amount
      const annualized_amount = amount / (t_end - t_start);

      // sub-timeline
      const timeline = this.timeline(t_start, t_end);

      // initialize loop
      let res = 0.0;
      let t0 = Math.max(0.0, t_start);
      let df0 = this.#disc_curve.get_df(t0);
      let sp0 = this.#survival_curve.get_df(t0);

      // loop over all payments
      for (let i = 1; i < timeline.length; i++) {
        const t1 = Math.max(timeline[i], 0);
        const df1 = this.#disc_curve.get_df(t1);
        const sp1 = this.#survival_curve.get_df(t1);

        const forward = Math.log(df0 / df1);
        const hazard = Math.log(sp0 / sp1);
        const dfsp0 = df0 * sp0;
        const dfsp1 = df1 * sp1;
        const fh = forward + hazard;
        let tmp = 0.0;

        if (Math.abs(fh) > 1e-4) {
          // regular case
          tmp =
            (hazard / fh) *
            ((t1 - t0) * ((dfsp0 - dfsp1) / fh - dfsp1) +
              (t0 - t_start) * (dfsp0 - dfsp1));
        } else {
          // taylor expansion for small fh
          const fh_2 = fh * fh;
          tmp =
            hazard *
            dfsp0 *
            ((t0 - t_start) *
              (1.0 - 0.5 * fh + (1.0 / 6.0) * fh_2 - (1.0 / 24.0) * fh_2 * fh) +
              (t1 - t0) *
                (0.5 -
                  (1.0 / 3.0) * fh +
                  (1.0 / 8.0) * fh_2 -
                  (1.0 / 30.0) * fh_2 * fh));
        }

        res += tmp;
        t0 = t1;
        df0 = df1;
        sp0 = sp1;
      }

      return res * annualized_amount;
    }

    protection_pv(period) {
      const { date_start, date_end, notional, recovery_rate } = period;
      const t_start = library.time_from_now(date_start);
      const t_end = library.time_from_now(date_end);
      if (t_end <= 0) return 0.0;

      // sub-timeline
      const timeline = this.timeline(t_start, t_end);

      // initialize loop
      let res = 0.0;
      let t0 = Math.max(0.0, t_start);
      let df0 = this.#disc_curve.get_df(t0);
      let sp0 = this.#survival_curve.get_df(t0);

      // loop over all payments
      for (let i = 1; i < timeline.length; i++) {
        const t1 = Math.max(timeline[i], 0);
        const df1 = this.#disc_curve.get_df(t1);
        const sp1 = this.#survival_curve.get_df(t1);

        const forward = Math.log(df0 / df1);
        const hazard = Math.log(sp0 / sp1);
        const dfsp0 = df0 * sp0;
        const dfsp1 = df1 * sp1;
        const fh = forward + hazard;
        let tmp = 0.0;

        if (Math.abs(fh) > 1e-4) {
          // regular case
          tmp = (hazard / fh) * (dfsp0 - dfsp1);
        } else {
          // taylor expansion for small fh
          const fh_2 = fh * fh;
          tmp =
            hazard *
            dfsp0 *
            (t0 - t_start) *
            (1.0 -
              0.5 * fh +
              (1.0 / 6.0) * fh_2 -
              (1.0 / 24.0) * fh_2 * fh +
              (1.0 / 120.0) * fh_2 * fh_2);
        }

        res += tmp;
        t0 = t1;
        df0 = df1;
        sp0 = sp1;
      }

      return res * notional * (1 - recovery_rate);
    }
  }
  library.IsdaCdsModel = IsdaCdsModel;
})(this.JsonRisk || module.exports);
(function (library) {
  const identity = function (t) {
    return t;
  };

  const STD_DEV_RANGE = 6;
  const RESOLUTION = 12;

  /**
   * Class representing an LGM (Linear Gauss Markov, equivalent to Hull-White) model. Reference: Hagan, Patrick. (2019). EVALUATING AND HEDGING EXOTIC SWAP INSTRUMENTS VIA LGM.
   * @memberof JsonRisk
   */
  class LGM {
    #h = identity;
    #int_h_prime_minus_2 = identity;
    #mean_reversion = 0.0;
    #xi = [];
    #t_ex = [];

    /**
     * Create an LGM model
     * @param {number} m A hull-white mean reversion
     */
    constructor(m = 0) {
      if (typeof m !== "number")
        throw new Error("LGM: mean reversion m must be a number");
      if (m < 0) throw new Error("LGM: mean reversion m must be positive");
      this.#mean_reversion = m;
      if (m === 0) {
        this.#h = identity;
        this.#int_h_prime_minus_2 = identity;
      }
      if (m > 0) {
        this.#h = function (t) {
          return (1 - Math.exp(-m * t)) / m;
        };
        this.#int_h_prime_minus_2 = function (t) {
          return (0.5 / m) * (Math.exp(2 * m * t) - 1);
        };
      }
    }

    /**
     * Parametrise the LGM with a vector of times and a constant Hull-White volatility
     * @param {Array} t_exercise the vector of exercise times
     * @param {number} sigma the constant Hull-White volatility
     */
    set_times_and_hull_white_volatility(t_exercise, sigma) {
      if (typeof sigma !== "number")
        throw new Error("LGM: Hull-White volatility sigma must be a number");
      if (sigma < 0)
        throw new Error("LGM: Hull-White volatility sigma must be positive");
      this.#t_ex = new Float64Array(t_exercise.length);
      this.#xi = new Float64Array(t_exercise.length);
      for (let i = 0; i < t_exercise.length; i++) {
        if (typeof t_exercise[i] !== "number")
          throw new Error("LGM: t_exercise must a vector of numbers");
        this.#t_ex[i] = t_exercise[i];
        let tlast = i > 0 ? this.#t_ex[i - 1] : 0;
        if (this.#t_ex[i] <= tlast)
          throw new Error("LGM: t_exercise must be positive and increasing");
        this.#xi[i] = sigma * sigma * this.#int_h_prime_minus_2(t_exercise[i]);
      }
    }

    /**
     * Get a vector of Hull-White volatilities from the parametrised model
     * @type {Array} vector of volatilities for the Hull-White model
     */
    get hull_white_volatility() {
      const sigma = new Array(this.#t_ex.length);
      for (let i = 0; i < sigma.length; i++) {
        const xi = this.#xi[i];
        const xi_last = i === 0 ? 0.0 : this.#xi[i - 1];
        const t = this.#t_ex[i];
        const t_last = i === 0 ? 0.0 : this.#t_ex[i - 1];

        const dxi = xi - xi_last;
        const dhpm2 =
          this.#int_h_prime_minus_2(t) - this.#int_h_prime_minus_2(t_last);
        sigma[i] = Math.sqrt(dxi / dhpm2);
      }
      return sigma;
    }

    /**
     * Get a vector of exercise times from the parametrised model
     * @type {Array} vector of times
     */
    get t_ex() {
      return Array.from(this.#t_ex);
    }

    /**
     * Get a vector of LGM volatilities (xis) from the parametrised model
     * @type {Array} vector of volatilities for the LGM model
     */
    get xi() {
      return Array.from(this.#xi);
    }

    /**
     * Get the mean reversoin
     * @type {number} mean reversion for the LGM model
     */
    get mean_reversion() {
      return this.#mean_reversion;
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
     * @memberof JsonRisk
     * @public
     */

    #dcf(cf_obj, t_exercise, discount_factors, xi, state, opportunity_spread) {
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

      let i = 0,
        j,
        dh,
        temp,
        dh_dh_xi_2;
      const res = new Float64Array(state.length);
      const times = cf_obj.t_pmt;
      const amounts = cf_obj.pmt_total;
      // move forward to first line after exercise date
      while (times[i] <= t_exercise) i++;

      //include accrued interest if interest payment is part of the cash flow object
      let accrued_interest = 0;
      if (cf_obj.pmt_interest) {
        accrued_interest =
          i === 0
            ? 0
            : (cf_obj.pmt_interest[i] * (t_exercise - times[i - 1])) /
              (times[i] - times[i - 1]);
      }
      // include principal payment on exercise date
      const sadj = strike_adjustment(
        cf_obj,
        t_exercise,
        discount_factors,
        opportunity_spread,
      );
      temp =
        -(cf_obj.current_principal[i] + accrued_interest + sadj) *
        discount_factors[discount_factors.length - 1];
      dh = this.#h(t_exercise);
      dh_dh_xi_2 = dh * dh * xi * 0.5;
      for (j = 0; j < state.length; j++) {
        res[j] = temp * Math.exp(-dh * state[j] - dh_dh_xi_2);
      }

      // include all payments after exercise date
      while (i < times.length) {
        dh = this.#h(cf_obj.t_pmt[i]);
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
    }

    /**
     * Calibrate and parametrise LGM against the supplied basket of swaptions
     * @param {object} basket basket
     * @param {object} disc_curve discount curve
     * @param {object} fwd_curve forward curve
     * @param {object} surface surface
     * @memberof JsonRisk
     */
    calibrate(basket, disc_curve, fwd_curve, surface) {
      this.#xi = new Float64Array(basket.length);
      this.#t_ex = new Float64Array(basket.length);
      let xi, cf_obj, tte, discount_factors, target;

      const func = function (xi) {
        const val = this.european_call(
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
      }.bind(this);

      for (let i = 0; i < basket.length; i++) {
        if (library.time_from_now(basket[i].first_exercise_date) > 1 / 512) {
          tte = library.time_from_now(basket[i].first_exercise_date);
          this.#t_ex[i] = tte;

          //first step: derive initial guess based on Hagan formula 5.16c
          //get swap fixed cash flow adjusted for basis spread
          cf_obj = european_swaption_adjusted_cashflow(
            basket[i],
            disc_curve,
            fwd_curve,
          );

          discount_factors = get_discount_factors(
            cf_obj,
            tte,
            disc_curve,
            null,
            null,
          );
          let denominator = 0;
          for (let j = 0; j < cf_obj.t_pmt.length; j++) {
            denominator +=
              cf_obj.pmt_total[j] *
              discount_factors[j] *
              this.#h(cf_obj.t_pmt[j]);
          }
          //bachelier swaption price and std deviation
          target = basket[i].value_with_curves(disc_curve, fwd_curve, surface);
          const std_dev_bachelier = basket[i].std_dev;

          //initial guess
          xi = Math.pow(
            (std_dev_bachelier * basket[i].annuity(disc_curve)) / denominator,
            2,
          );

          //second step: calibrate, but be careful with infeasible bachelier prices below min and max
          let min_value = this.#dcf(
            cf_obj,
            tte,
            discount_factors,
            0,
            [0],
            null,
          )[0];

          //max value is value of the payoff without redemption payment
          let max_value =
            min_value +
            basket[i].fixed_leg.payments[0].notional *
              discount_factors[discount_factors.length - 1];
          //min value (attained at vola=0) is maximum of zero and current value of the payoff
          if (min_value < 0) min_value = 0;

          const accuracy = target * 1e-7 + 1e-7;

          if (target <= min_value + accuracy || 0 === xi) {
            xi = 0;
          } else {
            if (target > max_value) target = max_value;
            let approx = func(xi);
            let j = 10;
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

          if (i > 0 && this.#xi[i - 1] > xi) {
            this.#xi[i] = this.#xi[i - 1]; //fallback if monotonicity is violated
          } else {
            this.#xi[i] = xi;
          }
        }
      }
    }

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
     * @returns {number} the option value
     * @memberof JsonRisk
     */
    european_call(
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

      const discount_factors =
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
          this.#dcf(
            cf_obj,
            t_exercise,
            discount_factors,
            0,
            [0],
            opportunity_spread,
          )[0],
        ); //very low volatility

      let std_dev = Math.sqrt(xi);
      let dh = this.#h(t_exercise + 1 / 365) - this.#h(t_exercise);
      let break_even;

      const func = function (x) {
        return this.#dcf(
          cf_obj,
          t_exercise,
          discount_factors,
          xi,
          [x],
          opportunity_spread,
        )[0];
      }.bind(this);

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

        let lower, upper;

        if (func(0) >= 0) {
          lower = 0;
          upper = std_dev * STD_DEV_RANGE;
          if (func(upper) > 0) {
            //special case where payoff is always positive, return expectation
            return this.#dcf(
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
          return this.bermudan_call(
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

      let i = 0;
      const one_std_dev = 1 / std_dev;

      // move forward to first line after exercise date
      while (cf_obj.t_pmt[i] <= t_exercise) i++;

      //include accrued interest if interest payment is part of the cash flow object
      let accrued_interest = 0;
      if (cf_obj.pmt_interest) {
        accrued_interest =
          i === 0
            ? 0
            : (cf_obj.pmt_interest[i] * (t_exercise - cf_obj.t_pmt[i - 1])) /
              (cf_obj.t_pmt[i] - cf_obj.t_pmt[i - 1]);
      }

      // include principal payment on or before exercise date
      dh = this.#h(t_exercise);
      const sadj = strike_adjustment(
        cf_obj,
        t_exercise,
        discount_factors,
        opportunity_spread,
      );
      let res =
        -(cf_obj.current_principal[i] + accrued_interest + sadj) *
        discount_factors[discount_factors.length - 1] *
        library.cndf(break_even * one_std_dev + dh * std_dev);

      // include all payments after exercise date
      while (i < cf_obj.t_pmt.length) {
        dh = this.#h(cf_obj.t_pmt[i]);
        res +=
          cf_obj.pmt_total[i] *
          discount_factors[i] *
          library.cndf(break_even * one_std_dev + dh * std_dev);
        i++;
      }
      return res;
    }

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
     * @memberof JsonRisk
     * @public
     */
    bermudan_call(
      cf_obj,
      t_exercise_vec,
      disc_curve,
      xi_vec,
      spread_curve,
      residual_spread,
      opportunity_spread,
    ) {
      if (t_exercise_vec[t_exercise_vec.length - 1] < 0) return 0; //expired option
      if (t_exercise_vec[t_exercise_vec.length - 1] < 1 / 512) {
        return this.european_call(
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
       * @memberof JsonRisk
       * @private
       */
      function make_state_vector() {
        //repopulates state vector and ds measure
        const res = new Float64Array(2 * STD_DEV_RANGE * RESOLUTION + 1);
        res[0] = -STD_DEV_RANGE * std_dev;
        for (i = 1; i < n; i++) {
          res[i] = res[i - 1] + ds;
        }
        return res;
      }
      /**
       * updates the value vector with the maximum of payof and hold for each state, inserts a discontinuity adjustment
       * @memberof JsonRisk
       * @private
       */
      function update_value() {
        //take maximum of payoff and hold values
        let i_d = 0;
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
          const max_0 = value[i_d - 1],
            max_1 = value[i_d];
          const min_0 = Math.min(payoff[i_d - 1], hold[i_d - 1]),
            min_1 = Math.min(payoff[i_d], hold[i_d]);
          const cross = (max_0 - min_0) / (max_1 - min_1 + max_0 - min_0);
          const err =
            0.25 * (cross * (max_1 - min_1) + (1 - cross) * (max_0 - min_0));
          value[i_d] -= cross * err;
          value[i_d - 1] -= (1 - cross) * err;
        }
      }

      /**
       * Performs numeric integration according to the LGM martingale formula
       * @param {} j state index
       * @returns {} ...
       * @memberof JsonRisk
       * @private
       */
      function numeric_integration(j) {
        if (xi_last - xi < 1e-12) return value[j];
        const norm_scale = 1 / Math.sqrt(xi_last - xi),
          increment = ds_last * norm_scale;
        let i = 0,
          x = (state_last[0] - state[j] + 0.5 * ds_last) * norm_scale;
        while (x < -STD_DEV_RANGE) {
          x += increment;
          i += 1;
        }

        let temp = 0,
          dp_lo = 0,
          dp_hi;
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

      const n = 2 * STD_DEV_RANGE * RESOLUTION + 1;
      let j, i, n_ex;
      let xi,
        xi_last = 0,
        std_dev,
        ds,
        ds_last;
      let state, state_last;
      let payoff;
      const value = new Float64Array(n);
      const hold = new Float64Array(n);
      let discount_factors;

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
        payoff = this.#dcf(
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
      const holdnow = numeric_integration(0); //last integration according to martingale formula
      return holdnow;
    }
  }

  library.LGM = LGM;

  /**
   * precalculates discount factors for each cash flow and for t_exercise
   * @param {object} cf_obj cash flow
   * @param {object} t_exercise time when optionality can be exercised
   * @param {object} disc_curve discount curve
   * @param {object} spread_curve spread curve
   * @param {} residual_spread residual spread
   * @returns {object} discount factors
   * @memberof JsonRisk
   * @private
   */
  const get_discount_factors = function (
    cf_obj,
    t_exercise,
    disc_curve,
    spread_curve,
    residual_spread,
  ) {
    const res = new Array(cf_obj.t_pmt.length + 1); //last item holds discount factor for t_exercise
    let i = 0,
      rate;
    if (typeof residual_spread !== "number") residual_spread = 0;
    const fast = !spread_curve && 0 === residual_spread;

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
  };

  /**
   * calculated a strike adjustment reflecting the opportunity spread
   * @param {object} cf_obj
   * @param {} t_exercise
   * @param {object} discount_factors
   * @param {} opportunity_spread
   * @returns {object} ...
   * @memberof JsonRisk
   * @private
   */
  const strike_adjustment = function (
    cf_obj,
    t_exercise,
    discount_factors,
    opportunity_spread,
  ) {
    if (!opportunity_spread) return 0;
    let i = 0,
      df,
      res = 0;
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
  };

  /**
   * Calculates correction for multi curve valuation - move basis spread to fixed leg
   * @param {object} swaption Instrument
   * @param {object} disc_curve discount curve
   * @param {object} fwd_curve forward curve
   * @param {} fair_rate fair rate
   * @returns {object} cash flow
   * @memberof JsonRisk
   * @public
   */
  const european_swaption_adjusted_cashflow = function (
    swaption,
    disc_curve,
    fwd_curve,
  ) {
    //correction for multi curve valuation - move basis spread to fixed leg
    const { fixed_leg, float_leg } = swaption;
    let fixed_rate = swaption.fixed_rate;
    const pv_float_singlecurve = float_leg.value_with_curves(
      disc_curve,
      disc_curve,
    );
    const pv_float_multicurve = float_leg.value_with_curves(
      disc_curve,
      fwd_curve,
    );
    const annuity = fixed_leg.annuity(disc_curve);
    if (annuity != 0) {
      // pv of original swap with multi curve valuation should be equal to pv of corrected swap with single curve valuation
      // i.e.
      // pv_fix_corrected + pv_float_singlecurve = pv_fix + pv_float_multicurve
      // pv_fix_corrected - pv_fix = pv_float_multicorve - pv_float_singlecurve
      // annuity * correction = pv_float_multicurve - pv_float_singlecurve
      // correction = (pv_float_multicurve - pv_float_singlecurve) / annuity

      fixed_rate += (pv_float_multicurve - pv_float_singlecurve) / annuity;
    }

    // calculate cash flow amounts to account for new fixed rate
    const p1 = fixed_leg.payments[0];
    const cf = {
      current_principal: [0.0],
      t_pmt: [library.time_from_now(p1.date_start)],
      pmt_total: [-p1.notional],
      pmt_interest: [0.0],
    };

    for (const p of swaption.fixed_leg.payments) {
      cf.current_principal.push(p.notional);
      cf.t_pmt.push(library.time_from_now(p.date_pmt));
      const amount = p.yf ? p.notional * p.yf * fixed_rate : 0.0;
      cf.pmt_total.push(amount);
      cf.pmt_interest.push(amount);
    }

    // add final principal exchange cash flows
    cf.pmt_total[cf.pmt_total.length - 1] +=
      cf.current_principal[cf.pmt_total.length - 1];

    return cf;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * Class representing a parameters object, e.g., a scalar, curve, or surface, that allows name and tags for attachment of scenarios
   * @memberof JsonRisk
   */
  class Simulatable {
    #name = "";
    #tags = new Set();
    /**
     * Create a Simulatable.
     * @param {obj} obj A plain object representing a Simulatable
     * @param {Array} obj.tags a list of tags for the Simulatable, order is irrelevant
     * @param {String} obj.name name for the Simulatable
     */
    constructor(obj) {
      // if non-object is given, throw error
      if ("object" !== typeof obj)
        throw new Error("Simulatable: must provide object");

      // name
      if ("name" in obj) {
        if (typeof obj.name === "string") this.#name = obj.name;
      }

      // tags
      if ("tags" in obj) {
        if (!Array.isArray(obj.tags))
          throw new Error("Simulatable: tags must be an array of strings");

        for (const tag of obj.tags) {
          if (typeof tag !== "string") continue;
          if (tag === "") continue;
          this.#tags.add(tag);
        }
      }
    }

    get name() {
      return this.#name;
    }

    get tags() {
      return Array.from(this.#tags);
    }

    has_tag(tag) {
      return this.#tags.has(tag);
    }

    toJSON() {
      return { name: this.#name, tags: Array.from(this.#tags) };
    }
  }

  library.Simulatable = Simulatable;
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * returns a constant zero-rate curve
   * @function get_const_curve
   * @param {number} value rate of curve
   * @param {string} type type of curve e.g. yield
   * @returns {object} constant curve with discount factors {type, times, dfs}
   * @memberof JsonRisk
   * @public
   */
  library.get_const_curve = function (value, type) {
    if (typeof value !== "number")
      throw new Error("get_const_curve: input must be number.");
    if (value <= -1) throw new Error("get_const_curve: invalid input.");
    return new library.Curve({
      type: type || "yield",
      times: [1],
      zcs: [value], //zero rates are act/365 annual compounding
    });
  };

  // helper function for curve constructor
  let default_yf = null;
  const get_time_at = function (curve, i) {
    if (!curve.times) {
      //construct times from other parameters in order of preference
      //curve times are always act/365
      if (curve.days) return curve.days[i] / 365;
      if (curve.dates) {
        default_yf = default_yf || library.year_fraction_factory("a/365");
        return default_yf(
          library.date_or_null(curve.dates[0]),
          library.date_or_null(curve.dates[i]),
        );
      }
      if (curve.labels) return library.period_str_to_time(curve.labels[i]);
      throw new Error("Curve: invalid curve, cannot derive times");
    }
    return curve.times[i];
  };

  // helper function for curve constructor
  const get_times = function (curve) {
    let i = (curve.times || curve.days || curve.dates || curve.labels || [])
      .length;
    if (!i)
      throw new Error(
        "Curve: invalid curve, need to provide valid times, days, dates, or labels",
      );
    const times = new Array(i);
    while (i > 0) {
      i--;
      times[i] = get_time_at(curve, i);
    }
    return times;
  };

  // helper function for curve constructor
  const get_values = function (curve, compounding) {
    // extract times, rates and discount factors from curve and store in hidden function scope
    let times = get_times(curve);
    let size = times.length;
    let zcs = library.number_vector_or_null(curve.zcs);
    let dfs = library.number_vector_or_null(curve.dfs);

    if (null === zcs) {
      if (null === dfs)
        throw new Error(
          "Curve: invalid curve, must provide numeric zcs or dfs",
        );
      zcs = new Array(size);
      for (let i = 0; i < size; i++) {
        zcs[i] = compounding.zc(times[i], dfs[i]);
      }
    }
    return [size, times, zcs];
  };

  /**
   * Class representing a curve
   * @memberof JsonRisk
   * @extends Simulatable
   */
  class Curve extends library.Simulatable {
    #times = null;
    #zcs = null;
    #intp = null;
    #compounding = null;
    #get_rate = null;
    #get_rate_scenario = null;
    #short_end_flat = true;
    #long_end_flat = true;

    /**
     * Create a Curve.
     * @param {obj} obj A plain object representing a curve. Must contain either times, labels, days or dates, and either zcs or dfs.
     * @param {Array} obj.times A vector of times
     * @param {Array} obj.labels A vector of labels
     * @param {Array} obj.days A vector of days
     * @param {Array} obj.dates A vector of dates
     * @param {Array} obj.zcs A vector of zero-coupon rates
     * @param {Array} obj.dfs A vector of discount factors
     * @param {String} obj.compounding Compounding method, valid values are "a", "annual", "c", "continuous", each case insensitive
     * @param {String} obj.intp Interpolation method, either "linear_zc", "linear_df", "linear_rt", "bessel" or "hermite"
     * @param {bool} obj.short_end_flat Extrapolation method is flat on zeros if this flag is true
     * @param {bool} obj.long_end_flat Extrapolation method is flat on zeros if this flag is true
     */
    constructor(obj) {
      super(obj);

      // compounding
      this.#compounding = library.compounding_factory(obj.compounding);

      // delete invalid members
      for (const member of ["dfs", "zcs", "times", "days", "dates", "labels"]) {
        if (!Array.isArray(obj[member])) delete obj[member];
      }

      // extract times, rates and discount factors from curve and store in hidden function scope
      const [_size, _times, _zcs] = get_values(obj, this.#compounding);
      this.#times = Object.freeze(_times);
      this.#zcs = Object.freeze(_zcs);

      let _get_interpolated_rate;
      let _always_flat = false;
      this.#intp = (obj.intp || "").toLowerCase();
      switch (this.#intp) {
        case "linear_zc":
          // interpolation on zcs
          _get_interpolated_rate = library.linear_interpolation_factory(
            this.#times,
            this.#zcs,
          );
          break;
        case "linear_rt":
          // interpolation on zcs
          _get_interpolated_rate = library.linear_xy_interpolation_factory(
            this.#times,
            this.#zcs,
          );
          _always_flat = true;
          break;
        case "bessel":
        case "hermite":
          // bessel-hermite spline interpolation
          _get_interpolated_rate = library.bessel_hermite_interpolation_factory(
            this.#times,
            this.#zcs,
          );
          break;
        default: {
          // interpolation on dfs
          this.#intp = "linear_df";
          let _dfs = new Array(_size);
          for (let i = 0; i < _size; i++) {
            _dfs[i] = this.#compounding.df(this.#times[i], this.#zcs[i]);
          }

          const _interpolation = library.linear_interpolation_factory(
            this.#times,
            _dfs,
          );

          const comp = this.#compounding;
          _get_interpolated_rate = function (t) {
            return comp.zc(t, _interpolation(t));
          };
          _always_flat = true;
        }
      }

      // extrapolation
      this.#short_end_flat = !(obj.short_end_flat === false) || _always_flat;
      this.#long_end_flat = !(obj.long_end_flat === false) || _always_flat;
      this.#get_rate = function (t) {
        if (t <= _times[0] && this.#short_end_flat) return _zcs[0];
        if (t >= _times[_size - 1] && this.#long_end_flat)
          return _zcs[_size - 1];
        return _get_interpolated_rate(t);
      };

      this.#get_rate_scenario = this.#get_rate;
    }

    // detach scenario rule
    detach_rule() {
      this.#get_rate_scenario = this.#get_rate;
    }

    // attach scenario rule
    attach_rule(rule) {
      if (typeof rule === "object") {
        const scenario = new library.Curve({
          labels: rule.labels_x,
          zcs: rule.values[0],
          intp: rule.model === "absolute" ? this.#intp : "linear_zc",
        });
        if (rule.model === "multiplicative")
          this.#get_rate_scenario = function (t) {
            return this.#get_rate(t) * scenario.get_rate(t);
          };
        if (rule.model === "additive")
          this.#get_rate_scenario = function (t) {
            return this.#get_rate(t) + scenario.get_rate(t);
          };
        if (rule.model === "absolute")
          this.#get_rate_scenario = function (t) {
            return scenario.get_rate(t);
          };
      } else {
        this.detach_rule();
      }
    }

    /**
     * Get the zero coupon rate, aware of the attached scenario.
     * @param {number} t the time
     * @return {number} Zero-coupon rate for time t.
     */
    get_rate(t) {
      return this.#get_rate_scenario(t);
    }

    /**
     * Get the discount factor, aware of the attached scenario.
     * @param {number} t the time
     * @return {number} Discount factor for time t.
     */
    get_df(t) {
      return this.#compounding.df(t, this.#get_rate_scenario(t));
    }

    /**
     * Get the forward amount for a future time period, aware of the attached scenario.
     * @param {number} tstart the start time of the period
     * @param {number} tend the end time of the peroid
     * @return {number} Returns the forward amount per unit of notional when using the curve as a forward curve. The forward amount is defined as the discount factr at tstart, divided by the discount factor at tend, minus 1.
     */
    get_fwd_amount(tstart, tend) {
      if (tend - tstart < 1 / 512) return 0.0;
      return this.get_df(tstart) / this.get_df(tend) - 1;
    }

    /**
     * Get the times.
     * @type {Array}
     */
    get times() {
      return this.#times;
    }

    /**
     * Get the zero coupon rates.
     * @type {Array}
     */
    get zcs() {
      return this.#zcs;
    }

    /**
     * Get the type, always returns "yield"
     * @type {string}
     */
    get type() {
      return "yield";
    }

    /**
     * Get the interpolation method
     * @type {string}
     */
    get intp() {
      return this.#intp;
    }

    /**
     * Get the long end extrapolation flag
     * @type {boolean}
     */
    get long_end_flat() {
      return this.#long_end_flat;
    }

    /**
     * Get the short end extrapolation flag
     * @type {boolean}
     */
    get short_end_flat() {
      return this.#short_end_flat;
    }

    /**
     * Get the compounding method
     * @type {string}
     */
    get compounding() {
      return this.#compounding.name;
    }

    /**
     * Get the discount factors.
     * @type {Array}
     */
    get dfs() {
      let res = new Array(this.#times.length);
      for (let i = 0; i < res.length; i++) {
        res[i] = this.#compounding.df(this.#times[i], this.#zcs[i]);
      }
      return res;
    }

    /**
     * Helper for cloning and serialisation
     * @function
     * @return {Object} A plain javascript object representing the curve
     */
    toJSON() {
      const res = super.toJSON();
      res.type = this.type;
      res.times = this.times;
      res.zcs = this.#zcs;
      res.intp = this.#intp;
      res.compounding = this.#compounding.name;
      if (this.#intp !== "linear_rt" && this.#intp !== "linear_df") {
        res.long_end_flat = this.#long_end_flat;
        res.short_end_flat = this.#long_end_flat;
      }
      return res;
    }
  }

  library.Curve = Curve;
})(this.JsonRisk || module.exports);
(function (library) {
  // helper function for constructor
  const get_times = function (labels) {
    //construct times from labels
    let res = null;
    if (Array.isArray(labels)) {
      res = labels.map((label) => library.period_str_to_time(label));
    }
    if (!res)
      throw new Error(
        "Surface: invalid surface, does not have times and no valid labels",
      );
    return res;
  };

  /**
   * Class representing a surface parametrised by expiries and absolute or relative strikes.
   * @memberof JsonRisk
   */
  class ExpiryStrikeSurface extends library.Simulatable {
    #expiries = null;
    #moneyness = [];
    get_surface_rate_scenario = null;

    /**
     * Create an ExpiryStrikeSurface.
     * @param {obj} obj A plain object representing an ExpiryStrikeSurface. Must contain either expiries or labels_expiry, and must contain values
     * @param {Array} obj.expiries A vector of times to expiry
     * @param {Array} obj.labels_expiry A vector of labels representing time to expiry
     * @param {Array} obj.moneyness A vector of numbers representing moneyness
     * @param {Array} obj.value A matrix of numbers representing volatility
     */
    constructor(obj) {
      super(obj);

      // expiries
      if ("expiries" in obj) {
        this.#expiries = library.number_vector_or_null(obj.expiries);
      } else {
        this.#expiries = get_times(obj.labels_expiry);
      }
      Object.freeze(this.#expiries);

      // moneyness
      if ("moneyness" in obj) {
        this.#moneyness = library.number_vector_or_null(obj.moneyness);
        Object.freeze(this.#expiries);
      }

      // interpolation
      this.get_surface_rate = library.interpolation2d_factory(
        this.#expiries,
        this.#moneyness,
        obj.values,
      );

      // scenario dependent surface evaluation
      this.get_surface_rate_scenario = this.get_surface_rate;
    }

    get expiries() {
      return this.#expiries;
    }

    get moneyness() {
      return this.#moneyness;
    }

    // detach scenario rule
    detach_rule() {
      this.get_surface_rate_scenario = this.get_surface_rate;
    }

    // attach scenario rule
    attach_rule(rule) {
      if (typeof rule === "object") {
        const scen = new library.ExpiryStrikeSurface({
          labels_expiry: rule.labels_y,
          moneyness: [0.0],
          values: [rule.values[0]],
        });

        if (rule.model === "multiplicative") {
          this.get_surface_rate_scenario = function (t_expiry, t_moneyness) {
            return (
              this.get_surface_rate(t_expiry, t_moneyness) *
              scen.get_surface_rate(t_expiry, t_moneyness)
            );
          };
        }
        if (rule.model === "additive") {
          this.get_surface_rate_scenario = function (t_expiry, t_moneyness) {
            return (
              this.get_surface_rate(t_expiry, t_moneyness) +
              scen.get_surface_rate(t_expiry, t_moneyness)
            );
          };
        }
        if (rule.model === "absolute") {
          this.get_surface_rate_scenario = function (t_expiry, t_moneyness) {
            return scen.get_surface_rate(t_expiry, t_moneyness);
          };
        }
      } else {
        this.detach_rule();
      }
    }

    // interpolation function for cube
    get_rate(
      t_expiry_not_used,
      t_term_not_used,
      fwd_not_used,
      strike_not_used,
    ) {
      throw new Error(
        "ExpiryStrikeSurface: get_rate not implemented, use ExpiryRelStrikeSurface or ExpiryAbsStrikeSurface",
      );
    }

    toJSON() {
      const res = super.toJSON();
      res.type = this.type;
      res.expiries = this.#expiries;
      res.moneyness = this.#moneyness;
      res.values = res.expiries.map((expiry) => {
        return res.moneyness.map((moneyness) => {
          return this.get_surface_rate(expiry, moneyness);
        });
      });
      return res;
    }
  }

  /**
   * Class representing a surface parametrised by expiries and absolute strikes
   * @memberof JsonRisk
   * @extends ExpiryStrikeSurface
   */
  class ExpiryAbsStrikeSurface extends ExpiryStrikeSurface {
    /**
     * Create an ExpiryAbsStrikeSurface.
     * @param {obj} obj A plain object representing an ExpiryAbsStrikeSurface. Must contain the required properties for ExpiryStrikeSurface
     * @param {string} obj.type Type, must "be expiry_abs_strike"
     */
    constructor(obj) {
      super(obj);
      if (obj.type !== "expiry_abs_strike")
        throw new Error(
          "ExpiryAbsStrikeSurface: type must be expiry_abs_strike",
        );
    }
    // getter functions
    get type() {
      return "expiry_abs_strike";
    }
    get_rate(t_expiry, t_term_not_used, fwd_not_used, strike) {
      return this.get_surface_rate_scenario(t_expiry, strike);
    }
  }

  /**
   * Class representing a surface parametrised by expiries and absolute strikes
   * @memberof JsonRisk
   * @extends ExpiryStrikeSurface
   */
  class ExpiryRelStrikeSurface extends ExpiryStrikeSurface {
    /**
     * Create an ExpiryRelStrikeSurface.
     * @param {obj} obj A plain object representing an ExpiryRelStrikeSurface. Must contain the required properties for ExpiryStrikeSurface
     * @param {string} obj.type Type, must "be expiry_abs_strike"
     */
    constructor(obj) {
      super(obj);
      if (obj.type !== "expiry_rel_strike")
        throw new Error(
          "ExpiryRelStrikeSurface: type must be expiry_rel_strike",
        );
    }
    // getter functions
    get type() {
      return "expiry_rel_strike";
    }

    get_rate(t_expiry, t_term_not_used, fwd, strike) {
      return this.get_surface_rate_scenario(t_expiry, strike - fwd);
    }
  }

  library.ExpiryAbsStrikeSurface = ExpiryAbsStrikeSurface;
  library.ExpiryRelStrikeSurface = ExpiryRelStrikeSurface;
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * Class representing a scalar
   * @memberof JsonRisk
   * @extends Simulatable
   */
  class Scalar extends library.Simulatable {
    #value = null;
    #scenario_value = null;
    /**
     * Create a Scalar.
     * @param {obj} obj A plain object representing a scalar
     * @param {number} obj.value The scalar value.
     */
    constructor(obj) {
      super(obj);
      this.#value = library.number_or_null(obj.value);
      this.#scenario_value = this.#value;
    }

    attach_rule(rule) {
      const scenval = rule.values[0][0];
      if (rule.model === "multiplicative")
        this.#scenario_value = this.#value * scenval;
      if (rule.model === "additive")
        this.#scenario_value = this.#value + scenval;
      if (rule.model === "absolute") this.#scenario_value = scenval;
    }

    detach_rule() {
      this.#scenario_value = this.#value;
    }

    get_value() {
      return this.#scenario_value;
    }

    get type() {
      return "scalar";
    }

    toJSON() {
      const res = super.toJSON();
      res.type = this.type;
      res["value"] = this.#value;
      return res;
    }
  }

  library.Scalar = Scalar;
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * ...
   * @param {number} value
   * @param {string} type
   * @returns {object} surface
   * @memberof JsonRisk
   * @public
   */
  library.get_const_surface = function (value, type) {
    if (typeof value !== "number")
      throw new Error("get_const_surface: input must be number.");
    return new library.Surface({
      type: type || "",
      expiries: [1],
      terms: [1],
      values: [[value]],
    });
  };

  // helper function for constructor
  const get_times = function (labels) {
    //construct times from labels
    let res = null;
    if (Array.isArray(labels)) {
      res = labels.map((label) => library.period_str_to_time(label));
    }
    if (!res)
      throw new Error(
        "Surface: invalid surface, does not have times and no valid labels",
      );
    return res;
  };

  /**
   * Class representing a surface parametrised by expiries and terms
   * @memberof JsonRisk
   * @extends Simulatable
   */
  class Surface extends library.Simulatable {
    #expiries = null;
    #terms = null;
    #moneyness = [];
    #smile = [];
    #get_surface_rate_scenario = null;

    /**
     * Create a Surface parametrised by expiries and terms.
     * @param {obj} obj A plain object representing a Surface. Must contain either expiries or labels_expiry, either terms or labels_term, and must contain values
     * @param {Array} obj.expiries A vector of times, i.e., numbers corresponding to expiry
     * @param {Array} obj.labels_expiry A vector of labels representing time to expiry
     * @param {Array} obj.terms A vector of times, i.e., numbers, representing the underlying terms
     * @param {Array} obj.labels_expiry A vector of labels representing the underlying terms
     * @param {Array} obj.value A matrix of numbers representing volatility
     */
    constructor(obj) {
      super(obj);

      // expiries
      if ("expiries" in obj) {
        this.#expiries = library.number_vector_or_null(obj.expiries);
      } else {
        this.#expiries = get_times(obj.labels_expiry);
      }
      Object.freeze(this.#expiries);

      // terms
      if ("terms" in obj) {
        this.#terms = library.number_vector_or_null(obj.terms);
      } else {
        this.#terms = get_times(obj.labels_term);
      }
      Object.freeze(this.#terms);

      // interpolation
      this.get_surface_rate = library.interpolation2d_factory(
        this.#expiries,
        this.#terms,
        obj.values,
      );

      // moneyness
      if ("moneyness" in obj) {
        this.#moneyness = library.number_vector_or_null(obj.moneyness);
      }

      // smile
      if ("smile" in obj) {
        if (!Array.isArray(obj.smile))
          throw new Error("Surface: smile must be an array");
        this.#smile = obj.smile.map((s) => {
          if (!(s instanceof library.Surface)) {
            // no recursions, smile surfaces must not have smiles themselves
            let temp = Object.assign({}, s);
            delete temp.moneyness;
            delete temp.smile;

            // make surface
            return new library.Surface(temp);
          } else {
            return s;
          }
        });
      }

      // check consistency
      if (this.#moneyness.length !== this.#smile.length)
        throw new Error(
          "Surface: smile and moneyness must have the same length",
        );

      // scenario dependent surface evaluation
      this.#get_surface_rate_scenario = this.get_surface_rate;
    }

    // getter functions
    get type() {
      return "expiry_term";
    }

    get expiries() {
      return this.#expiries;
    }

    get terms() {
      return this.#terms;
    }

    // detach scenario rule
    detach_rule() {
      this.#get_surface_rate_scenario = this.get_surface_rate;
    }

    // attach scenario ruls
    attach_rule(rule) {
      if (typeof rule === "object") {
        const scen = new library.Surface({
          labels_expiry: rule.labels_y,
          labels_term: rule.labels_x,
          values: rule.values,
        });

        if (rule.model === "multiplicative") {
          this.#get_surface_rate_scenario = function (t_expiry, t_term) {
            return (
              this.get_surface_rate(t_expiry, t_term) *
              scen.get_surface_rate(t_expiry, t_term)
            );
          };
        }
        if (rule.model === "additive") {
          this.#get_surface_rate_scenario = function (t_expiry, t_term) {
            return (
              this.get_surface_rate(t_expiry, t_term) +
              scen.get_surface_rate(t_expiry, t_term)
            );
          };
        }
        if (rule.model === "absolute") {
          this.#get_surface_rate_scenario = function (t_expiry, t_term) {
            return scen.get_surface_rate(t_expiry, t_term);
          };
        }
      } else {
        this.detach_rule();
      }
    }

    // interpolation function for cube
    get_rate(t_expiry, t_term, fwd, strike) {
      // atm rate can have a scenario
      const atm = this.#get_surface_rate_scenario(t_expiry, t_term);

      // optionally, we consider a smile on the surface
      if (this.#smile.length > 0) {
        let imin = 0;
        let imax = this.#smile.length - 1;

        // smile only has one extra surface
        if (imin === imax)
          return atm + this.#smile[imin].get_surface_rate(t_expiry, t_term);

        // determine moneyness
        let m = strike - fwd;
        let mmin = this.#moneyness[imin];
        let mmax = this.#moneyness[imax];
        //extrapolation (constant)
        if (m < mmin)
          return atm + this.#smile[imin].get_surface_rate(t_expiry, t_term);
        if (m > mmax)
          return atm + this.#smile[imax].get_surface_rate(t_expiry, t_term);

        // binary search
        let imed, mmed;
        while (imin + 1 !== imax) {
          imed = ((imin + imax) / 2.0) | 0; // truncate the mean time down to the closest integer
          mmed = this.#moneyness[imed];
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
        const temp = 1 / (mmax - mmin);
        return (
          atm +
          (this.#smile[imin].get_surface_rate(t_expiry, t_term) * (mmax - m) +
            this.#smile[imax].get_surface_rate(t_expiry, t_term) * (m - mmin)) *
            temp
        );
      }
      return atm;
    }

    toJSON() {
      const res = super.toJSON();
      res.type = this.type;
      res.expiries = this.#expiries;
      res.terms = this.#terms;
      res.values = res.expiries.map((expiry) => {
        return res.terms.map((term) => {
          return this.get_surface_rate(expiry, term);
        });
      });
      return res;
    }
  }

  library.Surface = Surface;
})(this.JsonRisk || module.exports);
(function (library) {
  const error_message = "Deps: name must be a string and cannot be empty";
  class Deps {
    #scalars = new Set();
    #curves = new Set();
    #surfaces = new Set();
    #currencies = new Set();
    constructor() {}

    add_scalar(name) {
      this.#scalars.add(library.nonempty_string_or_throw(name, error_message));
    }

    add_curve(name) {
      this.#curves.add(library.nonempty_string_or_throw(name, error_message));
    }

    add_surface(name) {
      this.#surfaces.add(library.nonempty_string_or_throw(name, error_message));
    }

    add_currency(name) {
      this.#currencies.add(
        library.nonempty_string_or_throw(name, error_message),
      );
    }

    get scalars() {
      return Array.from(this.#scalars);
    }

    get curves() {
      return Array.from(this.#curves);
    }

    get surfaces() {
      return Array.from(this.#surfaces);
    }

    get currencies() {
      return Array.from(this.#currencies);
    }

    minimal_params(params_json) {
      const obj = {
        valuation_date: null,
        main_currency: null,
        scalars: {},
        curves: {},
        surfaces: {},
        scenario_groups: [],
      };

      if ("valuation_date" in params_json) {
        obj.valuation_date = params_json.valuation_date;
      }

      if ("main_currency" in params_json) {
        obj.main_currency = params_json.main_currency;
      }

      const main_currency = new library.Params(obj).main_currency;

      if ("scalars" in params_json) {
        for (const s of this.#scalars) {
          if (s in params_json.scalars) obj.scalars[s] = params_json.scalars[s];
        }

        for (const c of this.#currencies) {
          if (c in params_json.scalars) obj.scalars[c] = params_json.scalars[c];
          for (const delim of ["", "/", "_", "-"]) {
            for (const name of [
              c + delim + main_currency,
              main_currency + delim + c,
            ]) {
              if (name in params_json.scalars)
                obj.scalars[name] = params_json.scalars[name];
            }
          }
        }
      }

      if ("curves" in params_json) {
        for (const c of this.#curves) {
          if (c in params_json.curves) obj.curves[c] = params_json.curves[c];
        }
      }

      if ("surfaces" in params_json) {
        for (const s of this.#surfaces) {
          if (s in params_json.surfaces)
            obj.surfaces[s] = params_json.surfaces[s];
        }
      }

      if ("scenario_groups" in params_json) {
        obj.scenario_groups = params_json.scenario_groups;
      }

      return new library.Params(obj);
    }
  }

  library.Deps = Deps;
})(this.JsonRisk || module.exports);
(function (library) {
  const name_to_moneyness = function (str) {
    const s = str.toLowerCase();
    if (s.endsWith("atm")) return 0; //ATM surface
    const n = s.match(/([+-][0-9]+)bp$/); //find number in name, convention is NAME+100BP, NAME-50BP
    if (n.length < 2) return null;
    return n[1] / 10000;
  };

  const find_smile = function (name, list) {
    const res = [];
    let moneyness;
    for (let i = 0; i < list.length; i++) {
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
  };

  class Params {
    #valuation_date = null;
    #main_currency = "EUR";
    #scalars = {};
    #curves = {};
    #surfaces = {};
    #scenario_groups = [];
    #num_scenarios = 1; // without any scenarios, num_scenarios is one since a base scenario is implicitly included

    constructor(obj) {
      // valuation date
      if (!("valuation_date" in obj))
        throw new Error("Params: must contain a valuation_date property");
      this.#valuation_date = library.date_or_null(obj.valuation_date);

      // main currency
      if (typeof obj.main_currency === "string") {
        if (obj.main_currency.length != 3)
          throw new Error(
            "Params: main_currency must be a three-letter currency code.",
          );
        this.#main_currency = obj.main_currency;
      }

      // scalars
      if ("scalars" in obj) {
        for (const [key, value] of Object.entries(obj.scalars)) {
          // make shallow copy for adding name
          const temp = Object.assign({}, value);
          temp.name = key;
          this.#scalars[key] = new library.Scalar(temp);
        }
      }

      // curves
      if ("curves" in obj) {
        for (const [key, value] of Object.entries(obj.curves)) {
          // make shallow copy for adding name
          const temp = Object.assign({}, value);
          temp.name = key;
          this.#curves[key] = new library.Curve(temp);
        }
      }

      // surfaces
      if ("surfaces" in obj) {
        //link smile surfaces to their atm surface
        const keys = Object.keys(obj.surfaces);
        for (const key of keys) {
          // make shallow copy of surface for adding name and smile
          const temp = Object.assign({}, obj.surfaces[key]);
          temp.name = key;
          const smile = find_smile(key, keys);
          if (smile.length > 0) {
            temp.smile = [];
            temp.moneyness = [];
            for (const s of smile) {
              const { name, moneyness } = s;
              temp.smile.push(obj.surfaces[name]);
              temp.moneyness.push(moneyness);
            }
          }
          this.#surfaces[key] = library.make_surface(temp);
        }
      }

      // scenario groups
      if ("scenario_groups" in obj) {
        if (!Array.isArray(obj.scenario_groups))
          throw new Error("Params: scenario_groups must be an array");
        this.#scenario_groups = obj.scenario_groups;
        for (const group of this.#scenario_groups) {
          if (!Array.isArray(group))
            throw new Error(
              "Params: each group in scenario_groups must be an array.",
            );
          this.#num_scenarios += group.length;
        }
      }

      // calendars are actually stored within the library and not in this object
      if ("calendars" in obj) {
        if (typeof obj.calendars !== "object")
          throw new Error("Params: Calendars object is invalid");
        for (const [calname, cal] of Object.entries(obj.calendars)) {
          library.add_calendar(calname, cal.dates);
        }
      }
    }

    get valuation_date() {
      return this.#valuation_date;
    }

    get main_currency() {
      return this.#main_currency;
    }

    get num_scenarios() {
      return this.#num_scenarios;
    }

    get scalar_names() {
      return Object.keys(this.#scalars);
    }

    get curve_names() {
      return Object.keys(this.#curves);
    }

    get surface_names() {
      return Object.keys(this.#surfaces);
    }

    has_scalar(name) {
      const n = library.nonempty_string_or_throw(
        name,
        "get_scalar: name must be nonempty string",
      );
      return n in this.#scalars;
    }

    has_curve(name) {
      const n = library.nonempty_string_or_throw(
        name,
        "get_scalar: name must be nonempty string",
      );
      return n in this.#curves;
    }

    has_surface(name) {
      const n = library.nonempty_string_or_throw(
        name,
        "get_scalar: name must be nonempty string",
      );
      return n in this.#surfaces;
    }

    get_scalar(name) {
      const n = library.nonempty_string_or_throw(
        name,
        "get_scalar: name must be nonempty string",
      );
      if (!(n in this.#scalars)) throw new Error(`Params: no such scalar ${n}`);
      return this.#scalars[n];
    }

    get_curve(name) {
      const n = library.nonempty_string_or_throw(
        name,
        "get_curve: name must be nonempty string",
      );
      if (!(n in this.#curves)) throw new Error(`Params: no such curve ${n}`);
      return this.#curves[n];
    }

    get_surface(name) {
      const n = library.nonempty_string_or_throw(
        name,
        "get_curve: name must be nonempty string",
      );
      if (!(n in this.#surfaces))
        throw new Error(`Params: no such surface ${n}`);
      return this.#surfaces[n];
    }

    #value_in_main_currency(cur) {
      let mcur = this.#main_currency;
      if (cur == mcur) return 1.0;
      if (cur in this.#scalars) return 1.0 / this.#scalars[cur].get_value();
      const delimiters = ["", "/", "_", "-"];
      for (const d of delimiters) {
        const name = cur + d + mcur;
        if (name in this.#scalars) return this.#scalars[name].get_value();
        const inverse = mcur + d + cur;
        if (inverse in this.#scalars)
          return 1.0 / this.#scalars[inverse].get_value();
      }
      throw new Error(
        `Params: no scalar found that converts ${cur} to ${mcur}`,
      );
    }

    get_fx_rate(from, to) {
      if (from === to) return 1.0;
      return (
        this.#value_in_main_currency(from) / this.#value_in_main_currency(to)
      );
    }

    detach_scenarios() {
      for (const container of [this.#scalars, this.#curves, this.#surfaces]) {
        for (const item of Object.values(container)) {
          item.detach_rule();
        }
      }
    }

    get_scenario(n) {
      if (n === 0) return null;
      let i = 0;
      for (const group of this.#scenario_groups) {
        for (const scenario of group) {
          i++;
          if (n === i) return scenario;
        }
      }
      return null;
    }

    attach_scenario(n) {
      const scenario = this.get_scenario(n);
      if (!scenario) return this.detach_scenarios();
      const rules = scenario.rules;

      // attach scenario if one of the rules match
      const match = function (item, rule) {
        if (Array.isArray(rule.risk_factors)) {
          // match by risk factors
          if (rule.risk_factors.indexOf(item.name) > -1) {
            return true;
          }
        }
        if (Array.isArray(rule.tags)) {
          // if no exact match by risk factors, all tags of that rule must match
          let found = true;
          for (const tag of rule.tags) {
            if (!item.has_tag(tag)) found = false;
          }
          // if tag list is empty, no matching by tags at all
          if (rule.tags.length === 0) found = false;
          if (found) {
            return true;
          }
        }
        return false;
      };

      for (const container of [this.#scalars, this.#curves, this.#surfaces]) {
        for (const item of Object.values(container)) {
          for (const rule of rules) {
            if (match(item, rule)) {
              item.attach_rule(rule);
              break;
            }
          }
        }
      }
    }

    toJSON() {
      const mapper = ([key, value]) => [key, value.toJSON()];
      const res = {
        valuation_date: library.date_to_date_str(this.#valuation_date),
        main_currency: this.#main_currency,
        scalars: Object.fromEntries(Object.entries(this.#scalars).map(mapper)),
        curves: Object.fromEntries(Object.entries(this.#curves).map(mapper)),
        surfaces: Object.fromEntries(
          Object.entries(this.#surfaces).map(mapper),
        ),
      };
      return res;
    }
  }

  library.Params = Params;
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * calculates the present value for any given supported instrument (bond, floater, fxterm, swap, swaption, callable_bond)
   * @param {object} instrument any instrument
   * @returns {number} present value
   * @memberof JsonRisk
   * @public
   */
  library.vector_pricer = function (instrument_json, params_json) {
    const simulation_once = function () {
      this.results.present_value = new Array(this.num_scenarios);
    };

    const simulation_scenario = function () {
      const i = this.idx_scen;
      this.results.present_value[i] = this.instrument.value(this.params);
    };

    const module = {
      simulation_once: simulation_once,
      simulation_scenario: simulation_scenario,
    };

    return library.simulation(instrument_json, params_json, [module])
      .present_value;
  };

  /**
   * runs a generic simulation on an instrument
   * @param {object} instrument any instrument
   * @param {array} modules an array of modules, i.e. objects that define either the simulation_once or simulation_scenario function, or both
   * @returns {object} results object
   * @memberof JsonRisk
   * @public
   */
  library.simulation = function (instrument_json, params_json, modules) {
    if (typeof instrument_json.type !== "string")
      throw new Error("simulation: instrument object must contain valid type");
    library.set_valuation_date(params_json.valuation_date);

    // create context for module execution
    const context = {
      instrument_json: instrument_json,
      instrument: library.make_instrument(instrument_json),
      params_json: params_json,
      params: null,
      idx_scen: 0,
      results: {},
    };

    // obtain dependencies on parameters
    const deps = new library.Deps();
    context.instrument.add_deps(deps);

    // obtain required set of params
    context.params = deps.minimal_params(params_json);
    context.num_scenarios = context.params.num_scenarios;

    for (let i = 0; i < context.num_scenarios; i++) {
      // update context for scenario
      context.idx_scen = i;

      // attach scenarios to params
      context.params.attach_scenario(i);

      // call simulation_once for all modules for i=0
      for (let j = 0; j < modules.length; j++) {
        if (0 === i && "function" === typeof modules[j].simulation_once)
          modules[j].simulation_once.call(context);
      }

      // call simulation_scenario for all modules for i=0
      for (let j = 0; j < modules.length; j++) {
        if ("function" === typeof modules[j].simulation_scenario)
          modules[j].simulation_scenario.call(context);
      }
    }
    return context.results;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * creates a forward schedule from start up to but excluding end, using tenor as frequency
   * @param {date} start start date
   * @param {date} end end date
   * @param {number} tenor tenor
   * @param {} adjust_func
   * @returns {object} schedule
   * @memberof JsonRisk
   * @private
   */
  const forward_rollout = function (start, end, tenor, adjust_func) {
    const res = [start];
    let i = 1,
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
   * @memberof JsonRisk
   * @private
   */
  const backward_rollout = function (start, end, tenor, adjust_func) {
    const res = [end];
    let i = 1,
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
   * @memberof JsonRisk
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

    let res;
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
   * @memberof JsonRisk
   */

  /*
    
            JsonRisk date and time functions
            
            
    */

  "use strict";

  const dl = 1000 * 60 * 60 * 24; // length of one day in milliseconds
  const one_over_dl = 1.0 / dl;

  /**
   * checks if a year is a leap year
   * @param {number} y year
   * @returns {boolean} true, if leap year
   * @memberof JsonRisk
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
   * @memberof JsonRisk
   * @private
   */
  function days_in_month(y, m) {
    switch (m) {
      case 1:
        return is_leap_year(y) ? 29 : 28;
      case 3:
      case 5:
      case 8:
      case 10:
        return 30;
      default:
        return 31;
    }
  }

  /*!
    
            Year Fractions
    
    */
  /**
   * counts days between to dates
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} days between from and to date
   * @memberof JsonRisk
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
   * @memberof JsonRisk
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
   * @memberof JsonRisk
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
   * @memberof JsonRisk
   * @private
   */
  function yf_30U360(from, to) {
    const y1 = from.getUTCFullYear();
    const y2 = to.getUTCFullYear();
    const m1 = from.getUTCMonth();
    const m2 = to.getUTCMonth();
    const d1 = Math.min(from.getUTCDate(), 30);
    let d2 = to.getUTCDate();
    if (29 < d1 && 31 == d2) d2 = 30;
    return ((y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1)) / 360;
  }

  /**
   * year fraction 30E/360 according to the ISDA 2006 rules, section 4.16 (g)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (30E/360)
   * @memberof JsonRisk
   * @private
   */
  function yf_30E360(from, to) {
    const y1 = from.getUTCFullYear();
    const y2 = to.getUTCFullYear();
    const m1 = from.getUTCMonth();
    const m2 = to.getUTCMonth();
    const d1 = Math.min(from.getUTCDate(), 30);
    const d2 = Math.min(to.getUTCDate(), 30);
    return ((y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1)) / 360;
  }

  /**
   * year fraction 30E/360 (ISDA) according to the ISDA 2006 rules, section 4.16 (h)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (30E/360 ISDA)
   * @memberof JsonRisk
   * @private
   */
  function yf_30G360(from, to) {
    const y1 = from.getUTCFullYear();
    const y2 = to.getUTCFullYear();
    const m1 = from.getUTCMonth();
    const m2 = to.getUTCMonth();
    let d1 = Math.min(from.getUTCDate(), 30);
    let d2 = Math.min(to.getUTCDate(), 30);
    if (1 == m1 && d1 == days_in_month(y1, m1)) d1 = 30;
    if (1 == m2 && d2 == days_in_month(y2, m2)) d2 = 30;
    return ((y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1)) / 360;
  }

  /**
   * year fraction act/act  according to the ISDA 2006 rules, section 4.16 (b)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (act/act)
   * @memberof JsonRisk
   * @private
   */
  function yf_actact(from, to) {
    if (from - to === 0) return 0;
    if (from > to) return -yf_actact(to, from);
    const yfrom = from.getUTCFullYear();
    const yto = to.getUTCFullYear();
    if (yfrom === yto)
      return days_between(from, to) / (is_leap_year(yfrom) ? 366 : 365);
    let res = yto - yfrom - 1;
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
   * @memberof JsonRisk
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
   * @memberof JsonRisk
   * @public
   */
  library.time_from_now = function (d) {
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
   * @memberof JsonRisk
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
   * @memberof JsonRisk
   * @public
   */
  library.add_months = function (from, nmonths, roll_day) {
    let y = from.getUTCFullYear(),
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
   * @memberof JsonRisk
   * @public
   */
  library.add_period = function (from, str) {
    const num = parseInt(str, 10);
    if (isNaN(num))
      throw new Error(
        "period_str_to_time(str) - Invalid time period string: " + str,
      );
    const unit = str.charAt(str.length - 1);
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
   * @memberof JsonRisk
   * @private
   */
  function easter_sunday(y) {
    const f = Math.floor,
      c = f(y / 100),
      n = y - 19 * f(y / 19),
      k = f((c - 17) / 25);
    let i = c - f(c / 4) - f((c - k) / 3) + 19 * n + 15;
    i = i - 30 * f(i / 30);
    i = i - f(i / 28) * (1 - f(i / 28) * f(29 / (i + 1)) * f((21 - n) / 11));
    let j = y + f(y / 4) + i + 2 - c + f(c / 4);
    j = j - 7 * f(j / 7);
    const l = i - j,
      m = 3 + f((l + 40) / 44),
      d = l + 28 - 31 * f(m / 4);
    return new Date(Date.UTC(y, m - 1, d));
  }

  /**
   * determine if a date is a saturday or sunday
   * @param {date} dt
   * @returns {boolean} true, if saturday or sunday
   * @memberof JsonRisk
   * @private
   */
  function is_holiday_default(dt) {
    const wd = dt.getUTCDay();
    if (0 === wd) return true;
    if (6 === wd) return true;
    return false;
  }

  /**
   * determine, if date is a holiday according to the TARGET calendar
   * @param {date} dt
   * @returns {boolean} true, if holiday
   * @memberof JsonRisk
   * @private
   */
  function is_holiday_target(dt) {
    if (is_holiday_default(dt)) return true;

    const d = dt.getUTCDate();
    const m = dt.getUTCMonth();
    if (1 === d && 0 === m) return true; //new year
    if (25 === d && 11 === m) return true; //christmas

    const y = dt.getUTCFullYear();
    if (1998 === y || 1999 === y || 2001 === y) {
      if (31 === d && 11 === m) return true; // December 31
    }
    if (y > 2000) {
      if ((1 === d && 4 === m) || (26 === d && 11 === m)) return true; //labour and goodwill
      const es = easter_sunday(y);
      if (dt.getTime() === library.add_days(es, -2).getTime()) return true; //Good Friday
      if (dt.getTime() === library.add_days(es, 1).getTime()) return true; //Easter Monday
    }
    return false;
  }

  const calendars = {};

  /**
   * add additional holidays that are no default holidays, i.e., weekend days
   * @param {string} name
   * @param {object} dates
   * @returns {object} the size of the hash table for holidays
   * @memberof JsonRisk
   * @public
   */
  library.add_calendar = function (name, dates) {
    if (!(name instanceof String || typeof name === "string"))
      throw new Error("add_calendar: invalid input.");
    if (!Array.isArray(dates)) throw new Error("add_calendar: invalid input.");
    let n = dates.length,
      i,
      ht_size;
    const holidays = [];
    //only consider array items that are valid dates or date strings and that are no default holidays, i.e., weekend days
    for (i = 0; i < n; i++) {
      const dt = library.date_or_null(dates[i]);
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
    const hash_table = new Array(ht_size);
    for (i = 0; i < ht_size; i++) {
      hash_table[i] = [];
    }

    for (i = 0; i < n; i++) {
      const ht_index =
        Math.floor(holidays[i].getTime() * one_over_dl) % ht_size;
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
   * @memberof JsonRisk
   * @public
   */
  library.is_holiday_factory = function (str) {
    const sl = str.toLowerCase();
    //builtin target calendar
    if (sl === "target") return is_holiday_target;
    //generic hash lookup function for stored calendars
    if (Array.isArray(calendars[sl])) {
      const cal = calendars[sl];
      return function (dt) {
        if (is_holiday_default(dt)) return true;
        const ms = dt.getTime();
        const ht_index = Math.floor(ms * one_over_dl) % cal.length;
        for (let i = 0; i < cal[ht_index].length; i++) {
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
   * @memberof JsonRisk
   * @public
   */
  library.adjust = function (dt, bdc, is_holiday_function) {
    if (!(bdc instanceof String) && typeof bdc !== "string") return dt; // no business day convention specified
    const s = (bdc || "u").charAt(0).toLowerCase();
    let adj = new Date(dt);
    if (s === "u") return adj; //unadjusted

    let m;
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
   * @memberof JsonRisk
   * @public
   */
  library.add_business_days = function (from, n, is_holiday_function) {
    let res = from,
      i = n;
    while (i > 0) {
      res = library.adjust(library.add_days(res, 1), "f", is_holiday_function);
      i--;
    }
    return res;
  };
})(this.JsonRisk || module.exports);
