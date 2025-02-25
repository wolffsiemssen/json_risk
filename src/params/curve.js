(function (library) {
  /**
   * @memberof library
   */
  var default_yf = null;
  /**
   * converts rate of a curve to zero rates
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
    return library.get_safe_curve({
      type: type || "yield",
      times: [1],
      dfs: [1 / (1 + value)], //zero rates are act/365 annual compounding
    });
  };

  /**
   * get i-th time entry of a curve
   * @param {object} curve curve
   * @param {number} i time
   * @returns {number} time
   * @memberof library
   * @private
   */
  function get_time_at(curve, i) {
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
      throw new Error("get_time_at: invalid curve, cannot derive times");
    }
    return curve.times[i];
  }
  /**
   * get time-array of a curve
   * @param {object} curve curve
   * @returns {array} times in days of given curve
   * @memberof library
   * @public
   */
  library.get_curve_times = function (curve) {
    var i = (curve.times || curve.days || curve.dates || curve.labels || [])
      .length;
    if (!i)
      throw new Error(
        "get_curve_times: invalid curve, need to provide valid times, days, dates, or labels",
      );
    var times = new Array(i);
    while (i > 0) {
      i--;
      times[i] = get_time_at(curve, i);
    }
    return times;
  };

  const get_values = function (curve, compounding) {
    // extract times, rates and discount factors from curve and store in hidden function scope
    let times = library.get_curve_times(curve);
    let size = times.length;
    let zcs = library.get_safe_number_vector(curve.zcs);
    let dfs = library.get_safe_number_vector(curve.dfs);

    if (null === zcs) {
      if (null === dfs)
        throw new Error(
          "get_safe_curve: invalid curve, must provide numeric zcs or dfs",
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
  library.get_safe_curve = function (curve) {
    //if null or other falsy argument is given, returns constant curve
    if (!curve)
      curve = {
        times: [1],
        zcs: [0.0],
      };

    // do not call this twice on a curve. If curve already has get_rate, just return
    if (curve.get_rate instanceof Function) return curve;

    // compounding
    var _compounding = library.compounding_factory(curve.compounding);

    // delete invalid members
    for (const member of ["dfs", "zcs", "times", "days", "dates", "labels"]) {
      if (!Array.isArray(curve[member])) delete curve[member];
    }

    // extract times, rates and discount factors from curve and store in hidden function scope
    var [_size, _times, _zcs] = get_values(curve, _compounding);

    var _get_interpolated_rate;
    let _always_flat = false;
    switch (curve.intp || "".toLowerCase()) {
      case "linear_zc":
        // interpolation on zcs
        _get_interpolated_rate = library.linear_interpolation_factory(
          _times,
          _zcs,
        );
        break;
      case "linear_rt":
        // interpolation on zcs
        _get_interpolated_rate = library.linear_xy_interpolation_factory(
          _times,
          _zcs,
        );
        _always_flat = true;
        break;
      default: {
        // interpolation on dfs
        let _dfs = new Array(_size);
        for (let i = 0; i < _size; i++) {
          _dfs[i] = _compounding.df(_times[i], _zcs[i]);
        }

        const _interpolation = library.linear_interpolation_factory(
          _times,
          _dfs,
        );

        _get_interpolated_rate = function (t) {
          return _compounding.zc(t, _interpolation(t));
        };
        _always_flat = true;
      }
    }

    // extrapolation
    var _short_end_flat = !(curve.short_end_flat === false) || _always_flat;
    var _long_end_flat = !(curve.long_end_flat === false) || _always_flat;
    var _get_rate = function (t) {
      if (t <= _times[0] && _short_end_flat) return _zcs[0];
      if (t >= _times[_size - 1] && _long_end_flat) return _zcs[_size - 1];
      return _get_interpolated_rate(t);
    };

    // attach get_rate function with scenario rule if present

    if (typeof curve._rule === "object") {
      var scenario = {
        labels: curve._rule.labels_x,
        zcs: curve._rule.values[0],
        intp: curve._rule.model === "absolute" ? curve.intp : "linear_zc",
      };
      scenario = library.get_safe_curve(scenario);
      if (curve._rule.model === "multiplicative")
        curve.get_rate = function (t) {
          return _get_rate(t) * scenario.get_rate(t);
        };
      if (curve._rule.model === "additive")
        curve.get_rate = function (t) {
          return _get_rate(t) + scenario.get_rate(t);
        };
      if (curve._rule.model === "absolute")
        curve.get_rate = function (t) {
          return scenario.get_rate(t);
        };
    } else {
      curve.get_rate = _get_rate;
    }

    // define get_df based on zcs
    curve.get_df = function (t) {
      return _compounding.df(t, this.get_rate(t));
    };

    // attach get_fwd_amount based on get_df
    curve.get_fwd_amount = function (tstart, tend) {
      if (tend - tstart < 1 / 512) return 0.0;
      return this.get_df(tstart) / this.get_df(tend) - 1;
    };

    // attach get_times closure in order to reobtain hidden times when needed
    curve.get_times = function () {
      return _times;
    };

    // attach get_zcs closure in order to reobtain hidden zcs when needed
    curve.get_zcs = function () {
      return _zcs;
    };

    return curve;
  };

  /**
   * Get discount factor from curve, calling get_safe_curve in case curve.get_df is not defined
   * @param {object} curve curve
   * @param {number} t
   * @param {number} imin
   * @param {number} imax
   * @returns {number} discount factor
   * @memberof library
   * @public
   */
  library.get_df = function (curve, t) {
    if (curve.get_df instanceof Function) return curve.get_df(t);
    return library.get_safe_curve(curve).get_df(t);
  };

  /**
   * TODO
   * @param {object} curve curve
   * @param {number} t
   * @returns {number} ...
   * @memberof library
   * @public
   */
  library.get_rate = function (curve, t) {
    if (curve.get_rate instanceof Function) return curve.get_rate(t);
    return library.get_safe_curve(curve).get_rate(t);
  };

  /**
   * TODO
   * @param {object} curve curve
   * @param {number} tstart
   * @param {number} tend
   * @returns {number} ...
   * @memberof library
   * @public
   */
  library.get_fwd_amount = function (curve, tstart, tend) {
    if (curve.get_fwd_amount instanceof Function)
      return curve.get_fwd_amount(tstart, tend);
    return library.get_safe_curve(curve).get_fwd_amount(tstart, tend);
  };
})(this.JsonRisk || module.exports);
