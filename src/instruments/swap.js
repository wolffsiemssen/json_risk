(function (library) {
  class Swap extends library.Instrument {
    constructor(obj) {
      super(obj);
      this.phi = library.get_safe_bool(obj.is_payer) ? -1 : 1;

      this.fixed_rate = obj.fixed_rate;
      //the fixed leg of the swap
      this.fixed_leg = new library.FixedIncome({
        notional: obj.notional * this.phi,
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

      //the floating rate leg of the swap
      this.float_leg = new library.FixedIncome({
        notional: -obj.notional * this.phi,
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
    }

    fair_rate(disc_curve, fwd_curve) {
      //returns fair rate, that is, rate such that swap has zero present value
      var pv_float = this.float_leg.present_value(disc_curve, null, fwd_curve);
      if (0 === pv_float) return 0;
      return (-this.phi * pv_float) / this.annuity(disc_curve);
    }

    annuity(disc_curve) {
      //returns always positive annuity regardless of payer/receiver flag
      return this.fixed_leg.annuity(disc_curve) * this.phi;
    }

    present_value(disc_curve, fwd_curve) {
      var res = 0;
      res += this.fixed_leg.present_value(disc_curve, null, null);
      res += this.float_leg.present_value(disc_curve, null, fwd_curve);
      return res;
    }

    add_deps_impl(deps) {
      this.float_leg.add_deps_impl(deps);
    }

    value_impl(params) {
      const disc_curve = params.get_curve(this.float_leg.disc_curve);
      const fwd_curve = params.get_curve(this.float_leg.fwd_curve);
      return this.present_value(disc_curve, fwd_curve);
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
