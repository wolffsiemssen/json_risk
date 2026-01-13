(function (library) {
  /**
   * @desc Returns a reference to the argument if the argument is a string, and an empty string otherwise
   * @param {any} input argument that is typically expected to be a string
   * @returns {string} the argument itself, or an empty string
   * @memberof JsonRisk
   */
  library.string_or_empty = function (input) {
    if (typeof input === "string") return input;
    return "";
  };

  /**
   * @desc Returns a reference to the argument if the argument is a string, and fallback string otherwise
   * @param {any} input that is typically expected to be a string
   * @param {string} fallback the fallback to return
   * @returns {string} the argument itself, or the fallback
   * @memberof JsonRisk
   */
  library.string_or_fallback = function (input, fallback) {
    if (typeof input === "string") return input;
    if (typeof fallback !== "string")
      throw new Error("string_or_fallback: fallback must be a string");
    return fallback;
  };

  /**
   * @desc Returns a reference to the argument if the argument is a string, and throws the supplied error message otherwise
   * @param {any} input that is typically expected to be a string
   * @param {string} message the message to throw
   * @returns {string} the argument supplied if it is a string
   * @memberof JsonRisk
   */
  library.string_or_throw = function (input, message) {
    if (typeof input !== "string") throw new Error(message);
    return input;
  };

  /**
   * @desc Returns a reference to the argument if the argument is a nonempty string, and throws the supplied error message otherwise
   * @param {any} input that is typically expected to be a string
   * @param {string} message the message to throw
   * @returns {string} the argument supplied if it is a nonempty string
   * @memberof JsonRisk
   */
  library.nonempty_string_or_throw = function (input, message) {
    if (typeof input !== "string") throw new Error(message);
    if ("" === input) throw new Error(message);
    return input;
  };
})(this.JsonRisk || module.exports);
