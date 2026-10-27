TEST_NAME = "Cap/Floor with zero-volatility";

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
  console.log("=== STARTING CAP/FLOOR ZERO-VOLATILITY UNIT TESTS ===");

  JsonRisk.set_valuation_date("13.09.2026");

  const curve = new JsonRisk.Curve({ times: [1.0, 2.0], zcs: [0.035, 0.035] });

  const surface_zero = new JsonRisk.ExpiryAbsStrikeSurface({
    type: "expiry_abs_strike",
    labels_expiry: ["1Y"],
    moneyness: [0.03, 0.035, 0.04],
    values: [[0.0, 0.0, 0.0]],
  });

  const index = new JsonRisk.SimpleIndex({
    fwd_curve: "EUR_3M",
    surface: "EUR_3M_ZERO",
  });
  index.link_curve(curve);
  index.link_surface(surface_zero);
  const indices = { EURIBOR_3M: index };

  const notional = 1000000;
  const strike = 0.035;

  // all the 6 combinations: type x spread
  const scenarios = [
    // Caplets
    { type: "Caplet", spread: 0.005, desc: "Caplet, Positive Spread (+50bp)" },
    { type: "Caplet", spread: 0.0, desc: "Caplet, No Spread" },
    { type: "Caplet", spread: -0.005, desc: "Caplet, Negative Spread (-50bp)" },
    // Floorlets
    {
      type: "Floorlet",
      spread: 0.005,
      desc: "Floorlet, Positive Spread (+50bp)",
    },
    { type: "Floorlet", spread: 0.0, desc: "Floorlet, No Spread" },
    {
      type: "Floorlet",
      spread: -0.005,
      desc: "Floorlet, Negative Spread (-50bp)",
    },
  ];

  scenarios.forEach((scenario, idx) => {
    const payment_data = {
      index: "EURIBOR_3M",
      date_pmt: new Date(2028, 0, 13),
      date_start: new Date(2027, 9, 13),
      date_end: new Date(2028, 0, 13),
      strike: strike,
      spread: scenario.spread,
      notional: notional,
    };

    // we dynamically instantiate caplet or floorlet
    const payment =
      scenario.type === "Caplet"
        ? new JsonRisk.CapletPayment(payment_data)
        : new JsonRisk.FloorletPayment(payment_data);

    payment.project(indices);

    // we get forward rate and year fraction from the library's computation
    const real_fwd = index.fwd_rate(payment.reset_start, payment.reset_end);
    const real_yf = payment.yf;
    const effective_fwd = real_fwd + scenario.spread;

    // the expected rate for vola = 0 (pure intrinsic rate value)
    let expected_rate = 0.0;
    if (scenario.type === "Caplet") {
      expected_rate = effective_fwd > strike ? -(effective_fwd - strike) : 0.0;
    } else {
      expected_rate = strike > effective_fwd ? strike - effective_fwd : 0.0;
    }
    const expected_amount = expected_rate * notional * real_yf;

    TestFramework.assert(
      payment.amount.toFixed(7) === expected_amount.toFixed(7),
      `Zero-Vola Scenario ${idx + 1}: ${scenario.desc} (Passed up to 1/100 bp)`,
    );
  });

  console.log("=== CAP/FLOOR ZERO-VOLATILITY UNIT TESTS SUCCESSFUL ===");
};
