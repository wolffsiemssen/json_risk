(function (library) {
  class EquityAmericanOption extends library.Equity {
    #expiry = null;
    #repo_curve = "";
    #surface = "";
    #strike = 0.0;
    #q = 0.0; // dividend yield
    #is_call = true;
    #first_exercise_date = null;
    #n = 10; // number of steps in the binomial tree
    constructor(obj) {
      super(obj);
      this.#expiry = library.date_or_null(obj.expiry);
      this.#repo_curve = library.string_or_empty(obj.repo_curve);
      this.#surface = library.string_or_empty(obj.surface);
      this.#strike = library.number_or_null(obj.strike) || 0.0;
      this.#is_call = library.make_bool(obj.is_call);
      this.#q = library.number_or_null(obj.q) || 0.0;
      this.#n = library.number_or_null(obj.n) || 10;
      // It would be great to implement Typescript,
      // so we can define what obj is, and avoid invoking non-existing properties, or pass to the constructor
      // false inputs.
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

      const B = dc.get_df(t);
      const Bq = Math.exp(-t * this.#q);
      const model = new library.CRRBinomialModel(
        t,
        vol,
        quote.get_value(), // forward, // we use the spot as forward, since the model will adjust it with the dividend yield and risk-free rate to get the forward price at time t
        this.#strike,
        this.#n,
        B,
        Bq,
        this.#first_exercise_date
          ? library.time_from_now(this.#first_exercise_date)
          : null,
      );
      const val = this.#is_call ? model.call_price() : model.put_price();
      // should we put the condition that when there are no dividends, the price of the american call option
      // should be the same as the price of the european call option given by the Black-Scholes formula,
      // because early exercise is not beneficial in that case?
      return val * dc.get_df(t);
    }
  }

  library.EquityAmericanOption = EquityAmericanOption;
})(this.JsonRisk || module.exports);
