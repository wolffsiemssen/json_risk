(function (library) {
  /**
   * read instrument type for given instrument and create instrument object
   * @param {object} obj any instrument JSON
   * @returns {object} instrument class object
   * @memberof library
   * @public
   */
  library.make_instrument = function (obj) {
    switch (obj.type.toLowerCase()) {
      case "bond":
      case "floater":
        return new library.FixedIncome(obj);
      case "swap":
        return new library.Swap(obj);
      case "swaption":
        return new library.Swaption(obj);
      case "fxterm":
        return new library.FxTerm(obj);
      case "callable_bond":
        return new library.CallableFixedIncome(obj);
      case "equity":
        return new library.Equity(obj);
      case "equity_future":
        return new library.EquityFuture(obj);
      case "equity_forward":
        return new library.EquityForward(obj);
      default:
        throw new Error("make_instrument: invalid instrument type");
    }
  };
})(this.JsonRisk || module.exports);
