(function (library) {
  /**
   * Class representing a forward contract on a stock or on an equity index
   * @memberof JsonRisk
   * @extends Equity
   */
  class EquityForward extends library.Equity {
    #expiry = null;
    #repo_curve = "";
    #price = 0.0;

    /**
     * Create an equity forward instrument.
     * @param {obj} obj A plain object representing position in a financial instrument
     * @param {string} [obj.currency=""] the currency in which this instrument's value is represented
     * @param {number} [obj.quantity=1.0] the quantity with which the instrument's value is multiplied
     * @param {string} [obj.quote=""] reference to a quote object
     * @param {string} [obj.disc_curve=""] reference to a curve object
     * @param {string} [obj.repo_curve=""] reference to a curve object
     * @param {string} [obj.calendar=""] calendar name
     * @param {number} [obj.spot_days=0] spot days for the quote
     * @param {date} obj.expiry expiry date of the forward
     * @param {number} [obj.price=0.0] price payable at expiry
     */
    constructor(obj) {
      super(obj);
      this.#expiry = library.date_or_null(obj.expiry);
      if (null === this.#expiry)
        throw new Error("EquityForward: must provide a valid expiry date");
      this.#repo_curve = library.string_or_empty(obj.repo_curve);
      this.#price = library.number_or_null(obj.price) || 0.0;
    }

    /**
     * Get the repo curve name
     * @type {string}
     */
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
