(function (library) {
  class LegInstrument extends library.Instrument {
    #legs = [];
    #acquire_date = new Date(Date.UTC(0, 0, 1));

    constructor(obj) {
      super(obj);

      if ("legs" in obj && Array.isArray(obj.legs)) {
        this.#legs = obj.legs.map((legobj) => {
          return new library.Leg(legobj);
        });
        Object.freeze(this.#legs);
      }

      const ad = library.date_or_null(obj.acquire_date);
      if (null !== ad) this.#acquire_date = ad;
    }

    get legs() {
      return this.#legs;
    }

    get acquire_date() {
      return this.#acquire_date;
    }

    add_deps_impl(deps) {
      for (const leg of this.#legs) {
        leg.add_deps(deps);
      }
    }

    value_impl(params, extras_not_used) {
      let res = 0;
      for (const leg of this.#legs) {
        let lv = leg.value(params, this.#acquire_date);
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
