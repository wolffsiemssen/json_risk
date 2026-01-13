(function (library) {
  /**
   * @desc calculates the time in years from a given period string
   * @param {string} str time string (xY, xM, xW, xD)
   * @returns {number} time in years
   * @memberof JsonRisk
   */
  library.period_str_to_time = function (str) {
    const num = parseInt(str, 10);
    if (isNaN(num))
      throw new Error(
        "period_str_to_time - Invalid time period string: " + str,
      );
    const unit = str.charAt(str.length - 1);
    if (unit === "Y" || unit === "y") return num;
    if (unit === "M" || unit === "m") return num / 12;
    if (unit === "W" || unit === "w") return num / 52;
    if (unit === "D" || unit === "d") return num / 365;
    throw new Error("period_str_to_time - Invalid time period string: " + str);
  };

  /**
   * @desc constructs a javascript date object from a JSON risk conformant date string
   * @param {string} str date string
   * @returns {date} javascript date object
   * @memberof JsonRisk
   */
  library.date_str_to_date = function (str) {
    let rr = null,
      d,
      m,
      y;
    if (
      (rr = /^([1-2][0-9]{3})[/-]([0-9]{1,2})[/-]([0-9]{1,2})/.exec(str)) !==
      null
    ) {
      // YYYY/MM/DD or YYYY-MM-DD
      y = parseInt(rr[1], 10);
      m = parseInt(rr[2], 10) - 1;
      d = parseInt(rr[3], 10);
    } else if (
      (rr = /^([0-9]{1,2})\.([0-9]{1,2})\.([1-2][0-9]{3})/.exec(str)) !== null
    ) {
      // DD.MM.YYYY
      y = parseInt(rr[3], 10);
      m = parseInt(rr[2], 10) - 1;
      d = parseInt(rr[1], 10);
    }
    if (null === rr)
      throw new Error("date_str_to_time - Invalid date string: " + str);
    if (m < 0 || m > 11)
      throw new Error(
        "date_str_to_time - Invalid month in date string: " + str,
      );
    const days_in_month = new Date(y, m + 1, 0).getDate();
    if (d < 0 || d > days_in_month)
      throw new Error("date_str_to_time - Invalid day in date string: " + str);
    return new Date(Date.UTC(y, m, d));
  };

  /**
   * @desc constructs a JSON risk conformant date string YYYY-MM-DD from a javascript date object or another JSON risk conformant date string
   * @param {date} date object
   * @returns {string} date string
   * @memberof JsonRisk
   */
  library.date_to_date_str = function (d) {
    var dobj = library.date_or_null(d);
    if (null === dobj) throw new Error("date_to_date_str: invalid input.");
    return dobj.toISOString().slice(0, 10);
  };

  /**
   * @desc takes a valid date string, a javascript date object, or a falsy value and returns a javascript date object or null. Normalises non-utc dates. Throws on invalid types (if not falsy) and nonempty date strings
   * @param {date} d
   * @returns {date} javascript date object
   * @memberof JsonRisk
   */
  library.date_or_null = function (d) {
    if (!d) return null;
    if (d instanceof Date) {
      var h = d.getUTCHours();
      var y = d.getUTCFullYear();
      var m = d.getUTCMonth();
      var t = d.getUTCDate();
      if (h > 11) t++; // advance to next day UTC 0:00 date
      return new Date(Date.UTC(y, m, t));
    }
    if (d instanceof String || typeof d === "string")
      return library.date_str_to_date(d);
    throw new Error("date_or_null: invalid input.");
  };

  /**
   * @desc takes a valid date string, or a javascript date object and returns a javascript date object or null. Normalises non-utc dates. Throws on invalid input
   * @param {date} d
   * @returns {date} javascript date object
   * @memberof JsonRisk
   */
  library.date_or_throw = function (d) {
    const date_or_null = library.date_or_null(d);
    if (null === date_or_null) throw new Error("date_or_throw: invalid input");
    return date_or_null;
  };

  /**
   * get a vector of dates when vector of dates, vector of date strings or space sepatated list of date strings is entered. Returns null otherwise but throws on invalid or empty date strings
   * @param {date} d
   * @returns {number} array of javascript date objects
   * @memberof JsonRisk
   */
  library.date_vector_or_null = function (d) {
    if (d instanceof Date) return [library.date_or_throw(d)];
    let res;
    if (typeof d === "string") {
      res = d.split(/\s+/);
    } else if (Array.isArray(d) && d.length > 0) {
      res = d.slice();
    } else {
      return null;
    }
    for (let i = 0; i < res.length; i++) {
      res[i] = library.date_or_null(res[i]);
      if (null === res[i])
        throw new Error("date_vector_or_null: invalid input");
    }
    return res;
  };
})(this.JsonRisk || module.exports);
