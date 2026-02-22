(function (library) {
  /**
   * Class representing a bachelier model used to value e.g. swaptions, caps and floors
   * @memberof JsonRisk
   */
  class BachelierModel {
    #impl = null;
    #std_dev = 0.0;

    /**
     * Create a bachelier model
     * @param {number} time time to exercise
     * @param {number} volatility bachelier, e.g. normal volatility
     */
    constructor(time, volatility) {
      this.#std_dev = volatility * Math.sqrt(time);
      if (time < 0) {
        this.#impl = function (
          phi_not_used,
          forward_not_used,
          strike_not_used,
        ) {
          // expired option
          return 0.0;
        };
      } else if (time < 1 / 512 || this.#std_dev < 0.000001) {
        this.#impl = function (phi, forward, strike) {
          // expiring option or very lw volatility, return inner value
          return Math.max(phi * (forward - strike), 0);
        };
      } else {
        // regular case - bachelier formula
        this.#impl = this.#bachelier_formula;
      }
    }

    #bachelier_formula(phi, forward, strike) {
      const d1 = (forward - strike) / this.#std_dev;
      return (
        phi * (forward - strike) * library.cndf(phi * d1) +
        this.#std_dev * library.ndf(d1)
      );
    }

    /**
     * Calculate the price of a put option
     * @param {number} forward the forward value
     * @param {number} strike the strike value
     * @return {number}
     */
    put_price(forward, strike) {
      return this.#impl(-1, forward, strike);
    }

    /**
     * Calculate the price of a call option
     * @param {number} forward the forward value
     * @param {number} strike the strike value
     * @return {number}
     */
    call_price(forward, strike) {
      return this.#impl(1, forward, strike);
    }
  }
  library.BachelierModel = BachelierModel;
})(this.JsonRisk || module.exports);
