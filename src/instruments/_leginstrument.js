(function (library) {
  class LegInstrument extends library.Instrument {
    #legs = [];

    constructor(obj) {
      super(obj);

      if ("legs" in obj && Array.isArray(obj.legs)) {
        this.#legs = obj.legs.map((legobj) => {
          return new library.Leg(legobj);
        });
      }
    }

    get legs() {
      return Array.from(this.#legs);
    }

    add_deps_impl(deps) {
      for (const leg of this.#legs) {
        leg.add_deps(deps);
      }
    }

    value_impl(params, extras_not_used) {
      let res = 0;
      for (const leg of this.#legs) {
        let lv = leg.value(params);
        if ("" != this.currency && "" != leg.currency) {
          const fx = params.get_fx_rate(leg.currency, this.currency);
          lv *= fx;
        }
        res += lv;
      }
      return res;
    }
  }

  library.LegInstrument = LegInstrument;
})(this.JsonRisk || module.exports);
