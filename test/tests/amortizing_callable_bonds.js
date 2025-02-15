TEST_NAME = "Amortizing Callable Bonds";

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

    Test amortizing callable bonds consistency

     */
  multi_callable_bonds = [];
  var amortizing_bonds = [];
  var accreting_bonds = [];
  var Firstcall = [
    "15.02.2020",
    "22.05.2010",
    "15.08.2015",
    "15.02.2000",
    "15.08.2005",
    "15.05.2010",
    "04.07.2029",
    "04.07.2020",
    "04.12.2003",
    "04.12.2000",
    "15.12.2045",
    "15.04.2038",
    "15.05.2038",
    "15.06.2038",
    "18.07.2038",
  ];
  var Tenor = [3, 3, 6, 6, 3, 3, 6, 6, 12, 12, 12, 12, 12, 1, 3];
  var Calltenor = [1, 3, 6, 12, 3, 3, 6, 6, 12, 12, 12, 12, 12, 12, 12];
  var curve = JsonRisk.get_const_curve(0.01);
  Maturity = [
    "15.02.2024",
    "15.05.2024",
    "15.08.2024",
    "15.02.2025",
    "15.08.2025",
    "15.02.2026",
    "04.07.2039",
    "04.07.2040",
    "04.07.2042",
    "04.07.2044",
    "15.08.2046",
    "15.08.2048",
    "15.08.2048",
    "15.08.2048",
    "15.08.2048",
  ];
  surface = {
    type: "bachelier",
    expiries: [1, 2, 5],
    terms: [1, 5, 10, 20],
    values: [
      [0.008, 0.0081, 0.0082, 0.008],
      [0.0085, 0.0076, 0.0068, 0.0068],
      [0.01, 0.0103, 0.012, 0.011],
    ],
  };
  //surface=JsonRisk.get_const_surface(0.06);
  JsonRisk.valuation_date = TestFramework.get_utc_date(2000, 0, 17);

  for (i = 0; i < Maturity.length; i++) {
    amortizing_bonds.push({
      maturity: Maturity[i],
      first_exercise_date: Firstcall[i],
      tenor: Tenor[i],
      call_tenor: Calltenor[i],
      notional: 10000.0,
      repay_amount: 10.0,
      fixed_rate: 0.01,
      bdc: "m",
      dcc: "act/365",
      calendar: "TARGET",
    });

    accreting_bonds.push({
      maturity: Maturity[i],
      first_exercise_date: Firstcall[i],
      tenor: Tenor[i],
      call_tenor: Calltenor[i],
      notional: 10000.0,
      repay_amount: -10.0,
      fixed_rate: 0.01,
      bdc: "m",
      dcc: "act/365",
      calendar: "TARGET",
    });

    multi_callable_bonds.push({
      maturity: Maturity[i],
      first_exercise_date: Firstcall[i],
      tenor: Tenor[i],
      call_tenor: Calltenor[i],
      notional: 10000.0,
      fixed_rate: 0.01,
      bdc: "m",
      dcc: "act/365",
      calendar: "TARGET",
    });

    result = JsonRisk.pricer_callable_bond(
      multi_callable_bonds[i],
      curve,
      null,
      curve,
      surface,
    );
    result_accreting = JsonRisk.pricer_callable_bond(
      accreting_bonds[i],
      curve,
      null,
      curve,
      surface,
    );
    result_amortizing = JsonRisk.pricer_callable_bond(
      amortizing_bonds[i],
      curve,
      null,
      curve,
      surface,
    );

    console.log("Multi-callable amortizing bond price: " + result_amortizing);
    console.log("Multi-callable bullet bond price: " + result);
    console.log("Multi-callable accreting bond price: " + result_accreting);

    TestFramework.assert(
      (result - result_accreting) * (result_amortizing - result) > 0,
      "Multi-callable accreting and amortizing bond consistency check (" +
        (i + 1) +
        ")",
    );
  }
};
