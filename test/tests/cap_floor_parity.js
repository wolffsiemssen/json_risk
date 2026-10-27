TEST_NAME = "Cap/Floor put-call parity";

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
  /**
   * Cap/Floot put-call parity
   */

  console.log("=== STARTING CAP/FLOOR PUT-CALL PARITY UNIT TESTS ===");

  JsonRisk.set_valuation_date("12.09.2026");

  // Constant 3.5% forward-curve for the test
  const curve = new JsonRisk.Curve({
    times: [1.0, 2.0],
    zcs: [0.035, 0.035],
  });

  // A typical Bachelier-Vola-Surface (e.g. 80 base points normal volatility)
  const normal_vola = 0.008;
  const surface_vola = new JsonRisk.ExpiryAbsStrikeSurface({
    type: "expiry_abs_strike",
    expiries: [1.0],
    moneyness: [0.03, 0.04], // covers different strikes
    values: [[normal_vola, normal_vola]],
  });

  const index = new JsonRisk.SimpleIndex({
    fwd_curve: "EUR_3M",
    surface: "EUR_3M_VOLA",
  });
  index.link_curve(curve);
  index.link_surface(surface_vola);

  const indices = { EURIBOR_3M: index };

  // 3. Test-parameters
  const notional = 1000000; // 1 Mi. Nominal

  // We test parity over various strikes (ITM, ATM, OTM) and spreads
  const test_scenarios = [
    { strike: 0.03, spread: 0.0, desc: "In-the-money Caplet, No Spread" },
    { strike: 0.035, spread: 0.0, desc: "At-the-money Caplet, No Spread" },
    { strike: 0.04, spread: 0.0, desc: "Out-of-the-money Caplet, No Spread" },
    {
      strike: 0.035,
      spread: 0.005,
      desc: "At-the-money Caplet, Positive Spread (+50bp)",
    },
    {
      strike: 0.035,
      spread: -0.005,
      desc: "At-the-money Caplet, Negative Spread (-50bp)",
    },
  ];

  test_scenarios.forEach((scenario, idx) => {
    // Generate an identical pair of Caplet and Floorlet
    const caplet = new JsonRisk.CapletPayment({
      index: "EURIBOR_3M",
      date_pmt: new Date(2028, 0, 13),
      date_start: new Date(2027, 9, 12), // 1 year in the future
      date_end: new Date(2028, 0, 12), // 3 months duration
      strike: scenario.strike,
      spread: scenario.spread,
      notional: notional,
    });

    const floorlet = new JsonRisk.FloorletPayment({
      index: "EURIBOR_3M",
      date_pmt: new Date(2028, 0, 13),
      date_start: new Date(2027, 9, 12), // 1 year in the future
      date_end: new Date(2028, 0, 12), // 3 months duration
      strike: scenario.strike,
      spread: scenario.spread,
      notional: notional,
    });

    // Project both payments
    caplet.project(indices);
    floorlet.project(indices);

    const real_fwd_rate = index.fwd_rate(caplet.reset_start, caplet.reset_end);
    const real_yf = caplet.yf;
    const real_notional = caplet.notional;

    // --- PUT-CALL PARITY EQUATION ---
    const call_minus_put = -caplet.amount - floorlet.amount; // caplet is a SHORT call

    const effective_fwd = real_fwd_rate + scenario.spread;
    const forward_minus_strike =
      (effective_fwd - scenario.strike) * real_notional * real_yf;

    TestFramework.assert(
      call_minus_put.toFixed(7) === forward_minus_strike.toFixed(7),
      `Put-Call-Parity Scenario ${idx + 1}: ${scenario.desc}`,
    );
  });

  console.log("=== CAP/FLOOR PUT-CALL PARITY UNIT TESTS SUCCESSFUL ===");
};
