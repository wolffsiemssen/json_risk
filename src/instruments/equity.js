(function (library) {
  /**
   * creates an internal equity object from input data
   * @param {object} instrument instrument of type equity
   * @memberof library
   * @public
   */
  library.equity = function (instrument) {
    this.quantity = library.get_safe_number(instrument.quantity);
    if (null === this.quantity)
      throw new Error("equity: must provide valid quantity");
  };
  /**
   * calculates the present value for internal equity object
   * @param {object} quote scalar object
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.equity.prototype.present_value = function (quote) {
    var q = library.get_safe_scalar(quote);
    return this.quantity * q.get_value();
  };

  /**
   * calculates the present value for equity JSON
   * @param {object} equity instrument of type equity
   * @param {object} quote market quote scalar object
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.pricer_equity = function (equity, quote) {
    var equity_internal = new library.equity(equity);
    return equity_internal.present_value(quote);
  };
})(this.JsonRisk || module.exports);
