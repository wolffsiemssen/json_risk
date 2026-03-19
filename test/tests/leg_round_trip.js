TEST_NAME = "Leg Round Trip";

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

    Test leg serialisation and consistency between generated and delivered legs

     */

  JsonRisk.set_valuation_date("2025/11/30");
  const params = new JsonRisk.Params({
    valuation_date: JsonRisk.valuation_date,
    curves: {
      curve: {
        times: [1, 2, 3, 5],
        dfs: [0.95, 0.91, 0.86, 0.78],
      },
      spread_curve: { times: [1], zcs: [0.05] },
    },
  });

  const ijson = {
    effective_date: "2020/11/15",
    maturity: "2030/11/15",
    notional: 100,
    tenor: 12,
    fixed_rate: 0.025,
    float_tenor: 6,
    float_current_rate: 0.0,
    float_spread: 0.025,
    disc_curve: "curve",
    fwd_curve: "curve",
    spread_curve: "spread_curve",
    calendar: "TARGET",
    bdc: "f",
  };

  const bond = new JsonRisk.Bond(ijson);
  const floater = new JsonRisk.Floater(ijson);
  const swap = new JsonRisk.Swap(ijson);

  const ref_pv =
    bond.value(params) + floater.value(params) + swap.value(params);

  // check payment pvs are consistent
  const legs = [bond.legs[0], floater.legs[0], swap.legs[0], swap.legs[1]];
  let p_pv = 0;
  for (const l of legs) {
    for (const p of l.payments) {
      p_pv += p.pv;
    }
  }

  TestFramework.assert(
    Math.abs(p_pv - ref_pv) < 1e-10,
    `Instrument PV (${ref_pv}) and payments pv (${p_pv}) are consistent`,
  );

  // serialise leg
  const ljson = legs.map((l) => l.toJSON());

  p_pv = 0;
  for (const l of ljson) {
    for (const p of l.payments) {
      p_pv += p.pv;
    }
  }

  TestFramework.assert(
    Math.abs(p_pv - ref_pv) < 1e-10,
    `Instrument PV (${ref_pv}) and serialised payments pv (${p_pv}) are consistent`,
  );

  // make leg instrument
  const leg_instrument = new JsonRisk.LegInstrument({
    legs: ljson,
  });

  const l_pv = leg_instrument.value(params);

  TestFramework.assert(
    Math.abs(l_pv - ref_pv) < 1e-10,
    `Instrument PV (${ref_pv}) and leg instrument pv after round trip (${l_pv}) are consistent`,
  );
};
