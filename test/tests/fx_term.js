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

  JsonRisk.set_valuation_date("30.11.2017");

  const dates = [
    "30.11.2017",
    "30.11.2018",
    "30.11.2019",
    "30.11.2020",
    "30.11.2022",
  ];
  const dfs = [1.0, 0.95, 0.91, 0.86, 0.78];
  const curve = {
    dates: dates,
    dfs: dfs,
  };
  const eurjpy = 125;
  const params = new JsonRisk.Params({
    valuation_date: JsonRisk.valuation_date,
    curves: { curve: curve },
    scalars: { JPY: { value: eurjpy } },
  });

  // single payment case (fx forward leg)
  for (let i = 1; i < dates.length; i++) {
    const pv = new JsonRisk.FxTerm({
      notional: 100,
      maturity: dates[i],
      disc_curve: "curve",
    }).value(params);

    const ref = dfs[i] * 100;

    TestFramework.assert(
      pv.toFixed(2) === ref.toFixed(2),
      `FX forward single-currency leg valuation from terms and condition (${i})`,
    );
  }

  // single currency near-far case (fx swap leg)
  for (let i = 1; i < dates.length; i++) {
    for (let j = i + 1; j < dates.length; j++) {
      const pv = new JsonRisk.FxTerm({
        notional: 100,
        maturity: dates[i],
        notional_2: -100,
        maturity_2: dates[j],
        disc_curve: "curve",
      }).value(params);

      const ref = (dfs[i] - dfs[j]) * 100;

      TestFramework.assert(
        pv.toFixed(2) === ref.toFixed(2),
        `FX swap single-currency leg valuation from terms and condition (${i}, ${j})`,
      );
    }
  }

  // full swap with predefined payments
  for (let i = 1; i < dates.length; i++) {
    for (let j = i + 1; j < dates.length; j++) {
      const eurleg = {
        disc_curve: "curve",
        currency: "EUR",
        payments: [
          { type: "notional", notional: 100, date_pmt: dates[i] },
          { type: "notional", notional: -100, date_pmt: dates[j] },
        ],
      };

      const jpyleg = {
        disc_curve: "curve",
        currency: "JPY",
        payments: [
          { type: "notional", notional: -12000, date_pmt: dates[i] },
          { type: "notional", notional: 12000, date_pmt: dates[j] },
        ],
      };

      const pveur = new JsonRisk.FxTerm({
        legs: [eurleg],
        currency: "EUR",
      }).value(params);

      const pvjpy = new JsonRisk.FxTerm({
        legs: [jpyleg],
        currency: "", // do not set currency, avoid conversion
      }).value(params);

      const pv = new JsonRisk.FxTerm({
        legs: [eurleg, jpyleg],
        currency: "EUR",
      }).value(params);

      const refeur = (dfs[i] - dfs[j]) * 100;
      const refjpy = (dfs[j] - dfs[i]) * 12000;
      const ref = refeur + refjpy / eurjpy;

      TestFramework.assert(
        pveur.toFixed(2) === refeur.toFixed(2),
        `FX swap valuation EUR predefined leg (${i}, ${j})`,
      );

      TestFramework.assert(
        pvjpy.toFixed(2) === refjpy.toFixed(2),
        `FX swap valuation JPY predefined leg (${i}, ${j})`,
      );

      TestFramework.assert(
        pv.toFixed(2) === ref.toFixed(2),
        `FX swap valuation with two legs (${i}, ${j})`,
      );
    }
  }
};
