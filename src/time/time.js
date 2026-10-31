{
  const dl = 1000 * 60 * 60 * 24; // length of one day in milliseconds
  const one_over_dl = 1.0 / dl;

  /**
   * checks if a year is a leap year
   * @param {number} y year
   * @returns {boolean} true, if leap year
   * @memberof JsonRisk
   * @private
   */
  JsonRisk.is_leap_year = function (y) {
    if (y % 4 !== 0) return false;
    if (y === 2000) return true;
    return y % 100 !== 0;
  };

  /**
   * returns the number of days in a given month, i.e., 28,29,30, or 31
   * @param {number} y year
   * @param {number} m month
   * @returns {number} number of days in month
   * @memberof JsonRisk
   * @private
   */
  JsonRisk.days_in_month = function (y, m) {
    switch (m) {
      case 1:
        return JsonRisk.is_leap_year(y) ? 29 : 28;
      case 3:
      case 5:
      case 8:
      case 10:
        return 30;
      default:
        return 31;
    }
  };

  /**
   * counts days between to dates
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} days between from and to date
   * @memberof JsonRisk
   * @private
   */
  JsonRisk.days_between = function (from, to) {
    return Math.round((to.getTime() - from.getTime()) * one_over_dl);
  };

  /**
   * Returns the time in years from JsonRisk.valuation_date until the given date
   * @param {date} d
   * @returns {number} time in years from JsonRisk.valuation_date until d
   * @memberof JsonRisk
   * @public
   */
  JsonRisk.time_from_now = function (d) {
    return JsonRisk.days_between(JsonRisk.valuation_date, d) / 365;
  };

  /*!
    
            Date rolling
    
    */
  /**
   * adds days
   * @param {date} from from date
   * @param {number} ndays days to be added
   * @returns {date} from date plus ndays
   * @memberof JsonRisk
   * @public
   */
  JsonRisk.add_days = function (from, ndays) {
    return new Date(from.getTime() + ndays * dl);
  };

  /**
   * Adds months
   * @param {date} from from date
   * @param {number} nmonths number of months to be added
   * @param {object} roll_day
   * @returns {date} the date that is nmonths months from the from date.
   * @memberof JsonRisk
   * @public
   */
  JsonRisk.add_months = function (from, nmonths, roll_day) {
    let y = from.getUTCFullYear(),
      m = from.getUTCMonth() + nmonths,
      d;
    while (m >= 12) {
      m = m - 12;
      y = y + 1;
    }
    while (m < 0) {
      m = m + 12;
      y = y - 1;
    }
    if (!roll_day) {
      d = from.getUTCDate();
    } else {
      d = roll_day;
    }
    return new Date(Date.UTC(y, m, Math.min(d, JsonRisk.days_in_month(y, m))));
  };

  /**
   * add period (like Years, Months, Days, Weeks)
   * @param {date} from
   * @param {string} str
   * @returns {date} from date plus the period given in the period string
   * @memberof JsonRisk
   * @public
   */
  JsonRisk.add_period = function (from, str) {
    const num = parseInt(str, 10);
    if (isNaN(num))
      throw new Error(
        "period_str_to_time(str) - Invalid time period string: " + str,
      );
    const unit = str.charAt(str.length - 1);
    if (unit === "Y" || unit === "y")
      return JsonRisk.add_months(from, 12 * num);
    if (unit === "M" || unit === "m") return JsonRisk.add_months(from, num);
    if (unit === "W" || unit === "w") return JsonRisk.add_days(from, 7 * num);
    if (unit === "D" || unit === "d") return JsonRisk.add_days(from, num);
    throw new Error(
      "period_str_to_time(str) - Invalid time period string: " + str,
    );
  };

  /*!
    
            Calendars
    
    */
  /**
   * determine easter sunday for a year
   * @param {number} y year
   * @returns {date} easter sunday for given year
   * @memberof JsonRisk
   * @private
   */
  function easter_sunday(y) {
    const f = Math.floor,
      c = f(y / 100),
      n = y - 19 * f(y / 19),
      k = f((c - 17) / 25);
    let i = c - f(c / 4) - f((c - k) / 3) + 19 * n + 15;
    i = i - 30 * f(i / 30);
    i = i - f(i / 28) * (1 - f(i / 28) * f(29 / (i + 1)) * f((21 - n) / 11));
    let j = y + f(y / 4) + i + 2 - c + f(c / 4);
    j = j - 7 * f(j / 7);
    const l = i - j,
      m = 3 + f((l + 40) / 44),
      d = l + 28 - 31 * f(m / 4);
    return new Date(Date.UTC(y, m - 1, d));
  }

  /**
   * determine if a date is a saturday or sunday
   * @param {date} dt
   * @returns {boolean} true, if saturday or sunday
   * @memberof JsonRisk
   * @private
   */
  function is_holiday_default(dt) {
    const wd = dt.getUTCDay();
    if (0 === wd) return true;
    if (6 === wd) return true;
    return false;
  }

  /**
   * determine, if date is a holiday according to the TARGET calendar
   * @param {date} dt
   * @returns {boolean} true, if holiday
   * @memberof JsonRisk
   * @private
   */
  function is_holiday_target(dt) {
    if (is_holiday_default(dt)) return true;

    const d = dt.getUTCDate();
    const m = dt.getUTCMonth();
    if (1 === d && 0 === m) return true; //new year
    if (25 === d && 11 === m) return true; //christmas

    const y = dt.getUTCFullYear();
    if (1998 === y || 1999 === y || 2001 === y) {
      if (31 === d && 11 === m) return true; // December 31
    }
    if (y > 2000) {
      if ((1 === d && 4 === m) || (26 === d && 11 === m)) return true; //labour and goodwill
      const es = easter_sunday(y);
      if (dt.getTime() === JsonRisk.add_days(es, -2).getTime()) return true; //Good Friday
      if (dt.getTime() === JsonRisk.add_days(es, 1).getTime()) return true; //Easter Monday
    }
    return false;
  }

  const calendars = {};

  /**
   * add additional holidays that are no default holidays, i.e., weekend days
   * @param {string} name
   * @param {object} dates
   * @returns {object} the size of the hash table for holidays
   * @memberof JsonRisk
   * @public
   */
  JsonRisk.add_calendar = function (name, dates) {
    if (!(name instanceof String || typeof name === "string"))
      throw new Error("add_calendar: invalid input.");
    if (!Array.isArray(dates)) throw new Error("add_calendar: invalid input.");
    const holidays = new Set();
    //only consider array items that are valid dates or date strings and that are no default holidays, i.e., weekend days
    for (let dt of dates) {
      dt = JsonRisk.date_or_null(dt);
      if (!dt) continue;
      if (is_holiday_default(dt)) continue;
      holidays.add(dt.getTime());
    }
    calendars[name.toLowerCase()] = holidays;
  };

  /**
   * factory function for calendar functionality
   * @param {string} str a string representing a holiday calendar
   * @returns {function} a function that takes a date as input argument and returns true if that date is a holiday according to the supplied calendar and false otherwise
   * @memberof JsonRisk
   * @public
   */
  JsonRisk.is_holiday_factory = function (str) {
    const sl = str.toLowerCase();

    //builtin target calendar
    if (sl === "target") return is_holiday_target;

    //fallback
    if (sl === "") return is_holiday_default;

    //generic lookup for stored calendars
    const cal = calendars[sl];
    if (cal instanceof Set) {
      return function (dt) {
        if (is_holiday_default(dt)) return true;
        if (cal.has(dt.getTime())) return true;
        return false;
      };
    }

    // fail otherwise
    throw new Error("is_holiday_factory: calendar not found: " + sl);
  };

  /*!
    
            Business Day Conventions
    
    */

  /**
   * Adjust dates according to a calendar and a business day convention
   * @param {date} dt
   * @param {string} bdc business day convention, can be "unadjusted", "following", "modified following" or "preceding". Only the first character of the string is actually evaluated
   * @param {function} is_holiday_function a function that takes a date as input argument and returns true if that date is a holiday and false otherwise
   * @returns {date} adjusted date
   * @memberof JsonRisk
   * @public
   */
  JsonRisk.adjust = function (dt, bdc, is_holiday_function) {
    if (!(bdc instanceof String) && typeof bdc !== "string") return dt; // no business day convention specified
    const s = (bdc || "u").charAt(0).toLowerCase();
    let adj = new Date(dt);
    if (s === "u") return adj; //unadjusted

    let m;
    if (s === "m") m = adj.getUTCMonth(); //save month for modified following
    if (s === "m" || s === "f") {
      while (is_holiday_function(adj)) adj = JsonRisk.add_days(adj, 1);
    }
    if (s === "f") return adj; //following
    if (s === "m" && m === adj.getUTCMonth()) return adj; //modified following, still in same month
    if (s === "m") adj = JsonRisk.add_days(adj, -1); //modified following, in next month
    while (is_holiday_function(adj)) adj = JsonRisk.add_days(adj, -1); //modified following or preceding
    return adj;
  };

  /**
   * add business days
   * @param {date} from from date
   * @param {number} n days to be added
   * @param {boolean} is_holiday_function a function that takes a date as input argument and returns true if that date is a holiday and false otherwise
   * @returns {date} date + n business days
   * @memberof JsonRisk
   * @public
   */
  JsonRisk.add_business_days = function (from, n, is_holiday_function) {
    let res = from,
      i = n;
    while (i > 0) {
      res = JsonRisk.adjust(
        JsonRisk.add_days(res, 1),
        "f",
        is_holiday_function,
      );
      i--;
    }
    return res;
  };
}
