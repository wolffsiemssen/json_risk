TEST_NAME = "Overnight index and compounding";

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
  const simple = JsonRisk.make_index_compounding("simple");
  const straight = JsonRisk.make_index_compounding("straight");
  const flat = JsonRisk.make_index_compounding("flat");
  const spread_ex = JsonRisk.make_index_compounding("spread exclusive");

  const year_fractions = [0.2, 0.1, 0.2]; // adds up to half a year
  const zeros = [0.0, 0.0, 0.0];
  const rates = [0.01, 0.02, 0.03];

  const compound = function (rates, year_fractions, spread) {
    return {
      simple: simple(rates, year_fractions, spread),
      straight: straight(rates, year_fractions, spread),
      flat: flat(rates, year_fractions, spread),
      spread_ex: spread_ex(rates, year_fractions, spread),
    };
  };

  let result = compound(rates, year_fractions, 0.0);

  TestFramework.assert(
    result.straight > result.simple,
    `Index Compounding: straight compounding is strictly greater than simple compounding, case without spread`,
  );

  TestFramework.assert(
    Math.abs(result.flat - result.straight) < 1e-12,
    `Index Compounding: flat matches straight in case of zero spread`,
  );

  TestFramework.assert(
    Math.abs(result.spread_ex - result.straight) < 1e-12,
    `Index Compounding: spread exclusive matches straight in case of zero spread`,
  );

  const spread = 0.05;
  result = compound(zeros, year_fractions, spread);

  TestFramework.assert(
    result.straight > result.simple,
    `Index Compounding: straight compounding is strictly greater than simple compounding, case without rates`,
  );

  TestFramework.assert(
    Math.abs(result.spread_ex - result.simple) < 1e-12,
    `Index Compounding: spread exclusive matches simple in case of zero rates`,
  );

  TestFramework.assert(
    Math.abs(result.flat - result.simple) < 1e-12,
    `Index Compounding: flat matches simple in case of zero rates`,
  );

  result = compound(rates, year_fractions, spread);

  TestFramework.assert(
    result.spread_ex > result.simple,
    `Index Compounding: spread exclusive compounding is strictly greater than simple compounding, general case`,
  );

  TestFramework.assert(
    result.flat > result.spread_ex,
    `Index Compounding: flat compounding is strictly greater than spread exclusive compounding, general case`,
  );

  TestFramework.assert(
    result.straight > result.flat,
    `Index Compounding: straight compounding is strictly greater than flat compounding, general case`,
  );

  //
  // exact numerical results with simple numbers
  //
  const r = 0.025;
  result = compound([r, r, r], [1, 1, 1], r);

  let ref = 6 * r;
  TestFramework.assert(
    Math.abs(result.simple - ref) < 1e-12,
    `Index Compounding: reference result for simple index compounding`,
  );

  ref = (1 + 2 * r) ** 3 - 1;
  TestFramework.assert(
    Math.abs(result.straight - ref) < 1e-12,
    `Index Compounding: reference result for straight index compounding`,
  );

  ref = (1 + r) ** 3 - 1 + 3 * r;
  TestFramework.assert(
    Math.abs(result.spread_ex - ref) < 1e-12,
    `Index Compounding: reference result for spread exclusive index compounding`,
  );

  ref = 2 * r; //first period earns spread and rate
  ref *= 1 + r; // second period earns rate on previously accrued earnings
  ref += 2 * r; // second period earns spread and rate on unit amount
  ref *= 1 + r; // third period earns rate on previously accrued earnings
  ref += 2 * r; // third period earns spread and rate on unit amount
  TestFramework.assert(
    Math.abs(result.flat - ref) < 1e-12,
    `Index Compounding: reference result for flat index compounding`,
  );

  //
  // Example from isda memo
  //
  result = compound([0.04, 0.045, 0.05], [1 / 12, 1 / 12, 1 / 12], 0.001);

  TestFramework.assert(
    Math.abs(result.straight - 0.011543965) < 1e-9,
    `Index Compounding: reference result from ISDA memo for straight index compounding`,
  );

  TestFramework.assert(
    Math.abs(result.flat - 0.011543074) < 1e-9,
    `Index Compounding: reference result from ISDA memo for flat index compounding`,
  );

  TestFramework.assert(
    Math.abs(result.spread_ex - 0.011542066) < 1e-9,
    `Index Compounding: reference result from ISDA memo for spread exclusive index compounding`,
  );
};
