(function (library) {
  /**
   * ...
   * @param {number} value
   * @param {string} type
   * @returns {object} surface
   * @memberof library
   * @public
   */
  library.get_const_surface = function (value, type) {
    if (typeof value !== "number")
      throw new Error("get_const_surface: input must be number.");
    return library.get_safe_surface({
      type: type || "",
      expiries: [1],
      terms: [1],
      values: [[value]],
    });
  };
  /**
   * ...
   * @param {object} surface surface
   * @param {number} i
   * @returns {number} term at time i
   * @memberof library
   * @private
   */
  function get_term_at(surface, i) {
    //construct terms from labels_term if terms are not defined
    if (surface.terms) return surface.terms[i];
    if (surface.labels_term)
      return library.period_str_to_time(surface.labels_term[i]);
    throw new Error("get_term_at: invalid surface, cannot derive terms");
  }
  /**
   * ...
   * @param {object} surface surface
   * @param {number} i
   * @returns {number} expiry at time i
   * @memberof library
   * @private
   */
  function get_expiry_at(surface, i) {
    //construct expiries from labels_expiry if expiries are not defined
    if (surface.expiries) return surface.expiries[i];
    if (surface.labels_expiry)
      return library.period_str_to_time(surface.labels_expiry[i]);
    throw new Error("get_expiry_at: invalid surface, cannot derive expiries");
  }
  /**
   * ...
   * @param {object} surface surface
   * @returns {object} terms
   * @memberof library
   * @private
   */
  function get_terms(surface) {
    var i = (surface.terms || surface.labels_term || []).length;
    if (!i)
      throw new Error(
        "get_surface_terms: invalid surface, need to provide valid terms or labels_term",
      );
    var terms = new Array(i);
    while (i > 0) {
      i--;
      terms[i] = get_term_at(surface, i);
    }
    return terms;
  }
  /**
   * ...
   * @param {object} surface surface
   * @returns {object} experies
   * @memberof library
   * @private
   */
  function get_expiries(surface) {
    var i = (surface.expiries || surface.labels_expiry || []).length;
    if (!i)
      throw new Error(
        "get_surface_terms: invalid surface, need to provide valid expiries or labels_expiry",
      );
    var expiries = new Array(i);
    while (i > 0) {
      i--;
      expiries[i] = get_expiry_at(surface, i);
    }
    return expiries;
  }
  /**
   * ...
   * @param {object} surface surface
   * @returns {object} surface
   * @memberof library
   * @public
   */
  library.get_safe_surface = function (surface) {
    //if valid surface is given, attach get_rate function and handle scenarios
    //if null or other falsy argument is given, returns constant zero surface
    if (!surface) return library.get_const_surface(0.0);

    // apply scenario rule if present
    var scen = null;
    if (typeof surface._rule === "object") {
      scen = {
        labels_expiry: surface._rule.labels_y,
        labels_term: surface._rule.labels_x,
        values: surface._rule.values,
      };
      if (scen.labels_expiry.length !== scen.values.length)
        throw new Error(
          "get_safe_surface: length of scenario labels_y must match length of scenario values outer array",
        );
      if (scen.labels_term.length !== scen.values[0].length)
        throw new Error(
          "get_safe_surface: length of scenario labels_x must match length of scenario values inner arrays",
        );

      if (surface._rule.model === "multiplicative")
        surface.get_rate = function (t_expiry, t_term) {
          return (
            get_surface_rate(surface, t_expiry, t_term) *
            get_surface_rate(scen, t_expiry, t_term)
          );
        };
      if (surface._rule.model === "additive")
        surface.get_rate = function (t_expiry, t_term) {
          return (
            get_surface_rate(surface, t_expiry, t_term) +
            get_surface_rate(scen, t_expiry, t_term)
          );
        };
      if (surface._rule.model === "absolute")
        surface.get_rate = function (t_expiry, t_term) {
          return get_surface_rate(scen, t_expiry, t_term);
        };
    } else {
      // no scenario
      surface.get_rate = function (t_expiry, t_term) {
        return get_surface_rate(surface, t_expiry, t_term);
      };
    }

    if (surface.moneyness && surface.smile) {
      if (!surface.moneyness.length || !surface.smile.length)
        throw new Error(
          "get_cube_rate: invalid cube, moneyness and smile must be arrays",
        );
      for (var i = 0; i < surface.smile.length; i++) {
        library.get_safe_surface(surface.smile[i]);
      }
    }

    return surface;
  };
  /**
   * ...
   * @param {object} surface
   * @param {date} i_expiry
   * @param {} t_term
   * @param {} imin
   * @param {} imax
   * @returns {number} slice rate
   * @memberof library
   * @privat
   */
  function get_slice_rate(surface, i_expiry, t_term) {
    var imin = 0;
    var imax = (surface.terms || surface.labels_term || []).length - 1;

    var sl = surface.values[i_expiry];
    if (!Array.isArray(sl))
      throw new Error(
        "get_slice_rate: invalid surface, values property must be an array of arrays",
      );
    //slice only has one value left
    if (imin === imax) return sl[imin];
    var tmin = get_term_at(surface, imin);
    var tmax = get_term_at(surface, imax);
    //extrapolation (constant)
    if (t_term < get_term_at(surface, imin)) return sl[imin];
    if (t_term > get_term_at(surface, imax)) return sl[imax];
    // binary search
    var imed, tmed;
    while (imin + 1 !== imax) {
      imed = ((imin + imax) / 2.0) | 0; // truncate the mean time down to the closest integer
      tmed = get_term_at(surface, imed);
      if (t_term > tmed) {
        tmin = tmed;
        imin = imed;
      } else {
        tmax = tmed;
        imax = imed;
      }
    }
    //interpolation (linear)
    if (tmax - tmin < 1 / 512)
      throw new Error(
        "get_slice_rate: invalid surface, support points must be increasing and differ at least one day",
      );
    var temp = 1 / (tmax - tmin);
    return (sl[imin] * (tmax - t_term) + sl[imax] * (t_term - tmin)) * temp;
  }
  /**
   * ...
   * @param {object} surface
   * @param {date} t_expiry
   * @param {} t_term
   * @returns {number} surface rate
   */
  function get_surface_rate(surface, t_expiry, t_term) {
    var imin = 0;
    var imax = (surface.expiries || surface.labels_expiry || []).length - 1;

    // surface only has one slice left
    if (imin === imax) return get_slice_rate(surface, imin, t_term);
    var tmin = get_expiry_at(surface, imin);
    var tmax = get_expiry_at(surface, imax);
    // extrapolation (constant)
    if (t_expiry < tmin) return get_slice_rate(surface, imin, t_term);
    if (t_expiry > tmax) return get_slice_rate(surface, imax, t_term);
    // binary search
    var imed, tmed;
    while (imin + 1 !== imax) {
      // truncate the mean time down to the closest integer
      imed = ((imin + imax) / 2.0) | 0;
      tmed = get_expiry_at(surface, imed);
      if (t_expiry > tmed) {
        tmin = tmed;
        imin = imed;
      } else {
        tmax = tmed;
        imax = imed;
      }
    }
    // interpolation (linear)
    if (tmax - tmin < 1 / 512)
      throw new Error(
        "get_surface_rate: invalid surface, support points must be increasing and differ at least one day",
      );
    var temp = 1 / (tmax - tmin);
    return (
      (get_slice_rate(surface, imin, t_term) * (tmax - t_expiry) +
        get_slice_rate(surface, imax, t_term) * (t_expiry - tmin)) *
      temp
    );
  }

  /**
   * ...
   * @param {object} surface
   * @param {date} t_expiry
   * @param {} t_term
   * @returns {number} surface rate
   */
  library.get_surface_rate = function (surface, t_expiry, t_term) {
    if (surface.get_rate instanceof Function)
      return surface.get_rate(t_expiry, t_term);
    return library.get_safe_surface(surface).get_rate(t_expiry, t_term);
  };

  library.get_cube_rate = function (cube, t_expiry, t_term, m) {
    var atm = library.get_surface_rate(cube, t_expiry, t_term);
    if (cube.moneyness && cube.smile) {
      if (!cube.moneyness.length || !cube.smile.length)
        throw new Error(
          "get_cube_rate: invalid cube, moneyness and smile must be arrays",
        );
      var imin = 0;
      var imax = cube.moneyness.length - 1;

      //surface only has one slice left
      if (imin === imax)
        return (
          atm + library.get_surface_rate(cube.smile[imin], t_expiry, t_term)
        );
      var mmin = cube.moneyness[imin];
      var mmax = cube.moneyness[imax];
      //extrapolation (constant)
      if (m < mmin)
        return (
          atm + library.get_surface_rate(cube.smile[imin], t_expiry, t_term)
        );
      if (m > mmax)
        return (
          atm + library.get_surface_rate(cube.smile[imax], t_expiry, t_term)
        );
      // binary search
      var imed, mmed;
      while (imin + 1 !== imax) {
        imed = ((imin + imax) / 2.0) | 0; // truncate the mean time down to the closest integer
        mmed = cube.moneyness[imed];
        if (m > mmed) {
          mmin = mmed;
          imin = imed;
        } else {
          mmax = mmed;
          imax = imed;
        }
      }
      //interpolation (linear)
      if (mmax - mmin < 1e-15)
        throw new Error(
          "get_cube_rate: invalid cube, moneyness must be nondecreasing",
        );
      var temp = 1 / (mmax - mmin);
      return (
        atm +
        (library.get_surface_rate(cube.smile[imin], t_expiry, t_term) *
          (mmax - m) +
          library.get_surface_rate(cube.smile[imax], t_expiry, t_term) *
            (m - mmin)) *
          temp
      );
    }
    return atm;
  };
})(this.JsonRisk || module.exports);
