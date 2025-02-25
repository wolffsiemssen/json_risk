(function (library) {
  "use strict";
  const continuous = {
    df: function (t, zc) {
      return Math.exp(-t * zc);
    },
    zc: function (t, df) {
      if (t < 1 / 512) return 0.0;
      return -Math.log(df) / t;
    },
  };

  const annual = {
    df: function (t, zc) {
      return (1 + zc) ** -t;
    },
    zc: function (t, df) {
      if (t < 1 / 512) return 0.0;
      return df ** (-1 / t) - 1;
    },
  };

  library.compounding_factory = function (str) {
    if (undefined === str) return annual;
    if (typeof str === "string") {
      switch (str.toLowerCase()) {
        case "annual":
        case "a":
          return annual;
        case "continuous":
        case "c":
          return continuous;

        default:
          //fail if invalid string was supplied
          throw new Error("compounding factory: invalid input " + str);
      }
    }
    throw new Error(
      "compounding factory: invalid input, string expected but " +
        typeof str +
        " supplied",
    );
  };
})(this.JsonRisk || module.exports);
