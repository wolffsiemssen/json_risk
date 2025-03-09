const TestFramework = {
  /* 

Checks if expr is true and prints a message to the console or the html window. On the console, it exits the process if expr is false

*/
  assert: function (expr, msg) {
    var m;
    if (!expr) {
      console.log("Failure: " + msg);
      if (typeof logMessage == "function") logMessage(msg, false);
      if (typeof process != "undefined" && typeof process.exit === "function")
        process.exit(1);
    } else {
      console.log("Success: " + msg);
      if (typeof logMessage == "function") logMessage(msg, true);
    }
  },
  /*

    Compares all elements in vector val with the corresponding element in expected, and checks if they are of the same type and value

     */
  assert_same_vector: function (val, expected, msg) {
    var i;
    if (val.length !== expected.length) {
      this.assert(false, msg);
      return;
    }
    for (i = 1; i < val.length; i++) {
      if (val[i] !== expected[i]) {
        console.log("WERTE: " + val[i] + ", " + expected[i]);
        this.assert(false, msg);
        return;
      }
    }
    this.assert(true, msg);
  },
  /*

    Compares all elements in vector val with the corresponding element in expected, and checks if they are of Date type and carry the same value

     */
  assert_same_dates: function (actual, expected, msg) {
    if (actual.length !== expected.length) {
      console.error(msg + ": length mismatch");
      this.assert(false, msg);
      return;
    }

    for (let i = 0; i < actual.length; i++) {
      if (actual[i].getTime() !== expected[i].getTime()) {
        console.error(
          msg +
            `: mismatch at index ${i} - expected ${expected[i]}, got ${actual[i]}`,
        );
        this.assert(false, msg);
        return;
      }
    }
    this.assert(true, msg);
  },

  /*
    
    Creates a UTC date from y,m,d
    
    */
  get_utc_date: function (y, m, d) {
    timestamp = Date.UTC(y, m, d);
    return new Date(timestamp);
  },
};

if (typeof require === "function") {
  var JsonRisk = require("../dist/json_risk.js");

  test_files = [
    "date_conversion.js",
    "number_bool_vector.js",
    "year_fraction.js",
    "month_rolling.js",
    "holidays_calender.js",
    "period_string_conversion.js",
    "date_string_conversion.js",
    "curves.js",
    "compounding.js",
    "bessel_hermite.js",
    "interpolation_curve.js",
    "surfaces.js",
    "schedule.js",
    "schedule_generation_consistency.js",
    "bond_valuation.js",
    "distribution_functions.js",
    "swaptions.js",
    "swaption_zero_notional",
    "cashflow_equivalent_swaption.js",
    "fx_term.js",
    "irregular_bonds.js",
    "lgm_option_pricing.js",
    "callable_bond_valuation.js",
    "amortizing_callable_bonds.js",
    "vector_pricing.js",
    "vector_pricing_curve_scenarios.js",
  ];

  for (testfile of test_files) {
    test = require(`./tests/${testfile}`);
    console.log(test.name);
    test.execute(TestFramework, JsonRisk);
  }
} else {
  console.log("TESTS LOADED: " + jr_tests.length);
}
