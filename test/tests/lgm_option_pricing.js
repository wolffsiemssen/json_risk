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

  const dates = [
    "2020/01/01",
    "2021/01/01",
    "2022/01/01",
    "2023/01/01",
    "2024/01/01",
    "2025/01/01",
    "2026/01/01",
    "2027/01/01",
  ];
  // notional payments
  const payments = dates.map(function (d) {
    return { type: "notional", date_pmt: d, notional: 10 };
  });
  // initial notional
  payments.push({
    type: "notional",
    date_pmt: JsonRisk.valuation_date,
    notional: -100,
  });
  // interest payments
  let last_date = JsonRisk.valuation_date;
  let notional = 100;
  for (const d of dates) {
    payments.push({
      type: "fixed",
      dcc: "30/360",
      notional: 100,
      rate: 0.01,
      date_start: last_date,
      date_end: d,
      date_pmt: d,
    });
    last_date = d;
  }

  // create leg
  const leg = new JsonRisk.Leg({
    disc_curve: "discount",
    payments: payments,
  });
  leg.update_notionals();

  // create params
  const params = new JsonRisk.Params({
    valuation_date: JsonRisk.valuation_date,
    curves: {
      discount: {
        type: "yield",
        times: [1],
        zcs: [0.01],
      },
    },
  });

  const params_1bp = new JsonRisk.Params({
    valuation_date: JsonRisk.valuation_date,
    curves: {
      discount: {
        type: "yield",
        times: [1],
        zcs: [0.0101],
      },
    },
  });

  const params_100bp = new JsonRisk.Params({
    valuation_date: JsonRisk.valuation_date,
    curves: {
      discount: {
        type: "yield",
        times: [1],
        zcs: [0.02],
      },
    },
  });

  const expiries = [
    TestFramework.get_utc_date(2019, 0, 1),
    TestFramework.get_utc_date(2020, 0, 1),
    TestFramework.get_utc_date(2021, 0, 1),
    TestFramework.get_utc_date(2022, 0, 1),
    TestFramework.get_utc_date(2023, 0, 1),
    TestFramework.get_utc_date(2024, 0, 1),
    TestFramework.get_utc_date(2025, 0, 1),
  ];

  for (let m = 0; m < 0.05; m += 0.01) {
    const lgm = new JsonRisk.LGM(m);
    for (i = 0; i < expiries.length; i++) {
      const swaption = JsonRisk.create_equivalent_regular_swaption(
        leg,
        expiries[i],
      );
      swaption.disc_curve = "discount";
      const leg_regular = new JsonRisk.Leg(
        JsonRisk.cashflow_generator(swaption),
      );

      //cash flow PVs
      let result = leg_regular.value(params);
      let result_up = leg_regular.value(params_1bp);
      const bpv = Math.abs(result_up - result);

      lgm.set_times_and_hull_white_volatility(
        [Math.max(yf(JsonRisk.valuation_date, expiries[i]), 0.0001)],
        0.01,
      );
      const lgm_xi = lgm.xi[0];

      //option PVs
      // Original Cash Flow
      let result_orig = lgm.european_call(
        leg.get_cash_flows(),
        yf(JsonRisk.valuation_date, expiries[i]),
        params.get_curve("discount"),
        lgm_xi,
      );

      // Equivalant regular cash flow
      result = lgm.european_call(
        leg_regular.get_cash_flows(),
        yf(JsonRisk.valuation_date, expiries[i]),
        params.get_curve("discount"),
        lgm_xi,
      );
      TestFramework.assert(
        Math.abs(result - result_orig) / bpv < 1,
        `LGM option price (equivalent regular vs original), Mean Rev ${m}, first_exercise_date ${i + 1}`,
      );

      // Original Cash Flow numeric, using the bermudan engine
      result = lgm.bermudan_call(
        leg.get_cash_flows(),
        [yf(JsonRisk.valuation_date, expiries[i])],
        params.get_curve("discount"),
        [lgm_xi],
      );
      TestFramework.assert(
        Math.abs(result - result_orig) / bpv < 1,
        `LGM option price (numeric vs. semianalytic), Mean Rev ${m}, first_exercise_date ${i + 1}`,
      );

      // Curve Up
      result_orig = lgm.european_call(
        leg.get_cash_flows(),
        yf(JsonRisk.valuation_date, expiries[i]),
        params_100bp.get_curve("discount"),
        lgm_xi,
      );
      result = lgm.european_call(
        leg_regular.get_cash_flows(),
        yf(JsonRisk.valuation_date, expiries[i]),
        params_100bp.get_curve("discount"),
        lgm_xi,
      );
      TestFramework.assert(
        Math.abs(result - result_orig) / bpv < 1,
        `LGM option price curve up (equivalent regular vs original), Mean Rev ${m}, first_exercise_date ${i + 1}`,
      );
      result = lgm.bermudan_call(
        leg_regular.get_cash_flows(),
        [yf(JsonRisk.valuation_date, expiries[i])],
        params_100bp.get_curve("discount"),
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
