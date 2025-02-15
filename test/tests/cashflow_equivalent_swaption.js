TEST_NAME = "Cashflow Equivalent Swaption";

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

    Test cashflow equivalent swaption generation

     */
  var expiries = [0, 6, 12, 18, 24, 36, 48, 60, 72, 96, 120];
  var months = [6, 12, 24, 48, 72, 120];
  var zcs = [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.007];
  var times = [1 / 12, 3 / 12, 6 / 12, 1, 2, 3, 4, 5];
  var first_exercise_date, swaption, swaption_internal, cfs, bond_internal;
  JsonRisk.valuation_date = TestFramework.get_utc_date(2000, 0, 17);
  curve = {
    times: times,
    zcs: zcs,
  };
  var surface = {
    type: "bachelier",
    expiries: [1, 2, 3],
    terms: [1, 2, 3, 4],
    values: [
      [0.01, 0.01, 0.02, 0.02],
      [0.02, 0.02, 0.03, 0.03],
      [0.03, 0.03, 0.04, 0.04],
    ],
  };
  for (i = 0; i < months.length; i++) {
    for (j = 0; j < expiries.length; j++) {
      first_exercise_date = JsonRisk.add_months(
        JsonRisk.valuation_date,
        expiries[j],
      );
      bond = {
        maturity: JsonRisk.add_months(
          JsonRisk.valuation_date,
          expiries[j] + months[i],
        ),
        notional: j % 2 ? 10000 : 1000000000000,
        fixed_rate: 0.02,
        tenor: 6,
        dcc: "act/365",
      };

      bond_internal = new JsonRisk.fixed_income(bond);
      p1 = bond_internal.present_value(curve, null);
      console.log(
        "JSON Risk bond price:                           " + p1.toFixed(3),
      );
      cfs = bond_internal.get_cash_flows();
      swaption = JsonRisk.create_equivalent_regular_swaption(
        cfs,
        first_exercise_date,
        bond,
      );
      p2 = JsonRisk.pricer_swaption(swaption, curve, curve, surface);
      console.log(
        "JSON Risk bond rate:                            " +
          bond.fixed_rate.toFixed(8),
      );
      console.log(
        "JSON Risk equivalent regular swaption strike:   " +
          swaption.fixed_rate.toFixed(8),
      );
      console.log(
        "JSON Risk bond maturity:                        " + bond.maturity,
      );
      console.log(
        "JSON Risk equivalent regular swaption maturity: " + swaption.maturity,
      );
      console.log(
        "JSON Risk equivalent regular swaption price:    " + p2.toFixed(3),
      );
      TestFramework.assert(
        swaption.maturity.getTime() === bond.maturity.getTime(),
        "Test equivalent swaption consistency for bullet bonds (maturity)",
      );
      TestFramework.assert(
        swaption.fixed_rate.toFixed(5) === bond.fixed_rate.toFixed(5),
        "Test equivalent swaption consistency for bullet bonds (rate)",
      );
      console.log("-----------------");
    }
  }
};
