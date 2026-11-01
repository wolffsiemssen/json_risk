{
  function simple(rates, year_fractions, spread) {
    let result = 0.0;
    for (let i = 0; i < rates.length; i++) {
      result += (rates[i] + spread) * year_fractions[i];
    }
    return result;
  }

  function straight(rates, year_fractions, spread) {
    let result = 1.0;
    for (let i = 0; i < rates.length; i++) {
      result *= 1.0 + (rates[i] + spread) * year_fractions[i];
    }
    return result - 1.0;
  }

  function flat(rates, year_fractions, spread) {
    let result = 0.0;
    let flat_accrued = 0.0;
    for (let i = 0; i < rates.length; i++) {
      const rate = rates[i];
      const yf = year_fractions[i];

      // Accrue current-period floating rate and spread.
      result += (rate + spread) * yf;

      // accrue without spread on previously accrued amount (zero in first period)
      result += rate * yf * flat_accrued;

      // update flat accrued for next period
      flat_accrued = result;
    }
    return result;
  }

  function spread_exclusive(rates, year_fractions, spread) {
    let result = 1.0;
    let total_yf = 0.0;
    for (let i = 0; i < rates.length; i++) {
      const yf = year_fractions[i];
      result *= 1.0 + rates[i] * yf;
      total_yf += yf;
    }
    return result - 1.0 + spread * total_yf;
  }

  JsonRisk.make_index_compounding = function (str) {
    if (!(str instanceof String) && typeof str !== "string") return simple; //default
    if ("" === str) return simple; // default
    switch (str.toLowerCase().replaceAll(" ", "").replaceAll("_", "")) {
      case "simple":
        return simple;
      case "straight":
        return straight;
      case "flat":
        return flat;
      case "ex":
      case "spreadex":
      case "spreadexclusive":
        return spread_exclusive;
      default:
        //fail if invalid string was supplied
        throw new Error("make_index_compounding: invalid input " + str);
    }
  };
}
