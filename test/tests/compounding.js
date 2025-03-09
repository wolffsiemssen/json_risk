TEST_NAME = "Curve Compounding";

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
  const times = [1, 2, 3, 5, 10];
  const zcs = [0.01, 0.02, 0.03, 0.03, 0.028];
  const dfs_annual = zcs.map((z, i) => {
    return Math.pow(1 + z, -times[i]);
  });
  const dfs_continuous = zcs.map((z, i) => {
    return Math.exp(-z * times[i]);
  });
  let annual = JsonRisk.get_safe_curve({
    times: times,
    dfs: dfs_annual,
    intp: "linear_zc",
    compounding: "annual",
  });
  let continuous = JsonRisk.get_safe_curve({
    times: times,
    dfs: dfs_continuous,
    intp: "linear_zc",
    compounding: "continuous",
  });

  for (let t = 0.5; t < 12; t += 0.5) {
    // curves should have the same rates as they are constructed with the same rates and interpolated on zero rates
    let r_annual = annual.get_rate(t);
    let r_continuous = continuous.get_rate(t);
    TestFramework.assert(
      Math.abs(r_annual - r_continuous) < 1e-12,
      `Compounding rates annu vs. cont (time ${t})`,
    );
  }
};
