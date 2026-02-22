(function (library) {
  /**
   * Class representing a leg, i.e., a stream of payments
   * @memberof JsonRisk
   */
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

    /**
     * Create a leg .
     * @param {obj} obj A plain object representing the leg
     * @param {string} [obj.currency=""] currency of the leg. If empty, the first currency found on one of the payments is used. All payments must have the same currency or no currency at all.
     * @param {string} [obj.disc_curve=""] named reference to a discount curve
     * @param {string} [obj.spread_curve=""] named reference to a spread curve
     * @param {number} [obj.residual_spread=0.0] residual spread on top of the discount and spread curves
     * @param {array} [obj.payments=[]] the payments. The constructor sorts payments by start date, end date, value date and type.
     * @param {object} [obj.indices={}] an object with index names as keys and indices as values.
     */
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

    /**
     * Get currency
     * @type {string}
     */
    get currency() {
      return this.#currency;
    }
    /**
     * Get discount curve
     * @type {string}
     */
    get disc_curve() {
      return this.#disc_curve;
    }

    /**
     * Get spread curve
     * @type {string}
     */
    get spread_curve() {
      return this.#spread_curve;
    }

    /**
     * Get residual spread
     * @type {number}
     */
    get residual_spread() {
      return this.#residual_spread;
    }

    /**
     * Get all payments. Array is frozen, i.e., read only
     * @type {array}
     */
    get payments() {
      return this.#payments;
    }

    /**
     * Get all indices. Object is frozen, i.e., read only
     * @type {object}
     */
    get indices() {
      return this.#indices;
    }

    /**
     * Flag indicating if leg has notional payments
     * @type {boolean}
     */
    get has_notional_payments() {
      for (const p of this.#payments) {
        if (p.constructor === library.NotionalPayment) return true;
      }
      return false;
    }

    /**
     * Flag indicating if leg has capitalizing rate payments
     * @type {boolean}
     */
    get has_capitalization() {
      for (const p of this.#payments) {
        if (p.capitalize) return true;
      }
      return false;
    }

    /**
     * Flag indicating if leg has fixed rate payments
     * @type {boolean}
     */
    get has_fixed_rate_payments() {
      for (const p of this.#payments) {
        if (p instanceof library.FixedRatePayment) return true;
      }
      return false;
    }

    /**
     * Flag indicating if leg has float rate payments
     * @type {boolean}
     */
    get has_float_rate_payments() {
      for (const p of this.#payments) {
        if (p instanceof library.FloatRatePayment) return true;
      }
      return false;
    }

    /**
     * Flag indicating if leg has embedded options, e.g. caps and floors
     * @type {boolean}
     */
    get has_embedded_options() {
      // not supported yet
      return false;
    }

    /**
     * Flag indicating if leg has constant notionals on all payments
     * @type {boolean}
     */
    get has_constant_notional() {
      if (!this.#payments.length) return true;
      let notional = Math.abs(this.#payments[0].notional);
      for (const p of this.#payments) {
        if (Math.abs(p.notional) != notional) return false;
      }
      return true;
    }

    /**
     * Flag indicating if leg has constant rate on all fixed rate payments
     * @type {boolean}
     */
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

    /**
     * Adds dependencies (disc_curve, spread_curve, currency, and all dependencies of relevant indices)
     * @param {Deps} deps a dependencies tracking object
     */
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

    /**
     * Evaluate the leg
     * @param {Params} params a parameters container object
     * @param {date} acquire_date an acquire date, payments on or before acquire date are excluded
     * @return {number}
     */
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

    /**
     * Evaluate the leg with just one discount curve and one forward curve. Used internally for valuing standard swaps and swaptions.
     * @param {Params} disc_curve a curve
     * @param {Params} fwd_curve a curve
     * @return {number}
     */
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

    /**
     * Calculate the annuity including all fixed rate and float rate payments. It is the sum of notional times year fraction for each such payments, discounted from the payment date down to today.
     * @param {obj} params_or_curve either a curve used for discounting or a params object. In the latter case, disc_curve and spread_curve are retrieved from the params object and residual spread is used.
     * @return {number}
     */
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

    /**
     * Calculates outstanding balance  - all floating capitalizing payments must have been projected before by e.g. calling the value method
     * @param {date} [d=library.valuation_date] as-of date for the balance.
     * @return {number}
     */
    balance(d = library.valuation_date) {
      let res = 0;
      for (const p of this.#payments) {
        if (p.date_value <= d) continue;
        res += p.amount_notional;
      }
      return res;
    }

    /**
     * Calculates irr  - all floating capitalizing payments must have been projected before by e.g. calling the value method. The irr is the zero rate in annual act/365 convention such that the value of the leg equals the balance.
     * @param {date} d payments on or before d are excluded.
     * @return {number}
     */
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

    /**
     * Updates notionals  - all floating capitalizing payments must have been projected before by e.g. calling the value method.
     * For legs with initial and final notional exchange, this method makes sure notionals on rate payments are consistent with notional repayments. More precisely, the notional of each rate payments must be equal to the outstanding balance valid for the accrual period, and the amount of a notional payment must not overpay. Capitalization of interest rate payments is taken into account as well.
     */
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

    /**
     * Get a simple cash flow table including payment times and payment amounts used internally for rate option pricing
     *
     */
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
