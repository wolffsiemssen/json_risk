(function (library) {
  class EquityOption extends library.Equity {
    #expiry = null;
    #repo_curve = "";
    #surface = "";
    #strike = 0.0;
    #is_call = true;
    constructor(obj) {
      super(obj);
      this.#expiry = library.date_or_null(obj.expiry);
      this.#repo_curve = library.string_or_empty(obj.repo_curve);
      this.#surface = library.string_or_empty(obj.surface);
      this.#strike = library.number_or_null(obj.strike) || 0.0;
      this.#is_call = library.make_bool(obj.is_call);
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

      const model = new library.BlackModel(t, vol);
      const val = this.#is_call
        ? model.call_price(forward, this.#strike)
        : model.put_price(forward, this.#strike);
      return val * dc.get_df(t);
    }
  }

  library.EquityOption = EquityOption;
})(this.JsonRisk || module.exports);
