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
  const Repay_Tenor = [1, 3, 6, 6, 12];
  const Tenor = [1, 3, 6, 6, 12, 12];
  const IntCap = [true, false];
  const Repay_Stub_Days = [1, 2, 3, 4, 5, 10, 15, 30];
  bonds = [];
  JsonRisk.set_valuation_date("2017/11/30");
  const params_json = {
    valuation_date: JsonRisk.valuation_date,
    curves: {
      curve: { times: [1], zcs: [0] },
      steep_curve: {
        times: [1, 2, 3, 5],
        dfs: [0.95, 0.91, 0.86, 0.78],
      },
      spread_curve: { times: [1], zcs: [0.05] },
    },
    scenario_groups: [
      [
        {
          name: "UP",
          rules: [
            {
              model: "additive",
              risk_factors: ["curve"],
              labels_x: ["1Y"],
              labels_y: ["1Y"],
              values: [[0.0001]],
            },
          ],
        },
        {
          name: "DOWN",
          rules: [
            {
              model: "additive",
              risk_factors: ["curve"],
              labels_x: ["1Y"],
              labels_y: ["1Y"],
              values: [[-0.0001]],
            },
          ],
        },
      ],
    ],
  };

  const setBaseRateLevel = function (rate) {
    params_json.curves.curve.zcs[0] = rate;
  };

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
  Coupon = [1.75, 1.5, 1.0, 0.5, 1.0, 0.5, 4.25, 4.75, 3.25, 2.5, 2.5, 1.25];

  for (i = 0; i < 400; i++) {
    bonds.push({
      type: "bond",
      effective_date: JsonRisk.valuation_date,
      maturity: Maturity[i % Maturity.length],
      notional: 100.0,
      fixed_rate: Coupon[i % Coupon.length] / 100,
      tenor: Tenor[i % Tenor.length], //(1+c*t/12)^(12/t)=1+c0
      repay_tenor: Repay_Tenor[i % Repay_Tenor.length],
      repay_next_to_last_date: JsonRisk.add_days(
        JsonRisk.date_or_null(Maturity[i % Maturity.length]),
        -Repay_Stub_Days[i % Repay_Stub_Days.length],
      ),
      bdc: "unadjusted",
      dcc: "act/365",
      repay_amount:
        ((Repay_Total[i % Repay_Total.length] / 12) *
          Repay_Tenor[i % Repay_Tenor.length]) /
        JsonRisk.time_from_now(
          JsonRisk.date_or_null(Maturity[i % Maturity.length]),
        ),
      interest_capitalization: IntCap[i % IntCap.length],
      disc_curve: "curve",
    });
    //discount curves are always annual compounding act/365, so we need to adjust the rate according to the tenor in order to arrive at a par valuation
    discount_rate =
      Math.pow(
        1 + ((Coupon[i % Coupon.length] / 100) * Tenor[i % Tenor.length]) / 12,
        12 / Tenor[i % Tenor.length],
      ) - 1;
    setBaseRateLevel(discount_rate);

    let [base, pUp, pDown] = JsonRisk.vector_pricer(bonds[i], params_json);
    console.log(
      "JSON Risk irregular bond price discounted at coupon rate minus one basis point (" +
        (i + 1) +
        "): " +
        pDown.toFixed(3),
    );

    console.log(
      "JSON Risk irregular bond price discounted at coupon rate plus one basis point (" +
        (i + 1) +
        "): " +
        pUp.toFixed(3),
    );
    TestFramework.assert(
      pDown > 100 && pUp < 100,
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
        1 + ((Coupon[i % Coupon.length] / 100) * Tenor[i % Tenor.length]) / 12,
        12 / Tenor[i % Tenor.length],
      ) - 1;

    setBaseRateLevel(discount_rate);

    let [base, pUp, pDown] = JsonRisk.vector_pricer(bonds[i], params_json);
    console.log(
      "JSON Risk irregular bond price discounted at coupon rate minus one basis point (" +
        (i + 1) +
        "): " +
        pDown.toFixed(3),
    );

    console.log(
      "JSON Risk irregular bond price discounted at coupon rate plus one basis point (" +
        (i + 1) +
        "): " +
        pUp.toFixed(3),
    );
    TestFramework.assert(
      pDown > 100 && pUp < 100,
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
        1 + ((Coupon[i % Coupon.length] / 100) * Tenor[i % Tenor.length]) / 12,
        12 / Tenor[i % Tenor.length],
      ) - 1;

    setBaseRateLevel(discount_rate);

    let [base, pUp, pDown] = JsonRisk.vector_pricer(bonds[i], params_json);
    console.log(
      "JSON Risk irregular bond price discounted at coupon rate minus one basis point (" +
        (i + 1) +
        "): " +
        pDown.toFixed(3),
    );

    console.log(
      "JSON Risk irregular bond price discounted at coupon rate plus one basis point (" +
        (i + 1) +
        "): " +
        pUp.toFixed(3),
    );
    TestFramework.assert(
      pDown > 100 && pUp < 100,
      "Irregular bond valuation with changing repay amounts (" + (i + 1) + ").",
    );
  }

  // test margins. Bond with margin should have the same principal cashflow as the same bond without margin
  var res = 0;
  for (i = 0; i < 400; i++) {
    let bond = new JsonRisk.Bond(bonds[i]);
    p1 = bond.legs[0].get_cash_flows().pmt_principal;
    bonds[i].excl_margin = 0.00125;
    bond = new JsonRisk.Bond(bonds[i]);
    p2 = bond.legs[0].get_cash_flows().pmt_principal;
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
  for (i = 0; i < 400; i++) {
    bonds.push({
      effective_date: JsonRisk.valuation_date,
      maturity: Maturity[i % Maturity.length],
      notional: 100.0,
      fixed_rate: Coupon[i % Coupon.length] / 100,
      tenor: Tenor[i % Tenor.length], //(1+c*t/12)^(12/t)=1+c0
      repay_tenor: Repay_Tenor[i % Repay_Tenor.length],
      repay_next_to_last_date: JsonRisk.add_days(
        JsonRisk.date_or_null(Maturity[i % Maturity.length]),
        -Repay_Stub_Days[i % Repay_Stub_Days.length],
      ),
      bdc: "following",
      calendar: "TARGET",
      dcc: "act/365",
      repay_amount:
        ((Repay_Total[i % Repay_Total.length] / 12) *
          Repay_Tenor[i % Repay_Tenor.length]) /
        JsonRisk.time_from_now(
          JsonRisk.date_or_null(Maturity[i % Maturity.length]),
        ),
      interest_capitalization: false, //test can only work for non-capitalising instruments. For capitalising instruments, changing the rate would change the notional structure.
      disc_curve: "steep_curve",
      spread_curve: "spread_curve",
    });

    //fix rate
    const params = new JsonRisk.Params(params_json);
    let r = new JsonRisk.Bond(bonds[i]).fair_rate_or_spread(params);

    bonds[i].fixed_rate = r;
    let p1 = new JsonRisk.Bond(bonds[i]).value(params);
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
    bonds[i].fwd_curve = "steep_curve";
    r = new JsonRisk.Floater(bonds[i]).fair_rate_or_spread(params);

    bonds[i].float_spread = r;
    p1 = new JsonRisk.Floater(bonds[i]).value(params);
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

  // Test bonds and floaters do not overpay, even with capitalization
  const effective_date = JsonRisk.date_or_throw("2025-01-01");
  const final_maturity = JsonRisk.date_or_throw("2027-01-01");
  const expected_end = JsonRisk.date_or_throw("2026-02-01");
  const overpayers = [
    {
      // fixed rate, no capitalization
      type: "Bond",
      effective_date: effective_date,
      maturity: final_maturity,
      notional: 120,
      repay_amount: 10, // should pay off after one year
      tenor: 1,
      fixed_rate: 0.03,
      calendar: "TARGET",
      bdc: "f",
    },
    {
      // fixed rate, extreme negative capitalization, should not overpay anyway
      type: "Bond",
      effective_date: effective_date,
      maturity: final_maturity,
      notional: 120,
      repay_amount: 10, // should pay off after one year
      tenor: 1,
      fixed_rate: -0.5, // 50%
      interest_capitalization: true,
      calendar: "TARGET",
      bdc: "f",
    },
    {
      // fixed rate, extreme negative capitalization, irregular schedule, should not overpay anyway
      type: "Bond",
      effective_date: effective_date,
      maturity: final_maturity,
      notional: 120,
      repay_amount: 10, // should pay off after one year
      tenor: 12,
      repay_tenor: 1,
      interest_capitalization: true,
      fixed_rate: -0.5, // 50%
      calendar: "TARGET",
      bdc: "f",
    },
    {
      // fame with negative notionals, should not overpay anyway
      type: "Bond",
      effective_date: effective_date,
      maturity: final_maturity,
      notional: -120,
      repay_amount: 10, // should pay off after one year
      tenor: 12,
      repay_tenor: 1,
      interest_capitalization: true,
      fixed_rate: -0.5, // 50%
      calendar: "TARGET",
      bdc: "f",
    },
    {
      // float rate, no capitalization
      type: "Floater",
      effective_date: effective_date,
      maturity: final_maturity,
      notional: 120,
      repay_amount: 10, // should pay off after one year
      tenor: 1,
      float_current_rate: 0.0,
      float_spread: 0.03,
      calendar: "TARGET",
      bdc: "f",
    },
    {
      // float rate, extreme negative capitalization, should not overpay anyway
      type: "Floater",
      effective_date: effective_date,
      maturity: final_maturity,
      notional: 120,
      repay_amount: 10, // should pay off after one year
      tenor: 1,
      interest_capitalization: true,
      float_current_rate: 0.0,
      float_spread: -0.5, // 50%
      calendar: "TARGET",
      bdc: "f",
    },
    {
      // float rate, extreme negative capitalization, irregular schedule, should not overpay anyway
      type: "Floater",
      effective_date: effective_date,
      maturity: final_maturity,
      notional: 120,
      repay_amount: 10, // should pay off after one year
      tenor: 12,
      repay_tenor: 1,
      interest_capitalization: true,
      float_current_rate: 0.0,
      float_spread: -0.5, // 50%
      calendar: "TARGET",
      bdc: "f",
    },
    {
      // same with negative notionals, should not overpay anyway
      type: "Floater",
      effective_date: effective_date,
      maturity: final_maturity,
      notional: -120,
      repay_amount: 10, // should pay off after one year
      tenor: 12,
      repay_tenor: 1,
      interest_capitalization: true,
      float_current_rate: 0.0,
      float_spread: -0.5, // 50%
      calendar: "TARGET",
      bdc: "f",
    },
  ];

  for (const o of overpayers) {
    const instrument = JsonRisk.make_instrument(o);
    const initial_balance = o.notional;
    const payments = instrument.legs[0].payments;
    for (const p of payments) {
      // all payments after expected end must have zero notionals and amounts
      if (p.date_value.getTime() > expected_end.getTime()) {
        TestFramework.assert(
          p.notional === 0,
          "Amortizing Bonds must not overpay",
        );
        TestFramework.assert(
          p.amount === 0,
          "Amortizing Bonds must not overpay",
        );
      }

      // regardless of the value date, rate payments must have a valid notional that has the same sign as the initial notional
      if (p.constructor === JsonRisk.NotionalPayment) continue;
      console.log("Notional: " + p.notional);
      TestFramework.assert(
        p.notional * o.notional >= 0,
        "Amortizing Bonds must not overpay",
      );
    }
  }
};
