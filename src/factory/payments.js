/**
 * Read payment type for given payment and create payment object
 * @param {object} obj any payment JSON
 * @returns {object} payment class object
 * @memberof JsonRisk
 */
JsonRisk.make_payment = function (obj) {
  if (obj instanceof JsonRisk.NotionalPayment) return obj; // all leg payment types inherit from NotionalPayment
  switch (obj.type.toLowerCase()) {
    case "notional":
      return new JsonRisk.NotionalPayment(obj);
    case "fixed":
      return new JsonRisk.FixedRatePayment(obj);
    case "float":
      return new JsonRisk.FloatRatePayment(obj);
    case "caplet":
      return new JsonRisk.CapletPayment(obj);
    case "floorlet":
      return new JsonRisk.FloorletPayment(obj);
    default:
      throw new Error(`make_payment: invalid payment type ${obj.type}`);
  }
};
