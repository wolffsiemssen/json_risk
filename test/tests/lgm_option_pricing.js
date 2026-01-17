TEST_NAME = "LGM Option Pricing";

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
  // test hull white vola insertion and extraction
  for (let m = 0; m < 0.05; m += 0.01) {
    const lgm = new JsonRisk.LGM(m);
    for (let sref = 0; sref < 0.05; sref += 0.01) {
      lgm.set_times_and_hull_white_volatility([1, 2, 3, 4, 5], sref);
      const svec = lgm.hull_white_volatility;
      for (let s of svec) {
        TestFramework.assert(
          Math.abs(s - sref) < 1e-12,
          `LGM Hull-White vola parametrisation and extraction, Mean Rev:: ${m.toFixed(4)}, Sigma out: ${s.toFixed(4)}, Sigma in: ${sref.toFixed(4)}.`,
        );
      }
    }
  }

  //Test LGM option pricing
  JsonRisk.set_valuation_date("2019/01/01");
  yf = JsonRisk.year_fraction_factory("");
  var cf_obj = {
    date_pmt: [
      TestFramework.get_utc_date(2019, 0, 1),
      TestFramework.get_utc_date(2020, 0, 1),
      TestFramework.get_utc_date(2021, 0, 1),
      TestFramework.get_utc_date(2022, 0, 1),
      TestFramework.get_utc_date(2023, 0, 1),
      TestFramework.get_utc_date(2024, 0, 1),
      TestFramework.get_utc_date(2025, 0, 1),
      TestFramework.get_utc_date(2026, 0, 1),
      TestFramework.get_utc_date(2027, 0, 1),
    ],
    current_principal: [100, 100, 90, 80, 70, 60, 50, 40, 30],
    pmt_interest: [0, 11, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3],
    pmt_total: [0, 11, 10.9, 10.8, 10.7, 10.6, 10.5, 10.4, 30.3],
  };

  cf_obj.t_pmt = new Array(cf_obj.date_pmt.length);
  for (i = 0; i < cf_obj.date_pmt.length; i++) {
    cf_obj.t_pmt[i] = JsonRisk.time_from_now(cf_obj.date_pmt[i]);
  }

  var cf_regular;

  expiries = [
    TestFramework.get_utc_date(2019, 0, 1),
    TestFramework.get_utc_date(2020, 0, 1),
    TestFramework.get_utc_date(2021, 0, 1),
    TestFramework.get_utc_date(2022, 0, 1),
    TestFramework.get_utc_date(2023, 0, 1),
    TestFramework.get_utc_date(2024, 0, 1),
    TestFramework.get_utc_date(2025, 0, 1),
  ];
  var lgm_xi;
  var result, result_orig, result_numeric, bpv;
  curve = JsonRisk.get_const_curve(0.01);
  curve_1bp = JsonRisk.get_const_curve(0.0101);
  curve_100bp = JsonRisk.get_const_curve(0.02);

  //create bcbs 352 scenarios
  var bcbs352times = [
    0.0028, 0.0417, 0.1667, 0.375, 0.625, 0.875, 1.25, 1.75, 2.5, 3.5, 4.5, 5.5,
    6.5, 7.5, 8.5, 9.5, 12.5, 17.5, 25,
  ];

  var curve_up = {
    times: bcbs352times,
    zcs: [],
  };
  var curve_down = {
    times: bcbs352times,
    zcs: [],
  };
  var curve_steepener = {
    times: bcbs352times,
    zcs: [],
  };
  var curve_flattener = {
    times: bcbs352times,
    zcs: [],
  };
  var curve_shortup = {
    times: bcbs352times,
    zcs: [],
  };
  var curve_shortdown = {
    times: bcbs352times,
    zcs: [],
  };

  var slong, sshort;
  for (var i = 0; i < bcbs352times.length; i++) {
    curve_up.zcs.push(0.02);
    curve_down.zcs.push(-0.02);
    sshort = Math.exp(-bcbs352times[i] / 4);
    slong = 1 - sshort;
    curve_shortup.zcs.push(0.025 * sshort);
    curve_shortdown.zcs.push(-0.025 * sshort);
    curve_steepener.zcs.push(-0.65 * 0.025 * sshort + 0.9 * 0.01 * slong);
    curve_flattener.zcs.push(0.8 * 0.025 * sshort - 0.6 * 0.01 * slong);
  }

  for (let m = 0; m < 0.05; m += 0.01) {
    const lgm = new JsonRisk.LGM(m);
    for (i = 0; i < expiries.length; i++) {
      swaption = JsonRisk.create_equivalent_regular_swaption(
        cf_obj,
        expiries[i],
      );
      cf_regular = new JsonRisk.FixedIncome(swaption).get_cash_flows();

      lgm.set_times_and_hull_white_volatility(
        [Math.max(yf(JsonRisk.valuation_date, expiries[i]), 0.0001)],
        0.01,
      );
      lgm_xi = lgm.xi[0];
      //cash flow PVs
      result = JsonRisk.dcf(cf_regular, curve, null, null, expiries[i]);
      bpv = Math.abs(
        JsonRisk.dcf(cf_regular, curve_1bp, null, null, expiries[i]) - result,
      );

      //option PVs
      // Original Cash Flow
      result_orig = lgm.european_call(
        cf_obj,
        yf(JsonRisk.valuation_date, expiries[i]),
        curve,
        lgm_xi,
      );

      // Equivalant regular cash flow
      result = lgm.european_call(
        cf_regular,
        yf(JsonRisk.valuation_date, expiries[i]),
        curve,
        lgm_xi,
      );
      TestFramework.assert(
        Math.abs(result - result_orig) / bpv < 1,
        `LGM option price (equivalent regular vs original), Mean Rev ${m}, first_exercise_date ${i + 1}`,
      );

      // Original Cash Flow numeric, using the bermudan engine
      result = lgm.bermudan_call(
        cf_obj,
        [yf(JsonRisk.valuation_date, expiries[i])],
        curve,
        [lgm_xi],
      );
      TestFramework.assert(
        Math.abs(result - result_orig) / bpv < 1,
        `LGM option price (numeric vs. semianalytic), Mean Rev ${m}, first_exercise_date ${i + 1}`,
      );

      // Curve Up
      result_orig = lgm.european_call(
        cf_obj,
        yf(JsonRisk.valuation_date, expiries[i]),
        curve_100bp,
        lgm_xi,
      );
      result = lgm.european_call(
        cf_regular,
        yf(JsonRisk.valuation_date, expiries[i]),
        curve_100bp,
        lgm_xi,
      );
      TestFramework.assert(
        Math.abs(result - result_orig) / bpv < 1,
        `LGM option price curve up (equivalent regular vs original), Mean Rev ${m}, first_exercise_date ${i + 1}`,
      );
      result = lgm.bermudan_call(
        cf_obj,
        [yf(JsonRisk.valuation_date, expiries[i])],
        curve_100bp,
        [lgm_xi],
      );
      TestFramework.assert(
        Math.abs(result - result_orig) / bpv < 1,
        `LGM option price curve up (numeric vs. semianalytic), Mean Rev ${m}, first_exercise_date ${i + 1}`,
      );

      console.log("--------------------------");
    }
  }
};
