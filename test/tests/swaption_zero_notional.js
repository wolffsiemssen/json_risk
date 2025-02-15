TEST_NAME = "Swaption Zero Notional";

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

    Test swaption with zero notional

     */

  var times = [1 / 12, 3 / 12, 6 / 12, 1, 2, 3, 4, 5];
  var zcs = [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.007];

  curve = {
    times: times,
    zcs: zcs,
  };
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

  swaption.notional = 0;
  p1 = JsonRisk.pricer_swaption(swaption, curve, curve, surface);
  TestFramework.assert(p1 === 0, "Test swaption with zero notional");
};
