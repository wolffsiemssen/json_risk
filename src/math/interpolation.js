(function (library) {
  "use strict";

  const find_index = function (x, s) {
    let index = 0;
    while (s > x[index + 1] && index < x.length - 2) {
      index++;
    }
    return index;
  };

  library.find_index = find_index;

  const copy_and_check_arrays = function (x, y) {
    const n = x.length;
    if (y.length !== n)
      throw new Error(
        "interpolation_factory: invalid input, x and y must have the same length",
      );
    if (0 === n)
      throw new Error(
        "interpolation_factory: invalid input, vectors have length zero",
      );
    const x_ = new Float64Array(n);
    const y_ = new Float64Array(n);
    x_[0] = x[0];
    y_[0] = y[0];
    for (let i = 1; i < n; i++) {
      if (x[i] <= x[i - 1])
        throw new Error(
          "interpolation_factory: invalid input, x must be increasing",
        );
      x_[i] = x[i];
      y_[i] = y[i];
    }
    return [x_, y_];
  };

  library.linear_interpolation = function (x, y) {
    // function that makes no more checks and copies
    if (1 === x.length) {
      const y0 = y[0];
      return function (s_not_used) {
        return y0;
      };
    }
    return function (s) {
      const index = find_index(x, s);
      const temp = 1 / (x[index + 1] - x[index]);
      return (
        (y[index] * (x[index + 1] - s) + y[index + 1] * (s - x[index])) * temp
      );
    };
  };

  library.linear_interpolation_factory = function (x, y) {
    const [x_, y_] = copy_and_check_arrays(x, y);
    return library.linear_interpolation(x_, y_);
  };

  library.linear_xy_interpolation_factory = function (x, y) {
    const [x_, y_] = copy_and_check_arrays(x, y);

    if (x_[0] <= 0)
      throw new Error(
        "interpolation_factory: linear xy interpolation requires all x to be greater than zero",
      );

    const xy_ = new Float64Array(x_.length);
    for (let i = 0; i < x_.length; i++) {
      xy_[i] = x_[i] * y_[i];
    }
    const linear = library.linear_interpolation(x_, xy_);
    return function (s) {
      if (s <= 0)
        throw new Error(
          "linear xy interpolation requires x to be greater than zero",
        );
      return linear(s) / s;
    };
  };

  library.bessel_hermite_interpolation_factory = function (x, y) {
    const [x_, y_] = copy_and_check_arrays(x, y);
    const n = x_.length;
    // need at least three support points, otherwise fall back to linear
    if (n < 3) {
      return library.linear_interpolation(x_, y_);
    }

    const dx = new Float64Array(n);
    const dy = new Float64Array(n);
    dx[0] = 0;
    dy[0] = 0;
    for (let i = 1; i < n; i++) {
      dx[i] = x_[i] - x_[i - 1];
      dy[i] = y_[i] - y_[i - 1];
    }

    let b = new Float64Array(n);

    // left boundary
    b[0] =
      (((x_[2] + x_[1] - 2 * x_[0]) * dy[1]) / dx[1] -
        (dx[1] * dy[2]) / dx[2]) /
      (x_[2] - x_[0]);

    // inner points
    for (let i = 1; i < n - 1; i++) {
      b[i] =
        ((dx[i + 1] * dy[i]) / dx[i] + (dx[i] * dy[i + 1]) / dx[i + 1]) /
        (x_[i + 1] - x_[i - 1]);
    }

    // right boundary
    b[n - 1] =
      (((2 * x_[n - 1] - x_[n - 2] - x_[n - 3]) * dy[n - 1]) / dx[n - 1] -
        (dx[n - 1] * dy[n - 2]) / dx[n - 2]) /
      (x_[n - 1] - x_[n - 3]);

    let c = new Float64Array(n - 1);
    let d = new Float64Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      let m = dy[i + 1] / dx[i + 1];
      c[i] = (3 * m - b[i + 1] - 2 * b[i]) / dx[i + 1];
      d[i] = (b[i + 1] + b[i] - 2 * m) / dx[i + 1] / dx[i + 1];
    }

    return function (s) {
      const i = find_index(x_, s);
      const ds = s - x_[i];
      return y_[i] + ds * (b[i] + ds * (c[i] + ds * d[i]));
    };
  };
})(this.JsonRisk || module.exports);
