/**
 * @desc read instrument type for given instrument and create instrument object
 * @param {object} obj any instrument JSON
 * @returns {object} instrument class object
 * @memberof JsonRisk
 */
JsonRisk.make_instrument = function (obj) {
  const type = JsonRisk.string_or_throw(
    obj.type,
    "make_instrument: no type supplied",
  );
  switch (type.toLowerCase().replaceAll("_", "")) {
    case "bond":
      return new JsonRisk.Bond(obj);
    case "floater":
      return new JsonRisk.Floater(obj);
    case "capfloor":
      return new JsonRisk.CapFloor(obj);
    case "swap":
      return new JsonRisk.Swap(obj);
    case "swaption":
      return new JsonRisk.Swaption(obj);
    case "fxterm":
      return new JsonRisk.FxTerm(obj);
    case "callablebond":
      return new JsonRisk.CallableBond(obj);
    case "leginstrument":
      return new JsonRisk.LegInstrument(obj);
    case "equity":
      return new JsonRisk.Equity(obj);
    case "equityfuture":
      return new JsonRisk.EquityFuture(obj);
    case "equityforward":
      return new JsonRisk.EquityForward(obj);
    case "equityoption":
      return new JsonRisk.EquityOption(obj);
    case "equityamericanoption":
      return new JsonRisk.EquityAmericanOption(obj);
    case "cds":
      return new JsonRisk.CreditDefaultSwap(obj);
    default:
      throw new Error("make_instrument: invalid instrument type");
  }
};
