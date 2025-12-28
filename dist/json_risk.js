/*!
	JSON Risk
	v1.0.1
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
  var valuation_date = null;
  var JsonRisk = {
    get valuation_date() {
      if (!(valuation_date instanceof Date))
        throw new Error("JsonRisk: valuation_date must be set");
      return valuation_date;
    },
  };

  JsonRisk.set_valuation_date = function (d) {
    valuation_date = JsonRisk.date_or_null(d);
    if (null === valuation_date)
      throw new Error("JsonRisk: trying to set invalid valuation_date");
  };

  return JsonRisk;
});
(function (library) {
  /**
   * Takes any value and turns it into a boolean. When a string is entered, returns true if it can be converted into a number other than zero or if it contains "true", "yes", "t" or "y", each case insensitive. Returns false otherwise. Does not throw.
   * @param {boolean} b
   * @returns {boolean} boolean vector
   * @memberof library
   * @public
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
   * Takes any value and converts it into a vector of booleans without throwing. Strings like "true true false" are split by spaces. If the value cannot be converted, returns single-entry array [false].
   * @param {boolean} b
   * @returns {boolean} boolean vector
   * @memberof library
   * @public
   */
  library.make_bool_vector = function (b) {
    //returns vector of booleans when input can be converted to booleans.
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
      res[i] = library.make_bool(res[i]);
    }
    return res;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * calculates the time in years from a given period string
   * @param {string} str time string (xY, xM, xW, xD)
   * @returns {number} time in years
   * @memberof library
   * @public
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
   * constructs a javascript date object from a JSON risk conformant date string
   * @param {string} str date string
   * @returns {date} javascript date object
   * @memberof library
   * @public
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
   * constructs a JSON risk conformant date string YYYY-MM-DD from a javascript date object or another JSON risk conformant date string
   * @param {date} date object
   * @returns {string} date string
   * @memberof library
   * @public
   */
  library.date_to_date_str = function (d) {
    var dobj = library.date_or_null(d);
    if (null === dobj) throw new Error("date_to_date_str: invalid input.");
    return dobj.toISOString().slice(0, 10);
  };

  /**
   * takes a valid date string, a javascript date object, or a falsy value and returns a javascript date object or null. Normalises non-utc dates. Throws on invalid types (if not falsy) and nonempty date strings
   * @param {date} d
   * @returns {date} javascript date object
   * @memberof library
   * @public
   */
  library.date_or_null = function (d) {
    if (!d) return null;
    if (d instanceof Date) {
      var h = d.getUTCHours();
      var y = d.getUTCFullYear();
      var m = d.getUTCMonth();
      var t = d.getUTCDate();
      if (h > 11) t++; // advance to next day UTC 0:00 date
      return new Date(Date.UTC(y, m, t));
    }
    if (d instanceof String || typeof d === "string")
      return library.date_str_to_date(d);
    throw new Error("date_or_null: invalid input.");
  };

  /**
   * takes a valid date string, or a javascript date object and returns a javascript date object or null. Normalises non-utc dates. Throws on invalid input
   * @param {date} d
   * @returns {date} javascript date object
   * @memberof library
   * @public
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
   * @memberof library
   * @public
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
   * read instrument type for given instrument and create instrument object
   * @param {object} obj any instrument JSON
   * @returns {object} instrument class object
   * @memberof library
   * @public
   */
  library.make_instrument = function (obj) {
    switch (obj.type.toLowerCase()) {
      case "bond":
      case "floater":
        return new library.FixedIncome(obj);
      case "swap":
        return new library.Swap(obj);
      case "swaption":
        return new library.Swaption(obj);
      case "fxterm":
        return new library.FxTerm(obj);
      case "callable_bond":
        return new library.CallableFixedIncome(obj);
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
   * Returns a number if a valid number or numeric string is entered and null otherwise, does not throw
   * @param {number} n
   * @returns {number} number
   * @memberof library
   * @public
   */
  library.number_or_null = function (n) {
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
   * Returns positive number if a valid positive number or numeric string is entered and null otherwise, does not throw
   * @param {number} n
   * @returns {number} number
   * @memberof library
   * @public
   */
  library.positive_number_or_null = function (n) {
    var res = library.number_or_null(n);
    if (res <= 0) return null;
    return res;
  };
  /**
   * Returns natural number, zero allowed, if a valid natural number or numeric string is entered and null otherwise, does not throw
   * @param {natural} n
   * @returns {natural} natural vector
   * @memberof library
   * @public
   */
  library.natural_number_or_null = function (n) {
    var res = library.number_or_null(n);
    if (res < 0 || res !== Math.floor(res)) return null;
    return res;
  };
  /**
   * Returns vector of numbers when vector of numbers, vector of numeric strings or space sepatated string is entered. Returns null otherwise
   * @param {number} n
   * @returns {number} number vector
   * @memberof library
   * @public
   */
  library.number_vector_or_null = function (n) {
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
      res[i] = library.number_or_null(res[i]);
      if (null === res[i])
        throw new Error("number_vector_or_null: invalid input");
    }
    return res;
  };
})(this.JsonRisk || module.exports);
(function (library) {
  library.make_surface = function (obj) {
    switch (obj.type.toLowerCase()) {
      case "equity_rel_strike":
        return new library.ExpiryRelStrkeSurface(obj);
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
   * @memberof library
   * @public
   */
  library.make_payment = function (obj) {
    switch (obj.type.toLowerCase()) {
      case "notional":
        return new library.NotionalPayment(obj);
      case "fixed":
        return new library.FixedRatePayment(obj);
      default:
        throw new Error("make_payment: invalid payment type");
    }
  };
})(this.JsonRisk || module.exports);
(function (library) {
  library.string_or_empty = function (input) {
    if (typeof input === "string") return input;
    return "";
  };

  library.string_or_fallback = function (input, fallback) {
    if (typeof input === "string") return input;
    if (typeof fallback !== "string")
      throw new Error("string_or_fallback: fallback must be a string");
    return fallback;
  };

  library.string_or_throw = function (input, message) {
    if (typeof input !== "string") throw new Error(message);
    return input;
  };

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

    constructor(obj) {
      super(obj);

      if ("legs" in obj && Array.isArray(obj.legs)) {
        this.#legs = obj.legs.map((legobj) => {
          return new library.Leg(legobj);
        });
      }
    }

    get legs() {
      return Array.from(this.#legs);
    }

    add_deps_impl(deps) {
      for (const leg of this.#legs) {
        leg.add_deps(deps);
      }
    }

    value_impl(params, extras_not_used) {
      let res = 0;
      for (const leg of this.#legs) {
        let lv = leg.value(params);
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
      // set lgm mean reversion
      library.lgm_set_mean_reversion(this.mean_reversion);

      //calibrate lgm model - returns xi for non-expired swaptions only
      if (!(surface instanceof library.Surface))
        surface = new library.Surface(surface);

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
  class FixedIncome extends library.Instrument {
    constructor(obj) {
      super(obj);
      var maturity = library.date_or_null(obj.maturity);
      if (!maturity)
        throw new Error("fixed_income: must provide maturity date.");

      var effective_date = library.date_or_null(obj.effective_date); //null allowed

      this.notional = library.number_or_null(obj.notional);
      if (null === this.notional)
        throw new Error("fixed_income: must provide valid notional.");

      //include notional exchange unless explicitly set to false (e.g., for swaps)
      this.notional_exchange = library.make_bool(obj.notional_exchange);
      if (
        null === obj.notional_exchange ||
        "" === obj.notional_exchange ||
        undefined === obj.notional_exchange
      )
        this.notional_exchange = true;

      //interest related fields
      var tenor = library.natural_number_or_null(obj.tenor);
      if (null === tenor)
        throw new Error("fixed_income: must provide valid tenor.");

      var first_date = library.date_or_null(obj.first_date); //null allowed
      var next_to_last_date = library.date_or_null(obj.next_to_last_date); //null allowed
      var stub_end = library.make_bool(obj.stub_end);
      var stub_long = library.make_bool(obj.stub_long);
      this.excl_margin = library.number_or_null(obj.excl_margin) || 0;

      //    this.current_accrued_interest = obj.current_accrued_interest || 0;

      this.type = typeof obj.type === "string" ? obj.type : "unknown";

      this.is_holiday_func = library.is_holiday_factory(obj.calendar || "");
      this.year_fraction_func = library.year_fraction_factory(obj.dcc || "");
      this.bdc = obj.bdc || "";
      this.adjust_accrual_periods = library.make_bool(
        obj.adjust_accrual_periods,
      );

      this.adj = (function (b, i) {
        return function (d) {
          return library.adjust(d, b, i);
        };
      })(this.bdc, this.is_holiday_func);

      //amortisation related fields
      var repay_tenor = library.natural_number_or_null(obj.repay_tenor);
      if (null === repay_tenor) repay_tenor = tenor;

      var linear_amortization = library.make_bool(obj.linear_amortization);

      this.repay_amount = library.number_vector_or_null(obj.repay_amount) || [
        0,
      ]; //array valued

      this.interest_capitalization = library.make_bool_vector(
        obj.interest_capitalization,
      );

      var repay_first_date =
        library.date_or_null(obj.repay_first_date) || this.first_date;
      var repay_next_to_last_date =
        library.date_or_null(obj.repay_next_to_last_date) ||
        this.next_to_last_date;
      var repay_stub_end = obj.stub_end || false;
      var repay_stub_long = obj.stub_long || false;

      //condition arrays
      this.conditions_valid_until = library.date_vector_or_null(
        obj.conditions_valid_until,
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
        library.natural_number_or_null(obj.settlement_days) || 0;
      this.settlement_date =
        library.date_or_null(obj.settlement_date) ||
        library.add_business_days(
          library.valuation_date,
          settlement_days,
          this.is_holiday_func,
        );

      this.residual_spread = library.number_or_null(obj.residual_spread) || 0;

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
      if (obj.fixed_rate || obj.fixed_rate === 0) {
        //fixed rate instrument
        this.is_float = false;
        this.fixed_rate = library.number_vector_or_null(obj.fixed_rate); //array valued
        this.float_spread = 0;
        this.cap_rate = [0];
        this.floor_rate = [0];
        this.fixing_schedule = [this.schedule[0], maturity];
      } else {
        //floating rate instrument
        this.is_float = true;
        this.fixed_rate = null;
        this.float_spread = library.number_vector_or_null(obj.float_spread) || [
          0,
        ]; // can be number or array, arrays to be impleented

        this.float_current_rate = library.number_or_null(
          obj.float_current_rate,
        );
        if (this.float_current_rate === null)
          throw new Error(
            "fixed_income: must provide valid float_current_rate.",
          );

        //fixing schedule related fields

        var fixing_tenor = library.natural_number_or_null(obj.fixing_tenor);
        if (null === fixing_tenor) fixing_tenor = tenor;

        var fixing_first_date =
          library.date_or_null(obj.fixing_first_date) || this.first_date;
        var fixing_next_to_last_date =
          library.date_or_null(obj.fixing_next_to_last_date) ||
          this.next_to_last_date;
        var fixing_stub_end = obj.fixing_stub_end || false;
        var fixing_stub_long = obj.fixing_stub_long || false;

        this.cap_rate =
          typeof obj.cap_rate === "number"
            ? [obj.cap_rate]
            : [Number.POSITIVE_INFINITY]; // can be number or array, arrays to be implemented
        this.floor_rate =
          typeof obj.floor_rate === "number"
            ? [obj.floor_rate]
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

      this.disc_curve = obj.disc_curve || "";
      this.spread_curve = obj.spread_curve || "";
      this.fwd_curve = obj.fwd_curve || "";
    }

    initialize_cash_flows() {
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
          date_accrual_end[i].getTime() ===
            this.fixing_schedule[i_fix].getTime()
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
            : this.year_fraction_func(
                date_accrual_start[i],
                date_accrual_end[i],
              );
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
    }

    finalize_cash_flows(fwd_curve, override_rate_or_spread) {
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
          (i < n - 1 &&
            pmt_principal[i] * sign > current_principal[i] * sign) ||
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
    }

    get_cash_flows(fwd_curve) {
      if (this.is_float) {
        if (typeof fwd_curve !== "object" || fwd_curve === null)
          throw new Error(
            "fixed_income.get_cash_flows: Must provide forward curve when evaluating floating rate interest stream",
          );
        return this.finalize_cash_flows(fwd_curve);
      }
      return this.cash_flows;
    }

    present_value(disc_curve, spread_curve, fwd_curve) {
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
    }

    add_deps_impl(deps) {
      deps.add_curve(this.disc_curve);
      if (this.spread_curve != "") deps.add_curve(this.spread_curve);
      if (this.is_float) deps.add_curve(this.fwd_curve);
    }

    value_impl(params) {
      if ((!params) instanceof library.Params)
        throw new Error("evaluate: params must be of type Params");
      const disc_curve = params.get_curve(this.disc_curve);
      const spread_curve =
        this.spread_curve != "" ? params.get_curve(this.spread_curve) : null;
      const fwd_curve = this.is_float ? params.get_curve(this.fwd_curve) : null;
      return this.present_value(disc_curve, spread_curve, fwd_curve);
    }

    fair_rate_or_spread(disc_curve, spread_curve, fwd_curve) {
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
    }

    annuity(disc_curve, spread_curve, fwd_curve) {
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
    }
  }

  library.FixedIncome = FixedIncome;
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
  class Swap extends library.Instrument {
    constructor(obj) {
      super(obj);
      this.phi = library.make_bool(obj.is_payer) ? -1 : 1;

      this.fixed_rate = obj.fixed_rate;
      //the fixed leg of the swap
      this.fixed_leg = new library.FixedIncome({
        notional: obj.notional * this.phi,
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

      //the floating rate leg of the swap
      this.float_leg = new library.FixedIncome({
        notional: -obj.notional * this.phi,
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
    }

    fair_rate(disc_curve, fwd_curve) {
      //returns fair rate, that is, rate such that swap has zero present value
      var pv_float = this.float_leg.present_value(disc_curve, null, fwd_curve);
      if (0 === pv_float) return 0;
      return (-this.phi * pv_float) / this.annuity(disc_curve);
    }

    annuity(disc_curve) {
      //returns always positive annuity regardless of payer/receiver flag
      return this.fixed_leg.annuity(disc_curve) * this.phi;
    }

    present_value(disc_curve, fwd_curve) {
      var res = 0;
      res += this.fixed_leg.present_value(disc_curve, null, null);
      res += this.float_leg.present_value(disc_curve, null, fwd_curve);
      return res;
    }

    add_deps_impl(deps) {
      this.float_leg.add_deps_impl(deps);
    }

    value_impl(params) {
      const disc_curve = params.get_curve(this.float_leg.disc_curve);
      const fwd_curve = params.get_curve(this.float_leg.fwd_curve);
      return this.present_value(disc_curve, fwd_curve);
    }

    get_cash_flows(fwd_curve) {
      return {
        fixed_leg: this.fixed_leg.get_cash_flows(),
        float_leg: this.float_leg.get_cash_flows(fwd_curve),
      };
    }
  }

  library.Swap = Swap;
})(this.JsonRisk || module.exports);
(function (library) {
  class Swaption extends library.Instrument {
    constructor(obj) {
      super(obj);

      //maturity of the underlying swap
      this.maturity = library.date_or_null(obj.maturity);
      if (!this.maturity)
        throw new Error("swaption: must provide valid maturity date.");

      //first_exercise_date (a.k.a. expiry) of the swaption
      this.first_exercise_date = library.date_or_null(obj.first_exercise_date);
      if (!this.first_exercise_date)
        throw new Error(
          "swaption: must provide valid first_exercise_date date.",
        );

      //underlying swap object
      this.swap = new library.Swap({
        is_payer: obj.is_payer,
        notional: obj.notional,
        effective_date: this.first_exercise_date,
        maturity: obj.maturity,
        fixed_rate: obj.fixed_rate,
        tenor: obj.tenor,
        calendar: obj.calendar,
        bdc: obj.bdc,
        dcc: obj.dcc,
        float_spread: obj.float_spread,
        float_tenor: obj.float_tenor,
        float_bdc: obj.float_bdc,
        float_dcc: obj.float_dcc,
        float_current_rate: obj.float_current_rate,
        adjust_accrual_periods: obj.adjust_accrual_periods,
        disc_curve: obj.disc_curve || "",
        fwd_curve: obj.fwd_curve || "",
      });

      this.surface = obj.surface || "";
    }

    present_value(disc_curve, fwd_curve, vol_surface) {
      if (!(disc_curve instanceof library.Curve))
        disc_curve = new library.Curve(disc_curve);

      if (!(fwd_curve instanceof library.Curve))
        fwd_curve = new library.Curve(fwd_curve);

      if (!(vol_surface instanceof library.Surface))
        vol_surface = new library.Surface(vol_surface);

      //obtain times
      var t_maturity = library.time_from_now(this.maturity);
      var t_first_exercise_date = library.time_from_now(
        this.first_exercise_date,
      );
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
      this.vol = vol_surface.get_rate(
        t_first_exercise_date,
        t_term,
        this.fair_rate, // fwd rate
        this.swap.fixed_rate, // strike
      );
      this.std_dev = this.vol * Math.sqrt(t_first_exercise_date);

      let res = 0.0;

      if (this.swap.phi === -1) {
        res = new library.BachelierModel(
          t_first_exercise_date,
          this.vol,
        ).call_price(this.fair_rate, this.swap.fixed_rate);
      } else {
        res = new library.BachelierModel(
          t_first_exercise_date,
          this.vol,
        ).put_price(this.fair_rate, this.swap.fixed_rate);
      }

      res *= this.swap.annuity(disc_curve);
      return res;
    }

    add_deps_impl(deps) {
      this.swap.add_deps_impl(deps);
      deps.add_surface(this.surface);
    }

    value_impl(params) {
      const disc_curve = params.get_curve(this.swap.float_leg.disc_curve);
      const fwd_curve = params.get_curve(this.swap.float_leg.fwd_curve);
      const surface = params.get_surface(this.surface);
      return this.present_value(disc_curve, fwd_curve, surface);
    }
  }

  library.Swaption = Swaption;

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
      this.notional_exchange = true;

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

    if (!conditions_valid_until) conditions_valid_until = [specs.maturity];

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
    timeline.sort();
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

    // fixing
    if (reset_start <= library.valuation_date) {
      res.is_fixed = true;
      res.rate = specs.float_current_rate;
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
      cashflows.push(pay_notional(timeline[0], -notional));

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

      // make notional payment if we are on a repay date. Do not worry about overpayments or capitalization. This is handled by the leg class.
      if (
        date_end === date_next_repay &&
        current_conditions.repay_amount !== 0.0
      ) {
        cashflows.push(
          pay_notional(date_next_repay, current_conditions.repay_amount),
        );
        notional -= current_conditions.repay_amount;
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
    };
  };
})(this.JsonRisk || module.exports);
(function (library) {
  class Leg {
    #currency = "";
    #disc_curve = "";
    #payments = [];
    constructor(obj) {
      if ("payments" in obj && Array.isArray(obj.payments)) {
        this.#payments = obj.payments.map((pobj) => library.make_payment(pobj));
      }
      this.#disc_curve = library.string_or_empty(obj.disc_curve);
      this.#currency = library.string_or_empty(obj.currency);

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
    }

    // getter functions
    get currency() {
      return this.#currency;
    }
    get disc_curve() {
      return this.#disc_curve;
    }
    get payments() {
      return Array.from(this.#payments);
    }

    add_deps(deps) {
      if ("" != this.#disc_curve) deps.add_curve(this.#disc_curve);
      if ("" != this.#currency) deps.add_currency(this.#currency);
    }

    value(params) {
      const disc_curve = params.get_curve(this.#disc_curve);
      let res = 0;
      for (const p of this.#payments) {
        let amount = p.amount;
        let t = library.time_from_now(p.date_pmt);
        let df = disc_curve.get_df(t);
        res += amount * df;
      }
      return res;
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
    get date_pmt() {
      return this.#date_pmt;
    }
    get date_value() {
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

  class FixedRatePayment extends NotionalPayment {
    #date_start = null;
    #date_end = null;
    #ref_start = null;
    #ref_end = null;
    #rate = null;
    #dcc = "";
    #yf = null;
    #yffunc = null;
    #capitalize = false;
    #amount = 0.0;
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

      // rate
      this.#rate = library.number_or_null(obj.rate);
      if (this.#rate === null)
        throw new Error("RatePayment: rate must be a valid number");

      // dcc and year fraction
      this.#dcc = library.string_or_empty(obj.dcc);
      this.#yffunc = library.year_fraction_factory(this.#dcc);
      this.#yf = this.#yffunc(this.#date_start, this.#date_end);

      // capitalization
      this.#capitalize = library.make_bool(this.capitalize);

      // amount
      this.#amount = this.notional * this.#rate * this.#yf;
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
    get rate() {
      return this.#rate;
    }

    get amount() {
      return this.#capitalize ? 0.0 : this.#amount;
    }
    get amount_interest() {
      return this.#amount;
    }
    get amount_notional() {
      return this.#capitalize ? -this.#amount : 0.0;
    }

    set_notional(n) {
      super.set_notional(n);
      this.#amount = this.notional * this.#rate * this.#yf;
    }
  }

  // FloatRatePayment(index_name, is_fixed, rate_spread)

  // FloatRatePaymentCapFloor(index_name, is_fixed, spread, rate_cap, rate_floor)

  // CapFloorPayment()
  library.NotionalPayment = NotionalPayment;
  library.FixedRatePayment = FixedRatePayment;
})(this.JsonRisk || module.exports);
(function (library) {
  "use strict";
  const continuous = {
    df: function (t, zc) {
      return Math.exp(-t * zc);
    },
    zc: function (t, df) {
      if (t < 1 / 512) return 0.0;
      return -Math.log(df) / t;
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

    // 1xN, covers 1x! as well
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

    //curve initialisation and fallbacks
    if (typeof residual_spread !== "number") residual_spread = 0;
    disc_curve = disc_curve || library.get_const_curve(0);
    var sd = library.date_or_null(settlement_date);
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
  class Simulatable {
    static type = "simulatable";
    #name = "";
    #tags = new Set();
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

    has_tag(tag) {
      return this.#tags.has(tag);
    }
  }

  library.Simulatable = Simulatable;
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * @memberof library
   */
  var default_yf = null;
  /**
   * returns a constant zero-rate curve
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
    return new library.Curve({
      type: type || "yield",
      times: [1],
      zcs: [value], //zero rates are act/365 annual compounding
    });
  };

  // helper function for curve constructor
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
    var i = (curve.times || curve.days || curve.dates || curve.labels || [])
      .length;
    if (!i)
      throw new Error(
        "Curve: invalid curve, need to provide valid times, days, dates, or labels",
      );
    var times = new Array(i);
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
   * attaches get_rate and other function to curve. If curve is null or falsy, create valid constant curve
   * @param {object} curve curve
   * @returns {object} curve
   * @memberof library
   * @public
   */
  class Curve extends library.Simulatable {
    #type = "yield";
    #times = null;
    #zcs = null;
    #intp = null;
    #compounding = null;
    #get_rate = null;
    #get_rate_scenario = null;

    constructor(obj) {
      super(obj);
      // type
      if (typeof obj.type === "string") this.#type = obj.type;

      // compounding
      this.#compounding = library.compounding_factory(obj.compounding);

      // delete invalid members
      for (const member of ["dfs", "zcs", "times", "days", "dates", "labels"]) {
        if (!Array.isArray(obj[member])) delete obj[member];
      }

      // extract times, rates and discount factors from curve and store in hidden function scope
      const [_size, _times, _zcs] = get_values(obj, this.#compounding);
      this.#times = _times;
      this.#zcs = _zcs;

      var _get_interpolated_rate;
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
      var _short_end_flat = !(obj.short_end_flat === false) || _always_flat;
      var _long_end_flat = !(obj.long_end_flat === false) || _always_flat;
      this.#get_rate = function (t) {
        if (t <= _times[0] && _short_end_flat) return _zcs[0];
        if (t >= _times[_size - 1] && _long_end_flat) return _zcs[_size - 1];
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
        var scenario = new library.Curve({
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
    // define get_rate aware of attached scenario
    get_rate(t) {
      return this.#get_rate_scenario(t);
    }

    // define get_df based on zcs, aware of attached scenario
    get_df(t) {
      return this.#compounding.df(t, this.#get_rate_scenario(t));
    }

    // attach get_fwd_amount based on get_df
    get_fwd_amount(tstart, tend) {
      if (tend - tstart < 1 / 512) return 0.0;
      return this.get_df(tstart) / this.get_df(tend) - 1;
    }

    // reobtain copy of hidden times when needed
    get times() {
      return Array.from(this.#times);
    }

    // reobtain copy of hidden zcs when needed
    get zcs() {
      return Array.from(this.#zcs);
    }

    // reobtain copy of hidden dfs when needed
    get dfs() {
      let res = new Array(this.#times.length);
      for (let i = 0; i < res.length; i++) {
        res[i] = this.#compounding.df(this.#times[i], this.#zcs[i]);
      }
      return res;
    }

    get type() {
      return this.#type;
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

  class ExpiryStrikeSurface extends library.Simulatable {
    #type = "";
    #expiries = null;
    #moneyness = [];
    get_surface_rate_scenario = null;
    constructor(obj) {
      super(obj);

      if (obj.type !== "expiry_rel_strike" && obj.type !== "expiry_abs_strike")
        throw new Error(
          "ExpirySmileSurface: type must be expiry_rel_strike or expiry_abs_strike",
        );

      // expiries
      if ("expiries" in obj) {
        this.#expiries = library.number_vector_or_null(obj.expiries);
      } else {
        this.#expiries = get_times(obj.labels_expiry);
      }

      // moneyness
      if ("moneyness" in obj) {
        this.#moneyness = library.number_vector_or_null(obj.moneyness);
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

    // getter functions
    get type() {
      return this.#type;
    }

    // detach scenario rule
    detach_rule() {
      this.get_surface_rate_scenario = this.get_surface_rate;
    }

    // attach scenario ruls
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
  }

  class ExpiryAbsStrikeSurface extends ExpiryStrikeSurface {
    constructor(obj) {
      super(obj);
      if (obj.type !== "expiry_abs_strike")
        throw new Error(
          "ExpiryAbsStrikeSurface: type must be expiry_abs_strike",
        );
    }
    get_rate(t_expiry, t_term_not_used, fwd_not_used, strike) {
      return this.get_surface_rate_scenario(t_expiry, strike);
    }
  }

  class ExpiryRelStrikeSurface extends ExpiryStrikeSurface {
    constructor(obj) {
      super(obj);
      if (obj.type !== "expiry_rel_strike")
        throw new Error(
          "ExpiryRelStrikeSurface: type must be expiry_rel_strike",
        );
    }

    get_rate(t_expiry, t_term_not_used, fwd, strike) {
      return this.get_surface_rate_scenario(t_expiry, strike - fwd);
    }
  }

  library.ExpiryAbsStrikeSurface = ExpiryAbsStrikeSurface;
  library.ExpiryRelStrikeSurface = ExpiryRelStrikeSurface;
})(this.JsonRisk || module.exports);
(function (library) {
  class Scalar extends library.Simulatable {
    static type = "scalar";
    #value = null;
    #scenario_value = null;
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
  }

  library.Scalar = Scalar;
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

  class Surface extends library.Simulatable {
    #type = "bachelier";
    #expiries = null;
    #terms = null;
    #moneyness = [];
    #smile = [];
    #get_surface_rate_scenario = null;
    constructor(obj) {
      super(obj);

      // type
      if (typeof obj.type === "string") this.#type = obj.type;

      // expiries
      if ("expiries" in obj) {
        this.#expiries = library.number_vector_or_null(obj.expiries);
      } else {
        this.#expiries = get_times(obj.labels_expiry);
      }

      // terms
      if ("terms" in obj) {
        this.#terms = library.number_vector_or_null(obj.terms);
      } else {
        this.#terms = get_times(obj.labels_term);
      }

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
      return this.#type;
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
      var atm = this.#get_surface_rate_scenario(t_expiry, t_term);

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
        var temp = 1 / (mmax - mmin);
        return (
          atm +
          (this.#smile[imin].get_surface_rate(t_expiry, t_term) * (mmax - m) +
            this.#smile[imax].get_surface_rate(t_expiry, t_term) * (m - mmin)) *
            temp
        );
      }
      return atm;
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
    var s = str.toLowerCase();
    if (s.endsWith("atm")) return 0; //ATM surface
    var n = s.match(/([+-][0-9]+)bp$/); //find number in name, convention is NAME+100BP, NAME-50BP
    if (n.length < 2) return null;
    return n[1] / 10000;
  };

  const find_smile = function (name, list) {
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
      if (typeof obj.main_currrency === "string") {
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
          var found = true;
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
  }

  library.Params = Params;
})(this.JsonRisk || module.exports);
(function (library) {
  /**
   * calculates the present value for any given supported instrument (bond, floater, fxterm, swap, swaption, callable_bond)
   * @param {object} instrument any instrument
   * @returns {number} present value
   * @memberof library
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

    var module = {
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
   * @memberof library
   * @public
   */
  library.simulation = function (instrument_json, params_json, modules) {
    if (typeof instrument_json.type !== "string")
      throw new Error("simulation: instrument object must contain valid type");
    library.set_valuation_date(params_json.valuation_date);

    // create context for module execution
    var context = {
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
      dt = library.date_or_null(dates[i]);
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
