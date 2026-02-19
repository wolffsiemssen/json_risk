(function (library) {
  /**
   * ...
   * @param {number} value
   * @param {string} type
   * @returns {object} surface
   * @memberof JsonRisk
   * @public
   */
  library.get_const_surface = function (value, type) {
    if (typeof value !== "number")
      throw new Error("get_const_surface: input must be number.");
    return new library.Surface({
      type: type || "",
      expiries: [1],
      terms: [1],
      values: [[value]],
    });
  };

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
   * Class representing a surface parametrised by expiries and terms
   * @memberof JsonRisk
   * @extends Simulatable
   */
  class Surface extends library.Simulatable {
    #expiries = null;
    #terms = null;
    #moneyness = [];
    #smile = [];
    #get_surface_rate_scenario = null;

    /**
     * Create a Surface parametrised by expiries and terms.
     * @param {obj} obj A plain object representing a Surface. Must contain either expiries or labels_expiry, either terms or labels_term, and must contain values
     * @param {Array} obj.expiries A vector of times, i.e., numbers corresponding to expiry
     * @param {Array} obj.labels_expiry A vector of labels representing time to expiry
     * @param {Array} obj.terms A vector of times, i.e., numbers, representing the underlying terms
     * @param {Array} obj.labels_expiry A vector of labels representing the underlying terms
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

      // terms
      if ("terms" in obj) {
        this.#terms = library.number_vector_or_null(obj.terms);
      } else {
        this.#terms = get_times(obj.labels_term);
      }
      Object.freeze(this.#terms);

      // interpolation
      this.get_surface_rate = library.interpolation2d_factory(
        this.#expiries,
        this.#terms,
        obj.values,
      );

      // moneyness
      if ("moneyness" in obj) {
        this.#moneyness = library.number_vector_or_null(obj.moneyness);
      }

      // smile
      if ("smile" in obj) {
        if (!Array.isArray(obj.smile))
          throw new Error("Surface: smile must be an array");
        this.#smile = obj.smile.map((s) => {
          if (!(s instanceof library.Surface)) {
            // no recursions, smile surfaces must not have smiles themselves
            let temp = Object.assign({}, s);
            delete temp.moneyness;
            delete temp.smile;

            // make surface
            return new library.Surface(temp);
          } else {
            return s;
          }
        });
      }

      // check consistency
      if (this.#moneyness.length !== this.#smile.length)
        throw new Error(
          "Surface: smile and moneyness must have the same length",
        );

      // scenario dependent surface evaluation
      this.#get_surface_rate_scenario = this.get_surface_rate;
    }

    // getter functions
    get type() {
      return "expiry_term";
    }

    get expiries() {
      return this.#expiries;
    }

    get terms() {
      return this.#terms;
    }

    // detach scenario rule
    detach_rule() {
      this.#get_surface_rate_scenario = this.get_surface_rate;
    }

    // attach scenario ruls
    attach_rule(rule) {
      if (typeof rule === "object") {
        const scen = new library.Surface({
          labels_expiry: rule.labels_y,
          labels_term: rule.labels_x,
          values: rule.values,
        });

        if (rule.model === "multiplicative") {
          this.#get_surface_rate_scenario = function (t_expiry, t_term) {
            return (
              this.get_surface_rate(t_expiry, t_term) *
              scen.get_surface_rate(t_expiry, t_term)
            );
          };
        }
        if (rule.model === "additive") {
          this.#get_surface_rate_scenario = function (t_expiry, t_term) {
            return (
              this.get_surface_rate(t_expiry, t_term) +
              scen.get_surface_rate(t_expiry, t_term)
            );
          };
        }
        if (rule.model === "absolute") {
          this.#get_surface_rate_scenario = function (t_expiry, t_term) {
            return scen.get_surface_rate(t_expiry, t_term);
          };
        }
      } else {
        this.detach_rule();
      }
    }

    // interpolation function for cube
    get_rate(t_expiry, t_term, fwd, strike) {
      // atm rate can have a scenario
      const atm = this.#get_surface_rate_scenario(t_expiry, t_term);

      // optionally, we consider a smile on the surface
      if (this.#smile.length > 0) {
        let imin = 0;
        let imax = this.#smile.length - 1;

        // smile only has one extra surface
        if (imin === imax)
          return atm + this.#smile[imin].get_surface_rate(t_expiry, t_term);

        // determine moneyness
        let m = strike - fwd;
        let mmin = this.#moneyness[imin];
        let mmax = this.#moneyness[imax];
        //extrapolation (constant)
        if (m < mmin)
          return atm + this.#smile[imin].get_surface_rate(t_expiry, t_term);
        if (m > mmax)
          return atm + this.#smile[imax].get_surface_rate(t_expiry, t_term);

        // binary search
        let imed, mmed;
        while (imin + 1 !== imax) {
          imed = ((imin + imax) / 2.0) | 0; // truncate the mean time down to the closest integer
          mmed = this.#moneyness[imed];
          if (m > mmed) {
            mmin = mmed;
            imin = imed;
          } else {
            mmax = mmed;
            imax = imed;
          }
        }
        //interpolation (linear)
        if (mmax - mmin < 1e-15)
          throw new Error(
            "get_cube_rate: invalid cube, moneyness must be nondecreasing",
          );
        const temp = 1 / (mmax - mmin);
        return (
          atm +
          (this.#smile[imin].get_surface_rate(t_expiry, t_term) * (mmax - m) +
            this.#smile[imax].get_surface_rate(t_expiry, t_term) * (m - mmin)) *
            temp
        );
      }
      return atm;
    }

    toJSON() {
      const res = super.toJSON();
      res.type = this.type;
      res.expiries = this.#expiries;
      res.terms = this.#terms;
      res.values = res.expiries.map((expiry) => {
        return res.terms.map((term) => {
          return this.get_surface_rate(expiry, term);
        });
      });
      return res;
    }
  }

  library.Surface = Surface;
})(this.JsonRisk || module.exports);
