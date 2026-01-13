(function (library) {
  // helper function for constructor
  const get_times = function (labels) {
    //construct times from labels
    let res = null;
    if (Array.isArray(labels)) {
      res = labels.map((label) => library.period_str_to_time(label));
    }
    if (!res)
      throw new Error(
        "Surface: invalid surface, does not have times and no valid labels",
      );
    return res;
  };

  /**
   * Class representing a surface parametrised by expiries and absolute or relative strikes.
   * @memberof JsonRisk
   */
  class ExpiryStrikeSurface extends library.Simulatable {
    #expiries = null;
    #moneyness = [];
    get_surface_rate_scenario = null;

    /**
     * Create an ExpiryStrikeSurface.
     * @param {obj} obj A plain object representing an ExpiryStrikeSurface. Must contain either expiries or labels_expiry, and must contain values
     * @param {Array} obj.expiries A vector of times to expiry
     * @param {Array} obj.labels_expiry A vector of labels representing time to expiry
     * @param {Array} obj.moneyness A vector of numbers representing moneyness
     * @param {Array} obj.value A matrix of numbers representing volatility
     */
    constructor(obj) {
      super(obj);

      // expiries
      if ("expiries" in obj) {
        this.#expiries = library.number_vector_or_null(obj.expiries);
      } else {
        this.#expiries = get_times(obj.labels_expiry);
      }
      Object.freeze(this.#expiries);

      // moneyness
      if ("moneyness" in obj) {
        this.#moneyness = library.number_vector_or_null(obj.moneyness);
        Object.freeze(this.#expiries);
      }

      // interpolation
      this.get_surface_rate = library.interpolation2d_factory(
        this.#expiries,
        this.#moneyness,
        obj.values,
      );

      // scenario dependent surface evaluation
      this.get_surface_rate_scenario = this.get_surface_rate;
    }

    get expiries() {
      return this.#expiries;
    }

    get moneyness() {
      return this.#moneyness;
    }

    // detach scenario rule
    detach_rule() {
      this.get_surface_rate_scenario = this.get_surface_rate;
    }

    // attach scenario rule
    attach_rule(rule) {
      if (typeof rule === "object") {
        const scen = new library.ExpiryStrikeSurface({
          labels_expiry: rule.labels_y,
          moneyness: [0.0],
          values: [rule.values[0]],
        });

        if (rule.model === "multiplicative") {
          this.get_surface_rate_scenario = function (t_expiry, t_moneyness) {
            return (
              this.get_surface_rate(t_expiry, t_moneyness) *
              scen.get_surface_rate(t_expiry, t_moneyness)
            );
          };
        }
        if (rule.model === "additive") {
          this.get_surface_rate_scenario = function (t_expiry, t_moneyness) {
            return (
              this.get_surface_rate(t_expiry, t_moneyness) +
              scen.get_surface_rate(t_expiry, t_moneyness)
            );
          };
        }
        if (rule.model === "absolute") {
          this.get_surface_rate_scenario = function (t_expiry, t_moneyness) {
            return scen.get_surface_rate(t_expiry, t_moneyness);
          };
        }
      } else {
        this.detach_rule();
      }
    }

    // interpolation function for cube
    get_rate(
      t_expiry_not_used,
      t_term_not_used,
      fwd_not_used,
      strike_not_used,
    ) {
      throw new Error(
        "ExpiryStrikeSurface: get_rate not implemented, use ExpiryRelStrikeSurface or ExpiryAbsStrikeSurface",
      );
    }

    toJSON() {
      const res = super.toJSON();
      res.type = this.type;
      res.expiries = this.#expiries;
      res.moneyness = this.#moneyness;
      res.values = res.expiries.map((expiry) => {
        return res.moneyness.map((moneyness) => {
          return this.get_surface_rate(expiry, moneyness);
        });
      });
      return res;
    }
  }

  /**
   * Class representing a surface parametrised by expiries and absolute strikes
   * @memberof JsonRisk
   * @extends ExpiryStrikeSurface
   */
  class ExpiryAbsStrikeSurface extends ExpiryStrikeSurface {
    /**
     * Create an ExpiryAbsStrikeSurface.
     * @param {obj} obj A plain object representing an ExpiryAbsStrikeSurface. Must contain the required properties for ExpiryStrikeSurface
     * @param {string} obj.type Type, must "be expiry_abs_strike"
     */
    constructor(obj) {
      super(obj);
      if (obj.type !== "expiry_abs_strike")
        throw new Error(
          "ExpiryAbsStrikeSurface: type must be expiry_abs_strike",
        );
    }
    // getter functions
    get type() {
      return "expiry_abs_strike";
    }
    get_rate(t_expiry, t_term_not_used, fwd_not_used, strike) {
      return this.get_surface_rate_scenario(t_expiry, strike);
    }
  }

  /**
   * Class representing a surface parametrised by expiries and absolute strikes
   * @memberof JsonRisk
   * @extends ExpiryStrikeSurface
   */
  class ExpiryRelStrikeSurface extends ExpiryStrikeSurface {
    /**
     * Create an ExpiryRelStrikeSurface.
     * @param {obj} obj A plain object representing an ExpiryRelStrikeSurface. Must contain the required properties for ExpiryStrikeSurface
     * @param {string} obj.type Type, must "be expiry_abs_strike"
     */
    constructor(obj) {
      super(obj);
      if (obj.type !== "expiry_rel_strike")
        throw new Error(
          "ExpiryRelStrikeSurface: type must be expiry_rel_strike",
        );
    }
    // getter functions
    get type() {
      return "expiry_rel_strike";
    }

    get_rate(t_expiry, t_term_not_used, fwd, strike) {
      return this.get_surface_rate_scenario(t_expiry, strike - fwd);
    }
  }

  library.ExpiryAbsStrikeSurface = ExpiryAbsStrikeSurface;
  library.ExpiryRelStrikeSurface = ExpiryRelStrikeSurface;
})(this.JsonRisk || module.exports);
