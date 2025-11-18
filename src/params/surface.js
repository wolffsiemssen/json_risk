(function (library) {
  /**
   * ...
   * @param {number} value
   * @param {string} type
   * @returns {object} surface
   * @memberof library
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

  class Surface extends library.Simulatable {
    #type = "bachelier";
    #expiries = null;
    #terms = null;
    #moneyness = [];
    #smile = [];
    #get_surface_rate_scenario = null;
    constructor(obj) {
      super(obj);

      // type
      if (typeof obj.type === "string") this.#type = obj.type;

      // expiries
      if ("expiries" in obj) {
        this.#expiries = library.number_vector_or_null(obj.expiries);
      } else {
        this.#expiries = get_times(obj.labels_expiry);
      }

      // terms
      if ("terms" in obj) {
        this.#terms = library.number_vector_or_null(obj.terms);
      } else {
        this.#terms = get_times(obj.labels_term);
      }

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
      return this.#type;
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
      var atm = this.#get_surface_rate_scenario(t_expiry, t_term);

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
        var temp = 1 / (mmax - mmin);
        return (
          atm +
          (this.#smile[imin].get_surface_rate(t_expiry, t_term) * (mmax - m) +
            this.#smile[imax].get_surface_rate(t_expiry, t_term) * (m - mmin)) *
            temp
        );
      }
      return atm;
    }
  }

  library.Surface = Surface;
})(this.JsonRisk || module.exports);
