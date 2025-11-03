TEST_NAME = "Bessel-Hermite Interpolation";

test = {
  name: TEST_NAME,
};

if (typeof module === "object" && typeof exports !== "undefined") {
  // Node.js
  module.exports = test;
} else {
  // Browser
  jr_tests.push(test);
}

test.execute = function (TestFramework, JsonRisk) {
  const times = [1, 2, 3, 6.5, 10];
  const zcs_lin = [0.01, 0.02, 0.03, 0.065, 0.1];
  const zcs = [0.01, 0.025, 0.01, 0.0, 0.01];

  let curve_lin = new JsonRisk.Curve({
    times: times,
    zcs: zcs_lin,
    intp: "bessel",
    compounding: "continuous",
  });

  let curve = new JsonRisk.Curve({
    times: times,
    zcs: zcs,
    intp: "bessel",
    compounding: "continuous",
  });

  for (let i = 0; i < times.length; i++) {
    // curves should have the same rates as they are constructed with the same rates and interpolated on zero rates
    let r_lin = curve_lin.get_rate(times[i]);
    let r = curve.get_rate(times[i]);
    TestFramework.assert(
      Math.abs(r_lin - zcs_lin[i]) < 1e-12,
      `Hermite interpolation recovers rates at support points (linear curve, timepoint ${i})`,
    );

    TestFramework.assert(
      Math.abs(r - zcs[i]) < 1e-12,
      `Hermite interpolation recovers rates at support points (general curve, timepoint ${i})`,
    );
  }

  let fourpoints = new JsonRisk.Curve({
    times: [1 / 365, 11 / 365, 18 / 365, 25 / 365],
    zcs: [0.032609, 0.032671, 0.031859, 0.031278],
    intp: "bessel",
    compounding: "continuous",
  });

  const ref = [
    0.032609, 0.032609, 0.03268, 0.032736, 0.032779, 0.032806, 0.03282,
    0.032819, 0.032803, 0.032774, 0.032729, 0.032671, 0.03259, 0.032484,
    0.03236, 0.032228, 0.032095, 0.031969, 0.031859, 0.031762, 0.031669,
    0.031582, 0.031499, 0.03142, 0.031347, 0.031278, 0.031278, 0.031278,
    0.031278, 0.031278,
  ];
  for (let i = 0; i < 30; i++) {
    let r = fourpoints.get_rate(i / 365);
    TestFramework.assert(
      Math.abs(r - ref[i]) < 0.0001,
      `Hermite interpolation against manually interpolated reference (timepoint ${i})`,
    );
  }
};
