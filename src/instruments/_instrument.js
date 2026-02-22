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

    /**
     * Get the instrument currency.
     * @type {string}
     */
    get currency() {
      return this.#currency;
    }

    /**
     * Get the position quantity.
     * @type {number}
     */
    get quantity() {
      return this.#quantity;
    }

    add_deps_impl(deps_not_used) {
      throw new Error("add_deps_impl: not implemented for class Instrument");
    }

    /**
     * Add the instruments dependencies to the attached Deps object.
     * This is the main entry point for querying parameter dependencies of any instrument.
     * This function calls the add_deps_impl function of the specific sub-class.
     * @param {Deps} deps dependency tracking object
     */
    add_deps(deps) {
      if (!(deps instanceof library.Deps))
        throw new Error("add_deps: deps must be of type Deps");
      if (this.#currency != "") deps.add_currency(this.#currency);
      this.add_deps_impl(deps);
    }

    value_impl(params_not_used, extras_not_used) {
      throw new Error("value_impl: not implemented for class Instrument");
    }

    /**
     * Evaluate the instrument with the specified parameters container.
     * This is the main entry point for evaluating any instrument.
     * This function calls the value_impl function of the specific sub-class.
     * It multiplies the result of value_impl with the position quantity and, if the instrument currency is set, converts the value into the main currency set in the parameters container.
     * @param {Params} params parameters object with market data and other parameters. If params is not of type Params, conversion is attempted. This works for a plain object containing parameters.
     * @param {object} extras container for additional valuation functionality
     */
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
