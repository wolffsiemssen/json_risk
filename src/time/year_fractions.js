(function (library) {
  /**
   * year fraction act365 according to the ISDA 2006 rules, section 4.16 (d)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (act365)
   * @memberof JsonRisk
   * @private
   */
  function yf_act365(from, to) {
    return library.days_between(from, to) / 365;
  }

  /**
   * year fraction act360  according to the ISDA 2006 rules, section 4.16 (e)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (act360)
   * @memberof JsonRisk
   * @private
   */
  function yf_act360(from, to) {
    return library.days_between(from, to) / 360;
  }

  /**
   * year fraction 30/360 according to the ISDA 2006 rules, section 4.16 (f)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (30/360)
   * @memberof JsonRisk
   * @private
   */
  function yf_30U360(from, to) {
    const y1 = from.getUTCFullYear();
    const y2 = to.getUTCFullYear();
    const m1 = from.getUTCMonth();
    const m2 = to.getUTCMonth();
    const d1 = Math.min(from.getUTCDate(), 30);
    let d2 = to.getUTCDate();
    if (29 < d1 && 31 == d2) d2 = 30;
    return ((y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1)) / 360;
  }

  /**
   * year fraction 30E/360 according to the ISDA 2006 rules, section 4.16 (g)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (30E/360)
   * @memberof JsonRisk
   * @private
   */
  function yf_30E360(from, to) {
    const y1 = from.getUTCFullYear();
    const y2 = to.getUTCFullYear();
    const m1 = from.getUTCMonth();
    const m2 = to.getUTCMonth();
    const d1 = Math.min(from.getUTCDate(), 30);
    const d2 = Math.min(to.getUTCDate(), 30);
    return ((y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1)) / 360;
  }

  /**
   * year fraction 30E/360 (ISDA) according to the ISDA 2006 rules, section 4.16 (h)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (30E/360 ISDA)
   * @memberof JsonRisk
   * @private
   */
  function yf_30G360(from, to) {
    const y1 = from.getUTCFullYear();
    const y2 = to.getUTCFullYear();
    const m1 = from.getUTCMonth();
    const m2 = to.getUTCMonth();
    let d1 = Math.min(from.getUTCDate(), 30);
    let d2 = Math.min(to.getUTCDate(), 30);
    if (1 == m1 && d1 == library.days_in_month(y1, m1)) d1 = 30;
    if (1 == m2 && d2 == library.days_in_month(y2, m2)) d2 = 30;
    return ((y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1)) / 360;
  }

  /**
   * year fraction act/act  according to the ISDA 2006 rules, section 4.16 (b)
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (act/act)
   * @memberof JsonRisk
   * @private
   */
  function yf_actact(from, to) {
    if (from - to === 0) return 0;
    if (from > to) return -yf_actact(to, from);
    const yfrom = from.getUTCFullYear();
    const yto = to.getUTCFullYear();
    if (yfrom === yto)
      return (
        library.days_between(from, to) /
        (library.is_leap_year(yfrom) ? 366 : 365)
      );
    let res = yto - yfrom - 1;
    res +=
      library.days_between(from, new Date(Date.UTC(yfrom + 1, 0, 1))) /
      (library.is_leap_year(yfrom) ? 366 : 365);
    res +=
      library.days_between(new Date(Date.UTC(yto, 0, 1)), to) /
      (library.is_leap_year(yto) ? 366 : 365);
    return res;
  }

  // fallback helper for act act ICMA - tenor is either 1,3,6, or 12
  function guess_tenor(from, to) {
    const d = library.days_between(from, to);

    if (d < 61) return 1;
    if (d < 137) return 3;
    if (d < 274) return 6;
    return 12;
  }

  // fallback helper for act act ICMA - roll date is either start or end date
  function guess_roll_date(from, to, tenor) {
    // check if start is a valid roll date rolling forward onto end
    let d = library.add_months(from, tenor, from.getDate());
    if (d.getTime() === to.getTime()) return from;

    // check if end is a valid roll date rolling backward onto start
    d = library.add_months(to, -tenor, to.getDate());
    if (d.getTime() === from.getTime()) return to;
    // fallback for stubs
    return from;
  }

  /**
   * year fraction act/act ICMA
   * @param {date} from from date
   * @param {date} to to date
   * @param {date} roll_date roll date
   * @param {number} tenor roll period in months
   * @returns {number} year fraction between from and to date (act/act ICMA/ISDA)
   * @memberof JsonRisk
   * @private
   */
  function yf_actact_icma(from, to, roll_date, tenor) {
    if (from - to === 0) return 0;
    if (from > to) return -yf_actact_icma(to, from, roll_date, tenor);
    let p = Math.round(tenor);
    if (!p) p = guess_tenor(from, to); // fallback
    if (!roll_date) roll_date = guess_roll_date(from, to, p); // fallback

    // implementation with roll date and tenor
    let n = Math.floor((library.days_between(roll_date, from) / 365.25) * p);

    // find largest date before from date
    const roll_day = roll_date.getDate();
    let ref_start = library.add_months(roll_date, n * p, roll_day);

    // make sure ref_start is greater than or equal to from date
    while (ref_start < from) {
      n++;
      ref_start = library.add_months(roll_date, n * p, roll_day);
    }
    // make sure r is smaller than or equal to from date
    while (ref_start > from) {
      n--;
      ref_start = library.add_months(roll_date, n * p, roll_day);
    }

    // now ref_start is smaller than or equal to the from date, and less than one period befort the from date
    let res = 0;
    let ref_end = ref_start;
    while (ref_end < to) {
      // add year fraction correponding to one period overlapping from and to date
      n++;
      ref_end = library.add_months(roll_date, n * p, roll_day);
      // actual days
      const actual_start = from > ref_start ? from : ref_start;
      const actual_end = to < ref_end ? to : ref_end;
      const actual_days = library.days_between(actual_start, actual_end);

      // reference days
      const ref_days = library.days_between(ref_start, ref_end);
      res += (p * actual_days) / (12 * ref_days);
      // prepare next period
      ref_start = ref_end;
    }
    return res;
  }

  // helper for act act AFB - works only if from and to are closer than one year
  function period_contains_leapday(from, to) {
    let leapday = null;
    const yfrom = from.getUTCFullYear();
    const yto = to.getUTCFullYear();

    if (library.is_leap_year(yfrom)) {
      leapday = new Date(Date.UTC(yfrom, 1, 29));
    } else if (library.is_leap_year(yto)) {
      leapday = new Date(Date.UTC(yto, 1, 29));
    }
    if (from < leapday && to >= leapday) return true;
    return false;
  }

  /**
   * year fraction act/act AFB  according to the ISDA 2008 memo
   * @param {date} from from date
   * @param {date} to to date
   * @returns {number} year fraction between from and to date (act/act AFB)
   * @memberof JsonRisk
   * @private
   */
  function yf_actact_afb(from, to) {
    if (from - to === 0) return 0;
    if (from > to) return -yf_actact(to, from);
    let rollday = to.getUTCDate();
    const m = to.getUTCMonth();
    const y = to.getUTCFullYear();

    // roll over day 29 if end of feb
    if (28 === rollday && 1 === m && false === library.is_leap_year(y))
      rollday++;

    let res = 0.0;
    let temp1 = to,
      temp2 = null;
    while (temp1 > from) {
      temp2 = temp1;
      temp1 = library.add_months(temp1, -12, rollday);

      // add a full year for each full yearly period within from and to
      if (temp1 >= from) res += 1.0;
    }

    // return if no days remain
    if (temp1.getTime() === from.getTime()) return res;

    // add remaining year fraction
    const deno = period_contains_leapday(from, temp2) ? 366 : 365;
    const num = library.days_between(from, temp2);
    res += num / deno;
    return res;
  }

  // canonical names for serialisation
  yf_act365.canonical_name = "a/365";
  yf_act360.canonical_name = "a/360";
  yf_30U360.canonical_name = "30u/360";
  yf_30E360.canonical_name = "30e/360";
  yf_30G360.canonical_name = "30g/360";
  yf_actact.canonical_name = "a/a isda";
  yf_actact_icma.canonical_name = "a/a icma";
  yf_actact_afb.canonical_name = "a/a afb";

  /**
   * returns day count convention of param (multiple possibilities to deliver day count conventions)
   * @param {string} str
   * @returns {number} day count convention in library format
   * @memberof JsonRisk
   * @public
   */
  library.year_fraction_factory = function (str) {
    if (!(str instanceof String) && typeof str !== "string") return yf_act365; //default dcc
    if ("" === str) return yf_act365; // default dcc

    switch (
      str
        .toLowerCase()
        .replaceAll("actual", "a")
        .replaceAll("act", "a")
        .replace("(", "")
        .replace(")", "")
    ) {
      case "a/365":
      case "a/365 fixed":
        return yf_act365;

      case "a/360":
      case "french":
        return yf_act360;

      case "a/a":
      case "a/a isda":
        return yf_actact;

      case "a/a icma":
      case "a/a isma":
      case "a/na":
        return yf_actact_icma;

      case "a/a afb":
        return yf_actact_afb;

      case "30/360":
      case "30u/360":
      case "bond":
      case "bond basis":
        return yf_30U360;

      case "30e/360":
      case "eurobond":
      case "eurobond basis":
        return yf_30E360;

      case "30g/360":
      case "30e/360 isda":
      case "30/360 german":
        return yf_30G360;

      default:
        //fail if invalid string was supplied
        throw new Error("year fraction factory: invalid input " + str);
    }
  };
})(this.JsonRisk || module.exports);
