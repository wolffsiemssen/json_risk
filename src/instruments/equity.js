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
    this.quote = instrument.quote || "";
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

  library.equity.prototype.add_deps = function (deps) {
    if ((!deps) instanceof library.Deps)
      throw new Error("add_deps: deps must be of type Deps");
    deps.addScalar(this.quote);
  };

  library.equity.prototype.evaluate = function (params) {
    if ((!params) instanceof library.Params)
      throw new Error("evaluate: params must be of type Params");
    const quote = params.getScalar(this.quote);
    return this.present_value(quote);
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
