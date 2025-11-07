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

  const equity_json = {
    type: "equity",
    quantity: 100.0,
    quote: "stock",
  };

  const params_json = {
    valuation_date: "2000/01/01",
    scalars: {
      stock: {
        value: 100.0,
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

  const scenarios = JsonRisk.vector_pricer(equity_json, params_json);

  TestFramework.assert(
    scenarios[0].toFixed(4) === (100.0 * 100.0).toFixed(4),
    "Stock valuation base scenario",
  );
  TestFramework.assert(
    scenarios[1].toFixed(4) === (100.0 * 100.0 * 1.1).toFixed(4),
    "Stock valuation UP scenario",
  );
  TestFramework.assert(
    scenarios[2].toFixed(4) === (100.0 * 100.0 * 0.9).toFixed(4),
    "Stock valuation DOWN scenario",
  );
};
