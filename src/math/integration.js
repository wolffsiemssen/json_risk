(function (library) {
  /**
   * Adaptive Simpson Integration
   * @param {function} f - function to integrate f(x)
   * @param {number} a - start
   * @param {number} b - ende
   * @param {number} eps - accuracy
   * @param {number} max_depth - max depth
   * @param {number} max_depth - min depth
   * @memberof JsonRisk
   */
  library.adaptive_simpson = function (
    f,
    a,
    b,
    eps = 1e-8,
    max_depth = 20,
    min_depth = 5,
  ) {
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
      depth: 1,
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

      if (
        depth >= min_depth &&
        (depth >= max_depth || Math.abs(delta) <= 15 * eps)
      ) {
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
          depth: depth + 1,
        });

        stack.push({
          a: a,
          b: m,
          fa: fa,
          fb: fm,
          fm: flm,
          whole: left,
          eps: eps / 2,
          depth: depth + 1,
        });
      }
    }

    return result;
  };

  /**
   * Adaptive Gauss Kronrod Integration
   * @param {function} f - function to integrate f(x)
   * @param {number} a - start
   * @param {number} b - ende
   * @param {number} eps - accuracy
   * @param {number} max_depth - max depth
   * @param {number} max_depth - min depth
   * @memberof JsonRisk
   */
  library.adaptive_gauss_kronrod = function (
    f,
    a,
    b,
    eps = 1e-8,
    max_depth = 20,
    min_depth = 3,
  ) {
    // Kronrod nodes (positive, symmetric)
    const xgk = [
      0.9914553711208126, 0.9491079123427585, 0.8648644233597691,
      0.7415311855993945, 0.5860872354676911, 0.4058451513773972,
      0.2077849550078985, 0.0,
    ];

    // Kronrod weights
    const wgk = [
      0.02293532201052922, 0.0630920926299785, 0.1047900103222502,
      0.1406532597155259, 0.1690047266392679, 0.1903505780647854,
      0.2044329400752989, 0.2094821410847278,
    ];

    // Gauss weights (subset)
    const wg = [
      0.1294849661688697, 0.2797053914892766, 0.3818300505051189,
      0.4179591836734694,
    ];

    function evaluate_interval(a, b) {
      const center = 0.5 * (a + b);
      const half_length = 0.5 * (b - a);

      let kronrod_sum = 0;
      let gauss_sum = 0;

      for (let i = 0; i < xgk.length; i++) {
        const abscissa = half_length * xgk[i];

        const x1 = center - abscissa;
        const x2 = center + abscissa;

        const f1 = f(x1);
        const f2 = f(x2);

        const wk = wgk[i];

        if (i === xgk.length - 1) {
          // center point
          const fc = f(center);
          kronrod_sum += wk * fc;
          gauss_sum += wg[3] * fc;
        } else {
          kronrod_sum += wk * (f1 + f2);

          // Map Kronrod nodes → Gauss subset
          if (i === 1) gauss_sum += wg[0] * (f1 + f2);
          if (i === 3) gauss_sum += wg[1] * (f1 + f2);
          if (i === 5) gauss_sum += wg[2] * (f1 + f2);
        }
      }

      const i_k = kronrod_sum * half_length;
      const i_g = gauss_sum * half_length;

      return {
        integral: i_k,
        error: Math.abs(i_k - i_g),
      };
    }

    // Stack of intervals
    const stack = [
      {
        a: a,
        b: b,
        eps: eps,
        depth: 1,
      },
    ];

    let result = 0;

    while (stack.length > 0) {
      const { a, b, eps, depth } = stack.pop();

      const { integral, error } = evaluate_interval(a, b);

      if (depth >= min_depth && (error < eps || depth >= max_depth)) {
        result += integral;
      } else {
        const mid = 0.5 * (a + b);

        // Push children (note: push right first for left-first processing)
        stack.push({
          a: mid,
          b: b,
          eps: eps / 2,
          depth: depth + 1,
        });

        stack.push({
          a: a,
          b: mid,
          eps: eps / 2,
          depth: depth + 1,
        });
      }
    }

    return result;
  };
})(this.JsonRisk || module.exports);
