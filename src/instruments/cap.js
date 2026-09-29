(function (library) {
  /**
   * Class representing a interest rate cap
   * @memberof JsonRisk
   * @extends Floater
   * @extends LegInstrument
   */

  class Cap extends Floater {
    /**
     * Create a floater instrument. If legs are not provided, legs are generated from terms and conditions. Legs must contain one and only one leg with floating and notional payments.
     * @param {obj} obj A plain object representing the instrument
     * @param {string} [obj.currency=""] the currency in which this instrument's value is represented
     * @param {number} [obj.quantity=1.0] the quantity with which the instrument's value is multiplied
     * @param {array} [obj.legs=[]] the legs of this instrument.
     * @param {date} [obj.acquire_date=01.01.1900] the acquire date
     */
    constructor(obj) {
      super(obj)
    }
  }

   library.Cap = Cap;
})(this.JsonRisk || module.exports);