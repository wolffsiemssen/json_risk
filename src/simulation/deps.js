(function (library) {
  class Deps {
    #scalars = new Set();
    #curves = new Set();
    #surfaces = new Set();
    constructor() {}

    #require_string(name) {
      if (typeof name !== "string")
        throw new Error("Deps: name must be a string");
      if (name === "") throw new Error("Deps: name must be nonempty");
      return name;
    }

    addScalar(name) {
      this.#scalars.add(this.#require_string(name));
    }

    addCurve(name) {
      this.#curves.add(this.#require_string(name));
    }

    addSurface(name) {
      this.#surfaces.add(this.#require_string(name));
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

    minimalParams(params_json) {
      const obj = {
        valuation_date: null,
        scalars: {},
        curves: {},
        surfaces: {},
        scenario_groups: [],
      };

      if ("valuation_date" in params_json) {
        obj.valuation_date = params_json.valuation_date;
      }

      if ("scenario_groups" in params_json) {
        obj.scenario_groups = params_json.scenario_groups;
      }

      if ("scalars" in params_json) {
        for (const s of this.#scalars) {
          if (s in params_json.scalars) obj.scalars[s] = params_json.scalars[s];
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

      return new library.Params(obj);
    }
  }

  library.Deps = Deps;
})(this.JsonRisk || module.exports);
