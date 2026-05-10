TEST_NAME = "Numeric integration";

test = {
  name: TEST_NAME,
};

if (typeof module === "object" && typeof exports !== "undefined") {
  // Node.js
  module.exports = test;
} else {
  // Browser
  jr_tests.push(test);
}

test.execute = function (TestFramework, JsonRisk) {
  for (const t of tests) {
    const result = JsonRisk.adaptive_simpson(t.f, t.a, t.b, 1e-10);
    const reference = t.ref;
    TestFramework.assert(
      Math.abs(result - reference) < 1e-10,
      `Numeric integration over ${t.name}, Result: ${result}, Reference: ${reference}`,
    );
  }
};

let n = 0;

const tests = [
  {
    name: "abs(x)",
    f: (x) => Math.abs(x),
    a: -1,
    b: 1,
    ref: 1,
  },
  {
    name: "abs(x - 0.3)",
    f: (x) => Math.abs(x - 0.3),
    a: 0,
    b: 1,
    ref: 0.3 ** 2 / 2 + 0.7 ** 2 / 2,
  },
  {
    name: "sqrt(x)",
    f: (x) => Math.sqrt(x),
    a: 0,
    b: 1,
    ref: 2 / 3,
  },
  {
    name: "|sin(x)|",
    f: (x) => Math.abs(Math.sin(x)),
    a: 0,
    b: Math.PI,
    ref: 2,
  },
  {
    name: "piecewise linear",
    f: (x) => (x < 0.5 ? x : 1 - x),
    a: 0,
    b: 1,
    ref: 0.25,
  },
  {
    name: "exp(x)",
    f: (x) => Math.exp(x),
    a: -5,
    b: 4,
    ref: Math.exp(4) - Math.exp(-5),
  },
  {
    name: "exp(|x|)",
    f: (x) => Math.exp(Math.abs(x)),
    a: -5,
    b: 4,
    ref: Math.exp(4) + Math.exp(5) - 2.0,
  },
];
