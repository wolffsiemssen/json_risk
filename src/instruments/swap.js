(function (library) {
  class Swap extends library.LegInstrument {
    #fixed_leg = null;
    #float_leg = null;
    constructor(obj) {
      if (!Array.isArray(obj.legs)) {
        // generate legs from terms and conditions
        const phi = library.make_bool(obj.is_payer) ? -1 : 1;
        const fixed_leg = library.cashflow_generator({
          notional: obj.notional * phi,
          notional_exchange: false,
          maturity: obj.maturity,
          fixed_rate: obj.fixed_rate,
          tenor: obj.tenor,
          effective_date: obj.effective_date,
          calendar: obj.calendar,
          bdc: obj.bdc,
          dcc: obj.dcc,
          adjust_accrual_periods: obj.adjust_accrual_periods,
          disc_curve: obj.disc_curve || "",
        });

        const float_leg = library.cashflow_generator({
          notional: -obj.notional * phi,
          notional_exchange: false,
          maturity: obj.maturity,
          float_spread: obj.float_spread,
          tenor: obj.float_tenor,
          effective_date: obj.effective_date,
          calendar: obj.calendar,
          bdc: obj.float_bdc,
          dcc: obj.float_dcc,
          float_current_rate: obj.float_current_rate,
          adjust_accrual_periods: obj.adjust_accrual_periods,
          disc_curve: obj.disc_curve || "",
          fwd_curve: obj.fwd_curve || "",
        });

        const index = {
          fwd_curve: obj.fwd_curve,
          surface: obj.surface,
          dcc: obj.dcc,
        };

        float_leg.indices = { index: index };

        // create shallow copy and leave original object unchanged
        const tempobj = Object.assign({ legs: [fixed_leg, float_leg] }, obj);
        super(tempobj);
      } else {
        super(obj);
      }

      if (2 !== this.legs.length)
        throw new Error("Swap: must have exactly two legs");

      // inspect legs and decide if this is a fix-float-swap (one purely fixed leg, one purely floating leg) which allows derivation of a fair rate
      for (const leg of this.legs) {
        if (leg.has_capitalization)
          throw new Error("Swap: Cannot have capitalizing rate payments");
        const is_fix = leg.has_fixed_rate_payments;
        const is_float = leg.has_float_rate_payments;
        if (is_fix === true && is_float === false) this.#fixed_leg = leg;
        if (is_fix === false && is_float === true) this.#float_leg = leg;
      }

      if (null === this.#fixed_leg || null === this.#float_leg) {
        throw new Error(
          "Swap: must have one purely fix and one purely float leg.",
        );
      }
    }

    // getter functions
    get fixed_leg() {
      return this.#fixed_leg;
    }
    get float_leg() {
      return this.#float_leg;
    }

    fair_rate(disc_curve, fwd_curve) {
      //returns fair rate, that is, rate such that swap has zero present value
      const pv_float = this.#float_leg.value_with_curves(disc_curve, fwd_curve);
      const annuity = this.annuity(disc_curve);
      if (0 === annuity) {
        if (0 === pv_float) return 0.0;
        throw new Error(
          "Swap: Cannot determine fair rate for swap with zero annuity",
        );
      }
      return -pv_float / annuity;
    }

    fixed_rate() {
      //returns first rate on the fixed leg
      for (const p of this.#fixed_leg.payments) {
        if (p instanceof library.FixedRatePayment) {
          return p.rate;
        }
      }
    }

    annuity(disc_curve) {
      // returns fixed rate annuity
      return this.#fixed_leg.annuity(disc_curve);
    }

    get_cash_flows(fwd_curve) {
      return {
        fixed_leg: this.fixed_leg.get_cash_flows(),
        float_leg: this.float_leg.get_cash_flows(fwd_curve),
      };
    }
  }

  library.Swap = Swap;
})(this.JsonRisk || module.exports);
