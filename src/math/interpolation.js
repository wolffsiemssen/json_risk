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
})(this.JsonRisk || module.exports);
