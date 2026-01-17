(function (library) {
  const identity = function (t) {
    return t;
  };

  const STD_DEV_RANGE = 6;
  const RESOLUTION = 12;

  /**
   * Class representing an LGM (Linear Gauss Markov, equivalent to Hull-White) model. Reference: Hagan, Patrick. (2019). EVALUATING AND HEDGING EXOTIC SWAP INSTRUMENTS VIA LGM.
   * @memberof JsonRisk
   */
  class LGM {
    #h = identity;
    #int_h_prime_minus_2 = identity;
    #mean_reversion = 0.0;
    #xi = [];
    #t_ex = [];

    /**
     * Create an LGM model
     * @param {number} m A hull-white mean reversion
     */
    constructor(m = 0) {
      if (typeof m !== "number")
        throw new Error("LGM: mean reversion m must be a number");
      if (m < 0) throw new Error("LGM: mean reversion m must be positive");
      this.#mean_reversion = m;
      if (m === 0) {
        this.#h = identity;
        this.#int_h_prime_minus_2 = identity;
      }
      if (m > 0) {
        this.#h = function (t) {
          return (1 - Math.exp(-m * t)) / m;
        };
        this.#int_h_prime_minus_2 = function (t) {
          return (0.5 / m) * (Math.exp(2 * m * t) - 1);
        };
      }
    }

    /**
     * Parametrise the LGM with a vector of times and a constant Hull-White volatility
     * @param {Array} t_exercise the vector of exercise times
     * @param {number} sigma the constant Hull-White volatility
     */
    set_times_and_hull_white_volatility(t_exercise, sigma) {
      if (typeof sigma !== "number")
        throw new Error("LGM: Hull-White volatility sigma must be a number");
      if (sigma < 0)
        throw new Error("LGM: Hull-White volatility sigma must be positive");
      this.#t_ex = new Float64Array(t_exercise.length);
      this.#xi = new Float64Array(t_exercise.length);
      for (let i = 0; i < t_exercise.length; i++) {
        if (typeof t_exercise[i] !== "number")
          throw new Error("LGM: t_exercise must a vector of numbers");
        this.#t_ex[i] = t_exercise[i];
        let tlast = i > 0 ? this.#t_ex[i - 1] : 0;
        if (this.#t_ex[i] <= tlast)
          throw new Error("LGM: t_exercise must be positive and increasing");
        this.#xi[i] = sigma * sigma * this.#int_h_prime_minus_2(t_exercise[i]);
      }
    }

    /**
     * Get a vector of Hull-White volatilities from the parametrised model
     * @type {Array} vector of volatilities for the Hull-White model
     */
    get hull_white_volatility() {
      const sigma = new Array(this.#t_ex.length);
      for (let i = 0; i < sigma.length; i++) {
        const xi = this.#xi[i];
        const xi_last = i === 0 ? 0.0 : this.#xi[i - 1];
        const t = this.#t_ex[i];
        const t_last = i === 0 ? 0.0 : this.#t_ex[i - 1];

        const dxi = xi - xi_last;
        const dhpm2 =
          this.#int_h_prime_minus_2(t) - this.#int_h_prime_minus_2(t_last);
        sigma[i] = Math.sqrt(dxi / dhpm2);
      }
      return sigma;
    }

    /**
     * Get a vector of exercise times from the parametrised model
     * @type {Array} vector of times
     */
    get t_ex() {
      return Array.from(this.#t_ex);
    }

    /**
     * Get a vector of LGM volatilities (xis) from the parametrised model
     * @type {Array} vector of volatilities for the LGM model
     */
    get xi() {
      return Array.from(this.#xi);
    }

    /**
     * Get the mean reversoin
     * @type {number} mean reversion for the LGM model
     */
    get mean_reversion() {
      return this.#mean_reversion;
    }

    /**
     * Calculates the discounted cash flow present value for a given vector of states (reduced value according to formula 4.14b)
     * @param {object} cf_obj
     * @param {} t_exercise
     * @param {object} discount_factors
     * @param {} xi volatility parameters
     * @param {} state state vector
     * @param {} opportunity_spread opportunity spread
     * @returns {number} present value
     * @memberof JsonRisk
     * @public
     */

    #dcf(cf_obj, t_exercise, discount_factors, xi, state, opportunity_spread) {
      /*

        Calculates the discounted cash flow present value for a given vector of states (reduced value according to formula 4.14b)

        requires cf_obj of type
        {
            current_principal: array(double),
            t_pmt: array(double),
            pmt_total: array(double),
            pmt_interest: array(double)
        }

        state must be an array of numbers

        */
      if (!state.length)
        throw new Error("lgm_dcf: state variable must be an array of numbers");

      var i = 0,
        j,
        dh,
        temp,
        dh_dh_xi_2;
      var res = new Float64Array(state.length);
      var times = cf_obj.t_pmt;
      var amounts = cf_obj.pmt_total;
      // move forward to first line after exercise date
      while (times[i] <= t_exercise) i++;

      //include accrued interest if interest payment is part of the cash flow object
      var accrued_interest = 0;
      if (cf_obj.pmt_interest) {
        accrued_interest =
          i === 0
            ? 0
            : (cf_obj.pmt_interest[i] * (t_exercise - times[i - 1])) /
              (times[i] - times[i - 1]);
      }
      // include principal payment on exercise date
      var sadj = strike_adjustment(
        cf_obj,
        t_exercise,
        discount_factors,
        opportunity_spread,
      );
      temp =
        -(cf_obj.current_principal[i] + accrued_interest + sadj) *
        discount_factors[discount_factors.length - 1];
      dh = this.#h(t_exercise);
      dh_dh_xi_2 = dh * dh * xi * 0.5;
      for (j = 0; j < state.length; j++) {
        res[j] = temp * Math.exp(-dh * state[j] - dh_dh_xi_2);
      }

      // include all payments after exercise date
      while (i < times.length) {
        dh = this.#h(cf_obj.t_pmt[i]);
        temp = amounts[i] * discount_factors[i];
        if (temp !== 0) {
          dh_dh_xi_2 = dh * dh * xi * 0.5;
          for (j = 0; j < state.length; j++) {
            res[j] += temp * Math.exp(-dh * state[j] - dh_dh_xi_2);
          }
        }
        i++;
      }
      return res;
    }

    /**
     * Calibrate and parametrise LGM against the supplied basket of swaptions
     * @param {object} basket basket
     * @param {object} disc_curve discount curve
     * @param {object} fwd_curve forward curve
     * @param {object} surface surface
     * @memberof JsonRisk
     */
    calibrate(basket, disc_curve, fwd_curve, surface) {
      this.#xi = new Float64Array(basket.length);
      this.#t_ex = new Float64Array(basket.length);
      let xi, cf_obj, tte, discount_factors, target;

      const func = function (xi) {
        const val = this.european_call(
          cf_obj,
          tte,
          disc_curve,
          xi,
          null,
          null,
          null,
          discount_factors,
        );
        return val - target;
      }.bind(this);

      for (let i = 0; i < basket.length; i++) {
        if (library.time_from_now(basket[i].first_exercise_date) > 1 / 512) {
          tte = library.time_from_now(basket[i].first_exercise_date);
          this.#t_ex[i] = tte;

          //first step: derive initial guess based on Hagan formula 5.16c
          //get swap fixed cash flow adjusted for basis spread
          cf_obj = european_swaption_adjusted_cashflow(
            basket[i],
            disc_curve,
            fwd_curve,
          );

          discount_factors = get_discount_factors(
            cf_obj,
            tte,
            disc_curve,
            null,
            null,
          );
          let denominator = 0;
          for (let j = 0; j < cf_obj.t_pmt.length; j++) {
            denominator +=
              cf_obj.pmt_total[j] *
              discount_factors[j] *
              this.#h(cf_obj.t_pmt[j]);
          }
          //bachelier swaption price and std deviation
          target = basket[i].value_with_curves(disc_curve, fwd_curve, surface);
          const std_dev_bachelier = basket[i].std_dev;

          //initial guess
          xi = Math.pow(
            (std_dev_bachelier * basket[i].annuity(disc_curve)) / denominator,
            2,
          );

          //second step: calibrate, but be careful with infeasible bachelier prices below min and max
          let min_value = this.#dcf(
            cf_obj,
            tte,
            discount_factors,
            0,
            [0],
            null,
          )[0];

          //max value is value of the payoff without redemption payment
          let max_value =
            min_value +
            basket[i].fixed_leg.payments[0].notional *
              discount_factors[discount_factors.length - 1];
          //min value (attained at vola=0) is maximum of zero and current value of the payoff
          if (min_value < 0) min_value = 0;

          const accuracy = target * 1e-7 + 1e-7;

          if (target <= min_value + accuracy || 0 === xi) {
            xi = 0;
          } else {
            if (target > max_value) target = max_value;
            let approx = func(xi);
            let j = 10;
            while (approx < 0 && j > 0) {
              j--;
              xi *= 2;
              approx = func(xi);
            }
            try {
              xi = library.find_root_ridders(func, 0, xi, 20, accuracy);
            } catch (e) {
              //use initial guess or zero as fallback, whichever is better
              if (Math.abs(target - min_value) < Math.abs(approx)) xi = 0;
            }
          }

          if (i > 0 && this.#xi[i - 1] > xi) {
            this.#xi[i] = this.#xi[i - 1]; //fallback if monotonicity is violated
          } else {
            this.#xi[i] = xi;
          }
        }
      }
    }

    /**
     * Calculates the european call option price on a cash flow (closed formula 5.7b).
     * @param {object} cf_obj
     * @param {} t_exercise
     * @param {object} disc_curve
     * @param {} xi
     * @param {object} spread_curve spread curve
     * @param {} residual_spread residual spread
     * @param {} opportunity_spread opportunity spread
     * @param {object} discount_factors_precalc
     * @returns {number} the option value
     * @memberof JsonRisk
     */
    european_call(
      cf_obj,
      t_exercise,
      disc_curve,
      xi,
      spread_curve,
      residual_spread,
      opportunity_spread,
      discount_factors_precalc,
    ) {
      /*

        Calculates the european call option price on a cash flow (closed formula 5.7b).

        requires cf_obj of type
        {
            current_principal: array(double),
            t_pmt: array(double),
            pmt_total: array(double)
            pmt_interest: array(double)
        }

        */

      var discount_factors =
        discount_factors_precalc ||
        get_discount_factors(
          cf_obj,
          t_exercise,
          disc_curve,
          spread_curve,
          residual_spread,
        ); // if discount factors are not provided, get them

      if (t_exercise < 0) return 0; //expired option
      if (t_exercise < 1 / 512 || xi < 1e-10)
        return Math.max(
          0,
          this.#dcf(
            cf_obj,
            t_exercise,
            discount_factors,
            0,
            [0],
            opportunity_spread,
          )[0],
        ); //very low volatility

      var std_dev = Math.sqrt(xi);
      var dh = this.#h(t_exercise + 1 / 365) - this.#h(t_exercise);
      var break_even;

      const func = function (x) {
        return this.#dcf(
          cf_obj,
          t_exercise,
          discount_factors,
          xi,
          [x],
          opportunity_spread,
        )[0];
      }.bind(this);

      // if std_dev is very large, break_even/std_dev tends to -infinity and break_even/std_dev + dh*std_dev tends to +infinity for all possible values of dh.
      // cumulative normal distribution is practically zero if quantile is outside of -10 and +10.
      // in order for break_even/std_dev < -10 and break_even/std_dev + dh+std_dev > 10, dh*std_dev must be larger than 20
      // larger values for std_dev do not make any sense
      if (std_dev > 20 / dh) {
        std_dev = 20 / dh;
        break_even = -10 * std_dev;
      } else {
        //
        //find break even point and good initial guess for it
        //

        var lower, upper;

        if (func(0) >= 0) {
          lower = 0;
          upper = std_dev * STD_DEV_RANGE;
          if (func(upper) > 0) {
            //special case where payoff is always positive, return expectation
            return this.#dcf(
              cf_obj,
              t_exercise,
              discount_factors,
              0,
              [0],
              opportunity_spread,
            )[0];
          }
        } else {
          upper = 0;
          lower = -std_dev * STD_DEV_RANGE;
          if (func(lower) < 0) {
            // special case where payoff value is always negative, return zero
            return 0;
          }
        }

        try {
          break_even = library.find_root_ridders(func, upper, lower, 20);
        } catch (e) {
          //fall back to numeric price
          return this.bermudan_call(
            cf_obj,
            [t_exercise],
            disc_curve,
            [xi],
            spread_curve,
            residual_spread,
            opportunity_spread,
          );
        }
      }

      var i = 0;
      var one_std_dev = 1 / std_dev;

      // move forward to first line after exercise date
      while (cf_obj.t_pmt[i] <= t_exercise) i++;

      //include accrued interest if interest payment is part of the cash flow object
      var accrued_interest = 0;
      if (cf_obj.pmt_interest) {
        accrued_interest =
          i === 0
            ? 0
            : (cf_obj.pmt_interest[i] * (t_exercise - cf_obj.t_pmt[i - 1])) /
              (cf_obj.t_pmt[i] - cf_obj.t_pmt[i - 1]);
      }

      // include principal payment on or before exercise date
      dh = this.#h(t_exercise);
      var sadj = strike_adjustment(
        cf_obj,
        t_exercise,
        discount_factors,
        opportunity_spread,
      );
      var res =
        -(cf_obj.current_principal[i] + accrued_interest + sadj) *
        discount_factors[discount_factors.length - 1] *
        library.cndf(break_even * one_std_dev + dh * std_dev);

      // include all payments after exercise date
      while (i < cf_obj.t_pmt.length) {
        dh = this.#h(cf_obj.t_pmt[i]);
        res +=
          cf_obj.pmt_total[i] *
          discount_factors[i] *
          library.cndf(break_even * one_std_dev + dh * std_dev);
        i++;
      }
      return res;
    }

    /**
     * Calculates the bermudan call option price on a cash flow (numeric integration according to martingale formula 4.14a).
     * @param {object} cf_obj
     * @param {} exercise_vec
     * @param {object} disc_curve discount curve
     * @param {} xi_vec
     * @param {object} spread_curve spread curve
     * @param {} residual_spread
     * @param {} opportunity_spread
     * @returns {object} cash flow
     * @memberof JsonRisk
     * @public
     */
    bermudan_call(
      cf_obj,
      t_exercise_vec,
      disc_curve,
      xi_vec,
      spread_curve,
      residual_spread,
      opportunity_spread,
    ) {
      if (t_exercise_vec[t_exercise_vec.length - 1] < 0) return 0; //expired option
      if (t_exercise_vec[t_exercise_vec.length - 1] < 1 / 512) {
        return this.european_call(
          cf_obj,
          t_exercise_vec[t_exercise_vec.length - 1],
          disc_curve,
          0,
          spread_curve,
          residual_spread,
          opportunity_spread,
        ); //expiring option
      }

      /**
       * Creates a new state vector
       * @returns {number} ...
       * @memberof JsonRisk
       * @private
       */
      function make_state_vector() {
        //repopulates state vector and ds measure
        var res = new Float64Array(2 * STD_DEV_RANGE * RESOLUTION + 1);
        res[0] = -STD_DEV_RANGE * std_dev;
        for (i = 1; i < n; i++) {
          res[i] = res[i - 1] + ds;
        }
        return res;
      }
      /**
       * updates the value vector with the maximum of payof and hold for each state, inserts a discontinuity adjustment
       * @memberof JsonRisk
       * @private
       */
      function update_value() {
        //take maximum of payoff and hold values
        var i_d = 0;
        for (i = 0; i < n; i++) {
          value[i] = Math.max(hold[i], payoff[i], 0);
          if (!i_d && i > 0) {
            if ((payoff[i] - hold[i]) * (payoff[i - 1] - hold[i - 1]) < 0) {
              i_d = i; //discontinuity where payoff-hold changes sign
            }
          }
        }
        //account for discontinuity if any
        if (i_d) {
          var max_0 = value[i_d - 1],
            max_1 = value[i_d];
          var min_0 = Math.min(payoff[i_d - 1], hold[i_d - 1]),
            min_1 = Math.min(payoff[i_d], hold[i_d]);
          var cross = (max_0 - min_0) / (max_1 - min_1 + max_0 - min_0);
          var err =
            0.25 * (cross * (max_1 - min_1) + (1 - cross) * (max_0 - min_0));
          value[i_d] -= cross * err;
          value[i_d - 1] -= (1 - cross) * err;
        }
      }

      /**
       * Performs numeric integration according to the LGM martingale formula
       * @param {} j state index
       * @returns {} ...
       * @memberof JsonRisk
       * @private
       */
      function numeric_integration(j) {
        if (xi_last - xi < 1e-12) return value[j];
        var temp = 0,
          dp_lo = 0,
          dp_hi,
          norm_scale = 1 / Math.sqrt(xi_last - xi),
          increment = ds_last * norm_scale,
          i = 0,
          x = (state_last[0] - state[j] + 0.5 * ds_last) * norm_scale;
        while (x < -STD_DEV_RANGE) {
          x += increment;
          i += 1;
        }
        while (x < STD_DEV_RANGE) {
          if (i >= n) break;
          dp_hi = library.fast_cndf(x);
          temp += value[i] * (dp_hi - dp_lo);
          dp_lo = dp_hi; // for next iteration
          x += increment;
          i++;
        }
        return temp;
      }

      var n = 2 * STD_DEV_RANGE * RESOLUTION + 1;
      var j, i, n_ex;
      var xi,
        xi_last = 0,
        std_dev,
        ds,
        ds_last;
      var state, state_last;
      var payoff;
      var value = new Float64Array(n);
      var hold = new Float64Array(n);
      var discount_factors;

      //n_ex starts at last exercise date
      n_ex = xi_vec.length - 1;

      //iterate backwards through call dates if at least one call date is left
      while (n_ex >= 0) {
        //set volatility and state parameters
        xi = xi_vec[n_ex];
        std_dev = Math.sqrt(xi);
        ds = std_dev / RESOLUTION;
        state = make_state_vector();

        //payoff is what option holder obtains when exercising
        discount_factors = get_discount_factors(
          cf_obj,
          t_exercise_vec[n_ex],
          disc_curve,
          spread_curve,
          residual_spread,
        );
        payoff = this.#dcf(
          cf_obj,
          t_exercise_vec[n_ex],
          discount_factors,
          xi,
          state,
          opportunity_spread,
        );

        //hold is what option holder obtains when not exercising
        if (n_ex < xi_vec.length - 1) {
          for (j = 0; j < n; j++) {
            hold[j] = numeric_integration(j); //hold value is determined by martingale formula
          }
        } else {
          for (j = 0; j < n; j++) {
            hold[j] = 0; //on last exercise date, hold value is zero (no more option left to hold).
          }
        }

        //value is maximum of payoff and hold
        update_value();

        //prepare next iteration
        xi_last = xi;
        state_last = state;
        ds_last = ds;
        n_ex--;
      }

      //last integration for time zero, state zero
      state = [0];

      xi = 0;
      hold = numeric_integration(0); //last integration according to martingale formula
      return hold;
    }
  }

  library.LGM = LGM;

  /**
   * precalculates discount factors for each cash flow and for t_exercise
   * @param {object} cf_obj cash flow
   * @param {object} t_exercise time when optionality can be exercised
   * @param {object} disc_curve discount curve
   * @param {object} spread_curve spread curve
   * @param {} residual_spread residual spread
   * @returns {object} discount factors
   * @memberof JsonRisk
   * @private
   */
  const get_discount_factors = function (
    cf_obj,
    t_exercise,
    disc_curve,
    spread_curve,
    residual_spread,
  ) {
    var res = new Array(cf_obj.t_pmt.length + 1); //last item holds discount factor for t_exercise
    var i = 0,
      rate;
    if (typeof residual_spread !== "number") residual_spread = 0;
    var fast = !spread_curve && 0 === residual_spread;

    // move forward to first line after exercise date
    while (cf_obj.t_pmt[i] <= 0) i++;

    //discount factors for cash flows after t_exercise
    while (i < cf_obj.t_pmt.length) {
      if (fast) {
        res[i] = disc_curve.get_df(cf_obj.t_pmt[i]);
      } else {
        rate = disc_curve.get_rate(cf_obj.t_pmt[i]);
        if (spread_curve) rate += spread_curve.get_rate(cf_obj.t_pmt[i]);
        rate += residual_spread;
        res[i] = Math.pow(1 + rate, -cf_obj.t_pmt[i]);
      }
      i++;
    }

    //discount factor for t_exercise
    if (fast) {
      res[i] = disc_curve.get_df(t_exercise);
    } else {
      rate = disc_curve.get_rate(t_exercise);
      if (spread_curve) rate += spread_curve.get_rate(t_exercise);
      rate += residual_spread;
      res[i] = Math.pow(1 + rate, -t_exercise);
    }
    return res;
  };

  /**
   * calculated a strike adjustment reflecting the opportunity spread
   * @param {object} cf_obj
   * @param {} t_exercise
   * @param {object} discount_factors
   * @param {} opportunity_spread
   * @returns {object} ...
   * @memberof JsonRisk
   * @private
   */
  const strike_adjustment = function (
    cf_obj,
    t_exercise,
    discount_factors,
    opportunity_spread,
  ) {
    if (!opportunity_spread) return 0;
    var i = 0,
      df;
    var res = 0;
    // move forward to first line after exercise date
    while (cf_obj.t_pmt[i] <= t_exercise) i++;

    // include all payments after exercise date

    while (i < cf_obj.t_pmt.length) {
      res +=
        cf_obj.current_principal[i] *
        discount_factors[i] *
        opportunity_spread *
        (cf_obj.t_pmt[i] - Math.max(cf_obj.t_pmt[i - 1], t_exercise));
      i++;
    }

    df = discount_factors[discount_factors.length - 1];
    res /= df;
    return res;
  };

  /**
   * Calculates correction for multi curve valuation - move basis spread to fixed leg
   * @param {object} swaption Instrument
   * @param {object} disc_curve discount curve
   * @param {object} fwd_curve forward curve
   * @param {} fair_rate fair rate
   * @returns {object} cash flow
   * @memberof JsonRisk
   * @public
   */
  const european_swaption_adjusted_cashflow = function (
    swaption,
    disc_curve,
    fwd_curve,
  ) {
    //correction for multi curve valuation - move basis spread to fixed leg
    const { fixed_leg, float_leg } = swaption;
    let fixed_rate = swaption.fixed_rate();
    const pv_float_singlecurve = float_leg.value_with_curves(
      disc_curve,
      disc_curve,
    );
    const pv_float_multicurve = float_leg.value_with_curves(
      disc_curve,
      fwd_curve,
    );
    const annuity = fixed_leg.annuity(disc_curve);
    if (annuity != 0) {
      // pv of original swap with multi curve valuation should be equal to pv of corrected swap with single curve valuation
      // i.e.
      // pv_fix_corrected + pv_float_singlecurve = pv_fix + pv_float_multicurve
      // pv_fix_corrected - pv_fix = pv_float_multicorve - pv_float_singlecurve
      // annuity * correction = pv_float_multicurve - pv_float_singlecurve
      // correction = (pv_float_multicurve - pv_float_singlecurve) / annuity

      fixed_rate += (pv_float_multicurve - pv_float_singlecurve) / annuity;
    }

    // calculate cash flow amounts to account for new fixed rate
    const p1 = fixed_leg.payments[0];
    const cf = {
      current_principal: [0.0],
      t_pmt: [library.time_from_now(p1.date_start)],
      pmt_total: [-p1.notional],
      pmt_interest: [0.0],
    };

    for (const p of swaption.fixed_leg.payments) {
      cf.current_principal.push(p.notional);
      cf.t_pmt.push(library.time_from_now(p.date_pmt));
      const amount = p.yf ? p.notional * p.yf * fixed_rate : 0.0;
      cf.pmt_total.push(amount);
      cf.pmt_interest.push(amount);
    }

    // add final principal exchange cash flows
    cf.pmt_total[cf.pmt_total.length - 1] +=
      cf.current_principal[cf.pmt_total.length - 1];

    return cf;
  };
})(this.JsonRisk || module.exports);
