(function (library) {
  class Equity extends library.Instrument {
    #quote = "";
    #disc_curve = "";
    #spot_days = 0;
    #calendar = null;
    #is_holiday_func = null;
    constructor(obj) {
      super(obj);
      this.#quote = library.string_or_empty(obj.quote);
      this.#disc_curve = library.string_or_empty(obj.disc_curve);
      this.#spot_days = library.get_safe_natural(obj.spot_days) || 0;
      this.#calendar = library.string_or_empty(obj.calendar);
      this.#is_holiday_func = library.is_holiday_factory(this.#calendar);
    }

    get quote() {
      return this.#quote;
    }

    get disc_curve() {
      return this.#disc_curve;
    }

    get spot_days() {
      return this.#spot_days;
    }

    add_deps_impl(deps) {
      deps.add_scalar(this.#quote);
      if ("" != this.#disc_curve) deps.add_curve(this.#disc_curve);
    }

    value_impl(params, extras_not_used) {
      const quote = params.get_scalar(this.#quote);
      if ("" == this.#disc_curve) return this.quantity * quote.getValue();
      library.require_vd();
      const spot_date = library.add_business_days(
        library.valuation_date,
        this.#spot_days,
        this.#is_holiday_func,
      );

      const dc = params.get_curve(this.#disc_curve);
      const discounted_quote =
        quote.getValue() * dc.get_df(library.time_from_now(spot_date));
      return this.quantity * discounted_quote;
    }
  }

  library.Equity = Equity;
})(this.JsonRisk || module.exports);
