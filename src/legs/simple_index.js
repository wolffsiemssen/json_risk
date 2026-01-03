(function (library) {
  class SimpleIndex {
    #fwd_curve = "";
    #surface = "";
    #dcc = "";
    #yffunc = null;
    #linked_curve = null;
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
