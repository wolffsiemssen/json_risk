const TEST_NAME = "Equity Option Surface Scenarios";

const test = {
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

    Test Equity Option Pricing under scenarios on ExpiryRelStrike and ExpiryAbsStrike surfaces

    */

  JsonRisk.set_valuation_date("2025/01/01");

  const spot = 100.0;
  const base_vol = 0.2;
  const risk_free_rate = 0.05;
  const dividend_yield = 0.02;
  const expiry = JsonRisk.add_days(JsonRisk.valuation_date, 365);

  // Test ExpiryRelStrike surface with basic option pricing
  const params_rel = {
    valuation_date: JsonRisk.valuation_date,
    scalars: {
      stock: { value: spot },
    },
    curves: {
      riskless: {
        compounding: "Continuous",
        times: [1.0],
        zcs: [risk_free_rate],
      },
    },
    surfaces: {
      surface_rel: {
        type: "expiry_rel_strike",
        expiries: [1.0],
        moneyness: [-0.1, 0.0, 0.1],
        values: [[0.18, 0.2, 0.22]],
      },
    },
  };

  // Test ATM call option with ExpiryRelStrike surface
  const atm_call_rel = new JsonRisk.EquityOption({
    quote: "stock",
    disc_curve: "riskless",
    repo_curve: "riskless",
    surface: "surface_rel",
    spot_days: 0,
    strike: 100.0,
    is_call: true,
    expiry: expiry,
    q: dividend_yield,
  });

  const params_rel_atm = new JsonRisk.Params(params_rel);
  const atm_value_rel = atm_call_rel.value(params_rel_atm);

  TestFramework.assert(
    atm_value_rel > 0,
    `ExpiryRelStrike surface ATM call: option value should be positive, got ${atm_value_rel.toFixed(4)}`,
  );

  // Test OTM call option with ExpiryRelStrike surface
  const otm_call_rel = new JsonRisk.EquityOption({
    quote: "stock",
    disc_curve: "riskless",
    repo_curve: "riskless",
    surface: "surface_rel",
    spot_days: 0,
    strike: 110.0,
    is_call: true,
    expiry: expiry,
    q: dividend_yield,
  });

  const otm_value_rel = otm_call_rel.value(params_rel_atm);
  TestFramework.assert(
    otm_value_rel > 0 && otm_value_rel < atm_value_rel,
    `ExpiryRelStrike surface OTM call: should be positive and less than ATM, got ${otm_value_rel.toFixed(4)} vs ATM ${atm_value_rel.toFixed(4)}`,
  );

  // Test ITM call option with ExpiryRelStrike surface
  const itm_call_rel = new JsonRisk.EquityOption({
    quote: "stock",
    disc_curve: "riskless",
    repo_curve: "riskless",
    surface: "surface_rel",
    spot_days: 0,
    strike: 90.0,
    is_call: true,
    expiry: expiry,
    q: dividend_yield,
  });

  const itm_value_rel = itm_call_rel.value(params_rel_atm);
  TestFramework.assert(
    itm_value_rel > atm_value_rel,
    `ExpiryRelStrike surface ITM call: should be greater than ATM, got ${itm_value_rel.toFixed(4)} vs ATM ${atm_value_rel.toFixed(4)}`,
  );

  // Test ExpiryAbsStrike surface with basic option pricing
  const params_abs = {
    valuation_date: JsonRisk.valuation_date,
    scalars: {
      stock: { value: spot },
    },
    curves: {
      riskless: {
        compounding: "Continuous",
        times: [1.0],
        zcs: [risk_free_rate],
      },
    },
    surfaces: {
      surface_abs: {
        type: "expiry_abs_strike",
        expiries: [1.0],
        moneyness: [90.0, 100.0, 110.0],
        values: [[0.18, 0.2, 0.22]],
      },
    },
  };

  // Test ATM call option with ExpiryAbsStrike surface
  const atm_call_abs = new JsonRisk.EquityOption({
    quote: "stock",
    disc_curve: "riskless",
    repo_curve: "riskless",
    surface: "surface_abs",
    spot_days: 0,
    strike: 100.0,
    is_call: true,
    expiry: expiry,
    q: dividend_yield,
  });

  const params_abs_atm = new JsonRisk.Params(params_abs);
  const atm_value_abs = atm_call_abs.value(params_abs_atm);

  TestFramework.assert(
    atm_value_abs > 0,
    `ExpiryAbsStrike surface ATM call: option value should be positive, got ${atm_value_abs.toFixed(4)}`,
  );

  // Test OTM call option with ExpiryAbsStrike surface
  const otm_call_abs = new JsonRisk.EquityOption({
    quote: "stock",
    disc_curve: "riskless",
    repo_curve: "riskless",
    surface: "surface_abs",
    spot_days: 0,
    strike: 110.0,
    is_call: true,
    expiry: expiry,
    q: dividend_yield,
  });

  const otm_value_abs = otm_call_abs.value(params_abs_atm);
  TestFramework.assert(
    otm_value_abs > 0 && otm_value_abs < atm_value_abs,
    `ExpiryAbsStrike surface OTM call: should be positive and less than ATM, got ${otm_value_abs.toFixed(4)} vs ATM ${atm_value_abs.toFixed(4)}`,
  );

  // Test ITM call option with ExpiryAbsStrike surface
  const itm_call_abs = new JsonRisk.EquityOption({
    quote: "stock",
    disc_curve: "riskless",
    repo_curve: "riskless",
    surface: "surface_abs",
    spot_days: 0,
    strike: 90.0,
    is_call: true,
    expiry: expiry,
    q: dividend_yield,
  });

  const itm_value_abs = itm_call_abs.value(params_abs_atm);
  TestFramework.assert(
    itm_value_abs > atm_value_abs,
    `ExpiryAbsStrike surface ITM call: should be greater than ATM, got ${itm_value_abs.toFixed(4)} vs ATM ${atm_value_abs.toFixed(4)}`,
  );

  // Test that both surface types produce reasonable ATM values
  TestFramework.assert(
    atm_value_rel > 0 && atm_value_abs > 0,
    `Both ExpiryRelStrike and ExpiryAbsStrike surfaces should produce positive ATM values: rel=${atm_value_rel.toFixed(4)}, abs=${atm_value_abs.toFixed(4)}`,
  );

  // Test put options with ExpiryRelStrike surface
  const atm_put_rel = new JsonRisk.EquityOption({
    quote: "stock",
    disc_curve: "riskless",
    repo_curve: "riskless",
    surface: "surface_rel",
    spot_days: 0,
    strike: 100.0,
    is_call: false,
    expiry: expiry,
    q: dividend_yield,
  });

  const put_value_rel = atm_put_rel.value(params_rel_atm);
  TestFramework.assert(
    put_value_rel > 0 && put_value_rel < atm_value_rel,
    `ExpiryRelStrike surface ATM put: should be positive and less than ATM call, got ${put_value_rel.toFixed(4)}`,
  );

  // Test put options with ExpiryAbsStrike surface
  const atm_put_abs = new JsonRisk.EquityOption({
    quote: "stock",
    disc_curve: "riskless",
    repo_curve: "riskless",
    surface: "surface_abs",
    spot_days: 0,
    strike: 100.0,
    is_call: false,
    expiry: expiry,
    q: dividend_yield,
  });

  const put_value_abs = atm_put_abs.value(params_abs_atm);
  TestFramework.assert(
    put_value_abs > 0 && put_value_abs < atm_value_abs,
    `ExpiryAbsStrike surface ATM put: should be positive and less than ATM call, got ${put_value_abs.toFixed(4)}`,
  );

  // Test different expiry times with ExpiryRelStrike
  const short_expiry = JsonRisk.add_days(JsonRisk.valuation_date, 180);
  const short_call_rel = new JsonRisk.EquityOption({
    quote: "stock",
    disc_curve: "riskless",
    repo_curve: "riskless",
    surface: "surface_rel",
    spot_days: 0,
    strike: 100.0,
    is_call: true,
    expiry: short_expiry,
    q: dividend_yield,
  });

  const params_rel_short = new JsonRisk.Params({
    ...params_rel,
    surfaces: {
      surface_rel: {
        type: "expiry_rel_strike",
        expiries: [0.5, 1.0],
        moneyness: [-0.1, 0.0, 0.1],
        values: [
          [0.15, 0.17, 0.19],
          [0.18, 0.2, 0.22],
        ],
      },
    },
  });

  const short_value_rel = short_call_rel.value(params_rel_short);
  TestFramework.assert(
    short_value_rel > 0 && short_value_rel < atm_value_rel,
    `ExpiryRelStrike surface short expiry: should be positive and less than 1-year, got ${short_value_rel.toFixed(4)} vs 1Y ${atm_value_rel.toFixed(4)}`,
  );

  // Test scenarios on ExpiryRelStrike surface
  const option_json_rel = {
    type: "equity_option",
    quote: "stock",
    disc_curve: "riskless",
    repo_curve: "riskless",
    surface: "surface_rel_scen",
    spot_days: 0,
    strike: 100.0,
    is_call: true,
    expiry: expiry,
    q: dividend_yield,
  };

  const params_rel_scenarios = {
    valuation_date: JsonRisk.valuation_date,
    scalars: {
      stock: { value: spot },
    },
    curves: {
      riskless: {
        compounding: "Continuous",
        times: [1.0],
        zcs: [risk_free_rate],
      },
    },
    surfaces: {
      surface_rel_scen: {
        type: "expiry_rel_strike",
        expiries: [1.0],
        moneyness: [-0.1, 0.0, 0.1],
        values: [[0.18, 0.2, 0.22]],
      },
    },
    scenario_groups: [
      [
        {
          name: "UP_VOL",
          rules: [
            {
              model: "additive",
              risk_factors: ["surface_rel_scen"],
              labels_x: ["1.0Y"],
              labels_y: ["1.0Y"],
              values: [[0.05]],
            },
          ],
        },
      ],
    ],
  };

  // Test scenarios on ExpiryAbsStrike surface
  const option_json_abs = {
    type: "equity_option",
    quote: "stock",
    disc_curve: "riskless",
    repo_curve: "riskless",
    surface: "surface_abs_scen",
    spot_days: 0,
    strike: 100.0,
    is_call: true,
    expiry: expiry,
    q: dividend_yield,
  };

  const params_abs_scenarios = {
    valuation_date: JsonRisk.valuation_date,
    scalars: {
      stock: { value: spot },
    },
    curves: {
      riskless: {
        compounding: "Continuous",
        times: [1.0],
        zcs: [risk_free_rate],
      },
    },
    surfaces: {
      surface_abs_scen: {
        type: "expiry_abs_strike",
        expiries: [1.0],
        moneyness: [90.0, 100.0, 110.0],
        values: [[0.18, 0.2, 0.22]],
      },
    },
    scenario_groups: [
      [
        {
          name: "UP_VOL",
          rules: [
            {
              model: "additive",
              risk_factors: ["surface_abs_scen"],
              labels_x: ["1.0Y"],
              labels_y: ["1.0Y"],
              values: [[0.05]],
            },
          ],
        },
      ],
    ],
  };

  // Test ExpiryRelStrike surface with scenarios using vector_pricer
  const rel_scenario_values = JsonRisk.vector_pricer(
    option_json_rel,
    params_rel_scenarios,
  );
  TestFramework.assert(
    rel_scenario_values.length === 2,
    `ExpiryRelStrike surface scenarios: should have 2 scenario values, got ${rel_scenario_values.length}`,
  );
  TestFramework.assert(
    rel_scenario_values[0] > 0,
    `ExpiryRelStrike surface BASE scenario: should be positive, got ${rel_scenario_values[0]?.toFixed(4)}`,
  );
  console.log(
    `ExpiryRelStrike scenarios: BASE=${rel_scenario_values[0]?.toFixed(4)}, UP_VOL=${rel_scenario_values[1]?.toFixed(4)}`,
  );

  // Test ExpiryAbsStrike surface with scenarios using vector_pricer
  const abs_scenario_values = JsonRisk.vector_pricer(
    option_json_abs,
    params_abs_scenarios,
  );
  TestFramework.assert(
    abs_scenario_values.length === 2,
    `ExpiryAbsStrike surface scenarios: should have 2 scenario values, got ${abs_scenario_values.length}`,
  );
  TestFramework.assert(
    abs_scenario_values[0] > 0,
    `ExpiryAbsStrike surface BASE scenario: should be positive, got ${abs_scenario_values[0]?.toFixed(4)}`,
  );
  console.log(
    `ExpiryAbsStrike scenarios: BASE=${abs_scenario_values[0]?.toFixed(4)}, UP_VOL=${abs_scenario_values[1]?.toFixed(4)}`,
  );

  console.log(
    `ExpiryRelStrike ATM Call: ${atm_value_rel.toFixed(4)}, OTM Call: ${otm_value_rel.toFixed(4)}, ITM Call: ${itm_value_rel.toFixed(4)}, ATM Put: ${put_value_rel.toFixed(4)}`,
  );
  console.log(
    `ExpiryAbsStrike ATM Call: ${atm_value_abs.toFixed(4)}, OTM Call: ${otm_value_abs.toFixed(4)}, ITM Call: ${itm_value_abs.toFixed(4)}, ATM Put: ${put_value_abs.toFixed(4)}`,
  );
  console.log(`Short Expiry Rel: ${short_value_rel.toFixed(4)}`);
};
