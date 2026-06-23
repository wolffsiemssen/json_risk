(function (library) {
  /**
   * Gaussian model for option pricing.
   * @memberof JsonRisk
   */
  class GaussianModel {
    #times;
    #xi;
    #n;
    #underlying;
    #payoff;
    #N = 0;
    #grid = null;
    #integrate = null;

    /**
     * @param {Object} obj
     * @param {number[]} obj.times array of times
     * @param {number[]} obj.xi array of standard deviations
     * @param {function} obj.underlying function returning the underlying value for time t and gaussian state x
     * @param {function} obj.payoff function returning the payoff for time t and underlying value v
     * @param {number} obj.num_std_devs=4 range of standard deviations for numeric integration
     * @param {number} obj.resulution=16 resolution for numeric integration
     */
    constructor(obj) {
      this.#times = obj.times;
      this.#n = obj.times.length;
      this.#xi = obj.xi;
      this.#underlying = obj.underlying;
      this.#payoff = obj.payoff;

      // numerics
      const num_std_devs =
        library.natural_number_or_null(obj.num_std_devs) || 4;
      const resolution = library.natural_number_or_null(obj.resolution) || 16;
      const dr = 0.5 / resolution;

      this.#N = 2 * num_std_devs * resolution + 1;
      this.#grid = new Array(this.#N);
      const ndf = new Array(this.#N);

      for (let i = 0; i < this.#N; ++i) {
        const temp = num_std_devs * ((2 * i) / (this.#N - 1) - 1);
        this.#grid[i] = temp;
        ndf[i] = library.ndf(temp);
      }

      this.#integrate = function (f) {
        // compute the integral over f(x) phi(x) dx where phi is the standard normal density
        const f_weighted = (x) => {
          let res = f(x);
          res *= library.fast_cndf(x + dr) - library.fast_cndf(x - dr);
          res *= resolution;
          return res;
        };
        const ret = library.adaptive_simpson(
          f_weighted,
          -num_std_devs,
          num_std_devs,
          1e-5,
          8,
          5,
        );
        return ret;
      };
    }

    price() {
      const values_hold = new Float64Array(this.#N);
      const values_ex = new Float64Array(this.#N);

      {
        // populate end state n
        const t = this.#times[this.#n - 1];
        const xi = this.#xi[this.#n - 1];
        for (let i = 0; i < this.#N; ++i) {
          const x = this.#grid[i];
          const x_scaled = x * xi;
          const val = this.#underlying(t, x_scaled);
          values_hold[i] = 0.0; // in the last step, not exercising holds no more value
          values_ex[i] = this.#payoff(t, val);
        }
      }

      for (let n = this.#n - 1; n > 0; n--) {
        const interp_hold = library.linear_interpolation_equidistant(
          this.#grid,
          new Float64Array(values_hold), // copy array since it is overwritten in the loop
        );

        const interp_ex = library.linear_interpolation_equidistant(
          this.#grid,
          new Float64Array(values_ex), // copy array since it is overwritten in the loop
        );

        const t = this.#times[n];
        const xi_start = this.#xi[n - 1];
        const xi_end = this.#xi[n];
        const rho = xi_end == 0 ? xi_start : xi_start / xi_end;
        const sigma = Math.sqrt(1 - rho * rho);

        for (let i = 0; i < this.#N; ++i) {
          // x is the standard normal variable corresponding to the model state in time n-1
          const x = this.#grid[i];
          const z1 = rho * x;
          // x_scaled is the actual model state in time n-1
          const x_scaled = x * xi_start;

          // val is the underlying value in time t, model state x
          const val = this.#underlying(t, x_scaled);
          values_ex[i] = this.#payoff(t, val);

          values_hold[i] = this.#integrate((y) => {
            // y is the standard normal variable we integrate over
            // z is the normalized state after transition, z = x_scaled+ x * Math.sqrt(xi_end * xi_end - xi_start * xi_start) / xi_end = rho * x+sigma * y
            let z = z1 + sigma * y;

            // compute the maximum of exercise value and hold value. payoff and hold are interpolated separately to achieve more accuracy around the point they cross
            const ex = interp_ex(z);
            const hold = interp_hold(z);
            return Math.max(ex, hold);
          });
        }
      }

      // final integration
      const interp_hold = library.linear_interpolation_equidistant(
        this.#grid,
        values_hold, // no more copying needed
      );

      const interp_ex = library.linear_interpolation_equidistant(
        this.#grid,
        values_ex, // no more copying needed
      );

      const res = this.#integrate((y) => {
        const ex = interp_ex(y);
        const hold = interp_hold(y);
        return Math.max(ex, hold);
      });

      return res;
    }
  }

  library.GaussianModel = GaussianModel;
})(this.JsonRisk || module.exports);
