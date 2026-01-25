(function (library) {
  class Floater extends library.LegInstrument {
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
