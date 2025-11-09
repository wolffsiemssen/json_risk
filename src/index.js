/*!
	JSON Risk
	v1.0.1
	https://github.com/wolffsiemssen/json_risk
	License: MIT
*/

(function (root, factory) {
  if (typeof module === "object" && typeof exports !== "undefined") {
    // Node
    module.exports = factory();
  } else {
    // Browser
    root.JsonRisk = factory();
  }
})(this, function () {
  var valuation_date = null;
  var JsonRisk = {
    get valuation_date() {
      if (!(valuation_date instanceof Date))
        throw new Error("JsonRisk: valuation_date must be set");
      return valuation_date;
    },
  };

  JsonRisk.set_valuation_date = function (d) {
    valuation_date = JsonRisk.get_safe_date(d);
    if (null === valuation_date)
      throw new Error("JsonRisk: trying to set invalid valuation_date");
  };

  return JsonRisk;
});
