(function (library) {
  /**
   * @desc Returns a number if a valid number or numeric string is entered and null otherwise, does not throw
   * @param {number} n
   * @returns {number} number
   * @memberof JsonRisk
   */
  library.number_or_null = function (n) {
    if (typeof n === "number") return n;
    if (typeof n === "string") {
      n = n.trim();
      let res = parseFloat(n);
      if (isNaN(res)) return null;
      if (n.charAt(n.length - 1) === "%") res *= 0.01;
      return res;
    }
    return null;
  };
  /**
   * @desc Returns positive number if a valid positive number or numeric string is entered and null otherwise, does not throw
   * @param {number} n
   * @returns {number} number
   * @memberof JsonRisk
   */
  library.positive_number_or_null = function (n) {
    const res = library.number_or_null(n);
    if (res <= 0) return null;
    return res;
  };
  /**
   * @desc Returns natural number, zero allowed, if a valid natural number or numeric string is entered and null otherwise, does not throw
   * @param {natural} n
   * @returns {natural} natural vector
   * @memberof JsonRisk
   */
  library.natural_number_or_null = function (n) {
    const res = library.number_or_null(n);
    if (res < 0 || res !== Math.floor(res)) return null;
    return res;
  };
  /**
   * @desc Returns vector of numbers when vector of numbers, vector of numeric strings or space sepatated string is entered. Returns null otherwise
   * @param {number} n
   * @returns {number} number vector
   * @memberof JsonRisk
   */
  library.number_vector_or_null = function (n) {
    if (typeof n === "number") return [n];
    let res;
    if (typeof n === "string") {
      res = n.split(/\s+/);
    } else if (Array.isArray(n)) {
      res = n.slice();
    } else {
      return null;
    }
    for (let i = 0; i < res.length; i++) {
      res[i] = library.number_or_null(res[i]);
      if (null === res[i])
        throw new Error("number_vector_or_null: invalid input");
    }
    return res;
  };
})(this.JsonRisk || module.exports);
