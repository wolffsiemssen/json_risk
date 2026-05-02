(function (library) {
  /**
   * Adaptive Simpson Integration
   * @param {function} f - function to integrate f(x)
   * @param {number} a - start
   * @param {number} b - ende
   * @param {number} eps - accuracy
   * @param {number} max_depth - max depth
   * @memberof JsonRisk
   */
  library.adaptive_simpson = function (f, a, b, eps = 1e-8, max_depth = 20) {
    function simpson(a, b, fa, fb, fm) {
      return ((b - a) / 6) * (fa + 4 * fm + fb);
    }

    const stack = [];

    const m = (a + b) / 2;
    const fa = f(a);
    const fb = f(b);
    const fm = f(m);

    stack.push({
      a,
      b,
      fa,
      fb,
      fm,
      whole: simpson(a, b, fa, fb, fm),
      eps,
      depth: max_depth,
    });

    let result = 0;

    while (stack.length > 0) {
      const node = stack.pop();

      const { a, b, fa, fb, fm, whole, eps, depth } = node;

      const m = (a + b) / 2;
      const lm = (a + m) / 2;
      const rm = (m + b) / 2;

      const flm = f(lm);
      const frm = f(rm);

      const left = simpson(a, m, fa, fm, flm);
      const right = simpson(m, b, fm, fb, frm);

      const delta = left + right - whole;

      if (depth <= 0 || Math.abs(delta) <= 15 * eps) {
        // accept partial result
        result += left + right + delta / 15;
      } else {
        // refine partial integral
        stack.push({
          a: m,
          b: b,
          fa: fm,
          fb: fb,
          fm: frm,
          whole: right,
          eps: eps / 2,
          depth: depth - 1,
        });

        stack.push({
          a: a,
          b: m,
          fa: fa,
          fb: fm,
          fm: flm,
          whole: left,
          eps: eps / 2,
          depth: depth - 1,
        });
      }
    }

    return result;
  };
})(this.JsonRisk || module.exports);
