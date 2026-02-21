(function (library) {
  /**
   * Class representing a floating rate bond
   * @memberof JsonRisk
   * @extends LegInstrument
   */
  class Floater extends library.LegInstrument {
    /**
     * Create a floater instrument. If legs are not provided, legs are generated from terms and conditions. Legs must contain one and only one leg with floating and notional payments.
     * @param {obj} obj A plain object representing the instrument
     * @param {string} [obj.currency=""] the currency in which this instrument's value is represented
     * @param {number} [obj.quantity=1.0] the quantity with which the instrument's value is multiplied
     * @param {array} [obj.legs=[]] the legs of this instrument.
     * @param {date} [obj.acquire_date=01.01.1900] the acquire date
     */
    constructor(obj) {
      if (!Array.isArray(obj.legs)) {
        // create shallow copy and leave original object unchanged
        const tempobj = Object.assign({}, obj);

        // remove fixed_rate so cash flow generator generates floating leg
        delete tempobj.fixed_rate;

        // generate leg from terms and conditions
        const leg = library.cashflow_generator(tempobj);

        // make simple index
        const index = {
          fwd_curve: obj.fwd_curve,
          surface: obj.surface,
          dcc: obj.dcc,
        };

        // attach index to leg json
        leg.indices = { index: index };

        // attach leg to instrument json
        tempobj.legs = [leg];

        super(tempobj);

        // update notionals
        this.legs[0].update_notionals();
      } else {
        super(obj);
      }

      // sanity checks
      if (1 !== this.legs.length)
        throw new Error("Floater: must have exactly one leg");

      const leg = this.legs[0];
      if (leg.has_fixed_rate_payments)
        throw new Error("Floater: cannot have fixed rate payments");

      if (false === leg.has_notional_payments)
        throw new Error("Floater: must have notional payments");
    }

    fair_rate_or_spread(params) {
      // returns the spread rate this bond would have to carry in order to have a par valuation
      return this.legs[0].fair_rate_or_spread(params);
    }

    annuity(params) {
      // returns spread rate annuity
      return this.legs[0].annuity(params);
    }
  }

  library.Floater = Floater;
})(this.JsonRisk || module.exports);
