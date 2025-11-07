(function (library) {
  /**
   * @memberof library
   */
  var default_yf = null;
  /**
   * returns a constant zero-rate curve
   * @param {number} value rate of curve
   * @param {string} type type of curve e.g. yield
   * @returns {object} constant curve with discount factors {type, times, dfs}
   * @memberof library
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
  const get_time_at = function (curve, i) {
    if (!curve.times) {
      //construct times from other parameters in order of preference
      //curve times are always act/365
      if (curve.days) return curve.days[i] / 365;
      if (curve.dates) {
        default_yf = default_yf || library.year_fraction_factory("a/365");
        return default_yf(
          library.get_safe_date(curve.dates[0]),
          library.get_safe_date(curve.dates[i]),
        );
      }
      if (curve.labels) return library.period_str_to_time(curve.labels[i]);
      throw new Error("Curve: invalid curve, cannot derive times");
    }
    return curve.times[i];
  };

  // helper function for curve constructor
  const get_times = function (curve) {
    var i = (curve.times || curve.days || curve.dates || curve.labels || [])
      .length;
    if (!i)
      throw new Error(
        "Curve: invalid curve, need to provide valid times, days, dates, or labels",
      );
    var times = new Array(i);
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
    let zcs = library.get_safe_number_vector(curve.zcs);
    let dfs = library.get_safe_number_vector(curve.dfs);

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
   * attaches get_rate and other function to curve. If curve is null or falsy, create valid constant curve
   * @param {object} curve curve
   * @returns {object} curve
   * @memberof library
   * @public
   */
  class Curve extends library.Simulatable {
    #type = "yield";
    #times = null;
    #zcs = null;
    #intp = null;
    #compounding = null;
    #get_rate = null;
    #get_rate_scenario = null;

    constructor(obj) {
      super(obj);
      // type
      if (typeof obj.type === "string") this.#type = obj.type;

      // compounding
      this.#compounding = library.compounding_factory(obj.compounding);

      // delete invalid members
      for (const member of ["dfs", "zcs", "times", "days", "dates", "labels"]) {
        if (!Array.isArray(obj[member])) delete obj[member];
      }

      // extract times, rates and discount factors from curve and store in hidden function scope
      const [_size, _times, _zcs] = get_values(obj, this.#compounding);
      this.#times = _times;
      this.#zcs = _zcs;

      var _get_interpolated_rate;
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
      var _short_end_flat = !(obj.short_end_flat === false) || _always_flat;
      var _long_end_flat = !(obj.long_end_flat === false) || _always_flat;
      this.#get_rate = function (t) {
        if (t <= _times[0] && _short_end_flat) return _zcs[0];
        if (t >= _times[_size - 1] && _long_end_flat) return _zcs[_size - 1];
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
        var scenario = new library.Curve({
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
    // define get_rate aware of attached scenario
    get_rate(t) {
      return this.#get_rate_scenario(t);
    }

    // define get_df based on zcs, aware of attached scenario
    get_df(t) {
      return this.#compounding.df(t, this.#get_rate_scenario(t));
    }

    // attach get_fwd_amount based on get_df
    get_fwd_amount(tstart, tend) {
      if (tend - tstart < 1 / 512) return 0.0;
      return this.get_df(tstart) / this.get_df(tend) - 1;
    }

    // reobtain copy of hidden times when needed
    get times() {
      return Array.from(this.#times);
    }

    // reobtain copy of hidden zcs when needed
    get zcs() {
      return Array.from(this.#zcs);
    }

    // reobtain copy of hidden dfs when needed
    get dfs() {
      let res = new Array(this.#times.length);
      for (let i = 0; i < res.length; i++) {
        res[i] = this.#compounding.df(this.#times[i], this.#zcs[i]);
      }
      return res;
    }

    get type() {
      return this.#type;
    }
  }

  library.Curve = Curve;
})(this.JsonRisk || module.exports);
