(function (library) {
  class CRRBinomialModel {
    #impl = null;
    #std_dev = 0.0;
    #step_std_dev = 0.0;
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

    constructor(
      time,
      volatility,
      forward,
      strike,
      n = 10,
      B = [1.0],
      Bq = [1.0],
      first_exercise_time = null,
      is_american = true,
    ) {
      this.#std_dev = volatility * Math.sqrt(time);
      this.#strike = strike;
      this.#n = n;
      this.#B = Array.isArray(B) ? B : Array(n).fill(Math.pow(B, 1 / n)); // if B is not an array, we assume that the risk-free rate is constant, and we set all the discount factors to the same value, otherwise we use the provided array of discount factors for each time step in the tree
      this.#Bq = Array.isArray(Bq) ? Bq : Array(n).fill(Math.pow(Bq, 1 / n)); // if Bq is not provided, we assume that the dividend yield is zero, and we set all the discount factors to 1.0
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
        this.#initialize(time, forward, volatility, first_exercise_time);
      }
    }

    #initialize(time, forward, volatility, first_exercise_time) {
      this.#check_inputs();

      this.#dt = time / this.#n;
      this.#step_std_dev = volatility * Math.sqrt(this.#dt);
      this.#up = Math.exp(this.#step_std_dev); // up factor for the binomial tree
      this.#down = Math.exp(-this.#step_std_dev); // down factor for the binomial tree,
      // risk-neutral probability of an up move, calculated as in the original Cox-Ross-Rubinstein paper
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
      console.debug(
        `Initialized CRRBinomialModel with time ${time}, forward ${forward}, volatility ${volatility}, strike ${this.#strike}, n ${this.#n}, B ${this.#B}, Bq ${this.#Bq}, first exercise step ${this.#first_exercise_step}, is american ${this.#is_american}, up ${this.#up}, down ${this.#down}, p ${this.#p}`,
      );
      this.#tree = this.#binomial_price_tree(forward);
      this.#impl = this.#backward_induction;
    }

    #check_inputs() {
      if (this.#n <= 0) {
        throw new Error(`Invalid input: n must be positive, got n ${this.#n}`);
      }
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
      if (this.#strike < 0) {
        throw new Error(
          `Invalid input: strike must be non-negative, got strike ${this.#strike}`,
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
      // this function can be used to test the consistency of the model parameters, and can be called from the constructor after initializing the parameters,
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
      console.debug(
        `Building binomial price tree, forward: ${forward}, up: ${this.#up}, down: ${this.#down}, p: ${this.#p}, steps: ${this.#n}`,
      );
      const tree = [];
      for (let i = 0; i <= this.#n; i++) {
        tree[i] = [];
        for (let j = 0; j <= i; j++) {
          tree[i][j] =
            // forward * Math.pow(this.#up, j) * Math.pow(this.#down, i - j);
            forward * Math.pow(this.#up, 2 * j - i);
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

    #backward_values(values, time_step) {
      let backward_values = [];
      for (let i = values.length - 1; i >= 0; i--) {
        for (let j = 0; j < i; j++) {
          console.debug(
            `Calculating backward value for node ${j} at step ${time_step}, values at next step: up ${values[j + 1]}, down ${values[j]}, p ${this.#p[time_step]}, df B ${this.#B[time_step]}`,
          );
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
        values = this.#backward_values(values, i);
        value = this.#backward_prices(values, i, phi);
        console.debug(
          `Backward induction step ${i}, values:`,
          values,
          `backward prices:`,
          value,
        );
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
