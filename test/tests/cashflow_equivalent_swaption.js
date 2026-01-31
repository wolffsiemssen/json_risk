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
  JsonRisk.set_valuation_date("17.01.2000");
  const params = {
    valuation_date: TestFramework.get_utc_date(2000, 0, 17),
    curves: {
      curve: {
        times: [1 / 12, 3 / 12, 6 / 12, 1, 2, 3, 4, 5],
        zcs: [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.007],
      },
    },
    surfaces: {
      surface: {
        type: "bachelier",
        expiries: [1, 2, 3],
        terms: [1, 2, 3, 4],
        values: [
          [0.01, 0.01, 0.02, 0.02],
          [0.02, 0.02, 0.03, 0.03],
          [0.03, 0.03, 0.04, 0.04],
        ],
      },
    },
  };

  var expiries = [0, 6, 12, 18, 24, 36, 48, 60, 72, 96, 120];
  var months = [6, 12, 24, 48, 72, 120];
  for (i = 0; i < months.length; i++) {
    for (j = 0; j < expiries.length; j++) {
      const first_exercise_date = JsonRisk.add_months(
        JsonRisk.valuation_date,
        expiries[j],
      );
      const bond_rate = 0.02;
      const bond_maturity = JsonRisk.add_months(
        JsonRisk.valuation_date,
        expiries[j] + months[i],
      );
      const bond = new JsonRisk.Bond({
        maturity: bond_maturity,
        notional: 10000000,
        fixed_rate: bond_rate,
        tenor: 6,
        dcc: "act/365",
        disc_curve: "curve",
      });

      const p1 = bond.value(params);
      console.log(
        "JSON Risk bond price:                           " + p1.toFixed(3),
      );
      const leg = bond.legs[0];
      let swaption = JsonRisk.create_equivalent_regular_swaption(
        leg,
        first_exercise_date,
        bond,
      );
      swaption_strike = swaption.fixed_rate;
      swaption_maturity = swaption.maturity;

      swaption.disc_curve = "curve";
      swaption.fwd_curve = "curve";
      swaption.surface = "surface";
      swaption = new JsonRisk.Swaption(swaption);
      p2 = swaption.value(params);
      console.log(
        "JSON Risk bond rate:                            " +
          bond_rate.toFixed(8),
      );
      console.log(
        "JSON Risk equivalent regular swaption strike:   " +
          swaption_strike.toFixed(8),
      );
      console.log(
        "JSON Risk bond maturity:                        " + bond_maturity,
      );
      console.log(
        "JSON Risk equivalent regular swaption maturity: " + swaption_maturity,
      );
      console.log(
        "JSON Risk equivalent regular swaption price:    " + p2.toFixed(3),
      );
      TestFramework.assert(
        swaption_maturity.getTime() === bond_maturity.getTime(),
        "Test equivalent swaption consistency for bullet bonds (maturity)",
      );
      TestFramework.assert(
        swaption_strike.toFixed(5) === bond_rate.toFixed(5),
        "Test equivalent swaption consistency for bullet bonds (rate)",
      );
      console.log("-----------------");
    }
  }
};
