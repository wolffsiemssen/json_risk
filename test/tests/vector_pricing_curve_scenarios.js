TEST_NAME = "Vector Pricing Curve Scenarios";

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

    Test vector pricing with curve scenarios

  */

  var compare = function (arr1, arr2) {
    var x, y;
    if (arr1.length !== arr2.length) return false;
    console.log("Arrays are the same length");
    for (var j = 0; j < arr1.length; j++) {
      if (typeof arr1[j] !== "number") return false;
      if (isNaN(arr1[j])) return false;
      if (typeof arr2[j] !== "number") return false;
      if (isNaN(arr2[j])) return false;
      x = arr1[j] - arr1[0];
      y = arr2[j] - arr2[0];
      x *= 10000;
      y *= 10000;
      if (Math.abs(x - y) > 1e-10) {
        console.log(`Prices do not match: Arr1 ${x}, Arr2 ${y}`);
        return false;
      }
      console.log(`Prices match: Arr1 ${x}, Arr2 ${y}`);
    }
    return true;
  };

  bond = {
    type: "bond",
    maturity: TestFramework.get_utc_date(2045, 1, 1),
    notional: 100.0,
    fixed_rate: 0.0125,
    tenor: 1,
    bdc: "following",
    dcc: "act/act",
    calendar: "TARGET",
    settlement_days: 2,
    disc_curve: "EUR_OIS_DISCOUNT",
    spread_curve: "EUR_GOV_SPREAD",
    currency: "EUR",
  };

  for (let curve of Object.values(params_scen_rf.curves)) {
    curve.intp = "linear_zc";
  }

  for (let curve of Object.values(params_scen_tag.curves)) {
    curve.intp = "linear_zc";
  }

  // scenarios by risk factor
  var results_scen_rf = JsonRisk.vector_pricer(bond, params_scen_rf);

  // scenarios by tag
  var results_scen_tag = JsonRisk.vector_pricer(bond, params_scen_tag);

  // compare
  TestFramework.assert(
    compare(results_scen_rf, results_scen_tag),
    "Vector pricing with scenarios by tag and risk factor (1)",
  );

  bond.disc_curve = "CONST_100BP";
  bond.spread_curve = "EUR_PFA_SPREAD";

  // scenarios by risk factor
  results_scen_rf = JsonRisk.vector_pricer(bond, params_scen_rf);

  // scenarios by tag
  results_scen_tag = JsonRisk.vector_pricer(bond, params_scen_tag);

  // compare
  TestFramework.assert(
    compare(results_scen_rf, results_scen_tag),
    "Vector pricing with scenarios by tag and risk factor (2)",
  );

  bond = {
    type: "callable_bond",
    maturity: TestFramework.get_utc_date(2042, 1, 1),
    first_exercise_date: TestFramework.get_utc_date(2023, 1, 1),
    call_tenor: 3,
    notional: 100.0,
    fixed_rate: 0.0001,
    tenor: 12,
    bdc: "following",
    dcc: "act/act",
    calendar: "TARGET",
    settlement_days: 2,
    disc_curve: "CONST",
    surface: "CONST_0BP",
    fwd_curve: "CONST",
    currency: "EUR",
  };

  // scenarios by risk factor
  results_scen_rf = JsonRisk.vector_pricer(bond, params_scen_rf);

  // scenarios by tag
  results_scen_tag = JsonRisk.vector_pricer(bond, params_scen_tag);

  //compare
  TestFramework.assert(
    compare(results_scen_rf, results_scen_tag),
    "Vector pricing with scenarios by risk factor, with volatilities (1)",
  );

  swaption = {
    type: "swaption",
    notional: 100000,
    tenor: 12,
    fixed_rate: 0.0,
    float_tenor: 6,
    float_current_rate: 0,
    surface: "CONST_0BP",
    disc_curve: "CONST",
    fwd_curve: "CONST",
    currency: "EUR",
  };

  for (i = 2; i < 50; i++) {
    swaption.maturity = TestFramework.get_utc_date(2025, 2 * i, 22);
    swaption.first_exercise_date = TestFramework.get_utc_date(2024, i, 22);
    // scenarios by risk factor
    results_scen_rf = JsonRisk.vector_pricer(swaption, params_scen_rf);

    // scenarios by tag
    results_scen_tag = JsonRisk.vector_pricer(swaption, params_scen_tag);

    //compare
    TestFramework.assert(
      compare(results_scen_rf, results_scen_tag),
      "Vector pricing with scenarios by risk factor, with volatilities (" +
        i +
        ")",
    );
  }
};

const params_scen_rf = {
  valuation_date: "2022-05-16",
  curves: {
    CONST: {
      type: "yield",
      tags: ["yield"],
      times: [1],
      zcs: [0],
    },
    CONST_100BP: {
      type: "yield",
      tags: ["yield"],
      times: [0.019230769, 0.25, 0.5, 1, 2, 3, 5, 7, 10, 15, 20, 25, 30],
      zcs: [
        0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01,
        0.01,
      ],
    },
    EUR_OIS_DISCOUNT: {
      type: "yield",
      tags: ["yield"],
      labels: [
        "1W",
        "3M",
        "6M",
        "1Y",
        "2Y",
        "3Y",
        "5Y",
        "7Y",
        "10Y",
        "15Y",
        "20Y",
        "25Y",
        "30Y",
      ],
      zcs: [
        -0.00593, -0.00587, -0.00589, -0.00515, -0.00509, -0.0031, -0.00299,
        0.00085, 0.00598, 0.00835, 0.01036, 0.01244, 0.01426,
      ],
    },
    EUR_GOV_SPREAD: {
      type: "spread",
      times: [1, 2, 3, 5, 7, 10],
      zcs: [-0.00265, -0.00438, -0.00475265, -0.00416, -0.004446837, -0.00446],
    },
    EUR_PFA_SPREAD: {
      type: "spread",
      times: [1, 2, 3, 5, 7, 10],
      zcs: [0.00235, 0.00242, 0.00264735, 0.00354, 0.003353163, 0.00354],
    },
  },
  surfaces: {
    CONST_0BP: {
      type: "bachelier",
      expiries: [1],
      terms: [1],
      values: [[0]],
    },
  },
  scenario_groups: [
    [
      {
        name: "Bump 1W",
        rules: [
          {
            model: "additive",
            risk_factors: ["EUR_OIS_DISCOUNT", "CONST_100BP", "CONST"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0.0001, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            risk_factors: ["CONST_0BP"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0.0001, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 3M",
        rules: [
          {
            model: "additive",
            risk_factors: ["EUR_OIS_DISCOUNT", "CONST_100BP", "CONST"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0.0001, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            risk_factors: ["CONST_0BP"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0.0001, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 6M",
        rules: [
          {
            model: "additive",
            risk_factors: ["EUR_OIS_DISCOUNT", "CONST_100BP", "CONST"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0.0001, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            risk_factors: ["CONST_0BP"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0.0001, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 1Y",
        rules: [
          {
            model: "additive",
            risk_factors: ["EUR_OIS_DISCOUNT", "CONST_100BP", "CONST"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0.0001, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            risk_factors: ["CONST_0BP"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0.0001],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 2Y",
        rules: [
          {
            model: "additive",
            risk_factors: ["EUR_OIS_DISCOUNT", "CONST_100BP", "CONST"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0.0001, 0, 0, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            risk_factors: ["CONST_0BP"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0.0001, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 3Y",
        rules: [
          {
            model: "additive",
            risk_factors: ["EUR_OIS_DISCOUNT", "CONST_100BP", "CONST"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0.0001, 0, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            risk_factors: ["CONST_0BP"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0.0001, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 5Y",
        rules: [
          {
            model: "additive",
            risk_factors: ["EUR_OIS_DISCOUNT", "CONST_100BP", "CONST"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0.0001, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            risk_factors: ["CONST_0BP"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0.0001, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 7Y",
        rules: [
          {
            model: "additive",
            risk_factors: ["EUR_OIS_DISCOUNT", "CONST_100BP", "CONST"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0, 0.0001, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            risk_factors: ["CONST_0BP"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0, 0.0001],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 10Y",
        rules: [
          {
            model: "additive",
            risk_factors: ["EUR_OIS_DISCOUNT", "CONST_100BP", "CONST"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0, 0, 0.0001, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            risk_factors: ["CONST_0BP"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0.0001, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 15Y",
        rules: [
          {
            model: "additive",
            risk_factors: ["EUR_OIS_DISCOUNT", "CONST_100BP", "CONST"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0001, 0, 0, 0]],
          },
          {
            model: "additive",
            risk_factors: ["CONST_0BP"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0.0001, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 20Y",
        rules: [
          {
            model: "additive",
            risk_factors: ["EUR_OIS_DISCOUNT", "CONST_100BP", "CONST"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0001, 0, 0]],
          },
          {
            model: "additive",
            risk_factors: ["CONST_0BP"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0.0001, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 25Y",
        rules: [
          {
            model: "additive",
            risk_factors: ["EUR_OIS_DISCOUNT", "CONST_100BP", "CONST"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0001, 0]],
          },
          {
            model: "additive",
            risk_factors: ["CONST_0BP"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0.0001],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 30Y",
        rules: [
          {
            model: "additive",
            risk_factors: ["EUR_OIS_DISCOUNT", "CONST_100BP", "CONST"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0001]],
          },
          {
            model: "additive",
            risk_factors: ["CONST_0BP"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0.0001, 0, 0, 0],
            ],
          },
        ],
      },
    ],
  ],
};

const params_scen_tag = {
  valuation_date: "2022-05-16",
  curves: {
    CONST: {
      type: "yield",
      tags: ["yield"],
      times: [1],
      zcs: [0],
    },
    CONST_100BP: {
      type: "yield",
      tags: ["yield"],
      times: [0.019230769, 0.25, 0.5, 1, 2, 3, 5, 7, 10, 15, 20, 25, 30],
      zcs: [
        0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01,
        0.01,
      ],
    },
    EUR_OIS_DISCOUNT: {
      type: "yield",
      tags: ["yield"],
      labels: [
        "1W",
        "3M",
        "6M",
        "1Y",
        "2Y",
        "3Y",
        "5Y",
        "7Y",
        "10Y",
        "15Y",
        "20Y",
        "25Y",
        "30Y",
      ],
      zcs: [
        -0.00593, -0.00587, -0.00589, -0.00515, -0.00509, -0.0031, -0.00299,
        0.00085, 0.00598, 0.00835, 0.01036, 0.01244, 0.01426,
      ],
    },
    EUR_GOV_SPREAD: {
      type: "spread",
      times: [1, 2, 3, 5, 7, 10],
      zcs: [-0.00265, -0.00438, -0.00475265, -0.00416, -0.004446837, -0.00446],
    },
    EUR_PFA_SPREAD: {
      type: "spread",
      times: [1, 2, 3, 5, 7, 10],
      zcs: [0.00235, 0.00242, 0.00264735, 0.00354, 0.003353163, 0.00354],
    },
  },
  surfaces: {
    CONST_0BP: {
      type: "bachelier",
      tags: ["bachelier"],
      expiries: [1],
      terms: [1],
      values: [[0]],
    },
  },
  scenario_groups: [
    [
      {
        name: "Bump 1W",
        rules: [
          {
            model: "additive",
            tags: ["yield"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0.0001, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            tags: ["bachelier"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0.0001, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 3M",
        rules: [
          {
            model: "additive",
            tags: ["yield"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0.0001, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            tags: ["bachelier"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0.0001, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 6M",
        rules: [
          {
            model: "additive",
            tags: ["yield"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0.0001, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            tags: ["bachelier"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0.0001, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 1Y",
        rules: [
          {
            model: "additive",
            tags: ["yield"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0.0001, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            tags: ["bachelier"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0.0001],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 2Y",
        rules: [
          {
            model: "additive",
            tags: ["yield"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0.0001, 0, 0, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            tags: ["bachelier"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0.0001, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 3Y",
        rules: [
          {
            model: "additive",
            tags: ["yield"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0.0001, 0, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            tags: ["bachelier"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0.0001, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 5Y",
        rules: [
          {
            model: "additive",
            tags: ["yield"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0.0001, 0, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            tags: ["bachelier"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0.0001, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 7Y",
        rules: [
          {
            model: "additive",
            tags: ["yield"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0, 0.0001, 0, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            tags: ["bachelier"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0, 0.0001],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 10Y",
        rules: [
          {
            model: "additive",
            tags: ["yield"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0, 0, 0.0001, 0, 0, 0, 0]],
          },
          {
            model: "additive",
            tags: ["bachelier"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0.0001, 0, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 15Y",
        rules: [
          {
            model: "additive",
            tags: ["yield"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0001, 0, 0, 0]],
          },
          {
            model: "additive",
            tags: ["bachelier"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0.0001, 0, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 20Y",
        rules: [
          {
            model: "additive",
            tags: ["yield"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0001, 0, 0]],
          },
          {
            model: "additive",
            tags: ["bachelier"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0.0001, 0],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 25Y",
        rules: [
          {
            model: "additive",
            tags: ["yield"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0001, 0]],
          },
          {
            model: "additive",
            tags: ["bachelier"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0.0001],
              [0, 0, 0, 0],
            ],
          },
        ],
      },
      {
        name: "Bump 30Y",
        rules: [
          {
            model: "additive",
            tags: ["yield"],
            labels_x: [
              "1W",
              "3M",
              "6M",
              "1Y",
              "2Y",
              "3Y",
              "5Y",
              "7Y",
              "10Y",
              "15Y",
              "20Y",
              "25Y",
              "30Y",
            ],
            labels_y: ["1"],
            values: [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0001]],
          },
          {
            model: "additive",
            tags: ["bachelier"],
            labels_x: ["1Y", "3Y", "5Y", "10Y"],
            labels_y: ["1Y", "3Y", "5Y", "10Y"],
            values: [
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0, 0, 0, 0],
              [0.0001, 0, 0, 0],
            ],
          },
        ],
      },
    ],
  ],
};
