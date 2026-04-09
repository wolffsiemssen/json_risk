(function (library) {
  /**
   * Cox-Ross-Rubinstein binomial tree model for option pricing. This model is used to price american options, and can also be used to price european options by setting the first exercise date to the expiry date, or to null.
   * The model is implemented as a class, which takes as input the time to maturity, the volatility, the forward price, the strike price, the number of steps in the tree, the discount factor at the risk-free rate, the discount factor at the dividend yield, and the first exercise date (if any).
   * The model builds a binomial tree of prices, and then uses backward induction to calculate the option price at time 0.
   * The model can handle both constant and time-varying discount factors for both the risk-free rate and the dividend yield, by passing an array of discount factors for each time step in the tree.
   * The model also checks for consistency of the input parameters, and throws an error if they are not consistent.
   * @memberof JsonRisk
   */
  class CRRBinomialModel {
    #impl = null;
    #std_dev = 0.0;
    #step_std_dev = 0.0; // standard deviation of the price changes at each time step in the tree, calculated as volatility multiplied by the square root of the time step
    #n = 10; // number of steps in the binomial tree - 1. We use n steps, but the tree has n+1 rows, since we start from time 0.
    #dt = 0.0; // time step, calculated as time to maturity divided by the number of steps
    #Bq = [1.0]; // discount factor at the dividend yield, defined as exp(-q*t), we keep it as an array to be able to handle the case where the dividend yield is not constant, and we need to use different discount factors for different time steps in the tree
    #B = [1.0]; // discount factor at the risk-free rate, defined as exp(-r*t), we keep it as an array to be able to handle the case where the risk-free rate is not constant, and we need to use different discount factors for different time steps in the tree
    #strike = 0.0; // strike price
    #is_american = true; // if true we calculate the price of an american option, if false we calculate the price of a european option
    // is_american is set by default to true, since this model is meant to be used for american options.
    #first_exercise_step = null; // the number of steps until the first exercise date,
    // used in the backward induction to determine if we are at the first exercise date or not
    // it can be a number or null, if null we assume that the first exercise date is the same as the expiry date for european options,
    // or that the option can be exercised from the first step for american options

    #up = 1; // up factor for the binomial tree
    #down = 1; // down factor for the binomial tree
    #p = [1.0]; // risk-neutral probability of an up move, calculated as in the original Cox-Ross-Rubinstein paper, we keep it as an array to be able to handle the case where the risk-neutral probability is not constant, and we need to use different probabilities for different time steps in the tree
    #tree = []; // tree is a 2D array, where tree[i][j] is the price at time step i and node j, as computed by the #binomial_tree_price function

    /**
     *
     * @param {number} time // time to maturity
     * @param {number} volatility  // black, e.g. log-normal volatility
     * @param {number} forward // forward price of the underlying at time 0, which will be used to build the binomial tree, and to calculate the payoff at maturity. The model will adjust it with the dividend yield and risk-free rate to get the forward price at each time step in the tree.
     * @param {number} strike // strike price of the option, used to calculate the payoff at maturity, and the payoff at each time step in the tree for american options
     * @param {number} n // number of steps in the binomial tree, used to build the tree and to calculate the time step
     * @param {object} curve_B // this can be an object with a get_df method, or an array of discount factors for each time step in the tree, or a single discount factor to be used for all time steps in the tree, which will be then converted to an array of discount factors by taking the nth root of the discount factor, where n is the number of steps in the tree. This is used to calculate the discount factors for each time step in the tree, which are used in the backward induction to calculate the option price.
     * @param {object | number | array} Bq // the discount factor of dividend yields. This can be an array of discount factors for each time step in the tree, or a single discount factor to be used for all time steps in the tree, which will be then converted to an array of discount factors by taking the nth root of the discount factor, where n is the number of steps in the tree. This is used to calculate the discount factors for each time step in the tree, which are used in the backward induction to calculate the option price, and also to calculate the risk-neutral probabilities for each time step in the tree.
     * @param {number | null} first_exercise_time // the time of the first exercise date, used to determine when we start to check for early exercise in the backward induction. This is used for american options, and can be set to null for european options, in which case we assume that the first exercise date is the same as the expiry date.
     * @param {boolean} is_american // if true we calculate the price of an american option, if false we calculate the price of a european option. This is used to determine if we check for early exercise in the backward induction or not.
     */
    constructor(
      time,
      volatility,
      forward,
      strike,
      n = 10,
      curve_B = null,
      Bq = [1.0],
      first_exercise_time = null,
      is_american = true,
    ) {
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
          // expiring option or very low volatility, return inner value
          return Math.max(phi * (forward - strike), 0);
        };
      } else {
        this.#strike = strike;
        this.#n = n;
        this.#is_american = is_american;
        this.#check_input();
        this.#initialize(
          time,
          forward,
          volatility,
          first_exercise_time,
          curve_B,
          Bq,
        );
      }
    }

    #initialize(time, forward, volatility, first_exercise_time, curve_B, Bq) {
      // we initialize the model parameters, and build the binomial tree, which will be used in the backward induction to calculate the option price.
      // we also check the consistency of the input parameters, and throw an error if they are not consistent.
      if (curve_B !== null && typeof curve_B.get_df === "function") {
        for (let i = this.#n - 1; i >= 0; i--) {
          const t_i = (i * time) / this.#n;
          const t_iplus1 = ((i + 1) * time) / this.#n;
          this.#B[this.#n - 1 - i] =
            curve_B.get_df(t_iplus1) / curve_B.get_df(t_i);
          // we calculate the discount factor for each time step in the tree as the ratio of the discount factors
          // at the end and the beginning of the time step.
          // keep in mind that get_df returns the discount factor from time 0 to time t, where 0 is maturity, and t the time from start to maturity
          // whereas step 0 in the tree corresponds to the start time, and step n corresponds to the maturity time.
          // Therefore, the ratio get_df(t_iplus1) / get_df(t_i) gives the discount factor of the (n-1-i)th step in the tree.
        }
      } else {
        this.#B = Array.isArray(curve_B)
          ? curve_B
          : Array(this.#n).fill(Math.pow(curve_B, 1 / this.#n));
      }
      // Bq will eventually be entered as curve_Bq, going through the same logic as curve_B
      // but for the moment the model instrument does not support dividend yield curves,
      // so we pass Bq directly as a parameter to the model,
      // and we keep it as an array to be able to handle the case where the dividend yield is not constant,
      // and we need to use different discount factors for different time steps in the tree
      this.#Bq = Array.isArray(Bq)
        ? Bq
        : Array(this.#n).fill(Math.pow(Bq, 1 / this.#n));
      this.#check_dfs();

      this.#dt = time / this.#n;
      this.#step_std_dev = volatility * Math.sqrt(this.#dt);
      this.#up = Math.exp(this.#step_std_dev);
      this.#down = Math.exp(-this.#step_std_dev);
      this.#p = this.#B.map(
        (B_i, i) => (this.#Bq[i] / B_i - this.#down) / (this.#up - this.#down),
      ); // we calculate the risk-neutral probability for each time step in the tree, using the corresponding discount factors
      // for the risk-free rate and the dividend yield at that time step
      this.#first_exercise_step =
        first_exercise_time !== null
          ? Math.round(first_exercise_time / this.#dt)
          : null; // this is the number of steps until the first exercise date, we round it to the nearest integer.
      // Null means that the first exercise date is the same as the expiry date, and the model behaves like
      // an european option

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

    #check_dfs() {
      if (this.#Bq.length !== this.#B.length) {
        throw new Error(
          `Inconsistent parameters: Bq and B arrays must have the same length, got Bq length ${this.#Bq.length} and B length ${this.#B.length}`,
        );
      }
      if (this.#B.length !== this.#n) {
        throw new Error(
          `Inconsistent parameters: B array must have length n, got B length ${this.#B.length} and n ${this.#n}`,
        );
      }
      if (this.#B.some((B_i) => B_i <= 0)) {
        throw new Error(
          `Invalid input: B values must be positive, got B ${this.#B}`,
        );
      }
      if (this.#Bq.some((Bq_i) => Bq_i <= 0)) {
        throw new Error(
          `Invalid input: Bq values must be positive, got Bq ${this.#Bq}`,
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
      // if the option is american, we check if we are at or after the first exercise step,
      // and if so we take the maximum between the backward value and the payoff at that node,
      // otherwise we just take the backward value.

      // phi is 1 for call and -1 for put
      return backward_values.map((value, index) => {
        if (!this.#is_american) {
          return value;
        }

        const beforeFirstExercise =
          this.#first_exercise_step !== null && i < this.#first_exercise_step;

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
