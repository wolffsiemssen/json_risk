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
      let notional = this.#payments[0].notional;
      for (const p of this.#payments) {
        if (p.notional != notional) return false;
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
          pmap.set(tpay, [total, notional]);
        }
      }
      const times = Array.from(pmap.keys()).sort();
      const n = times.length;

      const t_pmt = new Float64Array(n);
      const pmt_total = new Float64Array(n);
      const pmt_interest = new Float64Array(n);
      const pmt_principal = new Float64Array(n);
      const current_principal = new Float64Array(n);

      let cp = 0;
      for (let i = 0; i < n; i++) {
        const t = times[i];
        const [total, notional] = pmap.get(t);

        t_pmt[i] = t;
        pmt_total[i] = total;
        pmt_principal[i] = notional;
        pmt_interest[i] = total - notional;
        current_principal[i] = cp;
        cp -= notional;
      }

      return {
        t_pmt,
        pmt_total,
        pmt_principal,
        pmt_interest,
        current_principal,
      };
    }
  }

  library.Leg = Leg;
})(this.JsonRisk || module.exports);
