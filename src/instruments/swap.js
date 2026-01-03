(function (library) {
  class Swap extends library.LegInstrument {
    #fixed_leg = null;
    #float_leg = null;
    #is_fix_float = true;
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
        if (leg.has_fixed_rate_payments) this.#fixed_leg = leg;
        if (leg.has_float_rate_payments) this.#float_leg = leg;
      }

      if (null === this.#fixed_leg || null === this.#float_leg) {
        this.#is_fix_float = false;
      } else {
        if (this.#fixed_leg.has_float_rate_payments) this.#is_fix_float = false;
        if (this.#float_leg.has_fixed_rate_payments) this.#is_fix_float = false;
      }
    }

    // getter functions
    get fixed_leg() {
      return this.#fixed_leg;
    }
    get float_leg() {
      return this.#float_leg;
    }
    get is_fix_float() {
      return this.#is_fix_float;
    }

    fair_rate(disc_curve, fwd_curve) {
      if (this.#is_fix_float) {
        //returns fair rate, that is, rate such that swap has zero present value
        const pv_float = this.#float_leg.value_with_curves(
          disc_curve,
          fwd_curve,
        );
        const annuity = this.annuity(disc_curve);
        if (0 === annuity) {
          if (0 === pv_float) return 0.0;
          throw new Error(
            "Swap: Cannot determine fair rate for swap with zero annuity",
          );
        }
        return -pv_float / annuity;
      } else {
        throw new Error(
          "Swap: Cannot determine fair rate for swap that is not of fix-float type.",
        );
      }
    }

    fixed_rate() {
      if (this.#is_fix_float) {
        //returns first rate on the fixed leg
        for (const p of this.#fixed_leg.payments) {
          if (p instanceof library.FixedRatePayment) {
            return p.rate;
          }
        }
      } else {
        throw new Error(
          "Swap: Cannot determine fixed rate for swap that is not of fix-float type.",
        );
      }
    }

    annuity(disc_curve) {
      if (this.#is_fix_float) {
        return this.#fixed_leg.annuity(disc_curve);
      } else {
        throw new Error(
          "Swap: Cannot determine annuity for swap that is not of fix-float type.",
        );
      }
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
