(function (library) {
  class EquityFuture extends library.Equity {
    #expiry = null;
    #repo_curve = "";
    #price = 0.0;
    constructor(obj) {
      super(obj);
      this.#expiry = library.date_or_null(obj.expiry);
      this.#repo_curve = library.string_or_empty(obj.repo_curve);
      this.#price = library.number_or_null(obj.price) || 0.0;
    }

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
      return this.quantity * (forward - this.#price);
    }
  }

  library.EquityFuture = EquityFuture;
})(this.JsonRisk || module.exports);
