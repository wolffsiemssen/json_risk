TEST_NAME =
  "Equivalence CRR Binomial Model vs Black Scholes for early exercise date equal to maturity";

test = {
  name: TEST_NAME,
};

if (typeof module === "object" && typeof exports !== "undefined") {
  // Node
  module.exports = test;
} else {
  // Browser
  jr_tests.push(test);
}

test.execute = function (TestFramework, JsonRisk) {
  JsonRisk.set_valuation_date("2025/01/01");
  for (const [index, item] of testAmericanNoEarlyExerciseData.entries()) {
    let [
      type,
      strike,
      spot,
      q,
      r,
      t,
      vol,
      n,
      first_exercise_date,
      value_reference,
    ] = item;
    let model = new JsonRisk.CRRBinomialModel(
      t,
      vol,
      spot, // we use the spot as forward, since the model will adjust it with the dividend yield and risk-free rate to get the forward price at time t
      strike,
      n,
      Math.exp(-t * r), // B, where B is the full discount factor at the risk-free rate,
      Math.exp(-t * q), // Bq, where Bq is the discount factor at the dividend yield, defined as exp(-q*t),
      first_exercise_date,
      true,
    );

    let value = type === "Call" ? model.call_price() : model.put_price();
    // we do not discount the value, since the model already takes into account the discounting with the risk-free rate r.

    // test model converging to black scholes for european options as n increases
    const model_bs = new JsonRisk.BlackModel(t, vol);
    const forward = spot * Math.exp(-t * q) * Math.exp(t * r);
    const value_bs =
      type === "Call"
        ? model_bs.call_price(forward, strike) * Math.exp(-t * r)
        : model_bs.put_price(forward, strike) * Math.exp(-t * r);
    // differently from the binomial model, the black scholes model gives the price of the option at time t,
    // so we need to discount it to the present value with the discount factor from the risk-free rate r, which is exp(-t*r).
    TestFramework.assert(
      Math.abs(value - value_bs) < 1 / Math.sqrt(n),
      `CRR binomial vs BS76model price ${index}, value ${value.toFixed(4)}, bs reference ${value_bs.toFixed(4)}, diff ${Math.abs(value - value_bs).toFixed(4)}, tolerance ${(1 / Math.sqrt(n)).toFixed(4)}`,
      // we use as tolerance the error of the binomial model, that decreases roughly as 1/sqrt(n), where n is the number of steps in the tree.
      // This is a common rule of thumb for the convergence of the binomial model to the true option price as n increases.
    );
  }
};

// The data below is from the book:
//      "Option pricing formulas", E.G. Haug, McGraw-Hill, second edition 2007
//
const testAmericanNoEarlyExerciseData = [
  // pag 285
  // type, strike,spot,q,r,t,vol, n, first exercise date, value
  ["Put", 95.0, 100.0, 0.0, 0.08, 0.5, 0.3, 5, 0.5, 4.92],

  // from the CD rom of the book
  ["Call", 40.0, 42.0, 0.0, 0.1, 0.5, 0.2, 52, 0.5, 4.7623],
  ["Put", 40.0, 42.0, 0.0, 0.1, 0.5, 0.2, 52, 0.5, 0.9113],

  // from chatgpt (the chatgpt calculations are not very reliable, just use it as rough reference)
  ["Call", 100.0, 100.0, 0.02, 0.05, 1.0, 0.2, 100, 1.0, 9.2076], // chatgpt value: 10.4506,
  ["Call", 100.0, 100.0, 0.02, 0.05, 1.0, 0.2, 500, 1.0, 9.2076], // chatgpt value: 10.4506,
  ["Put", 100.0, 100.0, 0.02, 0.05, 1.0, 0.2, 100, 1.0, 6.3107], // chatgpt value: 5.5735,
  ["Put", 100.0, 100.0, 0.02, 0.05, 1.0, 0.2, 1000, 1.0, 6.3107], // chatgpt value: 5.5735,
];
