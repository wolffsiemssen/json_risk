TEST_NAME = "Cap Floor Payment";

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
  JsonRisk.set_valuation_date("16.09.2026");

  // valuation_date: TestFramework.get_utc_date(2026, 8, 17);  // months count starts from 0

  const mock_disc_curve = {
    get_df: function (start, end) {
      return 0.95;
    },
  };

  const mock_fwd_curve = {
    get_fwd_rate: function (start, end) {
      return 0.04;
    },
  };

  const test_cap = new JsonRisk.CapFloor({
    type: "capfloor",
    payment_type: "capfloor",
    notional: 1000000,
    effective_date: new Date("2026-09-17"),
    maturity: new Date("2028-09-17"),
    tenor: "6M",
    freq: "6M",
    dcc: "act/365",
    bdc: "following",
    float_current_rate: 0.04,

    // Strikes
    cap_rate: 0.03, // Strike 3% (since forward is 4%, the caplet is "In-the-Money")
    floor_rate: null,

    // The curve mappings
    disc_curve: "EUR_OIS",
    fwd_curve: mock_fwd_curve, // "EURIBOR_6M",

    cap_vola_curve: [0.25, 0.23, 0.22, 0.2],
  });

  // const price = JsonRisk.pricer_capfloor(
  //   test_cap,
  //   mock_disc_curve,
  //   mock_fwd_curve,
  //   // mock_cap_vola_curve,
  //   // mock_floor_vola_curve
  // );

  const price = test_cap.present_value(mock_disc_curve);

  console.debug("I am running through the cap floor test");

  TestFramework.assert(
    !!price,
    `Cap price correctly computed: ${price.toFixed(12)} }`,
  );
};
