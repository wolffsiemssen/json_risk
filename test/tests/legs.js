TEST_NAME = "Leg Instruments";

test = {
  name: TEST_NAME,
};

if (typeof module === "object" && typeof exports !== "undefined") {
  // Node
  module.exports = test;
} else {
  // Browser
  jr_tests.push(test);
}

test.execute = function (TestFramework, JsonRisk) {
  /*

    Test Leg Instruments

     */

  JsonRisk.set_valuation_date("2000/01/01");
  const currencies = {
    EUR: 1.0,
    JPY: 170,
    NOK: 0.12,
  };

  const params = {
    valuation_date: JsonRisk.valuation_date,
    curves: {
      discount: {
        times: [1],
        zcs: [0.0],
      },
    },
    scalars: {},
  };

  const template = {
    date_pmt: "2000/01/02",
    date_start: "1999/01/01",
    date_end: "2000/01/01",
  };

  const legs = [];
  const pmtval = 100;
  const rate = 0.01;
  let refval = 0;

  for (const [currency, fxrate] of Object.entries(currencies)) {
    // new scalar for new currency
    params.scalars[currency] = {
      value: fxrate,
    };
    // new leg for new currency
    const leg = {
      disc_curve: "discount",
      payments: [],
    };
    legs.push(leg);

    // add rate payment
    let rate_payment = Object.assign(
      {
        type: "fixed",
        currency: currency,
        notional: pmtval * fxrate,
        rate: rate,
      },
      template,
    );
    refval += pmtval * rate;
    leg.payments.push(rate_payment);

    // add notional payment
    let notional_payment = Object.assign(
      {
        type: "notional",
        currency: currency,
        notional: pmtval * fxrate,
      },
      template,
    );
    refval += pmtval;
    leg.payments.push(notional_payment);
  }

  for (const [currency, fxrate] of Object.entries(currencies)) {
    // instrument currency does not matter in the end, as payment currencies are converted correctly
    const legins = new JsonRisk.LegInstrument({ currency, legs });

    const val = legins.value(params);
    TestFramework.assert(
      val === refval,
      `Test Leg Instrumemts with different payment types and currencies, ${currency}`,
    );
  }
};
