{
  /**
   * Class representing a stock, also serving as super class for equity derivatives
   * @memberof JsonRisk
   * @extends Instrument
   */
  class Equity extends JsonRisk.Instrument {
    #quote = "";
    #disc_curve = "";
    #spot_days = 0;
    #calendar = null;
    #is_holiday_func = null;

    /**
     * Create an equity instrument.
     * @param {obj} obj A plain object representing position in a financial instrument
     * @param {string} [obj.currency=""] the currency in which this instrument's value is represented
     * @param {number} [obj.quantity=1.0] the quantity with which the instrument's value is multiplied
     * @param {string} [obj.quote=""] reference to a quote object
     * @param {string} [obj.disc_curve=""] reference to a curve object
     * @param {string} [obj.calendar=""] calendar name
     * @param {number} [obj.spot_days=0] spot days for the quote
     */
    constructor(obj) {
      super(obj);
      this.#quote = JsonRisk.string_or_empty(obj.quote);
      this.#disc_curve = JsonRisk.string_or_empty(obj.disc_curve);
      this.#spot_days = JsonRisk.natural_number_or_null(obj.spot_days) || 0;
      this.#calendar = JsonRisk.string_or_empty(obj.calendar);
      this.#is_holiday_func = JsonRisk.is_holiday_factory(this.#calendar);
    }

    /**
     * Get the name of the quote object
     * @type {string}
     */
    get quote() {
      return this.#quote;
    }

    /**
     * Get the disc curve name
     * @type {string}
     */
    get disc_curve() {
      return this.#disc_curve;
    }

    /**
     * Get the spot days
     * @type {number}
     */
    get spot_days() {
      return this.#spot_days;
    }

    spot_date() {
      return JsonRisk.add_business_days(
        JsonRisk.valuation_date,
        this.#spot_days,
        this.#is_holiday_func,
      );
    }

    forward(spot, fwd_date, disc_curve, repo_curve) {
      const tspot = JsonRisk.time_from_now(this.spot_date());
      const tfwd = JsonRisk.time_from_now(fwd_date);
      const discounted_spot = spot * disc_curve.get_df(tspot);
      const res = discounted_spot / repo_curve.get_df(tfwd);
      return res;
    }

    add_deps_impl(deps) {
      deps.add_scalar(this.#quote);
      if ("" != this.#disc_curve) deps.add_curve(this.#disc_curve);
    }

    value_impl(params, extras_not_used) {
      JsonRisk.nonempty_string_or_throw(
        this.quote,
        "Equity: no spot quote specified, make sure to populate 'quote' on instrument level",
      );
      const quote = params.get_scalar(this.#quote);
      if ("" == this.#disc_curve) return quote.get_value();
      const spot_date = this.spot_date();

      const dc = params.get_curve(this.#disc_curve);
      const discounted_quote =
        quote.get_value() * dc.get_df(JsonRisk.time_from_now(spot_date));
      return discounted_quote;
    }
  }

  JsonRisk.Equity = Equity;
}
