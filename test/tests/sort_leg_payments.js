TEST_NAME = "Sort leg payments";

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
  Test Sort payments
  */
  console.log("=== START LEG PAYMENTS UNIT TESTS ===");

  const testPmtDate = "2026-10-20";
  const testStartDate = "2026-10-10";
  const testEndDate = "2026-10-20";
  const testValueDate = "2026-10-20";

  const paymentObj = {
    notional: 100.0,
    date_pmt: testPmtDate,
    date_start: testStartDate,
    date_end: testEndDate,
    date_value: testValueDate,
    currency: "EUR",
  };

  const mockCaplet = new JsonRisk.CapletPayment(paymentObj);
  const mockFloat = new JsonRisk.FloatRatePayment(paymentObj);
  const mockFloorlet = new JsonRisk.FloorletPayment(paymentObj);

  const unsorted_payments = [mockCaplet, mockFloorlet, mockFloat];

  const leg = new JsonRisk.Leg({
    disc_curve: "discount",
    payments: unsorted_payments,
  });

  TestFramework.assert(
    leg.payments[0].constructor.name === "FloatRatePayment",
    `Test sort leg payments, first payment is, ${leg.payments[0].constructor.name}`,
  );

  console.log("=== SORT LEG PAYMENTS UNIT TESTS SUCCESSFUL ===");
};
