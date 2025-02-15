TEST_NAME = "Date String Conversion";

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

    Date string conversion

     */

  console.log(TestFramework.get_utc_date(2018, 1, 28));
  TestFramework.assert(
    JsonRisk.date_str_to_date("28.2.2018").getTime() ===
      TestFramework.get_utc_date(2018, 1, 28).getTime(),
    "Date string (28.2.2018)",
  );
  TestFramework.assert(
    JsonRisk.date_str_to_date("2018-2-28").getTime() ===
      TestFramework.get_utc_date(2018, 1, 28).getTime(),
    "Date string (2018-28-2)",
  );
  TestFramework.assert(
    JsonRisk.date_str_to_date("2018-02-28").getTime() ===
      TestFramework.get_utc_date(2018, 1, 28).getTime(),
    "Date string (2018-28-02)",
  );
  TestFramework.assert(
    JsonRisk.date_str_to_date("2018-03-31").getTime() ===
      TestFramework.get_utc_date(2018, 2, 31).getTime(),
    "Date string (2018-31-03)",
  );
  TestFramework.assert(
    JsonRisk.date_str_to_date("31.12.1999").getTime() ===
      TestFramework.get_utc_date(1999, 11, 31).getTime(),
    "Date string (31.12.1999)",
  );
  TestFramework.assert(
    JsonRisk.date_str_to_date("1.1.1999").getTime() ===
      TestFramework.get_utc_date(1999, 0, 1).getTime(),
    "Date string (1.1.1999)",
  );

  var foo = "do not overwrite";
  try {
    foo = JsonRisk.date_str_to_date("29.2.2018");
  } catch (e) {
    console.log("Expected error message: " + e.toString());
  }
  TestFramework.assert(
    foo === "do not overwrite",
    "Period string (invalid period string)",
  );

  foo = "do not overwrite";
  try {
    foo = JsonRisk.date_str_to_date("32.1.2018");
  } catch (e) {
    console.log("Expected error message: " + e.toString());
  }
  TestFramework.assert(
    foo === "do not overwrite",
    "Period string (invalid period string)",
  );

  foo = "do not overwrite";
  try {
    foo = JsonRisk.date_str_to_date("1.13.2099");
  } catch (e) {
    console.log("Expected error message: " + e.toString());
  }
  TestFramework.assert(
    foo === "do not overwrite",
    "Period string (invalid period string)",
  );

  foo = "do not overwrite";
  try {
    foo = JsonRisk.date_str_to_date("11-131-2099");
  } catch (e) {
    console.log("Expected error message: " + e.toString());
  }
  TestFramework.assert(
    foo === "do not overwrite",
    "Period string (invalid period string)",
  );
};
