TEST_NAME = "Date Conversion";

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
  /*!

		Test date conversion back and forth

	*/

  TestFramework.assert(
    JsonRisk.date_to_date_str("2000-01-01") === "2000-01-01",
    "date conversion back and forth (1)",
  );
  TestFramework.assert(
    JsonRisk.date_to_date_str("2000/01/01") === "2000-01-01",
    "date conversion back and forth (2)",
  );
  TestFramework.assert(
    JsonRisk.date_to_date_str("01.01.2000") === "2000-01-01",
    "date conversion back and forth (3)",
  );
  TestFramework.assert(
    JsonRisk.date_to_date_str("2000-1-1") === "2000-01-01",
    "date conversion back and forth (4)",
  );
  TestFramework.assert(
    JsonRisk.date_to_date_str("2000/1/1") === "2000-01-01",
    "date conversion back and forth (5)",
  );
  TestFramework.assert(
    JsonRisk.date_to_date_str("1.1.2000") === "2000-01-01",
    "date conversion back and forth (6)",
  );
};
