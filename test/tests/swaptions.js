TEST_NAME = "Swaptions";

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

    Test Swaptions

     */

  var params = {
    surfaces: {
      surface: {
        type: "bachelier",
        expiries: [1, 2, 3],
        terms: [1, 2, 3, 4],
        values: [
          [0.01, 0.01, 0.02, 0.02],
          [0.02, 0.02, 0.03, 0.03],
          [0.03, 0.03, 0.04, 0.04],
        ],
      },
    },
    curves: {
      curve: {
        times: [1 / 12, 3 / 12, 6 / 12, 1, 2, 3, 4, 5],
        zcs: [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.007],
      },
    },
  };
  params.valuation_date = JsonRisk.valuation_date = TestFramework.get_utc_date(
    2000,
    0,
    17,
  );
  params = new JsonRisk.Params(params);

  const expiries = [0, 6, 12, 18, 24, 36, 48, 60, 72, 96, 120];
  const months = [6, 12, 24, 48, 72, 120];

  for (i = 0; i < months.length; i++) {
    for (j = 0; j < expiries.length; j++) {
      const json = {
        is_payer: false,
        maturity: JsonRisk.add_months(
          JsonRisk.valuation_date,
          expiries[j] + months[i],
        ),
        first_exercise_date: JsonRisk.add_months(
          JsonRisk.valuation_date,
          expiries[j],
        ),
        effective_date: JsonRisk.add_months(
          JsonRisk.valuation_date,
          expiries[j],
        ),
        notional: 10000,
        fixed_rate: 0.02,
        tenor: 6,
        float_spread: 0.01,
        float_tenor: 3,
        float_current_rate: 0,
        dcc: "act/365",
        float_dcc: "30e/360",
        disc_curve: "curve",
        fwd_curve: "curve",
        surface: "surface",
      };

      const p1 = new JsonRisk.Swap(json).value(params);
      console.log("JSON Risk forward receiver swap price:   " + p1.toFixed(3));
      json.is_short = true;
      const p2 = new JsonRisk.Swaption(json).value(params);
      console.log("JSON Risk short receiver swaption price: " + p2.toFixed(3));
      json.is_payer = true;
      json.is_short = false;
      const p3 = new JsonRisk.Swaption(json).value(params);
      console.log("JSON Risk long payer swaption price:     " + p3.toFixed(3));
      console.log(
        "Sum of all three instruments:            " + (p1 + p2 + p3).toFixed(3),
      );
      TestFramework.assert(
        Math.abs(p1 + p2 + p3) < 0.01,
        "Test swaption put call parity      (" +
          expiries[j] +
          "M into " +
          months[i] +
          "M)",
      );
      console.log("-----------------");
    }
  }
};
