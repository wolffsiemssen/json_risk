(function (library) {
  /**
   * Takes any value and turns it into a boolean. When a string is entered, returns true if it can be converted into a number other than zero or if it contains "true", "yes", "t" or "y", each case insensitive. Returns false otherwise. Does not throw.
   * @param {boolean} b
   * @returns {boolean} boolean vector
   * @memberof JsonRisk
   */
  library.make_bool = function (b) {
    if (typeof b === "boolean") return b;
    if (typeof b === "number") return b !== 0;
    if (typeof b === "string") {
      const n = Number(b.trim()).valueOf();
      if (0 === n) return false;
      if (!isNaN(n)) return true;
      const s = b.trim().toLowerCase();
      if (s === "true" || s === "yes" || s === "t" || s === "y") return true;
      return false;
    }
    return false;
  };

  /**
   * Takes any value and converts it into a vector of booleans without throwing. Strings like "true true false" are split by spaces. If the value cannot be converted, returns single-entry array [false].
   * @param {boolean} b
   * @returns {boolean} boolean vector
   * @memberof JsonRisk
   */
  library.make_bool_vector = function (b) {
    if (typeof b === "boolean") return [b];
    if (typeof b === "number") return [b !== 0];
    let res;
    if (typeof b === "string") {
      res = b.split(/\s+/);
    } else if (Array.isArray(b)) {
      res = b.slice();
    } else {
      return [false];
    }
    for (let i = 0; i < res.length; i++) {
      res[i] = library.make_bool(res[i]);
    }
    return res;
  };
})(this.JsonRisk || module.exports);
