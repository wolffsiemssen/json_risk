(function (library) {
  /**
   * read payment type for given payment and create payment object
   * @param {object} obj any payment JSON
   * @returns {object} payment class object
   * @memberof library
   * @public
   */
  library.make_payment = function (obj) {
    switch (obj.type.toLowerCase()) {
      case "notional":
        return new library.NotionalPayment(obj);
      case "fixed":
        return new library.FixedRatePayment(obj);
      default:
        throw new Error("make_payment: invalid payment type");
    }
  };
})(this.JsonRisk || module.exports);
