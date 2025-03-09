(function (library) {
  "use strict";

  const find_index = function (x, s) {
    let index = 0;
    while (s > x[index + 1] && index < x.length - 2) {
      index++;
    }
    return index;
  };

  library.linear_interpolation_factory = function (x, y) {
    if (x.length !== y.length)
      throw new Error(
        "interpolation_factory: invalid input, x and y must have the same length",
      );
    if (0 === x.length)
      throw new Error(
        "interpolation_factory: invalid input, vectors have length zero",
      );
    if (1 === x.length)
      return function () {
        return x[0];
      };
    return function (s) {
      const index = find_index(x, s);
      const temp = 1 / (x[index + 1] - x[index]);
      return (
        (y[index] * (x[index + 1] - s) + y[index + 1] * (s - x[index])) * temp
      );
    };
  };

  library.linear_xy_interpolation_factory = function (x, y) {
    if (x.length !== y.length)
      throw new Error(
        "interpolation_factory: invalid input, x and y must have the same length",
      );
    let xy = new Array(x.length);
    for (let i = 0; i < x.length; i++) {
      if (x[i] <= 0)
        throw new Error(
          "interpolation_factory: linear xy interpolation requires x to be greater than zero",
        );
      xy[i] = x[i] * y[i];
    }
    const linear = library.linear_interpolation_factory(x, xy);
    return function (s) {
      if (s <= 0)
        throw new Error(
          "linear xy interpolation requires x to be greater than zero",
        );
      return linear(s) / s;
    };
  };

  library.bessel_hermite_interpolation_factory = function (x, y) {
    const n = x.length;
    if (n !== y.length)
      throw new Error(
        "interpolation_factory: invalid input, x and y must have the same length",
      );
    // need at least three support points, otherwise fall back to linear
    if (n < 3) {
      return library.linear_interpolation_factory(x, y);
    }

    const dx = new Array(n);
    const dy = new Array(n);
    dx[0] = 0;
    dy[0] = 0;
    for (let i = 1; i < n; i++) {
      dx[i] = x[i] - x[i - 1];
      dy[i] = y[i] - y[i - 1];
    }

    let b = new Array(n);

    // left boundary
    b[0] =
      (((x[2] + x[1] - 2 * x[0]) * dy[1]) / dx[1] - (dx[1] * dy[2]) / dx[2]) /
      (x[2] - x[0]);

    // inner points
    for (let i = 1; i < n - 1; i++) {
      b[i] =
        ((dx[i + 1] * dy[i]) / dx[i] + (dx[i] * dy[i + 1]) / dx[i + 1]) /
        (x[i + 1] - x[i - 1]);
    }

    // right boundary
    b[n - 1] =
      (((2 * x[n - 1] - x[n - 2] - x[n - 3]) * dy[n - 1]) / dx[n - 1] -
        (dx[n - 1] * dy[n - 2]) / dx[n - 2]) /
      (x[n - 1] - x[n - 3]);

    let c = new Array(n - 1);
    let d = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      let m = dy[i + 1] / dx[i + 1];
      c[i] = (3 * m - b[i + 1] - 2 * b[i]) / dx[i + 1];
      d[i] = (b[i + 1] + b[i] - 2 * m) / dx[i + 1] / dx[i + 1];
    }

    return function (s) {
      const i = find_index(x, s);
      const ds = s - x[i];
      return y[i] + ds * (b[i] + ds * (c[i] + ds * d[i]));
    };
  };
})(this.JsonRisk || module.exports);
