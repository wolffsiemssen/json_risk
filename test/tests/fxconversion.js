TEST_NAME = "FX Conversion";

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
  const currencies = {
    JPY: 150.0,
    DKK: 7.5,
    NOK: 12.0,
    SEK: 11.0,
    DEM: 1.9,
  };

  let equity_json = {
    type: "equity",
    quote: "stock",
  };

  const params_json = {
    valuation_date: "2000/01/01",
    scalars: {
      stock: {
        value: 100.0,
        tags: ["stock"],
      },
      JPY: {
        value: currencies.JPY,
        tags: ["fx"],
      },
      "EUR/DKK": {
        value: currencies.DKK,
        tags: ["fx"],
      },
      EURNOK: {
        value: currencies.NOK,
        tags: ["fx"],
      },
      "SEK-EUR": {
        value: 1.0 / currencies.SEK,
        tags: ["fx_inverse"],
      },
      DEM_EUR: {
        value: 1.0 / currencies.DEM,
        tags: ["fx_inverse"],
      },
    },
    scenario_groups: [
      [
        {
          name: "STOCK_UP_FX_DOWN",
          rules: [
            {
              model: "multiplicative",
              risk_factors: ["stock"],
              values: [[1.1]],
            },
            {
              model: "multiplicative",
              tags: ["fx"],
              values: [[1.1]],
            },
            {
              model: "multiplicative",
              tags: ["fx_inverse"],
              values: [[1.0 / 1.1]],
            },
          ],
        },
        {
          name: "STOCK_DOWN_FX_UP",
          rules: [
            {
              model: "multiplicative",
              risk_factors: ["stock"],
              values: [[0.9]],
            },
            {
              model: "multiplicative",
              tags: ["fx"],
              values: [[0.9]],
            },
            {
              model: "multiplicative",
              tags: ["fx_inverse"],
              values: [[1.0 / 0.9]],
            },
          ],
        },
      ],
    ],
  };

  for (const [currency, fxrate] of Object.entries(currencies)) {
    equity_json.currency = currency;
    equity_json.quantity = fxrate; // if quantity is equal to fx rate, value of the stock should be equal to the quote
    const scenarios = JsonRisk.vector_pricer(equity_json, params_json);

    TestFramework.assert(
      scenarios[0].toFixed(4) === "100.0000",
      `FX conversion BASE scenario ${currency}`,
    );
    TestFramework.assert(
      scenarios[1].toFixed(4) === "100.0000",
      `FX conversion UP scenario ${currency}`,
    );
    TestFramework.assert(
      scenarios[2].toFixed(4) === "100.0000",
      `FX conversion DOWN scenario ${currency}`,
    );
  }
};
