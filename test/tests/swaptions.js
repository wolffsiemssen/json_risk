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

  var surface = {
    type: "bachelier",
    expiries: [1, 2, 3],
    terms: [1, 2, 3, 4],
    values: [
      [0.01, 0.01, 0.02, 0.02],
      [0.02, 0.02, 0.03, 0.03],
      [0.03, 0.03, 0.04, 0.04],
    ],
  };
  var expiries = [0, 6, 12, 18, 24, 36, 48, 60, 72, 96, 120];
  var months = [6, 12, 24, 48, 72, 120];
  var tenors = [1, 3, 6, 12];
  var times = [1 / 12, 3 / 12, 6 / 12, 1, 2, 3, 4, 5];
  var zcs = [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.007];

  curve = {
    times: times,
    zcs: zcs,
  };
  JsonRisk.valuation_date = TestFramework.get_utc_date(2000, 0, 17);
  var p1, p2, p3;
  for (i = 0; i < months.length; i++) {
    for (j = 0; j < expiries.length; j++) {
      JsonRisk.valuation_date = TestFramework.get_utc_date(2000, 0, 17);

      swaption = {
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
      };

      p1 = JsonRisk.pricer_swap(swaption, curve, curve);
      console.log("JSON Risk forward receiver swap price:   " + p1.toFixed(3));
      swaption.is_short = true;
      p2 = JsonRisk.pricer_swaption(swaption, curve, curve, surface);
      console.log("JSON Risk short receiver swaption price: " + p2.toFixed(3));
      swaption.is_payer = true;
      swaption.is_short = false;
      p3 = JsonRisk.pricer_swaption(swaption, curve, curve, surface);
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
