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

  // helper function for constructor
  const get_values = function (values, num_expiries, num_terms) {
    let res = new Array();
    if (!Array.isArray(values))
      throw new Error("Surface: values must be an array");
    if (values.length !== num_expiries)
      throw new Error("Surface: values do not have the right length.");
    for (const slice of values) {
      if (!Array.isArray(slice))
        throw new Error("Surface: values must be an array of arrays");
      if (slice.length !== num_terms)
        throw new Error(
          "Surface: one of the slices does not have the right length.",
        );
      for (const value of slice) {
        if (!(typeof value === "number"))
          throw new Error(
            `Surface: values must be an array of arrays of numbers, but contains invalid value ${value}`,
          );
      }
      // slice is valid, make a copy of the values
      res.push(Array.from(slice));
    }
    return res;
  };

  class Surface extends library.Simulatable {
    #type = "bachelier";
    #expiries = null;
    #terms = null;
    #values = null;
    #moneyness = [];
    #smile = [];
    #get_surface_rate_scenario = null;
    constructor(obj) {
      super(obj);

      // type
      if (typeof obj.type === "string") this.#type = obj.type;

      // expiries
      if ("expiries" in obj) {
        this.#expiries = library.get_safe_number_vector(obj.expiries);
      } else {
        this.#expiries = get_times(obj.labels_expiry);
      }

      // terms
      if ("terms" in obj) {
        this.#terms = library.get_safe_number_vector(obj.terms);
      } else {
        this.#terms = get_times(obj.labels_term);
      }
      // values
      this.#values = get_values(
        obj.values,
        this.#expiries.length,
        this.#terms.length,
      );

      // moneyness
      if ("moneyness" in obj) {
        this.#moneyness = library.get_safe_number_vector(obj.moneyness);
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

    // interpolaton function for single slice
    #get_slice_rate(i_expiry, t_term) {
      let imin = 0;
      let imax = this.#terms.length - 1;

      const slice = this.#values[i_expiry];

      //slice only has one value left
      if (imin === imax) return slice[imin];
      var tmin = this.#terms[imin];
      var tmax = this.#terms[imax];
      //extrapolation (constant)
      if (t_term < tmin) return slice[imin];
      if (t_term > tmax) return slice[imax];
      // binary search
      let imed, tmed;
      while (imin + 1 !== imax) {
        imed = ((imin + imax) / 2.0) | 0; // truncate the mean time down to the closest integer
        tmed = this.#terms[imed];
        if (t_term > tmed) {
          tmin = tmed;
          imin = imed;
        } else {
          tmax = tmed;
          imax = imed;
        }
      }
      //interpolation (linear)
      if (tmax - tmin < 1 / 512)
        throw new Error(
          "get_slice_rate: invalid surface, support points must be increasing and differ at least one day",
        );
      var temp = 1 / (tmax - tmin);
      return (
        (slice[imin] * (tmax - t_term) + slice[imax] * (t_term - tmin)) * temp
      );
    }

    // interpolation function for surface
    get_surface_rate(t_expiry, t_term) {
      var imin = 0;
      var imax = this.#expiries.length - 1;

      // surface only has one slice left
      if (imin === imax) return this.#get_slice_rate(imin, t_term);
      var tmin = this.#expiries[imin];
      var tmax = this.#expiries[imax];
      // extrapolation (constant)
      if (t_expiry < tmin) return this.#get_slice_rate(imin, t_term);
      if (t_expiry > tmax) return this.#get_slice_rate(imax, t_term);
      // binary search
      var imed, tmed;
      while (imin + 1 !== imax) {
        // truncate the mean time down to the closest integer
        imed = ((imin + imax) / 2.0) | 0;
        tmed = this.#expiries[imed];
        if (t_expiry > tmed) {
          tmin = tmed;
          imin = imed;
        } else {
          tmax = tmed;
          imax = imed;
        }
      }
      // interpolation (linear)
      if (tmax - tmin < 1 / 512)
        throw new Error(
          "get_surface_rate: invalid surface, support points must be increasing and differ at least one day",
        );
      var temp = 1 / (tmax - tmin);
      return (
        (this.#get_slice_rate(imin, t_term) * (tmax - t_expiry) +
          this.#get_slice_rate(imax, t_term) * (t_expiry - tmin)) *
        temp
      );
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
