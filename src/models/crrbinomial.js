(function (library) {
  class CRRBinomialModel {
    #impl = null;
    #std_dev = 0.0;
    #step_std_dev = 0.0;
    #n = 10; // number of steps in the binomial tree
    #dt = 0.0; // time step
    #r = 0.0; // risk-free rate
    #q = 0.0; // dividend yield
    #strike = 0.0; // strike price
    #is_american = true; // if true we calculate the price of an american option, if false we calculate the price of a european option
    // is_american is set by default to true, since this model is meant to be used for american options.
    #first_exercise_step = null; // the number of steps until the first exercise date,
    // used in the backward induction to determine if we are at the first exercise date or not
    // it can be a number or null, if null we assume that the first exercise date is the same as the expiry date for european options,
    // or that the option can be exercised from the first step for american options

    #up = 1; // up factor for the binomial tree
    #down = 1; // down factor for the binomial tree
    #p = 1; // risk-neutral probability of an up move
    #df = 1; // discount factor for one time step
    #tree = []; // tree is a 2D array, where tree[i][j] is the price at time step i and node j, as computed by the #binomial_tree_price function

    constructor(
      time,
      volatility,
      forward,
      strike,
      r = 0.0,
      q = 0.0,
      n = 10,
      first_exercise_time = null,
      is_american = true,
    ) {
      this.#std_dev = volatility * Math.sqrt(time);
      this.#strike = strike;
      this.#n = n;
      this.#r = r;
      this.#q = q;
      this.#is_american = is_american;
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
        this.#maybe_adjust_n(time, volatility);
        this.#dt = time / this.#n;
        this.#step_std_dev = volatility * Math.sqrt(this.#dt);
        this.#up = Math.exp(this.#step_std_dev); // up factor for the binomial tree
        this.#down = Math.exp(-this.#step_std_dev); // down factor for the binomial tree
        this.#p =
          (Math.exp((this.#r - this.#q) * this.#dt) - this.#down) /
          (this.#up - this.#down); // risk-neutral probability of an up move
        this.#df = Math.exp(-this.#r * this.#dt);
        this.#first_exercise_step =
          first_exercise_time !== null
            ? Math.round(first_exercise_time / this.#dt)
            : null; // this is the number of steps until the first exercise date, we round it to the nearest integer.
        // Null means that the first exercise date is the same as the expiry date, and the model behaves like
        // an european option
        this.#df = Math.exp(-this.#r * this.#dt);
        this.#tree = this.#binomial_price_tree(forward);
        this.#impl = this.#backward_induction;
      }
    }

    /*  #initialize() {
      // this function can be used to initialize the model parameters, and can be called from the constructor, 
      // but for now we initialize the parameters directly in the constructor for simplicity
    }*/

    // we need the following function to adjust the number of steps in the binomial tree if the parameters are such that
    // the probability of an up move is negative, which can happen when the time step is too large compared
    // to the volatility and the difference between the risk-free rate and the dividend yield. In this case,
    // we can increase the number of steps until we get a valid probability, and recalculate the parameters
    // of the model accordingly. This is a common issue with binomial models, and it is important
    // to handle it properly to avoid getting incorrect prices.
    #maybe_adjust_n(time, volatility) {
      let n = this.#n;
      if (Math.abs(this.#r - this.#q) * Math.sqrt(time / n) > volatility) {
        n = Math.ceil(
          Math.pow(((this.#r - this.#q) * Math.sqrt(time)) / volatility, 2),
        );
      }
      this.#n = n;
    }

    #binomial_price_tree(forward) {
      // build the binomial tree
      console.debug(
        `Building binomial price tree, forward: ${forward}, up: ${this.#up}, down: ${this.#down}, p: ${this.#p}, df: ${this.#df}, steps: ${this.#n}`,
      );
      const tree = [];
      for (let i = 0; i <= this.#n; i++) {
        tree[i] = [];
        for (let j = 0; j <= i; j++) {
          tree[i][j] =
            forward * Math.pow(this.#up, j) * Math.pow(this.#down, i - j);
        }
      }
      console.debug(`Binomial price tree:`, tree);
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
        console.debug(
          `Calculating payoff at maturity for node ${j}, price ${tree[this.#n][j]}, strike ${this.#strike}, phi ${phi}`,
        );
        payoffs[j] = this.#payoff(tree[this.#n][j], phi);
      }
      return payoffs;
    }

    #backward_values(values) {
      let backward_values = [];
      for (let i = values.length - 1; i >= 0; i--) {
        for (let j = 0; j < i; j++) {
          backward_values[j] =
            this.#df * (this.#p * values[j + 1] + (1 - this.#p) * values[j]);
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
      console.debug(
        `Calculating backward prices for step ${i}`,
        this.#tree[i],
        backward_values,
      );
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
      console.debug(`Starting backward induction, phi:`, phi);
      let values = this.#payoff_maturity(this.#tree, phi);
      let value = [0.0];
      let i = this.#n - 1;
      console.debug(
        `Starting backward induction, initial values at maturity:`,
        values,
      );
      do {
        values = this.#backward_values(values);
        value = this.#backward_prices(values, i, phi);
        i--;
      } while (values.length > 1);
      return value[0];
    }

    // using typescript we could explicitly declare as private the functions that are not meant to be used outside the class,
    // and avoid the need to prefix them with #.
    put_price() {
      return this.#impl(-1);
    }

    call_price() {
      return this.#impl(1);
    }
  }
  library.CRRBinomialModel = CRRBinomialModel;
})(this.JsonRisk || module.exports);
