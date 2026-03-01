(function (library) {
  /**
   * @desc read instrument type for given instrument and create instrument object
   * @param {object} obj any instrument JSON
   * @returns {object} instrument class object
   * @memberof JsonRisk
   */
  library.make_instrument = function (obj) {
    switch (obj.type.toLowerCase().replaceAll("_", "")) {
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
      case "callablebond":
        return new library.CallableBond(obj);
      case "leginstrument":
        return new library.LegInstrument(obj);
      case "equity":
        return new library.Equity(obj);
      case "equityfuture":
        return new library.EquityFuture(obj);
      case "equityforward":
        return new library.EquityForward(obj);
      case "equityoption":
        return new library.EquityOption(obj);
      case "cds":
        return new library.CreditDefaultSwap(obj);
      default:
        throw new Error("make_instrument: invalid instrument type");
    }
  };
})(this.JsonRisk || module.exports);
