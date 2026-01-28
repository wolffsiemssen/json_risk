(function (library) {
  "use strict";

  const copy_and_check_arrays = function (x1, x2, y) {
    if (!Array.isArray(x1) || !Array.isArray(x2) || !Array.isArray(y))
      throw new Error(
        "interpolation2d_factory: invalid input, input must be arrays.",
      );
    const n1 = x1.length;
    const n2 = x2.length;
    if (0 === n1 || 0 === n2)
      throw new Error(
        "interpolation2d_factory: invalid input, x1 and x2 cannot be empty.",
      );
    if (y.length !== n1)
      throw new Error(
        "interpolation2d_factory: invalid input, y must have the same length as x1",
      );
    const x1_ = new Float64Array(n1);
    const x2_ = new Float64Array(n2);
    const y_ = new Float64Array(n1 * n2);

    for (let i1 = 0; i1 < n1; i1++) {
      if (i1 > 0 && x1[i1] <= x1[i1 - 1])
        throw new Error(
          "interpolation2d_factory: invalid input, x1 must be increasing",
        );
      x1_[i1] = x1[i1];
      if (!Array.isArray(y[i1]) || n2 !== y[i1].length)
        throw new Error(
          "interpolation2d_factory: invalid input, each element of y must be an array and have the same length as x1",
        );

      for (let i2 = 0; i2 < n2; i2++) {
        if (i1 === 0) {
          x2_[i2] = x2[i2];
          if (i2 > 0 && x2[i2] <= x2[i2 - 1])
            throw new Error(
              "interpolation2d_factory: invalid input, x2 must be increasing",
            );
        }
        if (typeof y[i1][i2] !== "number")
          throw new Error(
            "interpolation2d_factory: invalid input, each element of each array in y must be a number.",
          );
        y_[i1 * n2 + i2] = y[i1][i2];
      }
    }
    return [x1_, x2_, y_, n1, n2];
  };

  library.interpolation2d_factory = function (x1, x2, y) {
    const [x1_, x2_, y_, n1, n2] = copy_and_check_arrays(x1, x2, y);

    // 1xN, covers 1x1 as well
    if (n1 === 1) {
      const interpolation = library.linear_interpolation(x2_, y_);
      return function (s1_not_used, s2) {
        if (s2 <= x2_[0]) return y_[0];
        if (s2 >= x2_[n2 - 1]) return y_[n2 - 1];
        return interpolation(s2);
      };
    }
    // Nx1
    if (n2 === 1) {
      const interpolation = library.linear_interpolation(x1_, y_);
      return function (s1, s2_not_used) {
        if (s1 <= x1_[0]) return y_[0];
        if (s1 >= x1_[n1 - 1]) return y_[n1 - 1];
        return interpolation(s1);
      };
    }
    // NxN
    return function (s1, s2) {
      if (s1 < x1_[0]) s1 = x1_[0];
      else if (s1 > x1_[n1 - 1]) s1 = x1_[n1 - 1];

      if (s2 < x2_[0]) s2 = x2_[0];
      else if (s2 > x2_[n2 - 1]) s2 = x2_[n2 - 1];

      const i1 = library.find_index(x1_, s1);
      const i2 = library.find_index(x2_, s2);
      const v11 = y_[i1 * n2 + i2];
      const v12 = y_[i1 * n2 + n2 + i2];
      const v21 = y_[i1 * n2 + i2 + 1];
      const v22 = y_[i1 * n2 + n2 + i2 + 1];

      const w1 = (s1 - x1_[i1]) / (x1_[i1 + 1] - x1_[i1]);
      const w2 = (s2 - x2_[i2]) / (x2_[i2 + 1] - x2_[i2]);

      return (
        (1 - w1) * (1 - w2) * v11 +
        (1 - w1) * w2 * v21 +
        w1 * (1 - w2) * v12 +
        w1 * w2 * v22
      );
    };
  };
})(this.JsonRisk || module.exports);
