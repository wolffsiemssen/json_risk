TEST_NAME = "Period String Conversion";

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

    Period string conversion

     */
  TestFramework.assert(
    JsonRisk.period_str_to_time("1Y") === 1,
    "Period string (1Y)",
  );
  TestFramework.assert(
    JsonRisk.period_str_to_time("12y") === 12,
    "Period string (12y)",
  );
  TestFramework.assert(
    JsonRisk.period_str_to_time("999Y") === 999,
    "Period string (999Y)",
  );
  TestFramework.assert(
    JsonRisk.period_str_to_time("6M") === 1 / 2,
    "Period string (6M)",
  );
  TestFramework.assert(
    JsonRisk.period_str_to_time("12m") === 1,
    "Period string (12m)",
  );
  TestFramework.assert(
    JsonRisk.period_str_to_time("24M") === 2,
    "Period string (24M)",
  );
  TestFramework.assert(
    JsonRisk.period_str_to_time("365d") === 1,
    "Period string (365d)",
  );
  TestFramework.assert(
    JsonRisk.period_str_to_time("156w") === 3,
    "Period string (156w)",
  );

  var foo = "do not overwrite";
  try {
    foo = JsonRisk.period_str_to_time("156r");
  } catch (e) {
    console.log("Expected error message: " + e.toString());
  }
  TestFramework.assert(
    foo === "do not overwrite",
    "Period string (invalid period string)",
  );
};
