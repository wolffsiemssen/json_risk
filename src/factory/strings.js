(function (library) {
  library.string_or_empty = function (input) {
    if (typeof input === "string") return input;
    return "";
  };

  library.string_or_fallback = function (input, fallback) {
    if (typeof input === "string") return input;
    if (typeof fallback !== "string")
      throw new Error("string_or_fallback: fallback must be a string");
    return fallback;
  };

  library.string_or_throw = function (input, message) {
    if (typeof input !== "string") throw new Error(message);
    return input;
  };

  library.nonempty_string_or_throw = function (input, message) {
    if (typeof input !== "string") throw new Error(message);
    if ("" === input) throw new Error(message);
    return input;
  };
})(this.JsonRisk || module.exports);
