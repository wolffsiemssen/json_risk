TEST_NAME = "Holidays Calendar";

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

    Test holidays / calendar / adjustment

     */
  var cal = JsonRisk.is_holiday_factory("TARGET");

  from = TestFramework.get_utc_date(2000, 0, 1);
  for (i = 1; i < 10; i++) {
    from = JsonRisk.add_days(from, i * i);
    TestFramework.assert(
      from.getTime() === JsonRisk.adjust(from, "unadjusted", cal).getTime(),
      "BDC unadjusted (" + i + ")",
    );
  }

  from = TestFramework.get_utc_date(2018, 0, 1); //Monday
  TestFramework.assert(
    JsonRisk.add_days(from, 1).getTime() ===
      JsonRisk.adjust(from, "following", cal).getTime(),
    "BDC following",
  );
  TestFramework.assert(
    JsonRisk.add_days(from, 1).getTime() ===
      JsonRisk.adjust(from, "modified following", cal).getTime(),
    "BDC mod following",
  );
  TestFramework.assert(
    JsonRisk.add_days(from, -3).getTime() ===
      JsonRisk.adjust(from, "preceding", cal).getTime(),
    "BDC preceding",
  );

  from = TestFramework.get_utc_date(2018, 2, 30); //Friday
  TestFramework.assert(
    JsonRisk.add_days(from, 4).getTime() ===
      JsonRisk.adjust(from, "following", cal).getTime(),
    "BDC following",
  );
  TestFramework.assert(
    JsonRisk.add_days(from, -1).getTime() ===
      JsonRisk.adjust(from, "modified following", cal).getTime(),
    "BDC mod following",
  );
  TestFramework.assert(
    JsonRisk.add_days(from, -1).getTime() ===
      JsonRisk.adjust(from, "preceding", cal).getTime(),
    "BDC preceding",
  );

  from = TestFramework.get_utc_date(2018, 3, 2); //Monday (Ostermontag)
  TestFramework.assert(
    JsonRisk.add_days(from, 1).getTime() ===
      JsonRisk.adjust(from, "following", cal).getTime(),
    "BDC following",
  );
  TestFramework.assert(
    JsonRisk.add_days(from, 1).getTime() ===
      JsonRisk.adjust(from, "modified following", cal).getTime(),
    "BDC mod following",
  );
  TestFramework.assert(
    JsonRisk.add_days(from, -4).getTime() ===
      JsonRisk.adjust(from, "preceding", cal).getTime(),
    "BDC preceding",
  );

  from = TestFramework.get_utc_date(2018, 4, 1); //Tuesday
  TestFramework.assert(
    JsonRisk.add_days(from, 1).getTime() ===
      JsonRisk.adjust(from, "following", cal).getTime(),
    "BDC following",
  );
  TestFramework.assert(
    JsonRisk.add_days(from, 1).getTime() ===
      JsonRisk.adjust(from, "modified following", cal).getTime(),
    "BDC mod following",
  );
  TestFramework.assert(
    JsonRisk.add_days(from, -1).getTime() ===
      JsonRisk.adjust(from, "preceding", cal).getTime(),
    "BDC preceding",
  );

  from = TestFramework.get_utc_date(2018, 11, 25); //Tuesday
  TestFramework.assert(
    JsonRisk.add_days(from, 2).getTime() ===
      JsonRisk.adjust(from, "following", cal).getTime(),
    "BDC following",
  );
  TestFramework.assert(
    JsonRisk.add_days(from, 2).getTime() ===
      JsonRisk.adjust(from, "modified following", cal).getTime(),
    "BDC mod following",
  );
  TestFramework.assert(
    JsonRisk.add_days(from, -1).getTime() ===
      JsonRisk.adjust(from, "preceding", cal).getTime(),
    "BDC preceding",
  );

  from = TestFramework.get_utc_date(2018, 11, 26); //Wednesday
  TestFramework.assert(
    JsonRisk.add_days(from, 1).getTime() ===
      JsonRisk.adjust(from, "following", cal).getTime(),
    "BDC following",
  );
  TestFramework.assert(
    JsonRisk.add_days(from, 1).getTime() ===
      JsonRisk.adjust(from, "modified following", cal).getTime(),
    "BDC mod following",
  );
  TestFramework.assert(
    JsonRisk.add_days(from, -2).getTime() ===
      JsonRisk.adjust(from, "preceding", cal).getTime(),
    "BDC preceding",
  );

  //test custom calendar
  from = TestFramework.get_utc_date(2000, 0, 1);
  to = TestFramework.get_utc_date(2100, 0, 1);
  dates = [];
  while (from.getTime() < to.getTime()) {
    if (cal(from)) dates.push(from); // add all target holidays to custom list
    from = JsonRisk.add_days(from, 1);
  }
  //create custom calendar
  JsonRisk.add_calendar("custom", dates);

  //check custom calendar equals TARGET
  var customcal = JsonRisk.is_holiday_factory("CUSTOM"); //should be case insensitive
  from = TestFramework.get_utc_date(2000, 0, 1);
  var res = true;
  while (from.getTime() < to.getTime()) {
    if (cal(from) !== customcal(from)) {
      TestFramework.assert(
        cal(from) === customcal(from),
        "Custom Calendars: " + from,
      );
      break;
    }
    from = JsonRisk.add_days(from, 1);
  }
};
