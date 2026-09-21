(function (library) {
  /**
   * Class representing a interest rate cap, floor or collar
   * @memberof JsonRisk
   * @extends LegInstrument
   */

  class CapFloor extends library.LegInstrument {
    /**
     * Create a cap/floor instrument. If legs are not provided, legs are generated from terms and conditions.
     * Legs must contain one and only one leg with caplet/floorlet and notional payments.
     *
     * @param {object} obj - A plain JavaScript object representing the instrument terms and conditions.
     *
     * @param {string} [obj.id] - Unique identifier for the instrument instance.
     * @param {string} [obj.currency=""] - The currency in which this instrument's value is represented (e.g., "EUR", "USD").
     * @param {number} [obj.quantity=1.0] - The multiplier/quantity with which the instrument's total value is multiplied.
     * @param {Date} [obj.acquire_date] - The acquisition date of the instrument. Used for portfolio inventory accounting.
     * @param {array} [obj.legs] - Optional array containing pre-generated leg objects. If provided, the generator is bypassed.
     *
     * @param {number} [obj.notional] - The principal or nominal amount of the contract upon which payments are calculated.
     * @param {boolean} [obj.notional_exchange=false] - If true, principal exchange cashflows are generated at start and maturity.
     * @param {string} [obj.payment_type="capfloor"] - Internal flag to trigger caplet/floorlet generation path inside the cashflow generator.
     *
     * @param {number|number[]} [obj.cap_rate] - The strike rate for the Cap components. Can be a scalar (constant) or an array of numbers mapping to each schedule period (variable/amortizing strike). Must be provided if the instrument includes a Cap or Collar.
     * @param {number|number[]} [obj.floor_rate] - The strike rate for the Floor components. Can be a scalar (constant) or an array of numbers mapping to each schedule period. Must be provided if the instrument includes a Floor or Collar.
     * @param {number} [obj.float_current_rate] - The already fixed rate for the current period
     * @param {string} [obj.freq="6M"] - The payment and fixing frequency of the periods (e.g., "1M", "3M", "6M", "1Y").
     * @param {string} [obj.tenor="6M"] - The tenor (e.g., "1M", "3M", "6M").
     * @param {string} [obj.dcc="act/365"] - Day Count Convention used to calculate period year fractions (`yf`) and volatility horizons (e.g., "act/365", "act/360", "30/360").
     * @param {string} [obj.bdc="modfollow"] - Business Day Convention applied to unadjusted period dates (e.g., "following", "modfollow", "preceding").
     * @param {string} [obj.calendar="TARGET"] - The holiday calendar used for business day adjustments (e.g., "TARGET", "NYSE", "London").
     *
     * @param {Date} [obj.effective_date] - The inception or start date from which the schedule periods begin to accrue.
     * @param {Date} [obj.maturity] - The final termination or legal end date of the instrument.
     * @param {boolean} [obj.capitalize=false] - If true, option payoffs are capitalized into the subsequent period's notional rather than paid out immediately as cash.
     *
     * // @param {string} [obj.fwd_curve] - The string identifier/key mapping to the forward interest rate curve in global `params` (used to project fixing rates).
     * @param {string} [obj.disc_curve] - The string identifier/key mapping to the discount curve in global `params` (used to compute discount factors for payouts).
     * @param {obj} [obj.fwd_curve] - A function, its form is here for testing
     * @param {number|number[]} [obj.cap_vola_curve] - array of cap volatilities, or constant value
     * @param {number|number[]} [obj.floor_vola_curve] - array of floor volatilities, or constant value
     */

    constructor(obj) {
      if (!Array.isArray(obj.legs)) {
        // the obj passed to the constructor must contain information about the cap/floor,
        // e.g., the notional, the fixed rate, the cap rate, the floor rate, the payment dates,
        // the forward curve, the volatility curve etc.
        // If legs are not provided, we generate a leg from the terms and conditions in obj.

        // create shallow copy and leave original object unchanged
        const tempobj = Object.assign({}, obj);

        delete tempobj.fixed_rate;

        tempobj.payment_type ??= "capfloor"; // we need this to generate a leg with caplet/floorlet payments, so we set the payment_type to "capfloor" if it is not provided in obj

        // make simple index
        const index_config = {
          payment_type: obj.payment_type || "capfloor", // this is the type of payment, e.g., "capfloor", "caplet", "floorlet", etc.
          fwd_curve: obj.fwd_curve,
          // surface: obj.surface, // volatility surface, used to price caplets and floorlets
          // currently not used, but we can use it to get the volatility for the caplet/floorlet pricing

          /* // TODO do I need cap and floor vola curves for the index? Maybe not
          // we assume that volatilities are by contract already reduced to term structures depending only on time parameter,
          // so, for either cap or floor, we do not pass a surface but a curve with volatility for each fixing date, which is used to price caplets and floorlets 
          cap_vola_curve: obj.cap_vola_curve, // volatility surface for caplets, used to price caplets
          floor_vola_curve: obj.floor_vola_curve, // volatility surface for floorlets, used to price floorlets */

          disc_curve: obj.disc_curve, // discount curve, used to discount caplet/floorlet payments
          dcc: obj.dcc || "act/365", // day count convention, used to calculate the year fraction for the caplet/floorlet payments
        };

        tempobj.indices = { index: index_config };
        tempobj.index = "index";

        // generate leg from terms and conditions
        const leg = library.cashflow_generator(tempobj);

        // attach index to leg json
        leg.indices = { index: index_config };

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
        throw new Error("CapFloor: must have exactly one leg");

      const leg = this.legs[0];
      if (leg.has_fixed_rate_payments)
        throw new Error("CapFloor: cannot have fixed rate payments");

      if (false === leg.has_notional_payments)
        throw new Error("CapFloor: must have notional payments");
    }

    // present value is declared here to overcome passing through a pricer declared in json_risk_docu.js
    present_value(disc_curve) {
      const value_date = library.valuation_date;
      let total_pv = 0.0;

      const leg = this.legs[0];
      const cashflows = leg.payments;

      for (let i = 0; i < cashflows.length; i++) {
        const c = cashflows[i];

        if (c.date_pmt <= value_date) continue;
        if (c.rate_cap === undefined && c.rate_floor === undefined) continue;

        const df = disc_curve.get_df(value_date, c.date_pmt);
        const nominal_payoff = c.amount;

        total_pv += nominal_payoff * df;
      }

      return total_pv;
    }
  }

  library.CapFloor = CapFloor;
})(this.JsonRisk || module.exports);
