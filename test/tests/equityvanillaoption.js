TEST_NAME = "Equity Vanilla Option";

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
  for (const [index, item] of testData.entries()) {
    let [type, strike, spot, q, r, t, vol, value_reference] = item;
    let forward = spot * Math.exp(-t * q) * Math.exp(t * r);
    let model = new JsonRisk.BlackModel(t, vol);
    let value =
      type === "Call"
        ? model.call_price(forward, strike)
        : model.put_price(forward, strike);

    value *= Math.exp(-t * r);

    // test model

    TestFramework.assert(
      Math.abs(value - value_reference) < 0.0001,
      `Black model price ${index}, value ${value.toFixed(4)}, reference ${value_reference.toFixed(4)}`,
    );

    // test instrument
    const days = Math.round(t * 365.0);
    const expiry = JsonRisk.add_days(JsonRisk.valuation_date, days);
    // adjusted t is needed since jsonrisk works with pure dates without time component and act/365. So, time to expiry is typically not exactly as in the test data. The value of 0.25, for example, is impossible, since that is between 91 days and 92 days.
    t = JsonRisk.time_from_now(expiry);

    // adjusted forward with new t
    forward = spot * Math.exp(-t * q) * Math.exp(t * r);

    // adjusted reference price with new t
    model = new JsonRisk.BlackModel(t, vol);
    value_reference =
      type === "Call"
        ? model.call_price(forward, strike)
        : model.put_price(forward, strike);

    value_reference *= Math.exp(-t * r);

    const instrument = new JsonRisk.EquityOption({
      quote: "stock",
      disc_curve: "riskless",
      repo_curve: "riskless",
      surface: "surface",
      spot_days: 0,
      strike: strike,
      is_call: type === "Call",
      expiry: expiry,
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
      `Equity vanilla option ${index}, value ${value.toFixed(4)}, reference ${value_reference.toFixed(4)}`,
    );
  }
};

// The data below is from the QuantLib test suite, originally from the book:
//      "Option pricing formulas", E.G. Haug, McGraw-Hill 1998
//
const testData = [
  // pag 2-8
  // type, strike,spot,q,r,t,vol,value
  ["Call", 65.0, 60.0, 0.0, 0.08, 0.25, 0.3, 2.1334],
  ["Put", 95.0, 100.0, 0.05, 0.1, 0.5, 0.2, 2.4648],
  ["Put", 19.0, 19.0, 0.1, 0.1, 0.75, 0.28, 1.7011],
  ["Call", 19.0, 19.0, 0.1, 0.1, 0.75, 0.28, 1.7011],
  ["Call", 1.6, 1.56, 0.08, 0.06, 0.5, 0.12, 0.0291],
  ["Put", 70.0, 75.0, 0.05, 0.1, 0.5, 0.35, 4.087],
  // pag 24
  ["Call", 100.0, 90.0, 0.1, 0.1, 0.1, 0.15, 0.0205],
  ["Call", 100.0, 100.0, 0.1, 0.1, 0.1, 0.15, 1.8734],
  ["Call", 100.0, 110.0, 0.1, 0.1, 0.1, 0.15, 9.9413],
  ["Call", 100.0, 90.0, 0.1, 0.1, 0.1, 0.25, 0.315],
  ["Call", 100.0, 100.0, 0.1, 0.1, 0.1, 0.25, 3.1217],
  ["Call", 100.0, 110.0, 0.1, 0.1, 0.1, 0.25, 10.3556],
  ["Call", 100.0, 90.0, 0.1, 0.1, 0.1, 0.35, 0.9474],
  ["Call", 100.0, 100.0, 0.1, 0.1, 0.1, 0.35, 4.3693],
  ["Call", 100.0, 110.0, 0.1, 0.1, 0.1, 0.35, 11.1381],
  ["Call", 100.0, 90.0, 0.1, 0.1, 0.5, 0.15, 0.8069],
  ["Call", 100.0, 100.0, 0.1, 0.1, 0.5, 0.15, 4.0232],
  ["Call", 100.0, 110.0, 0.1, 0.1, 0.5, 0.15, 10.5769],
  ["Call", 100.0, 90.0, 0.1, 0.1, 0.5, 0.25, 2.7026],
  ["Call", 100.0, 100.0, 0.1, 0.1, 0.5, 0.25, 6.6997],
  ["Call", 100.0, 110.0, 0.1, 0.1, 0.5, 0.25, 12.7857],
  ["Call", 100.0, 90.0, 0.1, 0.1, 0.5, 0.35, 4.9329],
  ["Call", 100.0, 100.0, 0.1, 0.1, 0.5, 0.35, 9.3679],
  ["Call", 100.0, 110.0, 0.1, 0.1, 0.5, 0.35, 15.3086],
  ["Put", 100.0, 90.0, 0.1, 0.1, 0.1, 0.15, 9.921],
  ["Put", 100.0, 100.0, 0.1, 0.1, 0.1, 0.15, 1.8734],
  ["Put", 100.0, 110.0, 0.1, 0.1, 0.1, 0.15, 0.0408],
  ["Put", 100.0, 90.0, 0.1, 0.1, 0.1, 0.25, 10.2155],
  ["Put", 100.0, 100.0, 0.1, 0.1, 0.1, 0.25, 3.1217],
  ["Put", 100.0, 110.0, 0.1, 0.1, 0.1, 0.25, 0.4551],
  ["Put", 100.0, 90.0, 0.1, 0.1, 0.1, 0.35, 10.8479],
  ["Put", 100.0, 100.0, 0.1, 0.1, 0.1, 0.35, 4.3693],
  ["Put", 100.0, 110.0, 0.1, 0.1, 0.1, 0.35, 1.2376],
  ["Put", 100.0, 90.0, 0.1, 0.1, 0.5, 0.15, 10.3192],
  ["Put", 100.0, 100.0, 0.1, 0.1, 0.5, 0.15, 4.0232],
  ["Put", 100.0, 110.0, 0.1, 0.1, 0.5, 0.15, 1.0646],
  ["Put", 100.0, 90.0, 0.1, 0.1, 0.5, 0.25, 12.2149],
  ["Put", 100.0, 100.0, 0.1, 0.1, 0.5, 0.25, 6.6997],
  ["Put", 100.0, 110.0, 0.1, 0.1, 0.5, 0.25, 3.2734],
  ["Put", 100.0, 90.0, 0.1, 0.1, 0.5, 0.35, 14.4452],
  ["Put", 100.0, 100.0, 0.1, 0.1, 0.5, 0.35, 9.3679],
  ["Put", 100.0, 110.0, 0.1, 0.1, 0.5, 0.35, 5.7963],
  // pag 27
  ["Call", 40.0, 42.0, 0.08, 0.04, 0.75, 0.35, 5.0975],
];
