(function (library) {
  /**
   * Class representing a scalar
   * @memberof JsonRisk
   * @extends Simulatable
   */
  class Scalar extends library.Simulatable {
    #value = null;
    #scenario_value = null;
    /**
     * Create a Scalar.
     * @param {obj} obj A plain object representing a scalar
     * @param {number} obj.value The scalar value.
     */
    constructor(obj) {
      super(obj);
      this.#value = library.number_or_null(obj.value);
      this.#scenario_value = this.#value;
    }

    attach_rule(rule) {
      const scenval = rule.values[0][0];
      if (rule.model === "multiplicative")
        this.#scenario_value = this.#value * scenval;
      if (rule.model === "additive")
        this.#scenario_value = this.#value + scenval;
      if (rule.model === "absolute") this.#scenario_value = scenval;
    }

    detach_rule() {
      this.#scenario_value = this.#value;
    }

    get_value() {
      return this.#scenario_value;
    }

    get type() {
      return "scalar";
    }

    toJSON() {
      const res = super.toJSON();
      res.type = this.type;
      res["value"] = this.#value;
      return res;
    }
  }

  library.Scalar = Scalar;
})(this.JsonRisk || module.exports);
