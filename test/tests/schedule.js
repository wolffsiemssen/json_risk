TEST_NAME = "Schedule";

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

    Test Schedule

     */

  var expected = [
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1981, 0, 1),
    TestFramework.get_utc_date(1982, 0, 1),
    TestFramework.get_utc_date(1983, 0, 1),
    TestFramework.get_utc_date(1984, 0, 1),
  ];

  var adj = function (d) {
    return JsonRisk.adjust(d, "unadjusted", JsonRisk.is_holiday_factory(""));
  };

  var sched = JsonRisk.schedule(
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1984, 0, 1),
    12,
    adj,
    null,
    null,
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Backward schedule generation (1)",
  );

  sched = JsonRisk.schedule(
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1984, 0, 1),
    12,
    adj,
    TestFramework.get_utc_date(1981, 0, 1),
    TestFramework.get_utc_date(1983, 0, 1),
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Backward schedule generation (2)",
  );

  sched = JsonRisk.schedule(
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1984, 0, 1),
    12,
    adj,
    TestFramework.get_utc_date(1981, 0, 1),
    TestFramework.get_utc_date(1984, 0, 1),
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Backward schedule generation (3)",
  );

  adj = function (d) {
    return JsonRisk.adjust(d, "preceding", JsonRisk.is_holiday_factory(""));
  };
  sched = JsonRisk.schedule(
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1984, 0, 1),
    12,
    adj,
    TestFramework.get_utc_date(1981, 0, 1),
    TestFramework.get_utc_date(1983, 0, 1),
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Backward schedule generation (4)",
  );

  adj = function (d) {
    return JsonRisk.adjust(d, "unadjusted", JsonRisk.is_holiday_factory(""));
  };

  sched = JsonRisk.schedule(
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1984, 0, 1),
    12,
    adj,
    null,
    null,
    true /*stub at end*/,
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Forward schedule generation (1)",
  );

  sched = JsonRisk.schedule(
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1984, 0, 1),
    12,
    adj,
    TestFramework.get_utc_date(1981, 0, 1),
    null,
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Forward schedule generation (2)",
  );

  expected = [
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1981, 0, 2),
    TestFramework.get_utc_date(1982, 0, 2),
    TestFramework.get_utc_date(1983, 0, 2),
    TestFramework.get_utc_date(1984, 0, 2),
  ];

  adj = function (d) {
    return JsonRisk.adjust(
      d,
      "following",
      JsonRisk.is_holiday_factory("Target"),
    );
  };
  sched = JsonRisk.schedule(
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1984, 0, 2),
    12,
    adj,
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Backward schedule generation where effective date is unadjusted and duplicate needs to be avoided",
  );

  expected = [
    TestFramework.get_utc_date(1980, 11, 31),
    TestFramework.get_utc_date(1981, 11, 31),
    TestFramework.get_utc_date(1982, 11, 31),
    TestFramework.get_utc_date(1983, 11, 31),
    TestFramework.get_utc_date(1985, 0, 1),
  ];

  adj = function (d) {
    return JsonRisk.adjust(
      d,
      "preceding",
      JsonRisk.is_holiday_factory("Target"),
    );
  };
  sched = JsonRisk.schedule(
    TestFramework.get_utc_date(1980, 11, 31),
    TestFramework.get_utc_date(1985, 0, 1),
    12,
    adj,
    null,
    null,
    true /*stub at end*/,
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Forward schedule generation where maturity date is unadjusted and duplicate needs to be avoided",
  );

  expected = [
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1980, 2, 1), //first date
    TestFramework.get_utc_date(1981, 2, 1),
    TestFramework.get_utc_date(1982, 2, 1),
    TestFramework.get_utc_date(1983, 2, 1), //next to last date
    TestFramework.get_utc_date(1984, 0, 1),
  ];

  adj = function (d) {
    return JsonRisk.adjust(d, "unadjusted", JsonRisk.is_holiday_factory(""));
  };
  sched = JsonRisk.schedule(
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1984, 0, 1),
    12,
    adj,
    TestFramework.get_utc_date(1980, 2, 1),
    TestFramework.get_utc_date(1983, 2, 1),
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Backward schedule generation (6)",
  );

  sched = JsonRisk.schedule(
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1984, 0, 1),
    12,
    adj,
    TestFramework.get_utc_date(1980, 2, 1),
    null,
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Forward schedule generation (6)",
  );

  expected = [
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1980, 2, 1), //first date
    TestFramework.get_utc_date(1980, 8, 1),
    TestFramework.get_utc_date(1981, 2, 1),
    TestFramework.get_utc_date(1981, 8, 1),
    TestFramework.get_utc_date(1982, 2, 1),
    TestFramework.get_utc_date(1982, 8, 1),
    TestFramework.get_utc_date(1983, 2, 1), //next to last date
    TestFramework.get_utc_date(1984, 0, 1),
  ];
  sched = JsonRisk.schedule(
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1984, 0, 1),
    6,
    adj,
    TestFramework.get_utc_date(1980, 2, 1),
    TestFramework.get_utc_date(1983, 2, 1),
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Backward schedule generation (7)",
  );

  expected = [
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1980, 2, 1), //first date
    TestFramework.get_utc_date(1980, 8, 1),
    TestFramework.get_utc_date(1981, 2, 1),
    TestFramework.get_utc_date(1981, 8, 1),
    TestFramework.get_utc_date(1982, 2, 1),
    TestFramework.get_utc_date(1982, 8, 1),
    TestFramework.get_utc_date(1983, 2, 1),
    TestFramework.get_utc_date(1983, 8, 1), //implicit final stub
    TestFramework.get_utc_date(1984, 0, 1),
  ];

  sched = JsonRisk.schedule(
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1984, 0, 1),
    6,
    adj,
    TestFramework.get_utc_date(1980, 2, 1),
    null,
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Forward schedule generation (7)",
  );

  expected = [
    TestFramework.get_utc_date(1980, 0, 1),
    TestFramework.get_utc_date(1981, 0, 1),
    TestFramework.get_utc_date(1982, 0, 1),
    TestFramework.get_utc_date(1983, 0, 1),
    TestFramework.get_utc_date(1984, 0, 1),
  ];
  JsonRisk.set_valuation_date("1980/07/01");
  sched = JsonRisk.schedule(
    null,
    TestFramework.get_utc_date(1984, 0, 1),
    12,
    adj,
    null,
    null,
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Backward schedule generation without effective date (1)",
  );

  sched = JsonRisk.schedule(
    null,
    TestFramework.get_utc_date(1984, 0, 1),
    12,
    adj,
    null,
    TestFramework.get_utc_date(1983, 0, 1),
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Backward schedule generation without effective date (2)",
  );

  expected = [
    TestFramework.get_utc_date(1980, 3, 1),
    TestFramework.get_utc_date(1980, 9, 1),
    TestFramework.get_utc_date(1981, 3, 1),
    TestFramework.get_utc_date(1981, 9, 1),
    TestFramework.get_utc_date(1982, 3, 1),
    TestFramework.get_utc_date(1982, 9, 1),
    TestFramework.get_utc_date(1983, 3, 1),
    TestFramework.get_utc_date(1984, 0, 1),
  ];

  sched = JsonRisk.schedule(
    null,
    TestFramework.get_utc_date(1984, 0, 1),
    6,
    adj,
    null,
    TestFramework.get_utc_date(1983, 3, 1),
  );
  TestFramework.assert_same_dates(
    sched,
    expected,
    "Backward schedule generation without effective date (3)",
  );
};
