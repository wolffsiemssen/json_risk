TEST_NAME = "FX Term";

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

    Test FX Term

     */

  JsonRisk.valuation_date = TestFramework.get_utc_date(2017, 10, 30);

  times = [1, 2, 3, 5];
  dfs = [0.95, 0.91, 0.86, 0.78];
  curve = {
    times: times,
    dfs: dfs,
  };

  var fx_swapleg = {
    notional: 100,
    maturity: TestFramework.get_utc_date(2018, 10, 30),
    notional_2: -100,
    maturity_2: TestFramework.get_utc_date(2019, 10, 30),
  };

  var pv = JsonRisk.pricer_fxterm(fx_swapleg, curve);
  TestFramework.assert(pv.toFixed(2) === "4.00", "FX swap valuation (1)");

  fx_swapleg.maturity = TestFramework.get_utc_date(2020, 10, 29);
  fx_swapleg.maturity_2 = TestFramework.get_utc_date(2022, 10, 29);

  var pv = JsonRisk.pricer_fxterm(fx_swapleg, curve);
  TestFramework.assert(pv.toFixed(2) === "8.00", "FX swap valuation (2)");
};
