(function (library) {
  /**
   * Class representing a fixed rate bond
   * @memberof JsonRisk
   * @extends LegInstrument
   */
  class Bond extends library.LegInstrument {
    /**
     * Create a bond instrument. If legs are not provided, legs are generated from terms and conditions. Legs must contain one and only one lag with fixed and notional payments.
     * @param {obj} obj A plain object representing the instrument
     * @param {string} [obj.currency=""] the currency in which this instrument's value is represented
     * @param {number} [obj.quantity=1.0] the quantity with which the instrument's value is multiplied
     * @param {array} [obj.legs=[]] the legs of this instrument.
     * @param {date} [obj.acquire_date=01.01.1900] the acquire date
     */
    constructor(obj) {
      if (!Array.isArray(obj.legs)) {
        // fixed rate must be set either as a number or as a vector
        const f = library.number_vector_or_null(obj.fixed_rate);
        if (null === f) throw new Error("Bond: must have fixed rate set");

        // generate leg from terms and conditions
        const leg = library.cashflow_generator(obj);

        // create shallow copy and leave original object unchanged
        const tempobj = Object.assign({ legs: [leg] }, obj);
        super(tempobj);

        // update notionals
        this.legs[0].update_notionals();
      } else {
        super(obj);
      }

      // sanity checks
      if (1 !== this.legs.length)
        throw new Error("Bond: must have exactly one leg");

      const leg = this.legs[0];
      if (leg.has_float_rate_payments)
        throw new Error("Bond: cannot have float rate payments");
      if (false === leg.has_notional_payments)
        throw new Error("Bond: must have notional payments");
    }

    /**
     * Get the first fixed rate found on the bond's leg.
     * @type {number}
     */
    get fixed_rate() {
      //returns first rate on the leg
      for (const p of this.legs[0].payments) {
        if (p instanceof library.FixedRatePayment) {
          return p.rate;
        }
      }
      throw new Error(
        "Bond: cannot retrieve fixed rate, bond has no rate payments",
      );
    }

    /**
     * Calculate the fair rate, i.e., the rate this bond would have to carry in order to have a par valuation
     * @param {Params} params a valid parameters container object
     * @returns {number}
     */
    fair_rate_or_spread(params) {
      // returns
      return this.legs[0].fair_rate_or_spread(params);
    }

    /**
     * Calculate the fixed rate annuity
     * @param {Params} params a valid parameters container object
     * @returns {number}
     */
    annuity(params) {
      // returns fixed rate annuity
      return this.legs[0].annuity(params);
    }
  }

  library.Bond = Bond;
})(this.JsonRisk || module.exports);
