(function (library) {
  class SimpleIndex {
    #fwd_curve = "";
    #surface = "";
    #dcc = "";
    #yffunc = null;
    #linked_curve = null;
    #linked_surface = null;
    // #valuation_date = null;
    constructor(obj) {
      // fwd_curve
      this.#fwd_curve = library.string_or_empty(obj.fwd_curve);

      // surface
      this.#surface = library.string_or_empty(obj.surface);

      // dcc and year fraction
      this.#dcc = library.string_or_empty(obj.dcc);
      this.#yffunc = library.year_fraction_factory(this.#dcc);
    }

    // getter functions
    get fwd_curve() {
      return this.#fwd_curve;
    }

    get surface() {
      return this.#surface;
    }

    get dcc() {
      return this.#dcc;
    }

    // link curve
    link_curve(params_or_curve) {
      if (params_or_curve instanceof library.Curve) {
        this.#linked_curve = params_or_curve;
        return;
      }
      if (params_or_curve instanceof library.Params) {
        this.#linked_curve = params_or_curve.get_curve(this.#fwd_curve);
        return;
      }
      throw new Error(
        "SimpleIndex: Try to link curve with an invalid argument",
      );
    }

    // forward rate
    fwd_rate(start, end) {
      if (start <= library.valuation_date)
        throw new Error("SimpleIndex: Cannot project past fixings");
      const tstart = library.time_from_now(start);
      const tend = library.time_from_now(end);

      if (!(this.#linked_curve instanceof library.Curve))
        throw new Error(
          "SimpleIndex: No curve linked, call link_curve before calling fwd_rate",
        );

      // economically implied forward amount from curve
      const amount = this.#linked_curve.get_fwd_amount(tstart, tend);

      const yf = this.#yffunc(start, end);
      if (yf <= 0.0)
        throw new Error("SimpleIndex: Positive year fraction required");

      // amount converted to a rate with the index day count method
      return amount / yf;
    }

    link_surface(params_or_surface) {
      if (params_or_surface instanceof library.Surface) {
        this.#linked_surface = params_or_surface;
        return;
      }

      if (params_or_surface instanceof library.Params) {
        if (this.#surface)
          this.#linked_surface = params_or_surface.get_surface(this.#surface);
        return;
      }

      throw new Error(
        `${this.constructor.name}: Try to link volatility surface with an invalid argument.`,
      );
    }

    // volatility
    volatility(start, end, fwd, strike) {
      const t_expiry = library.time_from_now(start);
      const t_term = library.time_from_now(end) - t_expiry;

      if (!(this.#linked_surface instanceof library.Surface))
        throw new Error(
          `${this.constructor.name}: No volatility surface linked, call link_surface before calling volatility`,
        );

      return this.#linked_surface.get_rate(t_expiry, t_term, fwd, strike);
    }

    // link_valuation_date(params) {
    //   if (params?.valuation_date) this.#valuation_date = params.valuation_date;
    // }

    // get valuation_date() {
    //   return this.#valuation_date || library.valuation_date;
    // }

    // deps
    add_deps(deps) {
      if ("" != this.#fwd_curve) deps.add_curve(this.#fwd_curve);
      if ("" != this.#surface) deps.add_surface(this.#surface);
    }

    // serialisation
    toJSON() {
      return {
        fwd_curve: this.#fwd_curve,
        surface: this.#surface,
        dcc: this.#dcc,
      };
    }
  }

  library.SimpleIndex = SimpleIndex;
})(this.JsonRisk || module.exports);
