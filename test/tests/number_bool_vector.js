TEST_NAME = "Number Bool Vector";

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

		Test number and boolean vector parsing

	*/

  for (var b of JsonRisk.make_bool_vector(
    "True   TRUE yes YES 1  1   1.0 0.999E10",
  )) {
    TestFramework.assert(true === b, "Boolean conversion (true)");
  }

  for (var b of JsonRisk.make_bool_vector(
    "False   FALSE no NOTTRUE 0  0.0   0.000E10",
  )) {
    TestFramework.assert(false === b, "Boolean conversion (false)");
  }

  for (var n of JsonRisk.number_vector_or_null("1 1.0 100%")) {
    TestFramework.assert(1 === n, "Number conversion (one)");
  }
};
