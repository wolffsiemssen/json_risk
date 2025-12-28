(function (library) {
  class FxTerm extends library.LegInstrument {
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
