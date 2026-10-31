{
  class SimpleIndex {
    #fwd_curve = "";
    #surface = "";
    #dcc = "";
    #yffunc = null;
    #linked_curve = null;
    #linked_surface = null;
    constructor(obj) {
      // fwd_curve
      this.#fwd_curve = JsonRisk.string_or_empty(obj.fwd_curve);

      // surface
      this.#surface = JsonRisk.string_or_empty(obj.surface);

      // dcc and year fraction
      this.#dcc = JsonRisk.string_or_empty(obj.dcc);
      this.#yffunc = JsonRisk.year_fraction_factory(this.#dcc);
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
      if (params_or_curve instanceof JsonRisk.Curve) {
        this.#linked_curve = params_or_curve;
        return;
      }
      if (params_or_curve instanceof JsonRisk.Params) {
        this.#linked_curve = params_or_curve.get_curve(this.#fwd_curve);
        return;
      }
      throw new Error(
        "SimpleIndex: Try to link curve with an invalid argument",
      );
    }

    // forward rate
    fwd_rate(start, end) {
      if (start <= JsonRisk.valuation_date)
        throw new Error("SimpleIndex: Cannot project past fixings");
      const tstart = JsonRisk.time_from_now(start);
      const tend = JsonRisk.time_from_now(end);

      if (!(this.#linked_curve instanceof JsonRisk.Curve))
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
      if (params_or_surface && params_or_surface.get_surface_rate) {
        this.#linked_surface = params_or_surface;
        return;
      }

      if (params_or_surface instanceof JsonRisk.Params) {
        if (this.#surface)
          this.#linked_surface = params_or_surface.get_surface(this.#surface);
        return;
      }

      throw new Error(
        `${this.constructor.name}: Try to link volatility surface with an invalid argument.`,
      );
    }

    // volatility
    /**
     * @param {Date} start
     * @param {Date} end
     * @param {number} fwd
     * @param {number} strike
     * @returns {number} the volatility value
     */
    volatility(start, end, fwd, strike) {
      const t_expiry = JsonRisk.time_from_now(start);
      const t_term = JsonRisk.time_from_now(end) - t_expiry;

      if (
        !this.#linked_surface ||
        typeof this.#linked_surface.get_rate !== "function"
      ) {
        throw new Error(
          `${this.constructor.name}: No valid volatility surface linked, call link_surface first.`,
        );
      }

      return this.#linked_surface.get_rate(t_expiry, t_term, fwd, strike);
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

  JsonRisk.SimpleIndex = SimpleIndex;
}
