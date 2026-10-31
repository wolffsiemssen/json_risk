/**
 * Read surface type for given surface and create surface object
 * @param {object} obj any surface JSON
 * @returns {object} surface class object
 * @memberof JsonRisk
 */
JsonRisk.make_surface = function (obj) {
  switch (obj.type.toLowerCase()) {
    case "expiry_rel_strike":
      return new JsonRisk.ExpiryRelStrikeSurface(obj);
    case "expiry_abs_strike":
      return new JsonRisk.ExpiryAbsStrikeSurface(obj);
    default:
      return new JsonRisk.Surface(obj);
  }
};
