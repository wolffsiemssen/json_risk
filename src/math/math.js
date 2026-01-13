(function (library) {
  "use strict";

  var RT2PI = Math.sqrt(4.0 * Math.acos(0.0));
  var SPLIT = 7.07106781186547;
  var N0 = 220.206867912376;
  var N1 = 221.213596169931;
  var N2 = 112.079291497871;
  var N3 = 33.912866078383;
  var N4 = 6.37396220353165;
  var N5 = 0.700383064443688;
  var N6 = 3.52624965998911e-2;
  var M0 = 440.413735824752;
  var M1 = 793.826512519948;
  var M2 = 637.333633378831;
  var M3 = 296.564248779674;
  var M4 = 86.7807322029461;
  var M5 = 16.064177579207;
  var M6 = 1.75566716318264;
  var M7 = 8.83883476483184e-2;

  /**
   * ...
   * @param {number} x
   * @returns {number} ...
   * @memberof JsonRisk
   * @public
   */
  library.ndf = function (x) {
    return Math.exp((-x * x) / 2.0) / RT2PI;
  };

  /**
   * cumulative normal distribution function with double precision according to Graeme West, BETTER APPROXIMATIONS TO CUMULATIVE NORMAL FUNCTIONS, 2004
   * @param {number} x
   * @returns {number} ...
   * @memberof JsonRisk
   * @public
   */
  library.cndf = function (x) {
    var z = Math.abs(x);
    var c;

    if (z <= 37.0) {
      var e = Math.exp((-z * z) / 2.0);
      if (z < SPLIT) {
        var n =
          (((((N6 * z + N5) * z + N4) * z + N3) * z + N2) * z + N1) * z + N0;
        var d =
          ((((((M7 * z + M6) * z + M5) * z + M4) * z + M3) * z + M2) * z + M1) *
            z +
          M0;
        c = (e * n) / d;
      } else {
        var f = z + 1.0 / (z + 2.0 / (z + 3.0 / (z + 4.0 / (z + 13.0 / 20.0))));
        c = e / (RT2PI * f);
      }
    } else if (z > 37.0) {
      c = 0;
    } else {
      throw new Error("cndf: invalid input.");
    }
    return x <= 0.0 ? c : 1 - c;
  };

  var D1 = 0.049867347;
  var D2 = 0.0211410061;
  var D3 = 0.0032776263;
  var D4 = 0.0000380036;
  var D5 = 0.0000488906;
  var D6 = 0.000005383;

  /**
   * fast cumulative normal distribution function according to Abramowitz and Stegun
   * @param {number} x
   * @returns {number} ...
   * @memberof JsonRisk
   * @public
   */
  library.fast_cndf = function (x) {
    var z = x > 0 ? x : -x;
    var f = 1 + z * (D1 + z * (D2 + z * (D3 + z * (D4 + z * (D5 + z * D6)))));
    f *= f;
    f *= f;
    f *= f;
    f *= f; // raise to the power of -16
    f = 0.5 / f;
    return x >= 0 ? 1 - f : f;
  };

  /**
   * TODO
   * @param {} func
   * @param {number} start
   * @param {number} next
   * @param {number} max_iter
   * @param {number} threshold
   * @returns {number} ...
   * @memberof JsonRisk
   * @public
   */
  library.find_root_secant = function (func, start, next, max_iter, threshold) {
    var x = start,
      xnext = next,
      temp = 0,
      iter = max_iter || 20,
      t = threshold || 0.00000001;
    var f = func(x),
      fnext = func(xnext);
    if (Math.abs(fnext) > Math.abs(f)) {
      //swap start values if start is better than next
      temp = x;
      x = xnext;
      xnext = temp;
      temp = f;
      f = fnext;
      fnext = temp;
    }
    while (Math.abs(fnext) > t && Math.abs(x - xnext) > t && iter > 0) {
      temp = ((x - xnext) * fnext) / (fnext - f);
      x = xnext;
      f = fnext;
      xnext = x + temp;
      fnext = func(xnext);

      iter--;
    }
    if (iter <= 0)
      throw new Error("find_root_secant: failed, too many iterations");
    if (isNaN(xnext)) {
      throw new Error("find_root_secant: failed, invalid result");
    }
    return xnext;
  };
  /**
   * signum function
   * @param {number} x
   * @returns {number} signum
   * @memberof JsonRisk
   * @private
   */
  function signum(x) {
    if (x > 0) return 1;
    if (x < 0) return -1;
    return 0;
  }
  /**
   * TODO
   * @param {} func
   * @param {number} start
   * @param {number} next
   * @param {number} max_iter
   * @param {number} threshold
   * @returns {number} ...
   * @memberof JsonRisk
   * @public
   */
  library.find_root_ridders = function (
    func,
    start,
    next,
    max_iter,
    threshold,
  ) {
    var x = start,
      y = next,
      z = 0,
      w = 0,
      r = 0,
      iter = max_iter || 20,
      t = threshold || 0.00000001;
    var fx = func(x),
      fy = func(y),
      fz,
      fw;
    if (fx * fy > 0)
      throw new Error(
        "find_root_ridders: start values do not bracket the root",
      );
    if (Math.abs(fx) < t) return x;
    if (Math.abs(fy) < t) return y;
    while (iter > 0) {
      iter--;
      z = (x + y) * 0.5;
      if (Math.abs(x - y) < 1e-15) return z;
      fz = func(z);
      if (Math.abs(fz) < t) return z;
      r = Math.sqrt(fz * fz - fy * fx);
      if (0 === r) return z;
      w = ((z - x) * signum(fx - fy) * fz) / r + z;
      if (isNaN(w)) w = z;
      fw = func(w);
      if (Math.abs(fw) < t) return w;
      if (fz * fw < 0) {
        x = w;
        fx = fw;
        y = z;
        fy = fz;
        continue;
      }
      if (fx * fw < 0) {
        y = w;
        fy = fw;
        continue;
      }
      if (fy * fw < 0) {
        x = w;
        fx = fw;
        continue;
      }
    }
    if (iter <= 0)
      throw new Error("find_root_ridders: failed, too many iterations");
  };
})(this.JsonRisk || module.exports);
