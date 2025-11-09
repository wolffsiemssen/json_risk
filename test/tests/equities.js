TEST_NAME = "Equities";

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

    Test Equities

     */

  JsonRisk.set_valuation_date("2000/01/01");

  const equity_json = {
    type: "equity",
    quantity: 100.0,
    quote: "stock",
    disc_curve: "const",
    spot_days: 2,
  };

  const future_json = {
    type: "equity_future",
    quantity: 100.0,
    quote: "stock",
    disc_curve: "const",
    spot_days: 2,
    expiry: "2001/01/01",
    price: 100.0,
  };

  const fwd_json = {
    type: "equity_forward",
    quantity: 100.0,
    quote: "stock",
    disc_curve: "const",
    spot_days: 2,
    expiry: "2001/01/01",
    price: 100.0,
  };

  const stock_price = 100.0 * 1.01 ** (3 / 365); // three spot days due to weekend
  const params_json = {
    valuation_date: "2000/01/01",
    scalars: {
      stock: {
        value: stock_price,
      },
    },
    curves: {
      const: {
        times: [1.0],
        zcs: [0.01],
      },
    },
    scenario_groups: [
      [
        {
          name: "UP",
          rules: [
            {
              model: "multiplicative",
              risk_factors: ["stock"],
              values: [[1.1]],
            },
          ],
        },
        {
          name: "DOWN",
          rules: [
            {
              model: "multiplicative",
              risk_factors: ["stock"],
              values: [[0.9]],
            },
          ],
        },
      ],
    ],
  };

  const stock = new JsonRisk.Equity(equity_json);
  const params = new JsonRisk.Params(params_json);
  const value = stock.value(params);
  TestFramework.assert(
    value.toFixed(4) === (100.0 * 100.0).toFixed(4),
    "Stock valuation",
  );

  const scenarios_eq = JsonRisk.vector_pricer(equity_json, params_json);

  TestFramework.assert(
    scenarios_eq[0].toFixed(4) === (100.0 * 100.0).toFixed(4),
    "Stock valuation base scenario",
  );
  TestFramework.assert(
    scenarios_eq[1].toFixed(4) === (100.0 * 100.0 * 1.1).toFixed(4),
    "Stock valuation UP scenario",
  );
  TestFramework.assert(
    scenarios_eq[2].toFixed(4) === (100.0 * 100.0 * 0.9).toFixed(4),
    "Stock valuation DOWN scenario",
  );

  const df1y = 1.01 ** (-366 / 365);
  const scenarios_fut = JsonRisk.vector_pricer(future_json, params_json);

  TestFramework.assert(
    scenarios_fut[0].toFixed(4) === (100.0 * (100.0 / df1y - 100)).toFixed(4),
    "Equity future valuation base scenario",
  );
  TestFramework.assert(
    scenarios_fut[1].toFixed(4) ===
      (100.0 * ((100.0 * 1.1) / df1y - 100)).toFixed(4),
    "Equity future valuation UP scenario",
  );
  TestFramework.assert(
    scenarios_fut[2].toFixed(4) ===
      (100.0 * ((100.0 * 0.9) / df1y - 100)).toFixed(4),
    "Equity future valuation DOWN scenario",
  );

  const scenarios_fwd = JsonRisk.vector_pricer(fwd_json, params_json);

  TestFramework.assert(
    scenarios_fwd[0].toFixed(4) === (100.0 * (100.0 - 100.0 * df1y)).toFixed(4),
    "Equity forward valuation base scenario",
  );
  TestFramework.assert(
    scenarios_fwd[1].toFixed(4) ===
      (100.0 * (100.0 * 1.1 - 100 * df1y)).toFixed(4),
    "Equity forward valuation UP scenario",
  );
  TestFramework.assert(
    scenarios_fwd[2].toFixed(4) ===
      (100.0 * (100.0 * 0.9 - 100 * df1y)).toFixed(4),
    "Equity forward valuation DOWN scenario",
  );
};
