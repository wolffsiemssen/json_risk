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
