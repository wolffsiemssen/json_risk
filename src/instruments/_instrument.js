(function (library) {
  /**
   * Super-Class representing a position in a financial instrument
   * @memberof JsonRisk
   */
  class Instrument {
    static type = "Instrument";
    #currency = "";
    #quantity = 1.0;

    /**
     * Create an instrument.
     * @param {obj} obj A plain object representing position in a financial instrument
     * @param {string} [obj.currency=""] the currency in which this instrument's value is represented
     * @param {number} [obj.quantity=1.0] the quantity with which the instrument's value is multiplied
     */
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
