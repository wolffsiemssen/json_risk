(function (library) {
  /**
   * Class representing a FX Swap, FX Spot or FX Forward instrument
   * @memberof JsonRisk
   * @extends LegInstrument
   */
  class FxTerm extends library.LegInstrument {
    /**
     * Create a fx term instrument.
     * @param {obj} obj A plain object representing the instrument
     * @param {string} [obj.currency=""] the currency in which this instrument's value is represented
     * @param {number} [obj.quantity=1.0] the quantity with which the instrument's value is multiplied
     * @param {array} [obj.legs=[]] the legs of this instrument. Must be one or two legs. If two legs are specified, they must have two different currencies. If no legs are specified, one single leg is generated from terms and conditions.
     * @param {date} [obj.acquire_date=01.01.1900] the acquire date
     */
    constructor(obj) {
      if (!Array.isArray(obj.legs)) {
        // generate leg from terms and conditions, only one single currency leg with near and optonally far payment supported
        const leg = {
          currency: obj.currency,
          disc_curve: obj.disc_curve,
          payments: [],
        };

        // near payment
        leg.payments.push({
          type: "notional",
          notional: obj.notional,
          date_pmt: obj.maturity,
        });

        // far payment
        if (
          typeof obj.notional_2 === "number" &&
          library.date_or_null(obj.maturity_2)
        ) {
          leg.payments.push({
            type: "notional",
            notional: obj.notional_2,
            date_pmt: obj.maturity_2,
          });
        }

        // create shallow copy with leg and call constructor
        const tempobj = Object.assign({ legs: [leg] }, obj);
        super(tempobj);
      } else {
        super(obj);
      }

      // consistency checks
      if (1 !== this.legs.length && 2 !== this.legs.length)
        throw new Error("FxTerm: must have one or two legs");

      if (
        2 === this.legs.length &&
        this.legs[0].currency === this.legs[1].currency
      ) {
        throw new Error("FxTerm: Legs must have different currencies.");
      }
    }
  }

  library.FxTerm = FxTerm;
})(this.JsonRisk || module.exports);
