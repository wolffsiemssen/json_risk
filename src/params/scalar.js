(function (library) {
  class Scalar extends library.Simulatable {
    static type = "scalar";
    #value = null;
    #scenarioValue = null;
    constructor(obj) {
      super();
      this.#value = library.get_safe_number(obj.value);
      this.#scenarioValue = this.#value;
    }

    attachRule(rule) {
      const scenval = rule.values[0][0];
      if (rule.model === "multiplicative")
        this.#scenarioValue = this.#value * scenval;
      if (rule.model === "additive")
        this.#scenarioValue = this.#value + scenval;
      if (rule.model === "absolute") this.#scenarioValue = scenval;
    }

    detachRule() {
      this.#scenarioValue = this.#value;
    }

    getValue() {
      return this.#scenarioValue;
    }
  }

  library.Scalar = Scalar;
})(this.JsonRisk || module.exports);
