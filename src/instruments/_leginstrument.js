(function (library) {
  /**
   * Class representing a financial instrument with legs, basis class for most rate and credit instruments
   * @memberof JsonRisk
   * @extends Instrument
   */
  class LegInstrument extends library.Instrument {
    #legs = [];
    #acquire_date = new Date(Date.UTC(0, 0, 1));

    /**
     * Create a leg instrument.
     * @param {obj} obj A plain object representing the instrument
     * @param {string} [obj.currency=""] the currency in which this instrument's value is represented
     * @param {number} [obj.quantity=1.0] the quantity with which the instrument's value is multiplied
     * @param {array} [obj.legs=[]] the legs of this instrument.
     * @param {date} [obj.acquire_date=01.01.1900] the acquire date
     */
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

    /**
     * Get the vector of legs. Array is frozen, i.e., read only.
     * @type {array}
     */
    get legs() {
      return this.#legs;
    }

    /**
     * Get the acquire date.
     * @type {date}
     */
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
