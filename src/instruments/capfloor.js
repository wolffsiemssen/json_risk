(function (library) {
  /**
   * Class representing an interest rate cap or floor
   * @memberof JsonRisk
   * @extends LegInstrument
   */
  class CapFloor extends library.LegInstrument {
    /**
     * Create a cap/floor instrument. If legs are not provided, legs are generated from terms and conditions. Legs must contain one and only one leg with floating and notional payments.
     * @param {obj} obj A plain object representing the instrument
     * @param {string} [obj.currency=""] the currency in which this instrument's value is represented
     * @param {number} [obj.quantity=1.0] the quantity with which the instrument's value is multiplied
     * @param {array} [obj.legs=[]] the legs of this instrument.
     * @param {date} [obj.acquire_date=01.01.1900] the acquire date
     *
     * // MANDATORY & OPTIONAL FIELDS FOR GENERATING THE CAP/FLOOR CASH FLOWS:
     * @param {date|string} obj.effective_date - The start date of the instrument.
     * @param {date|string} obj.maturity - The maturity / end date of the instrument.
     * @param {number} obj.notional - The nominal amount for interest calculation.
     * @param {number} obj.tenor - The payment frequency in months (e.g., 6 for semi-annual).
     * @param {number} obj.float_current_rate - The fixing rate for the current open interest period.
     * @param {number} [obj.float_spread=0.0] - The constant margin/spread added to the floating rate.
     * @param {number} obj.cap_rate - The cap strike rate
     * @param {number} obj.floor_rate - The floor strike rate
     * @param {string} obj.disc_curve - The name of the discounting interest rate curve.
     * @param {string} obj.fwd_curve - The name of the forward interest rate curve for projections.
     * @param {string} obj.surface - The name of the ExpiryStrike volatility surface.
     * @param {string} [obj.dcc="act/365"] - Day count convention (e.g., "act/360", "30/360").
     * @param {string} [obj.calendar="TARGET"] - The holiday calendar used for business day adjustments.
     * @param {string} [obj.bdc="f"] - Business day convention (e.g., "f" for following, "m" for modified following).
     */

    constructor(obj) {
      if (!Array.isArray(obj.legs)) {
        // create shallow copy and leave original object unchanged
        const tempobj = Object.assign({}, obj);

        // remove fixed_rate so cash flow generator generates floating leg
        delete tempobj.fixed_rate;

        // generate leg from terms and conditions
        const leg = library.cashflow_generator(tempobj);

        // remove all payments except caplets and floorlets
        leg.payments = leg.payments.filter(
          (p) => p.type === "caplet" || p.type === "floorlet",
        );

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
      if (
        leg.has_fixed_rate_payments ||
        leg.has_float_rate_payments ||
        leg.has_notional_payments
      )
        throw new Error("CapFloor: can only have caplet and floorlet payments");

      if (leg.has_capitalization)
        throw new Error("CapFloor: cannot have capitalization");
    }

    /**
     * Calculate the fair spread rate, i.e., the spread rate this bond would have to carry on top of the float rate in order to have a par valuation
     * @param {Params} params a valid parameters container object
     * @returns {number}
     */
    fair_rate_or_spread(params) {
      return this.legs[0].fair_rate_or_spread(params);
    }

    /**
     * Calculate the spread rate annuity, e.g. the value of one hundred percent spread on top of the float rate
     * @param {Params} params a valid parameters container object
     * @returns {number}
     */
    annuity(params) {
      // returns spread rate annuity
      return this.legs[0].annuity(params);
    }
  }

  library.CapFloor = CapFloor;
})(this.JsonRisk || module.exports);
