(function (library) {
  class Scalar extends library.Simulatable {
    static type = "scalar";
    #value = null;
    #scenario_value = null;
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
  }

  library.Scalar = Scalar;
})(this.JsonRisk || module.exports);
