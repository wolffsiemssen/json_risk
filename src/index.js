/*!
	JSON Risk
	v2.1.0
	https://github.com/wolffsiemssen/json_risk
	License: MIT
*/

/**
 * @namespace JsonRisk
 */
const JsonRisk = (function () {
  let valuation_date = null;
  const j = {
    /**
     * @type {Date}
     * @description Gets the library's current valution date if set.
     * @memberof JsonRisk
     */
    get valuation_date() {
      if (!(valuation_date instanceof Date))
        throw new Error("JsonRisk: valuation_date must be set");
      return valuation_date;
    },

    /**
     * @function
     * @description Sets the library's valuation date.
     * @param {Date|string} d - The Date to set, if a string is supplied, it is converted to a date if possible.
     * @memberof JsonRisk
     */
    set_valuation_date: function (d) {
      valuation_date = JsonRisk.date_or_null(d);
      if (null === valuation_date)
        throw new Error("JsonRisk: trying to set invalid valuation_date");
    },
  };

  return j;
})();

if (typeof module === "object" && typeof exports !== "undefined") {
  // CommonJS module framework
  module.exports = JsonRisk;
}
