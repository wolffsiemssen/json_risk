TEST_NAME = "Year Fraction";

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

    Test Year Fraction

     */
  var from;
  var to;
  var yf;
  var i;
  yf = JsonRisk.year_fraction_factory("a/365");
  for (i = 1; i < 11; i++) {
    from = TestFramework.get_utc_date(2000 + i, 2 * i, 3 * i);
    to = JsonRisk.add_days(from, i * i);
    TestFramework.assert(
      (yf(from, to) * 365).toFixed(10) === (i * i).toFixed(10),
      "Act/365 year fraction (" + i + ")",
    );
  }

  yf = JsonRisk.year_fraction_factory("a/360");
  for (i = 1; i < 11; i++) {
    from = TestFramework.get_utc_date(2000 + i, 2 * i, 3 * i);
    to = JsonRisk.add_days(from, i * i);
    TestFramework.assert(
      (yf(from, to) * 360).toFixed(10) === (i * i).toFixed(10),
      "Act/360 year fraction (" + i + ")",
    );
  }

  yf = JsonRisk.year_fraction_factory("30U/360");
  from = TestFramework.get_utc_date(2000, 0, 1);
  to = TestFramework.get_utc_date(2001, 0, 1);
  TestFramework.assert(
    yf(from, to).toFixed(10) === (1).toFixed(10),
    "30U/360 year fraction (1)",
  );

  from = TestFramework.get_utc_date(2010, 7, 1);
  to = TestFramework.get_utc_date(2020, 7, 1);
  TestFramework.assert(
    yf(from, to).toFixed(10) === (10).toFixed(10),
    "30U/360 year fraction (2)",
  );

  from = TestFramework.get_utc_date(2000, 0, 31); //day will be set to 30
  to = TestFramework.get_utc_date(2001, 0, 30);
  TestFramework.assert(
    yf(from, to).toFixed(10) === (1).toFixed(10),
    "30U/360 year fraction (3)",
  );

  from = TestFramework.get_utc_date(2000, 0, 30);
  to = TestFramework.get_utc_date(2001, 0, 31); //day will be set to 30
  TestFramework.assert(
    yf(from, to).toFixed(10) === (1).toFixed(10),
    "30U/360 year fraction (4)",
  );

  from = TestFramework.get_utc_date(2000, 1, 28); //day will not be set to 30
  to = TestFramework.get_utc_date(2010, 1, 28); //day will not be set to 30
  TestFramework.assert(
    yf(from, to).toFixed(10) === (10).toFixed(10),
    "30U/360 year fraction (5)",
  );

  from = TestFramework.get_utc_date(2000, 0, 29);
  to = TestFramework.get_utc_date(2001, 0, 31); //day will not set to 30 since start day is less than 30
  TestFramework.assert(
    yf(from, to).toFixed(10) === (1 + 2 / 360).toFixed(10),
    "30U/360 year fraction (6)",
  );

  yf = JsonRisk.year_fraction_factory("30E/360");
  from = TestFramework.get_utc_date(2000, 0, 1);
  to = TestFramework.get_utc_date(2001, 0, 1);
  TestFramework.assert(
    yf(from, to).toFixed(10) === (1).toFixed(10),
    "30E/360 year fraction (1)",
  );

  from = TestFramework.get_utc_date(2010, 7, 1);
  to = TestFramework.get_utc_date(2020, 7, 1);
  TestFramework.assert(
    yf(from, to).toFixed(10) === (10).toFixed(10),
    "30E/360 year fraction (2)",
  );

  from = TestFramework.get_utc_date(2000, 0, 31); //day will be set to 30
  to = TestFramework.get_utc_date(2001, 0, 30);
  TestFramework.assert(
    yf(from, to).toFixed(10) === (1).toFixed(10),
    "30E/360 year fraction (3)",
  );

  from = TestFramework.get_utc_date(2000, 0, 30);
  to = TestFramework.get_utc_date(2001, 0, 31); //day will be set to 30
  TestFramework.assert(
    yf(from, to).toFixed(10) === (1).toFixed(10),
    "30E/360 year fraction (4)",
  );

  from = TestFramework.get_utc_date(2000, 1, 28); //day will not be set to 30
  to = TestFramework.get_utc_date(2010, 1, 28); //day will not be set to 30
  TestFramework.assert(
    yf(from, to).toFixed(10) === (10).toFixed(10),
    "30E/360 year fraction (5)",
  );

  from = TestFramework.get_utc_date(2000, 1, 29); //day will not be set to 30
  to = TestFramework.get_utc_date(2010, 1, 28); //day will not be set to 30
  TestFramework.assert(
    yf(from, to).toFixed(10) === (10 - 1 / 360).toFixed(10),
    "30E/360 year fraction (6)",
  );

  yf = JsonRisk.year_fraction_factory("30G/360");
  from = TestFramework.get_utc_date(2000, 0, 1);
  to = TestFramework.get_utc_date(2001, 0, 1);
  TestFramework.assert(
    yf(from, to).toFixed(10) === (1).toFixed(10),
    "30G/360 year fraction (1)",
  );

  from = TestFramework.get_utc_date(2010, 7, 1);
  to = TestFramework.get_utc_date(2020, 7, 1);
  TestFramework.assert(
    yf(from, to).toFixed(10) === (10).toFixed(10),
    "30G/360 year fraction (2)",
  );

  from = TestFramework.get_utc_date(2000, 0, 31); //day will be set to 30
  to = TestFramework.get_utc_date(2001, 0, 30);
  TestFramework.assert(
    yf(from, to).toFixed(10) === (1).toFixed(10),
    "30G/360 year fraction (3)",
  );

  from = TestFramework.get_utc_date(2000, 0, 30);
  to = TestFramework.get_utc_date(2001, 0, 31); //day will be set to 30
  TestFramework.assert(
    yf(from, to).toFixed(10) === (1).toFixed(10),
    "30G/360 year fraction (4)",
  );

  from = TestFramework.get_utc_date(2000, 1, 29); //day will be set to 30
  to = TestFramework.get_utc_date(2010, 1, 28); //day will be set to 30
  TestFramework.assert(
    yf(from, to).toFixed(10) === (10).toFixed(10),
    "30G/360 year fraction (5)",
  );

  from = TestFramework.get_utc_date(2000, 1, 28); //day will not be set to 30 since not the last day in feb
  to = TestFramework.get_utc_date(2010, 1, 28); //day will be set to 30
  TestFramework.assert(
    yf(from, to).toFixed(10) === (10 + 2 / 360).toFixed(10),
    "30G/360 year fraction (6)",
  );

  yf = JsonRisk.year_fraction_factory("act/act");
  from = TestFramework.get_utc_date(2010, 11, 30);
  to = TestFramework.get_utc_date(2011, 0, 2);
  TestFramework.assert(
    yf(from, to).toFixed(10) === (3 / 365).toFixed(10),
    "act/act year fraction (1)",
  );

  from = TestFramework.get_utc_date(2011, 11, 30);
  to = TestFramework.get_utc_date(2012, 0, 2);
  TestFramework.assert(
    yf(from, to).toFixed(10) === (2 / 365 + 1 / 366).toFixed(10),
    "act/act year fraction (2)",
  );

  from = TestFramework.get_utc_date(2010, 11, 30);
  to = TestFramework.get_utc_date(2013, 0, 2);
  TestFramework.assert(
    yf(from, to).toFixed(10) === (367 / 365 + 1 + 1 / 365).toFixed(10),
    "act/act year fraction (3)",
  );

  from = TestFramework.get_utc_date(2010, 3, 30);
  to = TestFramework.get_utc_date(2010, 9, 30);
  TestFramework.assert(
    yf(from, to).toFixed(10) === (183 / 365).toFixed(10),
    "act/act year fraction (4)",
  );

  yf = JsonRisk.year_fraction_factory("act/actAFB");
  for (const m of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    from = TestFramework.get_utc_date(2020, m, 25);
    to = JsonRisk.add_days(from, 40);
    const leap_period = m === 0 || m === 1;
    ref = leap_period ? 40 / 366 : 40 / 365;
    res = yf(from, to);
    TestFramework.assert(
      res.toFixed(10) == ref.toFixed(10),
      `act/actAFB year fraction short period(${m})`,
    );

    to = JsonRisk.add_months(to, 12);
    ref += 1.0;
    res = yf(from, to);
    TestFramework.assert(
      res.toFixed(10) == ref.toFixed(10),
      `act/actAFB year fraction long period(${m})`,
    );

    to = JsonRisk.add_months(to, 12 * 4);
    ref += 4.0;
    res = yf(from, to);
    TestFramework.assert(
      res.toFixed(10) == ref.toFixed(10),
      `act/actAFB year fraction very long period(${m})`,
    );
  }

  from = JsonRisk.date_or_throw("2023/02/28");
  to = JsonRisk.date_or_throw("2024/02/29");
  ref = 1;
  res = yf(from, to);
  TestFramework.assert(
    res.toFixed(10) == ref.toFixed(10),
    `act/actAFB year fraction ending end of feb (0)`,
  );

  from = JsonRisk.date_or_throw("2024/02/29");
  to = JsonRisk.date_or_throw("2025/02/28");
  ref = 1;
  res = yf(from, to);
  TestFramework.assert(
    res.toFixed(10) == ref.toFixed(10),
    `act/actAFB year fraction ending end of feb (1)`,
  );

  from = JsonRisk.date_or_throw("2023/02/27");
  to = JsonRisk.date_or_throw("2024/02/29");
  ref = 1 + 1 / 365;
  res = yf(from, to);
  TestFramework.assert(
    res.toFixed(10) == ref.toFixed(10),
    `act/actAFB year fraction ending end of feb with stub (0)`,
  );

  from = JsonRisk.date_or_throw("2024/02/28");
  to = JsonRisk.date_or_throw("2025/02/28");
  ref = 1 + 1 / 366;
  res = yf(from, to);
  TestFramework.assert(
    res.toFixed(10) == ref.toFixed(10),
    `act/actAFB year fraction ending end of feb with stub (1)`,
  );

  // act/act ICMA
  yf = JsonRisk.year_fraction_factory("act/actICMA");

  const regular_cases = [
    // mid month
    {
      from: "2020-01-15",
      to: "2020-02-15",
      tenor: 1,
      rolldates: ["2020-01-15", "2020-02-15", "2025-07-15", "1990-10-15"],
      ref: 1 / 12,
    },
    {
      from: "2020-01-15",
      to: "2020-04-15",
      tenor: 3,
      rolldates: ["2020-01-15", "2020-04-15", "2025-07-15", "1990-10-15"],
      ref: 0.25,
    },
    {
      from: "2020-01-15",
      to: "2020-07-15",
      tenor: 6,
      rolldates: ["2020-01-15", "2020-07-15", "2025-01-15", "1990-07-15"],
      ref: 0.5,
    },
    {
      from: "2020-01-15",
      to: "2021-01-15",
      tenor: 12,
      rolldates: ["2020-01-15", "2021-01-15", "2025-01-15", "1990-01-15"],
      ref: 1.0,
    },
    // end month roll day 31
    {
      from: "2020-01-31",
      to: "2020-02-29",
      tenor: 1,
      rolldates: ["2020-01-31", "2020-03-31", "2025-07-31", "1990-10-31"],
      ref: 1 / 12,
    },
    {
      from: "2020-01-31",
      to: "2020-04-30",
      tenor: 3,
      rolldates: ["2020-01-31", "2020-07-31", "2025-07-31", "1990-10-31"],
      ref: 0.25,
    },
    {
      from: "2020-01-31",
      to: "2020-07-31",
      tenor: 6,
      rolldates: ["2020-01-31", "2020-07-31", "2025-01-31", "1990-07-31"],
      ref: 0.5,
    },
    {
      from: "2020-01-31",
      to: "2021-01-31",
      tenor: 12,
      rolldates: ["2020-01-31", "2021-01-31", "2025-01-31", "1990-01-31"],
      ref: 1.0,
    },
    // end month roll day 30
    {
      from: "2020-01-30",
      to: "2020-02-29",
      tenor: 1,
      rolldates: ["2020-01-30", "2020-04-30", "2025-07-30", "1990-10-30"],
      ref: 1 / 12,
    },
    {
      from: "2020-01-30",
      to: "2020-04-30",
      tenor: 3,
      rolldates: ["2020-01-30", "2020-07-30", "2025-04-30", "1990-04-30"],
      ref: 0.25,
    },
    {
      from: "2020-06-30",
      to: "2020-12-30",
      tenor: 6,
      rolldates: ["2020-06-30", "2020-12-30", "2025-12-30", "1990-06-30"],
      ref: 0.5,
    },
    {
      from: "2020-04-30",
      to: "2021-04-30",
      tenor: 12,
      rolldates: ["2020-04-30", "2021-04-30", "2025-04-30", "1990-04-30"],
      ref: 1.0,
    },
    // end month roll day 30 start in feb
    {
      from: "2020-02-29",
      to: "2020-03-30",
      tenor: 1,
      rolldates: ["2020-01-30", "2020-04-30", "2025-07-30", "1990-10-30"],
      ref: 1 / 12,
    },
    {
      from: "2020-02-29",
      to: "2020-05-30",
      tenor: 3,
      rolldates: ["2020-05-30", "2020-08-30", "2025-11-30", "1990-11-30"],
      ref: 0.25,
    },
    {
      from: "2020-02-29",
      to: "2020-08-30",
      tenor: 6,
      rolldates: ["2020-08-30", "2021-08-30", "2025-08-30", "1990-08-30"],
      ref: 0.5,
    },
    // end month roll day 29
    {
      from: "2020-02-29",
      to: "2021-02-28",
      tenor: 12,
      rolldates: ["2020-02-29", "2024-02-29", "2028-02-29", "1992-02-29"],
      ref: 1.0,
    },
    // end month roll day 28
    {
      from: "2020-02-28",
      to: "2021-02-28",
      tenor: 12,
      rolldates: ["2021-02-28", "2022-02-28", "2023-02-28", "1990-02-28"],
      ref: 1.0,
    },
  ];

  for (const c of regular_cases) {
    const from = JsonRisk.date_or_throw(c.from);
    const to = JsonRisk.date_or_throw(c.to);
    let res;
    for (const roll of c.rolldates) {
      res = yf(from, to, JsonRisk.date_or_throw(roll), c.tenor);
      TestFramework.assert(
        Math.abs(res - c.ref) < 1e-10,
        `act/actICMA year fraction regular case with tenor ${c.tenor}, start ${c.from}, end ${c.to}`,
      );
      res = yf(from, to, JsonRisk.date_or_throw(roll), undefined);
      TestFramework.assert(
        Math.abs(res - c.ref) < 1e-10,
        `act/actICMA year fraction regular case tenor guess with tenor ${c.tenor}, start ${c.from}, end ${c.to}`,
      );
    }
    res = yf(from, to, undefined, c.tenor);
    TestFramework.assert(
      Math.abs(res - c.ref) < 1e-10,
      `act/actICMA year fraction regular case roll date guess with tenor ${c.tenor}, start ${c.from}, end ${c.to}`,
    );
    res = yf(from, to, undefined, undefined);
    TestFramework.assert(
      Math.abs(res - c.ref) < 1e-10,
      `act/actICMA year fraction regular case tenor and roll date guess with tenor ${c.tenor}, start ${c.from}, end ${c.to}`,
    );
  }

  const irregular_cases = [
    {
      from: "2020-02-29",
      to: "2020-03-31",
      subcases: [
        {
          roll: "2020-02-29",
          tenor: 3,
          ref: 31 / (29 + 31 + 30) / 4,
          desc: "end stub",
        },
        {
          roll: "2020-03-31",
          tenor: 3,
          ref: 31 / (31 + 29 + 31) / 4,
          desc: "front stub",
        },
        { roll: "2020-02-29", tenor: 12, ref: 31 / 365, desc: "end stub" },
        { roll: "2020-03-31", tenor: 12, ref: 31 / 366, desc: "front stub" },
        {
          roll: "2020-03-15",
          tenor: 1,
          ref: 15 / 29 / 12 + 16 / 31 / 12,
          desc: "accrual period within long stub",
        },
        {
          roll: "2020-03-15",
          tenor: 3,
          ref: 15 / (29 + 31 + 31) / 4 + 16 / (31 + 30 + 31) / 4,
          desc: "accrual period within long stub",
        },
        {
          roll: "2020-03-15",
          tenor: 6,
          ref:
            15 / (29 + 31 + 31 + 30 + 31 + 30) / 2 +
            16 / (31 + 30 + 31 + 30 + 31 + 31) / 2,
          desc: "accrual period within long stub",
        },
        {
          roll: "2020-03-15",
          tenor: 12,
          ref: 15 / 366 + 16 / 365,
          desc: "accrual period within long stub",
        },
      ],
    },
    {
      from: "2021-05-10",
      to: "2023-05-20",
      subcases: [
        {
          roll: "2021-05-01",
          tenor: 1,
          ref: 22 / 31 / 12 + 23 / 12 + 19 / 31 / 12,
          desc: "very long period within a very long stub",
        },
        {
          roll: "2021-03-01",
          tenor: 3,
          ref:
            22 / (31 + 30 + 31) / 4 +
            7 / 4 +
            (31 + 30 + 19) / (31 + 30 + 31) / 4,
          desc: "very long period within a very long stub",
        },
      ],
    },
  ];

  for (const c of irregular_cases) {
    const from = JsonRisk.date_or_throw(c.from);
    const to = JsonRisk.date_or_throw(c.to);
    for (const s of c.subcases) {
      const roll = JsonRisk.date_or_throw(s.roll);
      const res = yf(from, to, roll, s.tenor);
      TestFramework.assert(
        Math.abs(res - s.ref) < 1e-10,
        `act/actICMA year fraction irregular case with tenor ${s.tenor}, start ${c.from}, end ${c.to}, ${s.desc}, result ${res.toFixed(6)}`,
      );
    }
  }

  yf = JsonRisk.year_fraction_factory("");
  for (i = 1; i < 11; i++) {
    from = TestFramework.get_utc_date(2000 + i, 2 * i, 3 * i);
    to = JsonRisk.add_days(from, i * i);
    TestFramework.assert(
      (yf(from, to) * 365).toFixed(10) === (i * i).toFixed(10),
      "Undefined year fracion fallback to Act/365 (" + i + ")",
    );
  }
};
