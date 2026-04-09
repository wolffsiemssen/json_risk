(function (library) {
  /**
   * Class representing an american option on a stock or on an equity index
   * @memberof JsonRisk
   * @extends Equity
   */
  class EquityAmericanOption extends library.Equity {
    #expiry = null;
    #repo_curve = "";
    #surface = "";
    #strike = 0.0;
    #q = 0.0;
    #is_call = true;
    #first_exercise_date = null;
    #n = 10;

    /**
     * Create an equity option instrument.
     * @param {obj} obj A plain object representing position in a financial instrument
     * @param {string} [obj.currency=""] the currency in which this instrument's value is represented
     * @param {number} [obj.quantity=1.0] the quantity with which the instrument's value is multiplied
     * @param {string} [obj.quote=""] reference to a quote object
     * @param {string} [obj.disc_curve=""] reference to a curve object
     * @param {string} [obj.repo_curve=""] reference to a curve object
     * @param {string} [obj.surface=""] reference to a surface object
     * @param {string} [obj.calendar=""] calendar name
     * @param {number} [obj.spot_days=0] spot days for the quote
     * @param {date} obj.expiry expiry date of the forward
     * @param {number} [obj.strike=0.0] strke price payable at expiry
     * @param {boolean} [obj.is_call=false] flag indicating if this is a call option
     * @param {number} [obj.q=0.0] dividend yield, used to adjust the spot price to get the forward price at time t, and also to calculate the discount factor for dividends in the binomial model
     * @param {number} [obj.n=10] number of steps in the binomial tree, used to build the tree and to calculate the time step
     * @param {date} [obj.first_exercise_date=null] first exercise date for the option, used to determine when we start to check for early exercise in the backward induction. This is used for american options, and can be set to null for european options, in which case we assume that the first exercise date is the same as the expiry date.
     */
    constructor(obj) {
      super(obj);
      this.#expiry = library.date_or_null(obj.expiry);
      this.#repo_curve = library.string_or_empty(obj.repo_curve);
      this.#surface = library.string_or_empty(obj.surface);
      this.#strike = library.number_or_null(obj.strike) || 0.0;
      this.#is_call = library.make_bool(obj.is_call);
      this.#q = library.number_or_null(obj.q) || 0.0;
      this.#n = library.number_or_null(obj.n) || 10;
      this.#first_exercise_date = library.date_or_null(obj.first_exercise_date);
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
      const Bq = Math.exp(-t * this.#q);
      const model = new library.CRRBinomialModel(
        t,
        vol,
        quote.get_value(), // we use the spot as forward, since the model will adjust it with the dividend yield and risk-free rate to get the forward price at time t
        this.#strike,
        this.#n,
        dc,
        Bq,
        this.#first_exercise_date
          ? library.time_from_now(this.#first_exercise_date)
          : null,
      );
      const val = this.#is_call ? model.call_price() : model.put_price();
      // should we put the condition that when there are no dividends, the price of the american call option
      // should be the same as the price of the european call option given by the Black-Scholes formula,
      // because early exercise is not beneficial in that case?
      return val; // the model already discounts the payoff to the present value, so we do not need to discount it again with the discount factor from the curve, since that would be double counting the discounting effect. The model takes into account the time value of money and the risk-free rate in its calculations, so we can directly return the price given by the model as the value of the option.
    }
  }

  library.EquityAmericanOption = EquityAmericanOption;
})(this.JsonRisk || module.exports);
