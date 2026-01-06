(function (library) {
  library.make_surface = function (obj) {
    switch (obj.type.toLowerCase()) {
      case "expiry_rel_strike":
        return new library.ExpiryRelStrikeSurface(obj);
      case "expiry_abs_strike":
        return new library.ExpiryAbsStrikeSurface(obj);
      default:
        return new library.Surface(obj);
    }
  };
})(this.JsonRisk || module.exports);
