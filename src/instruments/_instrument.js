(function (library) {
  class Instrument {
    static type = "Instrument";
    #currency = "";
    #quantity = 1.0;

    constructor(obj) {
      this.#currency = library.string_or_empty(obj.currency);

      if ("quantity" in obj) {
        this.#quantity = library.get_safe_number(obj.quantity);
      }
    }

    get currency() {
      return this.#currency;
    }

    get quantity() {
      return this.#quantity;
    }

    add_deps_impl(deps_not_used) {
      throw new Error("add_deps_impl: not implemented for class Instrument");
    }

    add_deps(deps) {
      if (!(deps instanceof library.Deps))
        throw new Error("add_deps: deps must be of type Deps");
      this.add_deps_impl(deps);
    }

    value_impl(params_not_used, extras_not_used) {
      throw new Error("value_impl: not implemented for class Instrument");
    }

    value(params, extras) {
      const p =
        params instanceof library.Params ? params : new library.Params(params);

      const val = this.value_impl(p, extras);

      // todo: FX conversion et al.
      return val;
    }
  }

  library.Instrument = Instrument;
})(this.JsonRisk || module.exports);
