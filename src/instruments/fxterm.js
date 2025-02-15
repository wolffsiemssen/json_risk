(function (library) {
  /**
   * creates an internal fxterm object (including swap resp. bonds) from input data
   * @param {object} instrument instrument of type fxterm
   * @memberof library
   * @public
   */
  library.fxterm = function (instrument) {
    //the near payment of the swap
    this.near_leg = new library.fixed_income({
      notional: instrument.notional, // negative if first leg is pay leg
      maturity: instrument.maturity,
      fixed_rate: 0,
      tenor: 0,
    });

    //the far payment of the swap
    if (
      typeof instrument.notional_2 === "number" &&
      library.get_safe_date(instrument.maturity_2)
    ) {
      this.far_leg = new library.fixed_income({
        notional: instrument.notional_2, // negative if second leg is pay leg
        maturity: instrument.maturity_2,
        fixed_rate: 0,
        tenor: 0,
      });
    } else {
      this.far_leg = null;
    }
  };
  /**
   * calculates the present value for internal fxterm (object)
   * @param {object} disc_curve discount curve
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.fxterm.prototype.present_value = function (disc_curve) {
    var res = 0;
    res += this.near_leg.present_value(disc_curve, null, null);
    if (this.far_leg) res += this.far_leg.present_value(disc_curve, null, null);
    return res;
  };

  /**
   * calculates the present value for fxterm
   * @param {object} fxterm instrument of type fxterm
   * @param {object} disc_curve discount curve
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.pricer_fxterm = function (fxterm, disc_curve) {
    var fxterm_internal = new library.fxterm(fxterm);
    return fxterm_internal.present_value(disc_curve);
  };
})(this.JsonRisk || module.exports);
