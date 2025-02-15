TEST_NAME = "Bond Valuation";

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
  /*!


    Test bond Valuation

     */
  var curve = JsonRisk.get_const_curve(0.05);
  JsonRisk.valuation_date = TestFramework.get_utc_date(2000, 0, 17);
  var bond = {
    maturity: "2010-01-18",
    notional: 100,
    fixed_rate: 0.05,
    tenor: 12,
    bdc: "unadjusted",
  };
  console.log(JsonRisk.pricer_bond(bond, curve, null, null));

  TestFramework.assert(
    "105.0" === JsonRisk.pricer_bond(bond, curve, null, null).toFixed(1),
    "bond valuation (1)",
  );

  bond.settlement_days = 1;

  TestFramework.assert(
    "100.0" === JsonRisk.pricer_bond(bond, curve, null, null).toFixed(1),
    "bond valuation (2)",
  );

  bond.tenor = 6;
  TestFramework.assert(
    "100.5" === JsonRisk.pricer_bond(bond, curve, null, null).toFixed(1),
    "bond valuation (3)",
  );

  bond.tenor = 3;
  TestFramework.assert(
    "100.7" === JsonRisk.pricer_bond(bond, curve, null, null).toFixed(1),
    "bond valuation (4)",
  );

  //reale bundesanleihen, kurse und renditen vom 23.02.2018
  /*
    Kupon	Bez	Mat	        Kurs Clean	Rendite	Kurs Dirty
    1.750	Bund 14	15.02.2024	109.338	        0.18	109.396
    1.500	Bund 14	15.05.2024	107.930	        0.21	109.114
    1.000	Bund 14	15.08.2024	104.830	        0.25	105.367
    0.500	Bund 15	15.02.2025	101.263	        0.32	101.279
    1.000	Bund 15	15.08.2025	104.602	        0.37	105.139
    0.500	Bund 16	15.02.2026	100.474	        0.44	100.490
    4.250	Bund 07	04.07.2039	158.385	        1.15	161.156
    4.750	Bund 08	04.07.2040	170.090	        1.17	173.187
    3.250	Bund 10	04.07.2042	142.125	        1.24	144.244
    2.500	Bund 12	04.07.2044	126.970	        1.29	128.600
    2.500	Bund 14	15.08.2046	128.220	        1.31	129.562
    1.250	Bund 17	15.08.2048	97.695	        1.34	98.366
     */

  var Kupon = [1.75, 1.5, 1.0, 0.5, 1.0, 0.5, 4.25, 4.75, 3.25, 2.5, 2.5, 1.25];
  var Maturity = [
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
  var Kurs_Dirty = [
    109.396, 109.114, 105.367, 101.279, 105.139, 100.49, 161.156, 173.187,
    144.244, 128.6, 129.562, 98.366,
  ];
  var Rendite = [
    0.18, 0.21, 0.25, 0.32, 0.37, 0.44, 1.15, 1.17, 1.24, 1.29, 1.31, 1.34,
  ];

  JsonRisk.valuation_date = TestFramework.get_utc_date(2018, 1, 23);

  var bonds = [];
  for (i = 0; i < Kupon.length; i++) {
    bonds.push({
      maturity: Maturity[i],
      notional: 100.0,
      fixed_rate: Kupon[i] / 100,
      tenor: 12,
      bdc: "following",
      dcc: "act/act",
      calendar: "TARGET",
      settlement_days: 2,
    });
  }

  var pu, pd, i, r;
  var null_curve = JsonRisk.get_const_curve(0.0);
  //evaluate with yield curve
  for (i = 0; i < Kupon.length; i++) {
    r = Rendite[i] / 100;
    curve_down = JsonRisk.get_const_curve(r - 0.0001);
    curve_up = JsonRisk.get_const_curve(r + 0.0001);
    pu = JsonRisk.pricer_bond(bonds[i], curve_up, null, null);
    pd = JsonRisk.pricer_bond(bonds[i], curve_down, null, null);
    console.log(
      "JSON Risk Price one basis point cheaper:        " + pu.toFixed(3),
    );
    console.log(
      "Quote from www.bundesbank.de:                   " +
        Kurs_Dirty[i].toFixed(3),
    );
    console.log(
      "JSON Risk Price one basis point more expensive: " + pd.toFixed(3),
    );

    TestFramework.assert(
      pu < Kurs_Dirty[i] && Kurs_Dirty[i] < pd,
      "Bond Valuation (Real BUND Bonds using yield curve, " + (i + 1) + ")",
    );
  }
  //evaluate with spread curve
  for (i = 0; i < Kupon.length; i++) {
    r = Rendite[i] / 100;
    curve_down = JsonRisk.get_const_curve(r - 0.0001);
    curve_up = JsonRisk.get_const_curve(r + 0.0001);
    pu = JsonRisk.pricer_bond(bonds[i], null_curve, curve_up, null);
    pd = JsonRisk.pricer_bond(bonds[i], null_curve, curve_down, null);
    TestFramework.assert(
      pu < Kurs_Dirty[i] && Kurs_Dirty[i] < pd,
      "Bond Valuation (Real BUND Bonds using spread curve, " + (i + 1) + ")",
    );
  }

  //Real prices at interest payment date minus settlement days
  JsonRisk.valuation_date = TestFramework.get_utc_date(2018, 0, 2);

  Kupon = [3.75, 4.0];
  Maturity = ["04.01.2019", "04.01.2037"];
  Kurs_Dirty = [104.468, 152.42];
  Rendite = [-0.69, 0.97];

  bonds = [];
  for (i = 0; i < Kupon.length; i++) {
    bonds.push({
      maturity: Maturity[i],
      notional: 100.0,
      fixed_rate: Kupon[i] / 100,
      tenor: 12,
      bdc: "following",
      dcc: "act/act",
      calendar: "TARGET",
      settlement_days: 2,
    });
  }

  //evaluate with yield curve
  for (i = 0; i < Kupon.length; i++) {
    r = Rendite[i] / 100;
    curve_down = JsonRisk.get_const_curve(r - 0.0001);
    curve_up = JsonRisk.get_const_curve(r + 0.0001);
    pu = JsonRisk.pricer_bond(bonds[i], curve_up, null, null);
    pd = JsonRisk.pricer_bond(bonds[i], curve_down, null, null);
    console.log(
      "JSON Risk Price one basis point cheaper:        " + pu.toFixed(3),
    );
    console.log(
      "Quote from www.bundesbank.de:                   " +
        Kurs_Dirty[i].toFixed(3),
    );
    console.log(
      "JSON Risk Price one basis point more expensive: " + pd.toFixed(3),
    );

    TestFramework.assert(
      pu < Kurs_Dirty[i] && Kurs_Dirty[i] < pd,
      "Bond Valuation (Real BUND Bonds at interest payment date minus settlement days, " +
        (i + 1) +
        ")",
    );
  }

  //Real prices before interest payment date minus settlement
  JsonRisk.valuation_date = TestFramework.get_utc_date(2017, 11, 31);

  Kurs_Dirty = [108.23, 157.199];
  Rendite = [-0.7, 0.93];

  //evaluate with yield curve
  for (i = 0; i < Kupon.length; i++) {
    r = Rendite[i] / 100;
    curve_down = JsonRisk.get_const_curve(r - 0.0001);
    curve_up = JsonRisk.get_const_curve(r + 0.0001);
    pu = JsonRisk.pricer_bond(bonds[i], curve_up, null, null);
    pd = JsonRisk.pricer_bond(bonds[i], curve_down, null, null);
    console.log(
      "JSON Risk Price one basis point cheaper:        " + pu.toFixed(3),
    );
    console.log(
      "Quote from www.bundesbank.de:                   " +
        Kurs_Dirty[i].toFixed(3),
    );
    console.log(
      "JSON Risk Price one basis point more expensive: " + pd.toFixed(3),
    );

    TestFramework.assert(
      pu < Kurs_Dirty[i] && Kurs_Dirty[i] < pd,
      "Bond Valuation (Real BUND Bonds just before interest payment date minus settlement days, " +
        (i + 1) +
        ")",
    );
  }

  // test against simple reference price

  Kupon = [1.75, 1.5, 1.0, 0.5, 1.0, 0.5, 4.25, 4.75, 3.25, 2.5, 2.5, 1.25];
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

  var adj = function (d) {
    return JsonRisk.adjust(
      d,
      "following",
      JsonRisk.is_holiday_factory("TARGET"),
    );
  };
  JsonRisk.valuation_date = adj(TestFramework.get_utc_date(1900, 0, 1));

  var pv = 0,
    pv_ref = 0;
  //brief function to calculate bond pv at 10% discount
  var pv_func = function (mat, kup) {
    m = JsonRisk.get_safe_date(mat);
    var i = 1;
    var t = JsonRisk.time_from_now(m);
    var t_pay = JsonRisk.time_from_now(adj(m));
    var t_last = JsonRisk.time_from_now(JsonRisk.add_months(m, -i));
    var res = 100 * Math.pow(1.1, -t_pay);
    while (t_last > 0) {
      res += 100 * kup * (t - t_last) * Math.pow(1.1, -t_pay);
      i++;
      t = t_last;
      t_last = JsonRisk.time_from_now(JsonRisk.add_months(m, -i));
      t_pay = JsonRisk.time_from_now(adj(JsonRisk.add_months(m, -i + 1)));
    }

    t_last = 0;
    res += 100 * kup * (t - t_last) * Math.pow(1.1, -t_pay);
    return res;
  };
  //brief function to calculate bond pv at 10% discount, adjusted periods
  var pv_func_adj = function (mat, kup) {
    m = JsonRisk.get_safe_date(mat);
    var i = 1;
    var t = JsonRisk.time_from_now(adj(m));
    var t_last = JsonRisk.time_from_now(adj(JsonRisk.add_months(m, -i)));
    var res = 100 * Math.pow(1.1, -t);
    while (t_last > 0) {
      res += 100 * kup * (t - t_last) * Math.pow(1.1, -t);
      i++;
      t = t_last;
      t_last = JsonRisk.time_from_now(adj(JsonRisk.add_months(m, -i)));
    }

    t_last = 0;
    res += 100 * kup * (t - t_last) * Math.pow(1.1, -t);
    return res;
  };
  curve = JsonRisk.get_const_curve(0.1); // 10 percent discount
  for (i = 0; i < Kupon.length; i++) {
    bond = {
      effective_date: JsonRisk.valuation_date,
      maturity: Maturity[i],
      notional: 100.0,
      fixed_rate: Kupon[i] / 100,
      tenor: 1,
      bdc: "following",
      dcc: "act/365",
      calendar: "TARGET",
      adjust_accrual_periods: false,
    };

    //unadjusted periods
    pv = JsonRisk.pricer_bond(bond, curve, null, null);
    pv_ref = pv_func(Maturity[i], Kupon[i] / 100);
    console.log(
      "Bond without adjusted periods                 " + pv.toFixed(8),
    );
    console.log(
      "Bond without adjusted periods, reference price" + pv_ref.toFixed(8),
    );
    TestFramework.assert(
      pv.toFixed(8) === pv_ref.toFixed(8),
      "Bond Valuation against reference price, with unadjusted accrual periods (" +
        (i + 1) +
        ")",
    );

    //adjusted periods
    bond.adjust_accrual_periods = true;
    pv = JsonRisk.pricer_bond(bond, curve, null, null);
    pv_ref = pv_func_adj(Maturity[i], Kupon[i] / 100);
    console.log("Bond with adjusted periods                 " + pv.toFixed(8));
    console.log(
      "Bond with adjusted periods, reference price" + pv_ref.toFixed(8),
    );
    TestFramework.assert(
      pv.toFixed(8) === pv_ref.toFixed(8),
      "Bond Valuation against reference price, with adjusted accrual periods (" +
        (i + 1) +
        ")",
    );
  }

  //evaluate floaters
  Kupon = [1.75, 1.5, 1.0, 0.5, 1.0, 0.5, 4.25, 4.75, 3.25, 2.5, 2.5, 1.25];
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
  Kurs_Dirty = [
    109.396, 109.114, 105.367, 101.279, 105.139, 100.49, 161.156, 173.187,
    144.244, 128.6, 129.562, 98.366,
  ];
  Rendite = [
    0.18, 0.21, 0.25, 0.32, 0.37, 0.44, 1.15, 1.17, 1.24, 1.29, 1.31, 1.34,
  ];

  JsonRisk.valuation_date = TestFramework.get_utc_date(2018, 1, 23);
  var floaters = [];
  for (i = 0; i < Kupon.length; i++) {
    floaters.push({
      maturity: Maturity[i],
      notional: 100.0,
      float_spread: Kupon[i] / 100,
      float_current_rate: 0,
      tenor: 12,
      bdc: "following",
      dcc: "act/act",
      calendar: "TARGET",
      settlement_days: 2,
    });
  }
  var fwd_curve = JsonRisk.get_const_curve(0.0);

  for (i = 0; i < Kupon.length; i++) {
    r = Rendite[i] / 100;
    curve_down = JsonRisk.get_const_curve(r - 0.0001);
    curve_up = JsonRisk.get_const_curve(r + 0.0001);
    pu = JsonRisk.pricer_floater(floaters[i], curve_up, null, fwd_curve);
    pd = JsonRisk.pricer_floater(floaters[i], curve_down, null, fwd_curve);
    console.log(
      "JSON Risk Price one basis point cheaper:        " + pu.toFixed(3),
    );
    console.log(
      "Quote from www.bundesbank.de:                   " +
        Kurs_Dirty[i].toFixed(3),
    );
    console.log(
      "JSON Risk Price one basis point more expensive: " + pd.toFixed(3),
    );

    TestFramework.assert(
      pu < Kurs_Dirty[i] && Kurs_Dirty[i] < pd,
      "Floater Valuation (using constant forward curve with rate 0.0 and a positive float_spread, " +
        (i + 1) +
        ")",
    );
  }

  for (i = 0; i < Kupon.length; i++) {
    floaters[i].float_spread = 0;
    floaters[i].float_current_rate = Kupon[i] / 100;
    fwd_curve = JsonRisk.get_const_curve(Kupon[i] / 100);
    r = Rendite[i] / 100;
    curve_down = JsonRisk.get_const_curve(r - 0.0001);
    curve_up = JsonRisk.get_const_curve(r + 0.0001);
    pu = JsonRisk.pricer_floater(floaters[i], curve_up, null, fwd_curve);
    pd = JsonRisk.pricer_floater(floaters[i], curve_down, null, fwd_curve);
    console.log(
      "JSON Risk Price one basis point cheaper:        " + pu.toFixed(3),
    );
    console.log(
      "Quote from www.bundesbank.de:                   " +
        Kurs_Dirty[i].toFixed(3),
    );
    console.log(
      "JSON Risk Price one basis point more expensive: " + pd.toFixed(3),
    );
    TestFramework.assert(
      pu < Kurs_Dirty[i] && Kurs_Dirty[i] < pd,
      "Floater Valuation (using constant forward curve with rate reflecting Bund coupon and a zero float_spread, " +
        (i + 1) +
        ")",
    );
  }

  //evaluate swaps
  //self consistency tests: create swap with equal tenors and conventions on fix and float leg.
  // 1. create fixed curve for discount and forward
  // 2. evaluate swap
  // 3. evaluate with fix rate, forward curve and current float rate shifted 100 bp up
  // 4. prices should be essentially the same

  var months = [6, 12, 24, 48, 72, 120];
  var tenors = [1, 3, 6, 12];
  var times = [1 / 12, 3 / 12, 6 / 12, 1, 2, 3, 4, 5];
  var zcs = [0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.007];
  var zcs_up = [0.011, 0.012, 0.013, 0.014, 0.015, 0.016, 0.017, 0.017];
  curve = {
    times: times,
    zcs: zcs,
  };
  curve_up = {
    times: times,
    zcs: zcs_up,
  };
  var swap, swap_up;
  var p_up, p, p_diff;

  JsonRisk.valuation_date = TestFramework.get_utc_date(2018, 1, 23);
  for (i = 0; i < months.length; i++) {
    for (j = 0; j < tenors.length; j++) {
      swap = {
        is_payer: true,
        maturity: JsonRisk.add_months(JsonRisk.valuation_date, months[i]),
        notional: 10000,
        fixed_rate: 0.015,
        tenor: tenors[j],
        float_spread: 0.01,
        float_tenor: tenors[j],
        float_current_rate: -0.005,
        dcc: "30e/360",
        float_dcc: "30e/360",
      };
      swap_up = {
        is_payer: true,
        maturity: JsonRisk.add_months(JsonRisk.valuation_date, months[i]),
        notional: 10000,
        fixed_rate: swap.fixed_rate + 1 / 100,
        tenor: tenors[j],
        float_spread: 0.01,
        float_tenor: tenors[j],
        float_current_rate: swap.float_current_rate + 1 / 100,
        dcc: "30e/360",
        float_dcc: "30e/360",
      };
      p = JsonRisk.pricer_swap(swap, curve, curve);
      p_up = JsonRisk.pricer_swap(swap_up, curve, curve_up);
      p_diff = Math.abs(p - p_up);
      console.log("JSON Risk swap price:               " + p.toFixed(3));
      console.log("JSON Risk swap price with rates up: " + p_up.toFixed(3));
      TestFramework.assert(
        p_diff < months[i] / 12,
        "Swap Valuation (" + (i * tenors.length + (j + 1)) + ")",
      );
    }
  }
};
