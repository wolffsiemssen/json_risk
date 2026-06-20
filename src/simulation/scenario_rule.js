(function (library) {
  const validate_model = function (str) {
    if (typeof str !== "string")
      throw new Error("ScenarioRule: model must be a string");
    const ret = str.toLowerCase();
    if (ret !== "additive" && ret !== "multiplicative" && ret !== "absolute")
      throw new Error(
        "ScenarioRule: model must be additive, multiplicative or absolute",
      );
    return ret;
  };
  const validate_and_convert_to_set = function (arr) {
    if (!Array.isArray(arr)) {
      throw new Error("ScenarioRule: risk_factors and tags must be arrays");
    }
    for (const item of arr) {
      if (typeof item !== "string") {
        throw new Error(
          "ScenarioRule: risk_factors and tags must be arrays of strings",
        );
      }
    }
    return new Set(arr);
  };

  const validate_and_convert_to_numbers = function (arr) {
    if (null == arr) return [1.0];
    if (!Array.isArray(arr)) {
      throw new Error("ScenarioRule: labels_x and labels_y must be arrays");
    }
    if (arr.length === 0) {
      throw new Error("ScenarioRule: labels_x and labels_y must be non-empty");
    }
    const ret = arr.map((str) => {
      const num = parseFloat(str, 10);
      if (isNaN(num))
        throw new Error(
          "ScenarioRule: could not convert this value to a number: " + str,
        );
      const unit = str.charAt(str.length - 1);

      if (unit === "M" || unit === "m") return num / 12;
      if (unit === "W" || unit === "w") return num / 52;
      if (unit === "D" || unit === "d") return num / 365;
      return num; // return the number itself, especially if the unit is "y" or "Y", but also if there is no unit at all.
    });

    Object.freeze(ret);
    return ret;
  };

  const validate_and_copy_values = function (arr, xlen, ylen) {
    if (!Array.isArray(arr))
      throw new Error(
        "ScenarioRule: invalid values property, must be an array.",
      );
    const n = arr.length;
    if (n === xlen) {
      // regular case
      const res = new Array(xlen);
      for (let i = 0; i < xlen; i++) {
        const temp = arr[i];
        if (!Array.isArray(temp))
          throw new Error(
            "ScenarioRule: invalid values array, elements must be arrays",
          );
        if (temp.length !== ylen)
          throw new Error(
            "ScenarioRule: invalid values array, elements must be arrays of the same length as labels_y",
          );
        res[i] = new Array(ylen);
        for (let j = 0; j < ylen; j++) {
          const num = temp[j];
          if (typeof num !== "number")
            throw new Error(
              "ScenarioRule: invalid values array, elements must be arrays of numbers",
            );
          res[i][j] = num;
        }
      }
      Object.freeze(res);
      return res;
    } else if (n === 1 && ylen === 1) {
      // special case of one-dimensional curve-like scenario where we tolerate the transposed variant, too
      const temp = arr[0];
      if (!Array.isArray(temp))
        throw new Error(
          "ScenarioRule: invalid values array, elements must be arrays",
        );
      if (temp.length !== xlen)
        throw new Error(
          "ScenarioRule: invalid values array, expecting array of the same length as labels_x",
        );
      const res = new Array(xlen);
      for (let i = 0; i < xlen; i++) {
        const num = temp[i];
        if (typeof num !== "number")
          throw new Error(
            "ScenarioRule: invalid values array, elements must be arrays of numbers",
          );
        res[i] = [num];
      }
      Object.freeze(res);
      return res;
    } else {
      throw new Error(
        "ScenarioRule: invalid values array, length must be the same as labels_x",
      );
    }
  };

  /**
   * ScenarioRule - represents a scenario rule for simulations
   * @memberof JsonRisk
   */
  class ScenarioRule {
    #model = "";
    #risk_factors = null;
    #tags = null;
    #labels_x = null;
    #axis_x = null;
    #labels_y = null;
    #axis_y = null;
    #values = null;
    /**
     * Create a ScenarioRule object.
     * @param {object} obj A plain object representing a parameters container.
     * @param {string} [obj.model] the perturbation model (e.g., "additive", "multiplicative", "absolute")
     * @param {Array} [obj.risk_factors=[]] identifies which scalars, curves and surfaces to apply the rule to
     * @param {Array} [obj.tags=[]] identifies which scalars, curves and surfaces to apply the rule to
     * @param {Array} [obj.labels_x] Labels for the x-axis, e.g., curve term, surface expiry
     * @param {Array} [obj.labels_y] Labels for the y-axis, e.g., surface term, surface moneyness
     * @param {Array} [obj.values] Values for the scenario. Must be an array with the same length as labels_x and contain arrays with the same length ob labels_y
     */
    constructor({ model, risk_factors, tags, labels_x, labels_y, values }) {
      this.#model = validate_model(model);
      this.#risk_factors = validate_and_convert_to_set(risk_factors || []);
      this.#tags = validate_and_convert_to_set(tags || []);
      this.#labels_x = labels_x ? Array.from(labels_x) : null;
      this.#axis_x = validate_and_convert_to_numbers(labels_x);
      this.#labels_y = labels_y ? Array.from(labels_y) : null;
      this.#axis_y = validate_and_convert_to_numbers(labels_y);
      this.#values = validate_and_copy_values(
        values,
        this.#axis_x.length,
        this.#axis_y.length,
      );
    }

    get model() {
      return this.#model;
    }

    get axis_x() {
      return this.#axis_x;
    }

    get axis_y() {
      return this.#axis_y;
    }

    get values() {
      return this.#values;
    }

    get values_for_curve() {
      return this.#values.map((column) => column[0]);
    }

    get value_for_scalar() {
      return this.#values[0][0];
    }

    matches(item) {
      // check if a simulatable item is matched this rule
      if (!(item instanceof library.Simulatable))
        throw new Error(
          "ScenarioRule: can only match object of type Simulatable",
        );

      // match by risk factors
      if (this.#risk_factors.has(item.name)) {
        return true;
      }

      // if no exact match by risk factors, match by tags if tags are present. in that case, all tags must match
      if (this.#tags.size === 0) return false;
      let found = true;
      for (const tag of this.#tags) {
        if (!item.has_tag(tag)) found = false;
      }
      return found;
    }

    toJSON() {
      const res = {
        model: this.#model,
        values: this.#values,
      };

      if (this.#risk_factors.size > 0)
        res.risk_factors = Array.from(this.#risk_factors);
      if (this.#tags.size > 0) res.tags = Array.from(this.#tags);
      if (this.#labels_x) res.labels_x = Array.from(this.#labels_x);
      if (this.#labels_y) res.labels_y = Array.from(this.#labels_y);

      return res;
    }
  }

  library.ScenarioRule = ScenarioRule;
})(this.JsonRisk || module.exports);
