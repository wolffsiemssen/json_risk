TEST_NAME = "Credit Default Swaps";

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
  // set valuation date
  JsonRisk.set_valuation_date(params_json.valuation_date);

  // Test ISDA model corner cases
  const riskless = new JsonRisk.Curve(params_json.curves.riskless);
  const const100bp = new JsonRisk.Curve(params_json.curves.const100bp);
  const const1bp = new JsonRisk.Curve(params_json.curves.const1bp);

  const isda100 = new JsonRisk.IsdaCdsModel(riskless, const100bp);
  const isda1 = new JsonRisk.IsdaCdsModel(riskless, const1bp);

  const days = [0, 1, 2, 3, 4, 5].map((d) => d * 365 - 180);
  const coupondates = days.map((d) =>
    JsonRisk.add_days(JsonRisk.valuation_date, d),
  );
  for (let i = 1; i < coupondates.length; i++) {
    const payment = {
      date_start: coupondates[i - 1],
      date_end: coupondates[i],
      date_pmt: coupondates[i],
      amount: 1.0,
    };
    const val100 = isda100.accrual_on_default_pv(payment);
    const val1 = isda1.accrual_on_default_pv(payment);

    // reference calculation in the easier case with discount rate zero
    const t0 = days[i - 1] > 0 ? days[i - 1] / 365 : 0;
    const t1 = days[i] > 0 ? days[i] / 365 : 0;
    const t_start = days[i - 1] > 0 ? 0 : -days[i - 1] / 365;

    let df0 = const100bp.get_df(t0);
    let df1 = const100bp.get_df(t1);
    const h100 = 0.01 * (t1 - t0);
    const ref100 =
      (t1 - t0) * ((df0 - df1) / h100 - df1) + t_start * (df0 - df1);

    df0 = const1bp.get_df(t0);
    df1 = const1bp.get_df(t1);
    const h1 = 0.0001 * (t1 - t0);
    const ref1 = (t1 - t0) * ((df0 - df1) / h1 - df1) + t_start * (df0 - df1);

    const msg100 = `ISDA Credit Model 100BP accrual on default ${i}, value: ${val100}, ref: ${ref100}, diff: ${val100 - ref100}`;
    TestFramework.assert(Math.abs(ref100 - val100) < 1e-10, msg100);

    const msg1 = `ISDA Credit Model 1BP accrual on default ${i}, value: ${val1}, ref: ${ref1}, diff: ${val1 - ref1}`;
    TestFramework.assert(Math.abs(ref1 - val1) < 1e-10, msg1);
  }

  // Test CDS instruments

  for (let i = 0; i < testcases.length; i++) {
    const cds = new JsonRisk.CreditDefaultSwap(testcases[i]);
    const val = cds.value(params_json);
    const ref = testcases[i].pv;
    const msg = `CDS Valuation ${i}, value: ${val}, ref: ${ref}, diff: ${val - ref}`;
    TestFramework.assert(
      Math.abs(ref - val) < testcases[i].notional * 0.0001 * 10,
      msg,
    );
  }
};

// params and reference values generated with the ISDA CDS standard model excel tool
const params_json = {
  valuation_date: "18.09.2025",
  curves: {
    discount: {
      labels: [
        "34D",
        "67D",
        "95D",
        "186D",
        "277D",
        "369D",
        "550D",
        "734D",
        "916D",
        "1100D",
        "1281D",
        "1467D",
        "1646D",
        "1831D",
        "2013D",
        "2195D",
        "2377D",
        "2561D",
        "2742D",
        "2926D",
        "3107D",
        "3291D",
        "3472D",
        "3658D",
        "3840D",
        "4022D",
        "4204D",
        "4387D",
        "4568D",
        "4752D",
        "4933D",
        "5117D",
        "5299D",
        "5485D",
        "5664D",
        "5849D",
        "6031D",
        "6213D",
        "6395D",
      ],
      dfs: [
        0.9996293, 0.99834235, 0.99689118, 0.99110024, 0.98553846, 0.97930972,
        0.97352998, 0.9676894, 0.95452657, 0.94140109, 0.92669726, 0.91182648,
        0.89651619, 0.88096279, 0.86526356, 0.8498441, 0.83451536, 0.81929921,
        0.80421626, 0.78916789, 0.77448389, 0.75983653, 0.74543319, 0.73091636,
        0.7166673, 0.70269603, 0.68824168, 0.67400768, 0.66060894, 0.64726111,
        0.63439407, 0.62157592, 0.6091519, 0.59671136, 0.58622612, 0.575583,
        0.56530103, 0.55520274, 0.54528484,
      ],
      intp: "linear_rt",
      compounding: "Continuous",
    },
    survival: {
      labels: [
        "93D",
        "275D",
        "640D",
        "1006D",
        "1371D",
        "1736D",
        "2467D",
        "3562D",
      ],
      dfs: [
        0.97663901, 0.932532, 0.84991177, 0.77448868, 0.70599844, 0.64358913,
        0.53472762, 0.40514184,
      ],
      intp: "linear_rt",
      compounding: "Continuous",
    },
    riskless: {
      labels: ["3M", "6M", "9M", "12M", "3Y", "5Y", "10Y", "20Y"],
      dfs: [1, 1, 1, 1, 1, 1, 1, 1],
      intp: "linear_rt",
      compounding: "Continuous",
    },
    const100bp: {
      labels: [
        "30D",
        "93D",
        "275D",
        "640D",
        "1006D",
        "1371D",
        "1736D",
        "2467D",
        "3562D",
      ],
      zcs: [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
      intp: "linear_rt",
      compounding: "Continuous",
    },
    const1bp: {
      labels: [
        "30D",
        "93D",
        "275D",
        "640D",
        "1006D",
        "1371D",
        "1736D",
        "2467D",
        "3562D",
      ],
      zcs: [
        0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001, 0.0001,
      ],
      intp: "linear_rt",
      compounding: "Continuous",
    },
  },
};

const testcases = [
  {
    notional: 10000000,
    effective_date: "2025/03/20",
    maturity: "2035/03/20",
    adjust_accrual_periods: true,
    fixed_rate: 0.04,
    recovery_rate: 0.4,
    accrual_on_default: true,
    tenor: 3,
    dcc: "act/360",
    bdc: "f",
    disc_curve: "discount",
    survival_curve: "survival",
    pv: 765551.13,
    prot: 3173784.27,
  },
  {
    notional: 10000000,
    effective_date: "2025/03/20",
    maturity: "2035/03/20",
    adjust_accrual_periods: true,
    fixed_rate: 0.04,
    recovery_rate: 0.4,
    accrual_on_default: false,
    tenor: 3,
    dcc: "act/360",
    bdc: "f",
    disc_curve: "discount",
    survival_curve: "survival",
    pv: 792569.3,
    prot: 3173784.27,
  },
  {
    notional: 10000000,
    effective_date: "2025/03/20",
    maturity: "2035/03/20",
    adjust_accrual_periods: true,
    fixed_rate: 0.055,
    recovery_rate: 0.2,
    accrual_on_default: true,
    tenor: 3,
    dcc: "act/360",
    bdc: "f",
    disc_curve: "discount",
    survival_curve: "survival",
    pv: 920391.79,
    prot: 4231712.36,
  },
  {
    notional: 10000000,
    effective_date: "2025/03/20",
    maturity: "2035/03/20",
    adjust_accrual_periods: true,
    fixed_rate: 0.055,
    recovery_rate: 0.2,
    accrual_on_default: false,
    tenor: 3,
    dcc: "act/360",
    bdc: "f",
    disc_curve: "discount",
    survival_curve: "survival",
    pv: 957541.78,
    prot: 4231712.36,
  },
];
