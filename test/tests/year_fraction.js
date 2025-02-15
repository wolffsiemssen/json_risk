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
