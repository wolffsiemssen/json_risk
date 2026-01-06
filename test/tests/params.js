TEST_NAME = "Parameters";

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

{
  test.execute = function (TestFramework, JsonRisk) {
    const params1 = new JsonRisk.Params(params_json);
    const json2 = JSON.parse(JSON.stringify(params1));
    const params2 = new JsonRisk.Params(json2);

    compare(TestFramework, params1, params2);
  };

  const getnames = function (n1, n2) {
    const res = new Set();
    for (const n of n1) res.add(n);
    for (const n of n2) res.add(n);
    return res;
  };

  const compare = function (tf, p1, p2) {
    tf.assert(
      p1.valuation_date - p2.valuation_date == 0.0,
      "Params: Valuation dates are the same",
    );
    tf.assert(
      p1.main_currency === p2.main_currency,
      "Params: Main currencies are the same",
    );

    // scalars
    for (const n of getnames(p1.scalar_names, p2.scalar_names)) {
      tf.assert(p1.has_scalar(n), `Params: Scalar ${n} is in params 1`);
      tf.assert(p1.has_scalar(n), `Params: Scalar ${n} is in params 2`);
      tf.assert(
        p1.get_scalar(n).get_value() === p2.get_scalar(n).get_value(),
        `Params: Scalar ${n} matches after round trip`,
      );
    }

    // curves
    for (const n of getnames(p1.curve_names, p2.curve_names)) {
      tf.assert(p1.has_curve(n), `Params: Curve ${n} is in params 1`);
      tf.assert(p1.has_curve(n), `Params: Curve ${n} is in params 1`);

      const c1 = p1.get_curve(n);
      const c2 = p2.get_curve(n);
      const times = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4, 7, 10, 15];
      let equal = true;
      for (const t of times) {
        if (Math.abs(c1.get_rate(t) - c2.get_rate(t)) > 1e-10) {
          equal = false;
          console.log(
            `Curve ${n}, time ${t}: ${c1.get_rate(t)} != ${c2.get_rate(t)}`,
          );
        }
      }
      tf.assert(equal, `Params: Curve ${n} matches after round trip`);
    }

    // surfaces
    for (const n of getnames(p1.surface_names, p2.surface_names)) {
      tf.assert(p1.has_surface(n), `Params: Surface ${n} is in params 1`);
      tf.assert(p1.has_surface(n), `Params: Surface ${n} is in params 1`);

      const s1 = p1.get_surface(n);
      const s2 = p2.get_surface(n);
      const xs = s1.expiries;
      const ys = "terms" in s1 ? s1.terms : s1.moneyness;
      let equal = true;
      for (const x of xs) {
        for (const y of ys)
          if (s1.get_surface_rate(x, y) != s2.get_surface_rate(x, y))
            equal = false;
      }
      tf.assert(equal, `Params: Surface ${n} matches after round trip`);
    }
  };

  const params_json = {
    valuation_date: "2000-01-01",
    main_currency: "USD",
    scalars: {
      stock: { value: 100, tags: ["stock"] },
      JPY: { value: 135, tags: ["fx"] },
      "EUR/DKK": { value: 6.2, tags: ["fx"] },
      EURNOK: { value: 11, tags: ["fx"] },
      "SEK-EUR": { value: 0.91, tags: ["fx_inverse"] },
      DEM_EUR: { value: 0.5263157894736842, tags: ["fx_inverse"] },
    },
    curves: {
      ZC_LINEAR_ZC_FLAT_FLAT: {
        times: [1, 2, 3, 5, 10],
        zcs: [0.01, 0.02, 0.03, 0.03, 0.028],
        intp: "linear_zc",
        short_end_flat: true,
        long_end_flat: true,
      },
      ZC_LINEAR_ZC_NONFLAT_NONFLAT: {
        times: [1, 2, 3, 5, 10],
        zcs: [0.01, 0.02, 0.03, 0.03, 0.028],
        intp: "linear_zc",
        short_end_flat: false,
        long_end_flat: false,
      },
      ZC_LINEAR_DF_FLAT_FLAT: {
        times: [1, 2, 3, 5, 10],
        zcs: [0.01, 0.02, 0.03, 0.03, 0.028],
        intp: "linear_df",
        short_end_flat: true,
        long_end_flat: true,
      },
      ZC_LINEAR_DF_NONFLAT_NONFLAT: {
        times: [1, 2, 3, 5, 10],
        zcs: [0.01, 0.02, 0.03, 0.03, 0.028],
        intp: "linear_df",
        short_end_flat: false,
        long_end_flat: false,
      },
      DF_LINEAR_ZC_FLAT_FLAT: {
        times: [1, 2, 3, 5, 10],
        dfs: [
          0.99009900990099, 0.942322334547045, 0.862608784384164,
          0.813091511343354, 0.75869785008121,
        ],
        intp: "linear_zc",
        short_end_flat: true,
        long_end_flat: true,
      },
      DF_LINEAR_ZC_NONFLAT_NONFLAT: {
        times: [1, 2, 3, 5, 10],
        dfs: [
          0.99009900990099, 0.942322334547045, 0.862608784384164,
          0.813091511343354, 0.75869785008121,
        ],
        intp: "linear_zc",
        short_end_flat: false,
        long_end_flat: false,
      },
      DF_LINEAR_DF_FLAT_FLAT: {
        times: [1, 2, 3, 5, 10],
        dfs: [
          0.99009900990099, 0.942322334547045, 0.862608784384164,
          0.813091511343354, 0.75869785008121,
        ],
        intp: "linear_df",
        short_end_flat: true,
        long_end_flat: true,
      },
      DF_LINEAR_DF_NONFLAT_NONFLAT: {
        times: [1, 2, 3, 5, 10],
        dfs: [
          0.99009900990099, 0.942322334547045, 0.862608784384164,
          0.813091511343354, 0.75869785008121,
        ],
        intp: "linear_df",
        short_end_flat: false,
        long_end_flat: false,
      },
      ZC_LINEAR_RT_FLAT_FLAT: {
        times: [1, 2, 3, 5, 10],
        zcs: [0.01, 0.02, 0.03, 0.03, 0.028],
        intp: "linear_rt",
        short_end_flat: true,
        long_end_flat: true,
      },
      ZC_LINEAR_RT_NONFLAT_NONFLAT: {
        times: [1, 2, 3, 5, 10],
        zcs: [0.01, 0.02, 0.03, 0.03, 0.028],
        intp: "linear_rt",
        short_end_flat: false,
        long_end_flat: false,
      },
      DF_LINEAR_RT_FLAT_FLAT: {
        times: [1, 2, 3, 5, 10],
        dfs: [
          0.99009900990099, 0.942322334547045, 0.862608784384164,
          0.813091511343354, 0.75869785008121,
        ],
        intp: "linear_rt",
        short_end_flat: true,
        long_end_flat: true,
      },
      DF_LINEAR_RT_NONFLAT_NONFLAT: {
        times: [1, 2, 3, 5, 10],
        dfs: [
          0.99009900990099, 0.942322334547045, 0.862608784384164,
          0.813091511343354, 0.75869785008121,
        ],
        intp: "linear_rt",
        short_end_flat: false,
        long_end_flat: false,
      },
    },
    surfaces: {
      relstrike: {
        type: "expiry_rel_strike",
        expiries: [1, 2, 3],
        moneyness: [-0.02, -0.01, 0, 0.01, 0.02],
        values: [
          [1, 1, 2, 3, 3],
          [2, 2, 3, 4, 4],
          [3, 3, 4, 5, 5],
        ],
      },
      absstrike: {
        type: "expiry_abs_strike",
        expiries: [1, 2, 3],
        moneyness: [-0.01, 0, 0.01, 0.02, 0.03],
        values: [
          [1, 1, 2, 3, 3],
          [2, 2, 3, 4, 4],
          [3, 3, 4, 5, 5],
        ],
      },
      expiryterm: {
        type: "bachelier",
        expiries: [1, 2, 3],
        terms: [-0.01, 0, 0.01, 0.02, 0.03],
        values: [
          [1, 1, 2, 3, 3],
          [2, 2, 3, 4, 4],
          [3, 3, 4, 5, 5],
        ],
      },
    },
  };
}
