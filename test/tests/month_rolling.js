TEST_NAME = "Month Rolling";

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
  from = TestFramework.get_utc_date(2000, 1, 25);
  for (i = 1; i < 11; i++) {
    TestFramework.assert(
      JsonRisk.add_months(from, i * i).getTime() ===
        TestFramework.get_utc_date(2000, 1 + i * i, 25).getTime(),
      "Month addition (pos)",
    );
    TestFramework.assert(
      JsonRisk.add_months(from, -i * i).getTime() ===
        TestFramework.get_utc_date(2000, 1 - i * i, 25).getTime(),
      "Month addition (neg)",
    );
  }

  from = TestFramework.get_utc_date(2000, 0, 31);
  for (i = 1; i < 4; i++) {
    TestFramework.assert(
      JsonRisk.add_months(from, 2 * i).getTime() ===
        TestFramework.get_utc_date(2000, 2 * i, 31).getTime(),
      "Month addition (31st)",
    );
    TestFramework.assert(
      JsonRisk.add_months(from, 2 * i + 5).getTime() ===
        TestFramework.get_utc_date(2000, 2 * i + 5, 31).getTime(),
      "Month addition (31st)",
    );
    TestFramework.assert(
      JsonRisk.add_months(from, 12 * i + 1).getTime() ===
        TestFramework.get_utc_date(2000, 12 * i + 1, 28).getTime(),
      "Month addition (31st, Feb)",
    );
  }
  TestFramework.assert(
    JsonRisk.add_months(from, 49).getTime() ===
      TestFramework.get_utc_date(2000, 49, 29).getTime(),
    "Month addition (31st, Feb, Leap Year)",
  );
};
