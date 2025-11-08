(function (library) {
  const error_message = "Deps: name must be a string and cannot be empty";
  class Deps {
    #scalars = new Set();
    #curves = new Set();
    #surfaces = new Set();
    #currencies = new Set();
    constructor() {}

    add_scalar(name) {
      this.#scalars.add(library.nonempty_string_or_throw(name, error_message));
    }

    add_curve(name) {
      this.#curves.add(library.nonempty_string_or_throw(name, error_message));
    }

    add_surface(name) {
      this.#surfaces.add(library.nonempty_string_or_throw(name, error_message));
    }

    add_currency(name) {
      this.#currencies.add(
        library.nonempty_string_or_throw(name, error_message),
      );
    }

    get scalars() {
      return Array.from(this.#scalars);
    }

    get curves() {
      return Array.from(this.#curves);
    }

    get surfaces() {
      return Array.from(this.#surfaces);
    }

    get currencies() {
      return Array.from(this.#currencies);
    }

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
