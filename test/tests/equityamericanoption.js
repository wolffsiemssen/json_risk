TEST_NAME = "Equity American Option";

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

  const mock_curve = function (rshort, rlong) {
    return {
      get_df: function (t) {
        const r = t <= 0.25 ? rshort : rlong;
        return Math.exp(-r * t);
      },
    };
  };

  for (const [index, item] of testAmericanData.entries()) {
    let [type, strike, spot, q, rshort, rlong, t, vol, n, value_reference] =
      item;
    let model = new JsonRisk.CRRBinomialModel(
      0.0,
      t,
      vol,
      spot, // we use the spot as forward, since the model will adjust it with the dividend yield and risk-free rate to get the forward price at time t
      strike,
      n,
      mock_curve(rshort, rlong),
      q,
    );
    let value = type === "Call" ? model.call_price() : model.put_price();
    // we do not discount the value, since the model already takes into account the discounting with the risk-free rate r.

    // test model

    TestFramework.assert(
      Math.abs(value - value_reference) < 0.0001,
      `CRR binomial model price ${index}, value ${value.toFixed(12)}, reference ${value_reference.toFixed(12)}`,
    );
  }
  /* TestFramework.assert(
      Math.abs(value - value_reference) < 0.001, // 1 / Math.sqrt(n),
      `CRR binomial model price ${index}, value ${value.toFixed(4)}, reference ${value_reference.toFixed(4)}`,
      // we use as tolerance the error of the binomial model, that decreases roughly as 1/sqrt(n), where n is the number of steps in the tree.
      // This is a common rule of thumb for the convergence of the binomial model to the true option price as n increases.
    ); */

  const steps = 500;
  const tolerance = 1e-10; // tolerance to rule out numerical roundoff

  const instrument_json = {
    quote: "stock",
    disc_curve: "riskless",
    repo_curve: "riskless",
    surface: "surface",
    spot_days: 0,
    q: 0.05,
    n: steps,
  };

  const params = new JsonRisk.Params({
    valuation_date: JsonRisk.valuation_date,
    scalars: { stock: { value: 100.0 } }, // we do not use the forward price as a quote, since the model will adjust the spot price with the dividend yield and risk-free rate to get the forward price at time t, so we can directly use the spot price as a quote for the model, and it will take care of the rest.
    curves: {
      riskless: {
        compounding: "Annual",
        times: [1.0, 2.0, 3.0, 5.0, 10.0],
        zcs: [0.01, 0.03, 0.05, 0.07, 0.09],
      },
    },
    surfaces: {
      surface: {
        type: "expiry_abs_strike",
        expiries: [1.0],
        moneyness: [1.0],
        values: [[0.2]],
      },
    },
  });

  const strikes = [80, 90, 100, 110, 120];
  const is_call_flags = [true, false];

  for (const years of [2, 3, 4, 5, 6]) {
    for (const strike of strikes) {
      for (const is_call of is_call_flags) {
        // test instrument
        const days = Math.round(years * 365.0);
        const expiry = JsonRisk.add_days(JsonRisk.valuation_date, days);

        instrument_json.expiry = expiry;
        instrument_json.strike = strike;
        instrument_json.is_call = is_call;

        // full american
        instrument_json.first_exercise_date = null;
        full = new JsonRisk.EquityAmericanOption(instrument_json);
        full = full.value(params);

        // forward starting american, starting one year before end
        instrument_json.first_exercise_date = JsonRisk.add_days(expiry, -365);
        forward = new JsonRisk.EquityAmericanOption(instrument_json);
        forward = forward.value(params);

        // quasi-european, starting five days before
        instrument_json.first_exercise_date = JsonRisk.add_days(expiry, -5);
        approx_euro = new JsonRisk.EquityAmericanOption(instrument_json);
        approx_euro = approx_euro.value(params);

        // numeric european
        instrument_json.first_exercise_date = expiry;
        numeric_euro = new JsonRisk.EquityAmericanOption(instrument_json);
        numeric_euro = numeric_euro.value(params);

        analytic_euro = new JsonRisk.EquityOption(instrument_json);
        analytic_euro = analytic_euro.value(params);

        const option_type = is_call ? "call" : "put";

        TestFramework.assert(
          full > forward - tolerance,
          `Equity american ${option_type} option ${years.toFixed(0)} years, strike ${strike.toFixed(0)}, full option (${full.toFixed(2)}) is worth more than forward starting option (${forward.toFixed(2)})`,
        );

        TestFramework.assert(
          forward >= approx_euro - tolerance,
          `Equity american ${option_type} option ${years.toFixed(0)} years, strike ${strike.toFixed(0)}, forward starting option (${forward.toFixed(2)}) is worth more than quasi european option (${approx_euro.toFixed(2)})`,
        );

        TestFramework.assert(
          approx_euro >= numeric_euro - tolerance,
          `Equity american ${option_type} option ${years.toFixed(0)} years, strike ${strike.toFixed(0)}, quasi european option (${approx_euro.toFixed(2)}) is worth more than numeric european option (${numeric_euro.toFixed(2)})`,
        );

        let ok = false;
        if (Math.abs(numeric_euro - analytic_euro) < 0.01) ok = true;
        TestFramework.assert(
          ok,
          `Equity american ${option_type} option ${years.toFixed(0)} years, strike ${strike.toFixed(0)}, numeric european option (${numeric_euro.toFixed(2)}) is worth about the same as analytic european option (${analytic_euro.toFixed(2)})`,
        );
      }
    }
  }
};

// The data below is from the book:
//      "Option pricing formulas", E.G. Haug, McGraw-Hill, second edition 2007
//
const testAmericanData = [
  // const curve
  // type, strike, spot, q, rshort, rlong, t, vol, n, value
  ["Put", 95.0, 100.0, 0.0, 0.08, 0.08, 0.5, 0.3, 5, 4.91921196455],
  ["Call", 95.0, 100.0, 0.0, 0.08, 0.08, 0.5, 0.3, 5, 13.352682693546],

  // dividend
  ["Put", 95.0, 100.0, 0.05, 0.08, 0.08, 0.5, 0.3, 5, 5.570131008005],
  ["Call", 95.0, 100.0, 0.05, 0.08, 0.08, 0.5, 0.3, 5, 11.664487052877],

  // non const curve
  // type, strike, spot, q, rshort, rlong, t, vol, n, value
  ["Put", 95.0, 100.0, 0.0, 0.03, 0.06, 0.5, 0.3, 5, 5.209098306382],
  ["Call", 95.0, 100.0, 0.0, 0.03, 0.06, 0.5, 0.3, 5, 12.783855042015],

  // from the CD rom of the book
  ["Call", 40.0, 42.0, 0.0, 0.1, 0.1, 0.5, 0.2, 52, 4.7623],
  ["Put", 40.0, 42.0, 0.0, 0.1, 0.1, 0.5, 0.2, 52, 0.9113],
];
