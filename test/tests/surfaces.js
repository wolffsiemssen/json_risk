TEST_NAME = "Surfaces";

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

    Test Surfaces

     */

  //Constant surface - extrapolation only
  var s = JsonRisk.get_const_surface(0.03);
  console.log(s);
  TestFramework.assert(
    (0.03).toFixed(10) === JsonRisk.get_surface_rate(s, 0.1, 0.2).toFixed(10),
    "Const Surface Extrapolation short-short (1)",
  );
  TestFramework.assert(
    (0.03).toFixed(10) === JsonRisk.get_surface_rate(s, 0.1, 20).toFixed(10),
    "Const Surface Extrapolation short-long (2)",
  );
  TestFramework.assert(
    (0.03).toFixed(10) === JsonRisk.get_surface_rate(s, 20, 0.1).toFixed(10),
    "Const Surface Extrapolation long-short (1)",
  );
  TestFramework.assert(
    (0.03).toFixed(10) === JsonRisk.get_surface_rate(s, 20, 20).toFixed(10),
    "Const Surface Extrapolation long-long (2)",
  );

  //

  //bi-linear interpolation on surface
  s = {
    type: "bachelier",
    expiries: [1, 2, 3],
    terms: [1, 2, 3, 4],
    values: [
      [1, 1, 2, 2],
      [2, 2, 3, 3],
      [3, 3, 4, 4],
    ],
  };

  TestFramework.assert(
    (1.5).toFixed(10) === JsonRisk.get_surface_rate(s, 1, 2.5).toFixed(10),
    "Surface interpolation (1)",
  );
  TestFramework.assert(
    (2.5).toFixed(10) === JsonRisk.get_surface_rate(s, 2, 2.5).toFixed(10),
    "Surface interpolation (2)",
  );
  TestFramework.assert(
    (3).toFixed(10) === JsonRisk.get_surface_rate(s, 2.5, 2.5).toFixed(10),
    "Surface interpolation (3)",
  );
  TestFramework.assert(
    (3.5).toFixed(10) === JsonRisk.get_surface_rate(s, 2.5, 3.5).toFixed(10),
    "Surface interpolation (4)",
  );

  s.labels_expiry = ["1Y", "2Y", "3Y"];
  s.labels_term = ["1Y", "2Y", "3Y", "4Y"];
  delete s.expiries;
  delete s.terms;

  TestFramework.assert(
    (1.5).toFixed(10) === JsonRisk.get_surface_rate(s, 1, 2.5).toFixed(10),
    "Surface interpolation (fallback on labels, 1)",
  );
  TestFramework.assert(
    (2.5).toFixed(10) === JsonRisk.get_surface_rate(s, 2, 2.5).toFixed(10),
    "Surface interpolation (fallback on labels, 2)",
  );
  TestFramework.assert(
    (3).toFixed(10) === JsonRisk.get_surface_rate(s, 2.5, 2.5).toFixed(10),
    "Surface interpolation (fallback on labels, 3)",
  );
  TestFramework.assert(
    (3.5).toFixed(10) === JsonRisk.get_surface_rate(s, 2.5, 3.5).toFixed(10),
    "Surface interpolation (fallback on labels, 4)",
  );

  //bi-linear interpolation on cube without strikes
  TestFramework.assert(
    (1.5).toFixed(10) === JsonRisk.get_cube_rate(s, 1, 2.5, 0).toFixed(10),
    "Cube interpolation on surface only (1)",
  );
  TestFramework.assert(
    (2.5).toFixed(10) === JsonRisk.get_cube_rate(s, 2, 2.5, 1).toFixed(10),
    "Cube interpolation on surface only (2)",
  );
  TestFramework.assert(
    (3).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 2.5, -1).toFixed(10),
    "Cube interpolation on surface only (3)",
  );
  TestFramework.assert(
    (3.5).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 3.5, 0).toFixed(10),
    "Cube interpolation on surface only (4)",
  );

  //tri-linear interpolation on cube with strikes
  s = {
    type: "bachelier",
    expiries: [1, 2, 3],
    terms: [1, 2, 3, 4],
    values: [
      [1, 1, 2, 2],
      [2, 2, 3, 3],
      [3, 3, 4, 4],
    ],
  };
  smile_section = JSON.parse(JSON.stringify(s));
  s.moneyness = [-0.02, -0.01, 0, 0.01, 0.01];
  s.smile = [
    smile_section,
    smile_section,
    JsonRisk.get_const_surface(0),
    smile_section,
    smile_section,
  ];

  //ATM
  TestFramework.assert(
    (1.5).toFixed(10) === JsonRisk.get_cube_rate(s, 1, 2.5, 0).toFixed(10),
    "Cube interpolation ATM (1)",
  );
  TestFramework.assert(
    (2.5).toFixed(10) === JsonRisk.get_cube_rate(s, 2, 2.5, 0).toFixed(10),
    "Cube interpolation ATM (2)",
  );
  TestFramework.assert(
    (3).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 2.5, 0).toFixed(10),
    "Cube interpolation ATM (3)",
  );
  TestFramework.assert(
    (3.5).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 3.5, 0).toFixed(10),
    "Cube interpolation ATM (4)",
  );

  //+50 BP
  TestFramework.assert(
    (1.5 * 1.5).toFixed(10) ===
      JsonRisk.get_cube_rate(s, 1, 2.5, 0.005).toFixed(10),
    "Cube interpolation +50BP (1)",
  );
  TestFramework.assert(
    (2.5 * 1.5).toFixed(10) ===
      JsonRisk.get_cube_rate(s, 2, 2.5, 0.005).toFixed(10),
    "Cube interpolation +50BP (2)",
  );
  TestFramework.assert(
    (3 * 1.5).toFixed(10) ===
      JsonRisk.get_cube_rate(s, 2.5, 2.5, 0.005).toFixed(10),
    "Cube interpolation +50BP (3)",
  );
  TestFramework.assert(
    (3.5 * 1.5).toFixed(10) ===
      JsonRisk.get_cube_rate(s, 2.5, 3.5, 0.005).toFixed(10),
    "Cube interpolation +50BP (4)",
  );

  //-100 BP
  TestFramework.assert(
    (1.5 * 2).toFixed(10) ===
      JsonRisk.get_cube_rate(s, 1, 2.5, -0.01).toFixed(10),
    "Cube interpolation -100BP (1)",
  );
  TestFramework.assert(
    (2.5 * 2).toFixed(10) ===
      JsonRisk.get_cube_rate(s, 2, 2.5, -0.01).toFixed(10),
    "Cube interpolation -100BP (2)",
  );
  TestFramework.assert(
    (3 * 2).toFixed(10) ===
      JsonRisk.get_cube_rate(s, 2.5, 2.5, -0.01).toFixed(10),
    "Cube interpolation -100BP (3)",
  );
  TestFramework.assert(
    (3.5 * 2).toFixed(10) ===
      JsonRisk.get_cube_rate(s, 2.5, 3.5, -0.01).toFixed(10),
    "Cube interpolation -100BP (4)",
  );

  //+150 BP
  TestFramework.assert(
    (1.5 * 2).toFixed(10) ===
      JsonRisk.get_cube_rate(s, 1, 2.5, 0.015).toFixed(10),
    "Cube interpolation +150BP (1)",
  );
  TestFramework.assert(
    (2.5 * 2).toFixed(10) ===
      JsonRisk.get_cube_rate(s, 2, 2.5, 0.015).toFixed(10),
    "Cube interpolation +150BP (2)",
  );
  TestFramework.assert(
    (3 * 2).toFixed(10) ===
      JsonRisk.get_cube_rate(s, 2.5, 2.5, 0.015).toFixed(10),
    "Cube interpolation +150BP (3)",
  );
  TestFramework.assert(
    (3.5 * 2).toFixed(10) ===
      JsonRisk.get_cube_rate(s, 2.5, 3.5, 0.015).toFixed(10),
    "Cube interpolation +150BP (4)",
  );
};
