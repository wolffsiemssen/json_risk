(function (library) {
  /**
   * Cox-Ross-Rubinstein binomial tree model for option pricing.
   * @memberof JsonRisk
   */
  class CRRBinomialModel {
    #impl = null;
    #std_dev = 0.0;
    #up = 1.0;
    #n = 10; // number of steps in the binomial tree
    #n_first_exercise = 0; // the number of steps until the first exercise date
    #B = null; // forward discount factors
    #strike = 0.0; // strike price
    #p = [1.0]; // risk-neutral probability of an up move
    #tree = []; // tree is a 2D array, where tree[i][j] is the price at time step i and node j, as computed by the #binomial_tree_price function

    /**
     * Create a CRR binomial model
     * @param {number} t_start // time to first exercise
     * @param {number} t_end // time to maturity
     * @param {number} volatility  // black, e.g. log-normal volatility
     * @param {number} forward // forward price of the underlying at time 0, which will be used to build the binomial tree, and to calculate the payoff at maturity. The model will adjust it with the dividend yield and risk-free rate to get the forward price at each time step in the tree.
     * @param {number} strike // strike price of the option, used to calculate the payoff at maturity, and the payoff at each time step in the tree for american options
     * @param {number} n // number of steps in the binomial tree, used to build the tree and to calculate the time step
     * @param {object} disc_curve // doscount curve
     * @param {number} q // continuous dividend yield
     */
    constructor(t_start, t_end, volatility, forward, strike, n, disc_curve, q) {
      this.#std_dev = volatility * Math.sqrt(t_end);
      if (t_end <= 0) {
        this.#impl = function (phi_not_used) {
          // expired option
          return 0.0;
        };
      } else if (t_end < 1 / 512 || this.#std_dev < 0.000001) {
        this.#impl = function (phi) {
          // expiring option or very low volatility, return inner value
          return Math.max(phi * (forward - strike), 0);
        };
      } else {
        this.#strike = strike;
        this.#n = n;
        this.#check_input();
        this.#initialize(t_start, t_end, volatility, forward, disc_curve, q);
      }
    }

    #initialize(t_start, t_end, volatility, forward, disc_curve, q) {
      // we initialize the model parameters, and build the binomial tree, which will be used in the backward induction to calculate the option price.
      // we also check the consistency of the input parameters, and throw an error if they are not consistent.
      const dt = t_end / this.#n;

      // we calculate the discount factor for each time step in the tree as the ratio of the discount factors
      // at the end and the beginning of the time step, e.g., a forward discount factor
      this.#B = new Array(this.#n);
      this.#B[0] = 1.0;
      for (let i = 1; i < this.#n; i++) {
        this.#B[i] =
          disc_curve.get_df(i * dt) / disc_curve.get_df((i - 1) * dt);
      }

      // Bq is the discount factor corresponding to the dividend yield q and one time step
      const Bq = Math.exp(-dt * q);

      // risk-neutral probabilities, using the corresponding discount factors
      // for the risk-free rate and the dividend yield at that time step
      const up = Math.exp(volatility * Math.sqrt(dt));
      this.#up = up;
      const down = 1.0 / up;
      this.#p = this.#B.map((B_i) => (Bq / B_i - down) / (up - down));

      // this is the number of steps until the first exercise date, we round it down
      this.#n_first_exercise = Math.trunc(t_start / dt);

      this.#check_consistency();
      this.#tree = this.#binomial_price_tree(forward);
      this.#impl = this.#backward_induction;
    }

    #check_input() {
      if (this.#n <= 0) {
        throw new Error(`Invalid input: n must be positive, got n ${this.#n}`);
      }
      if (this.#strike < 0) {
        throw new Error(
          `Invalid input: strike must be non-negative, got strike ${this.#strike}`,
        );
      }
    }

    #check_consistency() {
      // this function is used to check the consistency of the model
      for (let i = 0; i < this.#p.length; i++) {
        if (this.#p[i] < 0 || this.#p[i] > 1) {
          throw new Error(
            `Inconsistent parameters: p values must be between 0 and 1, got p[${i}] = ${this.#p[i]}`,
          );
        }
      }
    }

    #binomial_price_tree(forward) {
      // build the binomial tree
      const tree = [];
      for (let i = 0; i <= this.#n; i++) {
        tree[i] = [];
        for (let j = 0; j <= i; j++) {
          tree[i][j] = forward * Math.pow(this.#up, 2 * j - i);
        }
      }
      return tree;
    }

    #payoff(price, phi) {
      return Math.max(phi * (price - this.#strike), 0);
    }

    #payoff_maturity(tree, phi) {
      // tree is a 2D array, where tree[i][j] is the price at time step i and node j,
      // as computed by the #binomial_tree_price function.
      // This function returns an array of payoffs at maturity, where payoffs[j] is the payoff at node j in the last row of the tree,
      // which corresponds to the maturity. The payoff is calculated as max(phi * (price - strike), 0), where phi is 1 for call options and -1 for put options.
      const payoffs = [];
      for (let j = 0; j <= this.#n; j++) {
        payoffs[j] = this.#payoff(tree[this.#n][j], phi);
      }
      return payoffs;
    }

    #backward_values(values, time_step) {
      let backward_values = [];
      for (let i = values.length - 1; i >= 0; i--) {
        for (let j = 0; j < i; j++) {
          backward_values[j] =
            this.#B[time_step] *
            (this.#p[time_step] * values[j + 1] +
              (1 - this.#p[time_step]) * values[j]);
        }
      }
      return backward_values;
    }

    #backward_prices(backward_values, i, phi) {
      // this function takes the backward values at time step i+1, and calculates the backward values at time step i,
      // taking into account the possibility of early exercise if we are at or after the first exercise step
      const beforeFirstExercise = i < this.#n_first_exercise;

      // phi is 1 for call and -1 for put
      return backward_values.map((value, index) => {
        if (beforeFirstExercise) {
          return value;
        }

        const exerciseValue = this.#payoff(this.#tree[i][index], phi);
        return Math.max(value, exerciseValue);
      });
    }

    #backward_induction(phi) {
      let values = this.#payoff_maturity(this.#tree, phi);
      let value = [0.0];
      let i = this.#n - 1;
      do {
        values = this.#backward_values(values, i);
        value = this.#backward_prices(values, i, phi);
        i--;
      } while (values.length > 1);
      return value[0];
    }

    /**
     * Calculate the price of a put option
     */
    put_price() {
      return this.#impl(-1);
    }

    /**
     *  Calculate the price of a call option
     */
    call_price() {
      return this.#impl(1);
    }
  }
  library.CRRBinomialModel = CRRBinomialModel;
})(this.JsonRisk || module.exports);
