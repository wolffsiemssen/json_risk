TEST_NAME = "Irregular Bonds";

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

    Test irregular bonds

     */

  //test irregular bonds by checking that, regardless of the amortisation used, a bond with coupon r, when discounted at r, always values at par.

  var Repay_Total = [30, 70, 100];
  var Repay_Tenor = [1, 3, 6, 6, 12];
  var Tenor = [1, 3, 6, 6, 12, 12];
  var IntCap = [true, false];
  var Repay_Stub_Days = [1, 2, 3, 4, 5, 10, 15, 30];
  bonds = [];
  JsonRisk.valuation_date = TestFramework.get_utc_date(2017, 10, 30);
  var discount_rate;

  Maturity = [
    "15.02.2024",
    "15.05.2024",
    "15.08.2024",
    "15.02.2025",
    "15.08.2025",
    "15.02.2026",
    "04.07.2039",
    "04.07.2040",
    "04.07.2042",
    "04.07.2044",
    "15.08.2046",
    "15.08.2048",
  ];
  Kupon = [1.75, 1.5, 1.0, 0.5, 1.0, 0.5, 4.25, 4.75, 3.25, 2.5, 2.5, 1.25];

  for (i = 0; i < 400; i++) {
    bonds.push({
      effective_date: JsonRisk.valuation_date,
      maturity: Maturity[i % Maturity.length],
      notional: 100.0,
      fixed_rate: Kupon[i % Kupon.length] / 100,
      tenor: Tenor[i % Tenor.length], //(1+c*t/12)^(12/t)=1+c0
      repay_tenor: Repay_Tenor[i % Repay_Tenor.length],
      repay_next_to_last_date: JsonRisk.add_days(
        JsonRisk.get_safe_date(Maturity[i % Maturity.length]),
        -Repay_Stub_Days[i % Repay_Stub_Days.length],
      ),
      bdc: "unadjusted",
      dcc: "act/365",
      repay_amount:
        ((Repay_Total[i % Repay_Total.length] / 12) *
          Repay_Tenor[i % Repay_Tenor.length]) /
        JsonRisk.time_from_now(
          JsonRisk.get_safe_date(Maturity[i % Maturity.length]),
        ),
      interest_capitalization: IntCap[i % IntCap.length],
    });
    //discount curves are always annual compounding act/365, so we need to adjust the rate according to the tenor in order to arrive at a par valuation
    discount_rate =
      Math.pow(
        1 + ((Kupon[i % Kupon.length] / 100) * Tenor[i % Tenor.length]) / 12,
        12 / Tenor[i % Tenor.length],
      ) - 1;

    bond_internal = new JsonRisk.fixed_income(bonds[i]);
    p1 = bond_internal.present_value({
      times: [1],
      zcs: [discount_rate - 0.0001],
    });
    console.log(
      "JSON Risk irregular bond price discounted at coupon rate minus one basis point (" +
        (i + 1) +
        "): " +
        p1.toFixed(3),
    );

    p2 = bond_internal.present_value({
      times: [1],
      zcs: [discount_rate + 0.0001],
    });
    console.log(
      "JSON Risk irregular bond price discounted at coupon rate plus one basis point (" +
        (i + 1) +
        "): " +
        p2.toFixed(3),
    );
    TestFramework.assert(
      p1 > 100 && p2 < 100,
      "Irregular bond valuation for amortising bonds (" + (i + 1) + ").",
    );
  }

  // test changing repay amounts
  for (i = 0; i < 400; i++) {
    //repay amount as string with two space separated entries
    bonds[i].repay_amount =
      "" + bonds[i].repay_amount + " " + bonds[i].repay_amount * 0.9;
    //condition array as string with two space separated entries
    bonds[i].conditions_valid_until = "2020/01/01 " + bonds[i].maturity;
    //discount curves are always annual compounding act/365, so we need to adjust the rate according to the tenor in order to arrive at a par valuation
    discount_rate =
      Math.pow(
        1 + ((Kupon[i % Kupon.length] / 100) * Tenor[i % Tenor.length]) / 12,
        12 / Tenor[i % Tenor.length],
      ) - 1;

    bond_internal = new JsonRisk.fixed_income(bonds[i]);
    p1 = bond_internal.present_value({
      times: [1],
      zcs: [discount_rate - 0.0001],
    });
    console.log(
      "JSON Risk irregular bond price discounted at coupon rate minus one basis point (" +
        (i + 1) +
        "): " +
        p1.toFixed(3),
    );

    p2 = bond_internal.present_value({
      times: [1],
      zcs: [discount_rate + 0.0001],
    });
    console.log(
      "JSON Risk irregular bond price discounted at coupon rate plus one basis point (" +
        (i + 1) +
        "): " +
        p2.toFixed(3),
    );
    TestFramework.assert(
      p1 > 100 && p2 < 100,
      "Irregular bond valuation with changing repay amounts (" + (i + 1) + ").",
    );
  }

  // additionally, test changing interest rates with different syntaxes
  for (i = 0; i < 400; i++) {
    //fixed rate as string with two space separated entries, second entry expressed as percentage
    bonds[i].fixed_rate =
      "" +
      (bonds[i].fixed_rate - 0.0001) +
      " " +
      (bonds[i].fixed_rate * 100 + 0.01) +
      "%";
    //discount curves are always annual compounding act/365, so we need to adjust the rate according to the tenor in order to arrive at a par valuation
    discount_rate =
      Math.pow(
        1 + ((Kupon[i % Kupon.length] / 100) * Tenor[i % Tenor.length]) / 12,
        12 / Tenor[i % Tenor.length],
      ) - 1;

    bond_internal = new JsonRisk.fixed_income(bonds[i]);
    p1 = bond_internal.present_value({
      times: [1],
      zcs: [discount_rate - 0.0001],
    });
    console.log(
      "JSON Risk irregular bond price discounted at coupon rate minus one basis point (" +
        (i + 1) +
        "): " +
        p1.toFixed(3),
    );

    p2 = bond_internal.present_value({
      times: [1],
      zcs: [discount_rate + 0.0001],
    });
    console.log(
      "JSON Risk irregular bond price discounted at coupon rate plus one basis point (" +
        (i + 1) +
        "): " +
        p2.toFixed(3),
    );
    TestFramework.assert(
      p1 > 100 && p2 < 100,
      "Irregular bond valuation with changing repay amounts (" + (i + 1) + ").",
    );
  }

  // test margins. Bond with margin should have the same principal cashflow as the same bond without margin
  var res = 0;
  for (i = 0; i < 400; i++) {
    bond_internal = new JsonRisk.fixed_income(bonds[i]);
    p1 = bond_internal.get_cash_flows().pmt_principal;
    bonds[i].excl_margin = 0.00125;
    bond_internal = new JsonRisk.fixed_income(bonds[i]);
    p2 = bond_internal.get_cash_flows().pmt_principal;
    for (var j = 0; j < p1.length; j++) {
      res += Math.abs(p2[j] - p1[j]);
    }
    TestFramework.assert(
      res < 0.001,
      "Irregular bond valuation with margin (" + (i + 1) + ").",
    );
  }

  // test fair rate derivation for all kinds of amortizing bonds

  bonds = [];
  times = [1, 2, 3, 5];
  dfs = [0.95, 0.91, 0.86, 0.78];
  curve = {
    times: times,
    dfs: dfs,
  };
  var spread_curve = {
    times: [1],
    zcs: [0.05],
  };
  var r;
  for (i = 0; i < 400; i++) {
    bonds.push({
      effective_date: JsonRisk.valuation_date,
      maturity: Maturity[i % Maturity.length],
      notional: 100.0,
      fixed_rate: Kupon[i % Kupon.length] / 100,
      tenor: Tenor[i % Tenor.length], //(1+c*t/12)^(12/t)=1+c0
      repay_tenor: Repay_Tenor[i % Repay_Tenor.length],
      repay_next_to_last_date: JsonRisk.add_days(
        JsonRisk.get_safe_date(Maturity[i % Maturity.length]),
        -Repay_Stub_Days[i % Repay_Stub_Days.length],
      ),
      bdc: "following",
      calendar: "TARGET",
      dcc: "act/365",
      repay_amount:
        ((Repay_Total[i % Repay_Total.length] / 12) *
          Repay_Tenor[i % Repay_Tenor.length]) /
        JsonRisk.time_from_now(
          JsonRisk.get_safe_date(Maturity[i % Maturity.length]),
        ),
      interest_capitalization: false, //test can only work for non-capitalising instruments. For capitalising instruments, changing the rate would change the notional structure.
    });

    //fix rate
    bond_internal = new JsonRisk.fixed_income(bonds[i]);
    r = bond_internal.fair_rate_or_spread(curve, spread_curve, null);

    bonds[i].fixed_rate = r;
    bond_internal = new JsonRisk.fixed_income(bonds[i]);
    p1 = bond_internal.present_value(curve, spread_curve);
    console.log(
      "JSON Risk irregular bond fair rate        (" +
        (i + 1) +
        "): " +
        (100 * r).toFixed(4) +
        "%",
    );
    console.log(
      "JSON Risk price at fair rate              (" +
        (i + 1) +
        "): " +
        p1.toFixed(4),
    );
    TestFramework.assert(
      p1.toFixed(3) === "100.000",
      "Fair rate derivation for amortising fixed rate bonds (" + (i + 1) + ").",
    );

    //floater
    bonds[i].fixed_rate = null;
    bonds[i].float_current_rate = 0;
    bonds[i].float_spread = 0;
    bond_internal = new JsonRisk.fixed_income(bonds[i]);
    r = bond_internal.fair_rate_or_spread(curve, spread_curve, curve);

    bonds[i].float_spread = r;
    bond_internal = new JsonRisk.fixed_income(bonds[i]);
    p1 = bond_internal.present_value(curve, spread_curve, curve);
    console.log(
      "JSON Risk irregular floater fair spread        (" +
        (i + 1) +
        "): " +
        (100 * r).toFixed(4) +
        "%",
    );
    console.log(
      "JSON Risk price at fair spread                 (" +
        (i + 1) +
        "): " +
        p1.toFixed(4),
    );
    TestFramework.assert(
      p1.toFixed(3) === "100.000",
      "Fair spread derivation for amortising float rate bonds (" +
        (i + 1) +
        ").",
    );
  }
};
