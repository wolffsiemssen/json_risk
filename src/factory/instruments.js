(function (library) {
  /**
   * @desc read instrument type for given instrument and create instrument object
   * @param {object} obj any instrument JSON
   * @returns {object} instrument class object
   * @memberof JsonRisk
   */
  library.make_instrument = function (obj) {
    switch (obj.type.toLowerCase()) {
      case "bond":
        return new library.Bond(obj);
      case "floater":
        return new library.Floater(obj);
      case "swap":
        return new library.Swap(obj);
      case "swaption":
        return new library.Swaption(obj);
      case "fxterm":
        return new library.FxTerm(obj);
      case "callable_bond":
        return new library.CallableBond(obj);
      case "equity":
        return new library.Equity(obj);
      case "equity_future":
        return new library.EquityFuture(obj);
      case "equity_forward":
        return new library.EquityForward(obj);
      case "equity_option":
        return new library.EquityOption(obj);
      case "cds":
        return new library.CreditDefaultSwap(obj);
      default:
        throw new Error("make_instrument: invalid instrument type");
    }
  };
})(this.JsonRisk || module.exports);
