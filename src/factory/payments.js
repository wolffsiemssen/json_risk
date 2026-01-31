(function (library) {
  /**
   * read payment type for given payment and create payment object
   * @param {object} obj any payment JSON
   * @returns {object} payment class object
   * @memberof JsonRisk
   */
  library.make_payment = function (obj) {
    if (obj instanceof library.NotionalPayment) return obj; // all leg payment types inherit from NotionalPayment
    switch (obj.type.toLowerCase()) {
      case "notional":
        return new library.NotionalPayment(obj);
      case "fixed":
        return new library.FixedRatePayment(obj);
      case "float":
        return new library.FloatRatePayment(obj);
      default:
        throw new Error("make_payment: invalid payment type");
    }
  };
})(this.JsonRisk || module.exports);
