(function (library) {
  /**
   * Class representing a black76 model user to value e.g. equity options
   * @memberof JsonRisk
   */
  class BlackModel {
    #impl = null;
    #std_dev = 0.0;

    /**
     * Create a black76 model
     * @param {number} time time to exercise
     * @param {number} volatility black, e.g. log-normal volatility
     */
    constructor(time, volatility) {
      this.#std_dev = volatility * Math.sqrt(time);
      if (time <= 0) {
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
        // regular case - black formula
        this.#impl = this.#black_formula;
      }
    }

    #black_formula(phi, forward, strike) {
      if (!(forward > 0.0))
        throw new Error("Black76 model: forward must be positive");
      if (!(strike > 0.0))
        throw new Error("Black76 model: strike must be positive");
      const temp = Math.log(forward / strike) / this.#std_dev;
      const d1 = temp + 0.5 * this.#std_dev;
      const d2 = temp - 0.5 * this.#std_dev;
      return (
        phi * forward * library.cndf(phi * d1) -
        phi * strike * library.cndf(phi * d2)
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
  library.BlackModel = BlackModel;
})(this.JsonRisk || module.exports);
