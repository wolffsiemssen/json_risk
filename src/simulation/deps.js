(function (library) {
  const check_name = function (s) {
    return library.nonempty_string_or_throw(
      s,
      "Deps: name must be a string and cannot be empty",
    );
  };

  /**
   * Class used for collecting dependencies, i.e., names of required scalars, curves, and surfaces, from an instrument, a leg, or an index
   * @memberof JsonRisk
   */
  class Deps {
    #scalars = new Set();
    #curves = new Set();
    #surfaces = new Set();
    #currencies = new Set();

    /** Create an empty Deps object */
    constructor() {}

    /**
     * Add a scalar dependency
     * @param {string} name The name of the scalar
     */
    add_scalar(name) {
      this.#scalars.add(check_name(name));
    }

    /**
     * Add a curve dependency
     * @param {string} name The name of the curve
     */
    add_curve(name) {
      this.#curves.add(check_name(name));
    }

    /**
     * Add a surface dependency
     * @param {string} name The name of the surface
     */
    add_surface(name) {
      this.#surfaces.add(check_name(name));
    }

    /**
     * Add a dependency on a currency
     * @param {string} name The name of the currency
     */
    add_currency(name) {
      this.#currencies.add(check_name(name));
    }

    /**
     * Get the names of all scalars.
     * @type {Array}
     */
    get scalars() {
      return Array.from(this.#scalars);
    }

    /**
     * Get the names of all curves.
     * @type {Array}
     */
    get curves() {
      return Array.from(this.#curves);
    }

    /**
     * Get the names of all surfaces.
     * @type {Array}
     */
    get surfaces() {
      return Array.from(this.#surfaces);
    }

    /**
     * Get the names of all currencies.
     * @type {Array}
     */
    get currencies() {
      return Array.from(this.#currencies);
    }

    /**
     * Create a minimal params container from an object with params, containing all collected dependencies
     * @param {obj} params_json The plain object with parameters
     */
    minimal_params(params_json) {
      const obj = {
        valuation_date: null,
        main_currency: null,
        scalars: {},
        curves: {},
        surfaces: {},
        scenario_groups: [],
      };

      if ("valuation_date" in params_json) {
        obj.valuation_date = params_json.valuation_date;
      }

      if ("main_currency" in params_json) {
        obj.main_currency = params_json.main_currency;
      }

      const main_currency = new library.Params(obj).main_currency;

      if ("scalars" in params_json) {
        for (const s of this.#scalars) {
          if (s in params_json.scalars) obj.scalars[s] = params_json.scalars[s];
        }

        for (const c of this.#currencies) {
          if (c in params_json.scalars) obj.scalars[c] = params_json.scalars[c];
          for (const delim of ["", "/", "_", "-"]) {
            for (const name of [
              c + delim + main_currency,
              main_currency + delim + c,
            ]) {
              if (name in params_json.scalars)
                obj.scalars[name] = params_json.scalars[name];
            }
          }
        }
      }

      if ("curves" in params_json) {
        for (const c of this.#curves) {
          if (c in params_json.curves) obj.curves[c] = params_json.curves[c];
        }
      }

      if ("surfaces" in params_json) {
        for (const s of this.#surfaces) {
          if (s in params_json.surfaces)
            obj.surfaces[s] = params_json.surfaces[s];
        }
      }

      if ("scenario_groups" in params_json) {
        obj.scenario_groups = params_json.scenario_groups;
      }

      return new library.Params(obj);
    }
  }

  library.Deps = Deps;
})(this.JsonRisk || module.exports);
