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
      forward: {
        times: [1],
        zcs: [0.01],
      },
    },
    // add vola surface here
    // type: type || "",
    surfaces: {
      volatility: {
        // check what are the allowed types, and where a "from_json" is implemented
        type: "",
        expiries: [1],
        terms: [1],
        values: [[0.2]], // a 20% volatility
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
      surface: "volatility",
      payments: [],
    };
    legs.push(leg);

    // add fixed rate payment
    let fixed_rate_payment = Object.assign(
      {
        type: "fixed",
        currency: currency,
        notional: pmtval * fxrate,
        rate: rate,
      },
      template,
    );
    refval += pmtval * rate;
    leg.payments.push(fixed_rate_payment);

    // add float rate payment with fixing
    let fixed_float_rate_payment = Object.assign(
      {
        type: "float",
        currency: currency,
        notional: pmtval * fxrate,
        rate: rate * 2, // includes spread when fixed
        spread: rate,
        is_fixed: true,
      },
      template,
    );
    refval += pmtval * rate * 2;
    leg.payments.push(fixed_float_rate_payment);

    // add float rate payment without fixing
    let float_rate_payment = {
      type: "float",
      currency: currency,
      notional: pmtval * fxrate,
      rate: null,
      spread: rate,
      is_fixed: false,

      date_pmt: "2010/01/02",
      date_start: "2009/01/01",
      date_end: "2010/01/01",
      index: "index",
    };
    refval += pmtval * rate * 2.0;
    leg.payments.push(float_rate_payment);

    // add caplet payment
    // Note: I presume that eventually a real cap/floor instrument will have one leg, with
    // an array of caplet/floorlet payments
    let cap_rate_payment = {
      type: "Caplet",
      currency: currency,
      notional: pmtval * fxrate,
      rate: rate,
      spread: 0.01 * rate,
      is_fixed: false,
      strike: 0.8 * rate, // a cap choosen so to be in the money ??

      date_pmt: "2012/01/02",
      date_start: "2011/01/01",
      date_end: "2012/01/01",
      index: "cap_index",
    };
    refval += pmtval * rate * 2.0;
    leg.payments.push(cap_rate_payment);

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

    // add index
    leg.indices = {
      index: {
        type: "simple",
        fwd_curve: "forward",
      },
      cap_index: {
        type: "simple",
        fwd_curve: "forward",
        surface: "volatility",
      },
    };
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
