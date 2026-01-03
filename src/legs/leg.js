(function (library) {
  class Leg {
    #currency = "";
    #disc_curve = "";
    #payments = [];
    #indices = {};
    constructor(obj) {
      this.#disc_curve = library.string_or_empty(obj.disc_curve);
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

      // sort payments
      this.#payments.sort(function (a, b) {
        // most important: if the notional of a rate payment depends on another payment, that payment must be before the rate payment. Amortization features are implemented much more straightforward if this is guaranteed.
        if (undefined !== b.date_start && b.date_start >= a.date_value)
          return -1;
        if (undefined !== a.date_start && a.date_start >= b.date_value)
          return 1;

        // sort independend payments by value date and payment date
        if (a.date_value != b.date_value) return a.date_value - b.date_value;
        if (a.date_pmt != b.date_pmt) return a.date_pmt - b.date_pmt;

        // sort rate payments with the same value and payment dates by their end and start dates
        if (
          a instanceof library.RatePayment &&
          b instanceof library.RatePayment
        ) {
          if (a.date_end != b.date.end) return a.date_end - b.date_end;
          if (a.date_start != b.date.start) return a.date_start - b.date_start;
        }

        // sort the remaining payments by their type
        const na = a.constructor.name;
        const nb = b.constructor.name;
        return na < nb ? 1 : na > nb ? -1 : 0;
      });
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
      if ("" != this.#currency) deps.add_currency(this.#currency);

      for (const idx of Object.values(this.#indices)) {
        idx.add_deps(deps);
      }
    }

    #dcf(disc_curve) {
      let res = 0;
      for (const p of this.#payments) {
        // get amount and discount
        let amount = p.amount;
        let t = library.time_from_now(p.date_pmt);
        if (t < 0) continue;
        let df = disc_curve.get_df(t);
        res += amount * df;
      }
      return res;
    }

    value(params) {
      for (const idx of Object.values(this.#indices)) {
        idx.link_curve(params);
      }
      for (const p of this.#payments) {
        // make projection for unfixed payments
        if (!p.is_fixed) p.project(this.#indices);
      }
      const disc_curve = params.get_curve(this.#disc_curve);
      return this.#dcf(disc_curve);
    }

    value_with_curves(disc_curve, fwd_curve) {
      for (const idx of Object.values(this.#indices)) {
        idx.link_curve(fwd_curve);
      }
      for (const p of this.#payments) {
        // make projection for unfixed payments
        if (!p.is_fixed) p.project(this.#indices);
      }
      return this.#dcf(disc_curve);
    }

    // argument must be either a valid params object or a curve object
    annuity(params_or_curve) {
      const disc_curve =
        params_or_curve instanceof library.Params
          ? params_or_curve.get_curve(this.#disc_curve)
          : params_or_curve;
      let res = 0;
      for (const p of this.#payments) {
        if (!(p instanceof library.FixedRatePayment)) continue;

        let t = library.time_from_now(p.date_pmt);
        if (t < 0) continue;

        // get amount based on 100 percent interest and discount
        let amount = p.notional * p.yf;
        let df = disc_curve.get_df(t);
        res += amount * df;
      }
      return res;
    }
  }

  library.Leg = Leg;
})(this.JsonRisk || module.exports);
