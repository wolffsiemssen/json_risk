TEST_NAME = "Schedule Generation Consistency";

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

    Schedule generation consistency checks

     */
  var start, end, stub;

  var adj = function (d) {
    return JsonRisk.adjust(d, "unadjusted", JsonRisk.is_holiday_factory(""));
  };
  for (i = 2; i <= 12; i++) {
    start = TestFramework.get_utc_date(2000 + i, i - 2, 2 * i); //starts in Jan, Feb, Mar ...
    end = JsonRisk.add_months(start, 12 * i + 1); //always requires one-month short stub or one+i months long stub ...
    expected = JsonRisk.schedule(start, end, i, adj, null, null, false, false); //standard backward schedule has short stub at beginning
    stub = JsonRisk.add_months(start, 1);
    sched = JsonRisk.schedule(start, end, i, adj, stub, null, false, false);
    TestFramework.assert_same_dates(
      sched,
      expected,
      "Schedule generation consistency short stub at beginning (" +
        (i - 1) +
        ")",
    );

    expected = JsonRisk.schedule(start, end, i, adj, null, null, false, true); //backward schedule with long stub at beginning
    stub = JsonRisk.add_months(start, 1 + i);
    sched = JsonRisk.schedule(start, end, i, adj, stub, null, null, null);
    TestFramework.assert_same_dates(
      sched,
      expected,
      "Schedule generation consistency long stub at beginning (" +
        (i - 1) +
        ")",
    );

    expected = JsonRisk.schedule(start, end, i, adj, null, null, true, false); //forward schedule with short stub at end
    stub = JsonRisk.add_months(end, -1);
    console.log("Explicit short stub at end: " + stub);
    sched = JsonRisk.schedule(start, end, i, adj, null, stub, null, null);
    TestFramework.assert_same_dates(
      sched,
      expected,
      "Schedule generation consistency short stub at end (" + (i - 1) + ")",
    );

    expected = JsonRisk.schedule(start, end, i, adj, null, null, true, true); //forward schedule with long stub at end
    stub = JsonRisk.add_months(end, -1 - i);
    sched = JsonRisk.schedule(start, end, i, adj, null, stub, null, null);
    TestFramework.assert_same_dates(
      sched,
      expected,
      "Schedule generation consistency long stub at end (" + (i - 1) + ")",
    );
  }
};
