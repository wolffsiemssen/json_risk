TEST_NAME = "Equity American Vanilla Option";

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
  JsonRisk.set_valuation_date("2025/01/01");
  for (const [index, item] of testAmericanData.entries()) {
    let [
      type,
      strike,
      spot,
      q,
      r,
      t,
      vol,
      n,
      first_exercise_date,
      value_reference,
    ] = item;
    let forward = spot * Math.exp(-t * q) * Math.exp(t * r);
    let model = new JsonRisk.CRRBinomialModel(
      t,
      vol,
      spot, // forward, // we use the spot as forward, since the model will adjust it with the dividend yield and risk-free rate to get the forward price at time t
      strike,
      r,
      q,
      n,
      first_exercise_date,
      true,
    );
    let value = type === "Call" ? model.call_price() : model.put_price();

    // we do not discount the value, since the model already takes into account the discounting with the risk-free rate r.
    /* value *= Math.exp(-t * r); */

    // test model

    TestFramework.assert(
      // problem: here I get an error of 2% as compared to the reference, which is quite high, and I am not sure why.
      // It could be due to a cumulative effect of rounding errors in the binomial tree, but I will investigate it further.

      Math.abs(value - value_reference) < 0.0001, // we use a tolerance of 1e-4 since the reference values are typically rounded to 4 decimal places, and we want to avoid false positives due to rounding issues
      `CRR binomial model price ${index}, value ${value.toFixed(4)}, reference ${value_reference.toFixed(4)}`,
    );

    // test instrument
    const days = Math.round(t * 365.0);
    const expiry = JsonRisk.add_days(JsonRisk.valuation_date, days);
    // adjusted t is needed since jsonrisk works with pure dates without time component and act/365. So, time to expiry is typically not exactly as in the test data. The value of 0.25, for example, is impossible, since that is between 91 days and 92 days.
    t = JsonRisk.time_from_now(expiry);

    // adjusted forward with new t
    forward = spot * Math.exp(-t * q) * Math.exp(t * r);

    // adjusted reference price with new t
    model = new JsonRisk.CRRBinomialModel(
      t,
      vol,
      spot, // forward, // we use the spot as forward, since the model will adjust it with the dividend yield and risk-free rate to get the forward price at time t
      strike,
      r,
      q,
      n,
      first_exercise_date,
      true,
    );
    value_reference = type === "Call" ? model.call_price() : model.put_price();

    // We could also test that in the case of european options, the price given by the model is the same as the price 
    // given by the Black-Scholes formula, which is implemented in the library as well. 
    // This would be a good test to check that the model is correctly implemented, 
    // and that it converges to the correct price for european options as the number of steps increases. 
    // For now, we will just test that the price given by the model is close to the reference value given in the book,
    // which is a good test of the overall implementation of the instrument and the model.


    // value_reference *= Math.exp(-t * r);

    const instrument = new JsonRisk.EquityAmericanOption({
      quote: "stock",
      disc_curve: "riskless",
      repo_curve: "riskless",
      surface: "surface",
      spot_days: 0,
      strike: strike,
      is_call: type === "Call",
      expiry: expiry,
      r: r,
      q: q,
      n: n,
      first_exercise_date: first_exercise_date,
    });

    const params = new JsonRisk.Params({
      valuation_date: JsonRisk.valuation_date,
      scalars: { stock: { value: spot * Math.exp(-t * q) } }, // instruments do not support dividend yield, so we adjust the spot
      curves: {
        riskless: { compounding: "Continuous", times: [1.0], zcs: [r] },
      },
      surfaces: {
        surface: {
          type: "expiry_abs_strike",
          expiries: [1.0],
          moneyness: [1.0],
          values: [[vol]],
        },
      },
    });

    value = instrument.value(params);

    TestFramework.assert(
      Math.abs(value - value_reference) < 1e-12,
      `Equity american vanilla option ${index}, value ${value.toFixed(4)}, reference ${value_reference.toFixed(4)}`,
    );
  }
};

// The data below is from the book:
//      "Option pricing formulas", E.G. Haug, McGraw-Hill, second edition 2007
//
const testAmericanData = [
  // pag 285
  // type, strike,spot,q,r,t,vol, n, first exercise date, value
  // the "value" is the price of the option, as given in the book, and it is used as a reference to test the implementation of the model and the instrument.
  // Unless there are some errors in the implementation, it seems that the CRR method is not perfectly accurate,
  // and a tolerance of 1e-4, although in principle justified in the tests to avoid false positives due to rounding issues,
  // is not sufficient here: I get an error of 2%, which is quite high. It could be due to a cumulative effect of rounding errors in the binomial tree.
  // I will investigate it further.
 

  ["Put", 95.0, 100.0, 0.0, 0.08, 0.5, 0.3, 5, null, 4.92],

  // from the CD rom of the book
  ["Call", 42.0, 42.0, 0.0, 0.1, 0.5, 0.2, 52, null, 4.7623],
  ["Put", 40.0, 42.0, 0.0, 0.1, 0.5, 0.2, 52, null, 0.9113],
];
