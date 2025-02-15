TEST_NAME = "Distribution Functions";

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

    Test distribution functions

     */

  var prob_interval = [
    0, 0.68268949, 0.95449974, 0.9973002, 0.99993666, 0.99999943,
  ];
  for (i = 0; i < prob_interval.length; i++) {
    TestFramework.assert(
      (JsonRisk.ndf(i) * Math.sqrt(4.0 * Math.acos(0.0))).toFixed(8) ===
        Math.exp((-i * i) / 2).toFixed(8),
      "Test normal distribution function (" + i + ")",
    );
  }

  for (i = 0; i < prob_interval.length; i++) {
    TestFramework.assert(
      (JsonRisk.cndf(i) - JsonRisk.cndf(-i)).toFixed(8) ===
        prob_interval[i].toFixed(8),
      "Test cumulative normal distribution function (" + i + ")",
    );
  }

  for (i = 0; i < prob_interval.length; i++) {
    console.log("IST:  " + (JsonRisk.fast_cndf(i) - JsonRisk.fast_cndf(-i)));
    console.log("SOLL: " + prob_interval[i]);
    TestFramework.assert(
      (JsonRisk.fast_cndf(i) - JsonRisk.fast_cndf(-i)).toFixed(5) ===
        prob_interval[i].toFixed(5),
      "Test fast cumulative normal distribution function (" + i + ")",
    );
  }
};
