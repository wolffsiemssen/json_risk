(function (library) {
  /**
   * returns a constant zero-rate curve
   * @function get_const_curve
   * @param {number} value rate of curve
   * @param {string} type type of curve e.g. yield
   * @returns {object} constant curve with discount factors {type, times, dfs}
   * @memberof JsonRisk
   * @public
   */
  library.get_const_curve = function (value, type) {
    if (typeof value !== "number")
      throw new Error("get_const_curve: input must be number.");
    if (value <= -1) throw new Error("get_const_curve: invalid input.");
    return new library.Curve({
      type: type || "yield",
      times: [1],
      zcs: [value], //zero rates are act/365 annual compounding
    });
  };

  // helper function for curve constructor
  let default_yf = null;
  const get_time_at = function (curve, i) {
    if (!curve.times) {
      //construct times from other parameters in order of preference
      //curve times are always act/365
      if (curve.days) return curve.days[i] / 365;
      if (curve.dates) {
        default_yf = default_yf || library.year_fraction_factory("a/365");
        return default_yf(
          library.date_or_null(curve.dates[0]),
          library.date_or_null(curve.dates[i]),
        );
      }
      if (curve.labels) return library.period_str_to_time(curve.labels[i]);
      throw new Error("Curve: invalid curve, cannot derive times");
    }
    return curve.times[i];
  };

  // helper function for curve constructor
  const get_times = function (curve) {
    let i = (curve.times || curve.days || curve.dates || curve.labels || [])
      .length;
    if (!i)
      throw new Error(
        "Curve: invalid curve, need to provide valid times, days, dates, or labels",
      );
    const times = new Array(i);
    while (i > 0) {
      i--;
      times[i] = get_time_at(curve, i);
    }
    return times;
  };

  // helper function for curve constructor
  const get_values = function (curve, compounding) {
    // extract times, rates and discount factors from curve and store in hidden function scope
    let times = get_times(curve);
    let size = times.length;
    let zcs = library.number_vector_or_null(curve.zcs);
    let dfs = library.number_vector_or_null(curve.dfs);

    if (null === zcs) {
      if (null === dfs)
        throw new Error(
          "Curve: invalid curve, must provide numeric zcs or dfs",
        );
      zcs = new Array(size);
      for (let i = 0; i < size; i++) {
        zcs[i] = compounding.zc(times[i], dfs[i]);
      }
    }
    return [size, times, zcs];
  };

  /**
   * Class representing a curve
   * @memberof JsonRisk
   * @extends Simulatable
   */
  class Curve extends library.Simulatable {
    #times = null;
    #zcs = null;
    #intp = null;
    #compounding = null;
    #get_rate = null;
    #get_rate_scenario = null;
    #short_end_flat = true;
    #long_end_flat = true;

    /**
     * Create a Curve.
     * @param {obj} obj A plain object representing a curve. Must contain either times, labels, days or dates, and either zcs or dfs.
     * @param {Array} obj.times A vector of times
     * @param {Array} obj.labels A vector of labels
     * @param {Array} obj.days A vector of days
     * @param {Array} obj.dates A vector of dates
     * @param {Array} obj.zcs A vector of zero-coupon rates
     * @param {Array} obj.dfs A vector of discount factors
     * @param {String} obj.compounding Compounding method, valid values are "a", "annual", "c", "continuous", each case insensitive
     * @param {String} obj.intp Interpolation method, either "linear_zc", "linear_df", "linear_rt", "bessel" or "hermite"
     * @param {bool} obj.short_end_flat Extrapolation method is flat on zeros if this flag is true
     * @param {bool} obj.long_end_flat Extrapolation method is flat on zeros if this flag is true
     */
    constructor(obj) {
      super(obj);

      // compounding
      this.#compounding = library.compounding_factory(obj.compounding);

      // delete invalid members
      for (const member of ["dfs", "zcs", "times", "days", "dates", "labels"]) {
        if (!Array.isArray(obj[member])) delete obj[member];
      }

      // extract times, rates and discount factors from curve and store in hidden function scope
      const [_size, _times, _zcs] = get_values(obj, this.#compounding);
      this.#times = Object.freeze(_times);
      this.#zcs = Object.freeze(_zcs);

      let _get_interpolated_rate;
      let _always_flat = false;
      this.#intp = (obj.intp || "").toLowerCase();
      switch (this.#intp) {
        case "linear_zc":
          // interpolation on zcs
          _get_interpolated_rate = library.linear_interpolation_factory(
            this.#times,
            this.#zcs,
          );
          break;
        case "linear_rt":
          // interpolation on zcs
          _get_interpolated_rate = library.linear_xy_interpolation_factory(
            this.#times,
            this.#zcs,
          );
          _always_flat = true;
          break;
        case "bessel":
        case "hermite":
          // bessel-hermite spline interpolation
          _get_interpolated_rate = library.bessel_hermite_interpolation_factory(
            this.#times,
            this.#zcs,
          );
          break;
        default: {
          // interpolation on dfs
          this.#intp = "linear_df";
          let _dfs = new Array(_size);
          for (let i = 0; i < _size; i++) {
            _dfs[i] = this.#compounding.df(this.#times[i], this.#zcs[i]);
          }

          const _interpolation = library.linear_interpolation_factory(
            this.#times,
            _dfs,
          );

          const comp = this.#compounding;
          _get_interpolated_rate = function (t) {
            return comp.zc(t, _interpolation(t));
          };
          _always_flat = true;
        }
      }

      // extrapolation
      this.#short_end_flat = !(obj.short_end_flat === false) || _always_flat;
      this.#long_end_flat = !(obj.long_end_flat === false) || _always_flat;
      this.#get_rate = function (t) {
        if (t <= _times[0] && this.#short_end_flat) return _zcs[0];
        if (t >= _times[_size - 1] && this.#long_end_flat)
          return _zcs[_size - 1];
        return _get_interpolated_rate(t);
      };

      this.#get_rate_scenario = this.#get_rate;
    }

    // detach scenario rule
    detach_rule() {
      this.#get_rate_scenario = this.#get_rate;
    }

    // attach scenario rule
    attach_rule(rule) {
      if (typeof rule === "object") {
        const scenario = new library.Curve({
          labels: rule.labels_x,
          zcs: rule.values[0],
          intp: rule.model === "absolute" ? this.#intp : "linear_zc",
        });
        if (rule.model === "multiplicative")
          this.#get_rate_scenario = function (t) {
            return this.#get_rate(t) * scenario.get_rate(t);
          };
        if (rule.model === "additive")
          this.#get_rate_scenario = function (t) {
            return this.#get_rate(t) + scenario.get_rate(t);
          };
        if (rule.model === "absolute")
          this.#get_rate_scenario = function (t) {
            return scenario.get_rate(t);
          };
      } else {
        this.detach_rule();
      }
    }

    /**
     * Get the zero coupon rate, aware of the attached scenario.
     * @param {number} t the time
     * @return {number} Zero-coupon rate for time t.
     */
    get_rate(t) {
      return this.#get_rate_scenario(t);
    }

    /**
     * Get the discount factor, aware of the attached scenario.
     * @param {number} t the time
     * @return {number} Discount factor for time t.
     */
    get_df(t) {
      return this.#compounding.df(t, this.#get_rate_scenario(t));
    }

    /**
     * Get the forward amount for a future time period, aware of the attached scenario.
     * @param {number} tstart the start time of the period
     * @param {number} tend the end time of the peroid
     * @return {number} Returns the forward amount per unit of notional when using the curve as a forward curve. The forward amount is defined as the discount factr at tstart, divided by the discount factor at tend, minus 1.
     */
    get_fwd_amount(tstart, tend) {
      if (tend - tstart < 1 / 512) return 0.0;
      return this.get_df(tstart) / this.get_df(tend) - 1;
    }

    /**
     * Get the times.
     * @type {Array}
     */
    get times() {
      return this.#times;
    }

    /**
     * Get the zero coupon rates.
     * @type {Array}
     */
    get zcs() {
      return this.#zcs;
    }

    /**
     * Get the type, always returns "yield"
     * @type {string}
     */
    get type() {
      return "yield";
    }

    /**
     * Get the interpolation method
     * @type {string}
     */
    get intp() {
      return this.#intp;
    }

    /**
     * Get the long end extrapolation flag
     * @type {boolean}
     */
    get long_end_flat() {
      return this.#long_end_flat;
    }

    /**
     * Get the short end extrapolation flag
     * @type {boolean}
     */
    get short_end_flat() {
      return this.#short_end_flat;
    }

    /**
     * Get the compounding method
     * @type {string}
     */
    get compounding() {
      return this.#compounding.name;
    }

    /**
     * Get the discount factors.
     * @type {Array}
     */
    get dfs() {
      let res = new Array(this.#times.length);
      for (let i = 0; i < res.length; i++) {
        res[i] = this.#compounding.df(this.#times[i], this.#zcs[i]);
      }
      return res;
    }

    /**
     * Helper for cloning and serialisation
     * @function
     * @return {Object} A plain javascript object representing the curve
     */
    toJSON() {
      const res = super.toJSON();
      res.type = this.type;
      res.times = this.times;
      res.zcs = this.#zcs;
      res.intp = this.#intp;
      res.compounding = this.#compounding.name;
      if (this.#intp !== "linear_rt" && this.#intp !== "linear_df") {
        res.long_end_flat = this.#long_end_flat;
        res.short_end_flat = this.#long_end_flat;
      }
      return res;
    }
  }

  library.Curve = Curve;
})(this.JsonRisk || module.exports);
