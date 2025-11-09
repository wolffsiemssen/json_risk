TEST_NAME = "Callable Bond Valuation";

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

    Test callable bond Valuation

     */
  const curve = { times: [1], zcs: [0.01] };
  const curve_up = { times: [1], zcs: [0.0101] };
  const surface = {
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
  JsonRisk.set_valuation_date("17.01.2000");

  const params = new JsonRisk.Params({
    valuation_date: JsonRisk.valuation_date,
    curves: { curve: curve },
    surfaces: { surface },
  });

  const params_up = new JsonRisk.Params({
    valuation_date: JsonRisk.valuation_date,
    curves: { curve: curve_up },
    surfaces: { surface },
  });

  const Maturity = [
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
  const Firstcall = [
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
  const Tenor = [3, 3, 6, 6, 3, 3, 6, 6, 12, 12, 12, 12, 12, 1, 3];
  const Calltenor = [1, 3, 6, 12, 3, 3, 6, 6, 12, 12, 12, 12, 12, 12, 12];

  for (i = 0; i < Maturity.length; i++) {
    const bond = new JsonRisk.FixedIncome({
      maturity: Maturity[i],
      tenor: Tenor[i],
      call_tenor: 0,
      notional: 100.0,
      fixed_rate: 0.01,
      bdc: "m",
      dcc: "act/365",
      calendar: "TARGET",
      exclude_base: true,
      disc_curve: "curve",
    });

    const european = new JsonRisk.CallableFixedIncome({
      maturity: Maturity[i],
      first_exercise_date: Firstcall[i],
      tenor: Tenor[i],
      call_tenor: 0,
      notional: 100.0,
      fixed_rate: 0.01,
      bdc: "m",
      dcc: "act/365",
      calendar: "TARGET",
      exclude_base: true,
      disc_curve: "curve",
      fwd_curve: "curve",
      surface: "surface",
    });
    const bermudan = new JsonRisk.CallableFixedIncome({
      maturity: Maturity[i],
      first_exercise_date: Firstcall[i],
      tenor: Tenor[i],
      call_tenor: Calltenor[i],
      notional: 100.0,
      fixed_rate: 0.01,
      bdc: "m",
      dcc: "act/365",
      calendar: "TARGET",
      exclude_base: true,
      disc_curve: "curve",
      fwd_curve: "curve",
      surface: "surface",
    });
    const swaption = new JsonRisk.Swaption({
      is_payer: false,
      is_short: true,
      maturity: Maturity[i],
      first_exercise_date: Firstcall[i],
      notional: 100,
      fixed_rate: 0.01,
      tenor: Tenor[i],
      float_spread: 0.0,
      float_tenor: 6,
      float_current_rate: 0.0,
      calendar: "TARGET",
      bdc: "m",
      float_bdc: "m",
      dcc: "act/365",
      float_dcc: "act/365",
      disc_curve: "curve",
      fwd_curve: "curve",
      surface: "surface",
    });

    result_european = european.value(params);
    result_bermudan = bermudan.value(params);
    result_swaption = swaption.value(params);
    result_bond = bond.value(params);
    bpv = bond.value(params_up) - result_bond;
    console.log("Non-callable bond price : " + result_bond);
    console.log("Explicit swaption price : " + result_swaption);
    console.log("Embedded bond option price     : " + result_european);
    console.log("Multi-callable bond option price: " + result_bermudan);
    console.log("Basis point value        : " + bpv);
    console.log(
      "Difference in BP   (" +
        (i + 1) +
        "): " +
        ((result_european - result_swaption) / bpv).toFixed(1),
    );

    TestFramework.assert(
      Math.abs((result_european - result_swaption) / bpv) < 1,
      "Callable bond consistency check (" + (i + 1) + ")",
    );
    TestFramework.assert(
      result_european >= result_bermudan,
      "Multi-callable bond consistency check (" + (i + 1) + ")",
    );
  }
};
