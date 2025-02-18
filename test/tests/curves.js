TEST_NAME = "Curves";

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
  /*!

    Test Curves

     */

  //Constant zero curve - extrapolation only
  var c = JsonRisk.get_const_curve(0.03);
  TestFramework.assert(
    (0.03).toFixed(10) === JsonRisk.get_rate(c, 0.1).toFixed(10),
    "Const Yield Curve Extrapolation short (1)",
  );
  TestFramework.assert(
    (0.03).toFixed(10) === JsonRisk.get_rate(c, 1 / 365).toFixed(10),
    "Const Yield Curve Extrapolation short (2)",
  );
  TestFramework.assert(
    (0.03).toFixed(10) === JsonRisk.get_rate(c, 10).toFixed(10),
    "Const Yield Curve Extrapolation long (1)",
  );
  TestFramework.assert(
    (0.03).toFixed(10) === JsonRisk.get_rate(c, 20).toFixed(10),
    "Const Yield Curve Extrapolation long (2)",
  );

  //

  //linear interpolation on discounts
  c = {
    type: "yield",
    labels: ["1Y", "20Y"],

    times: [1, 20],
    dfs: [1, 0.5],
  };
  for (i = 1; i < 21; i++) {
    TestFramework.assert(
      ((1 * (20 - i)) / 19 + (0.5 * (i - 1)) / 19).toFixed(10) ===
        JsonRisk.get_df(c, i).toFixed(10),
      "Yield Curve interpolation " + i,
    );
  }

  //linear interpolation stability with more support points
  c = {
    type: "yield",
    times: [1, 7, 12, 15.5, 20],
    dfs: [
      1,
      JsonRisk.get_df(c, 7),
      JsonRisk.get_df(c, 12),
      JsonRisk.get_df(c, 15.5),
      0.5,
    ],
  };

  for (i = 1; i < 21; i++) {
    TestFramework.assert(
      ((1 * (20 - i)) / 19 + (0.5 * (i - 1)) / 19).toFixed(10) ===
        JsonRisk.get_df(c, i).toFixed(10),
      "Yield Curve interpolation stability " + i,
    );
  }

  //Curve without times - fallback based on days
  c = {
    type: "yield",
    days: [365, 7 * 365, 12 * 365, 15.5 * 365, 20 * 365],
    dfs: c.dfs,
  };

  for (i = 1; i < 21; i++) {
    TestFramework.assert(
      ((1 * (20 - i)) / 19 + (0.5 * (i - 1)) / 19).toFixed(10) ===
        JsonRisk.get_df(c, i).toFixed(10),
      "Yield Curve interpolation fallback on days " + i,
    );
  }

  //Curve without times - fallback based on labels
  c = {
    type: "yield",
    labels: ["1Y", "7Y", "12Y", "186M", "20Y"],
    dfs: c.dfs,
  };

  for (i = 1; i < 21; i++) {
    TestFramework.assert(
      ((1 * (20 - i)) / 19 + (0.5 * (i - 1)) / 19).toFixed(10) ===
        JsonRisk.get_df(c, i).toFixed(10),
      "Yield Curve interpolation fallback on labels " + i,
    );
  }

  //Curve without times - fallback based on dates
  c = {
    type: "yield",
    dates: [
      "01.01.2000",
      "31.12.2000",
      "31.12.2001",
      "31.12.2002",
      "28.12.2012",
    ],
    dfs: [1, 0.9, 0.8, 0.7, 0.5],
  };

  TestFramework.assert(
    (0.95).toFixed(10) === JsonRisk.get_df(c, 0.5).toFixed(10),
    "Yield Curve interpolation fallback on dates 1",
  );
  TestFramework.assert(
    (0.85).toFixed(10) === JsonRisk.get_df(c, 1.5).toFixed(10),
    "Yield Curve interpolation fallback on dates 2",
  );
  TestFramework.assert(
    (0.75).toFixed(10) === JsonRisk.get_df(c, 2.5).toFixed(10),
    "Yield Curve interpolation fallback on dates 3",
  );
  TestFramework.assert(
    (0.6).toFixed(10) === JsonRisk.get_df(c, 8).toFixed(10),
    "Yield Curve interpolation fallback on dates 4",
  );

  //Curve with scenario rules
  additive = {
    type: "yield",
    labels: ["1Y", "7Y", "12Y", "186M", "20Y"],
    zcs: [0.01, 0.015, 0.016, 0.015, 0.01],
    intp: "linear_zc",
    _rule: {
      model: "additive",
      labels_x: ["1Y", "7Y", "12Y", "186M", "20Y"],
      labels_y: ["1"],
      values: [[0.01, 0.015, 0.016, 0.015, 0.01]],
    },
  };

  multiplicative = {
    type: "yield",
    labels: ["1Y", "7Y", "12Y", "186M", "20Y"],
    zcs: [0.01, 0.015, 0.016, 0.015, 0.01],
    intp: "linear_zc",
    _rule: {
      model: "multiplicative",
      labels_x: ["1Y", "7Y", "12Y", "186M", "20Y"],
      labels_y: ["1"],
      values: [[2, 2, 2, 2, 2]],
    },
  };

  absolute = {
    type: "yield",
    labels: ["1Y", "7Y", "12Y", "186M", "20Y"],
    zcs: [0, 0, 0, 0, 0],
    intp: "linear_zc",
    _rule: {
      model: "absolute",
      labels_x: ["1Y", "7Y", "12Y", "186M", "20Y"],
      labels_y: ["1"],
      values: [[0.02, 0.03, 0.032, 0.03, 0.02]],
    },
  };

  TestFramework.assert(
    0.02 === JsonRisk.get_rate(absolute, 1.0),
    "Yield Curve with absolute scenario (1)",
  );

  TestFramework.assert(
    0.032 === JsonRisk.get_rate(absolute, 12.0),
    "Yield Curve with absolute scenario (2)",
  );

  TestFramework.assert(
    0.02 === JsonRisk.get_rate(absolute, 20.0),
    "Yield Curve with absolute scenario (3)",
  );

  TestFramework.assert(
    0.032 === JsonRisk.get_rate(additive, 12.0),
    "Yield Curve with additive scenario (1)",
  );

  TestFramework.assert(
    0.032 === JsonRisk.get_rate(multiplicative, 12.0),
    "Yield Curve with multiplicative scenario (1)",
  );

  TestFramework.assert(
    JsonRisk.get_rate(additive, 0.1) === JsonRisk.get_rate(multiplicative, 0.1),
    "Yield Curve with additive vs multiplicative scenario (1)",
  );

  TestFramework.assert(
    JsonRisk.get_rate(additive, 5.0) === JsonRisk.get_rate(multiplicative, 5.0),
    "Yield Curve with additive vs multiplicative scenario (2)",
  );

  TestFramework.assert(
    JsonRisk.get_rate(additive, 10.0) ===
      JsonRisk.get_rate(multiplicative, 10.0),
    "Yield Curve with additive vs multiplicative scenario (3)",
  );

  TestFramework.assert(
    JsonRisk.get_rate(additive, 15.0) ===
      JsonRisk.get_rate(multiplicative, 15.0),
    "Yield Curve with additive vs multiplicative scenario (4)",
  );

  TestFramework.assert(
    JsonRisk.get_rate(additive, 30.0) ===
      JsonRisk.get_rate(multiplicative, 30.0),
    "Yield Curve with additive vs multiplicative scenario (5)",
  );
};
