(function (library) {
  class CreditDefaultSwap extends library.LegInstrument {
    #survival_curve = "";
    #accrual_on_default = false;
    #recovery_rate = 0.0;

    constructor(obj) {
      if (!Array.isArray(obj.legs)) {
        // generate leg from terms and conditions
        const fixed_rate = library.number_or_null(obj.fixed_rate);
        if (null === fixed_rate)
          throw new Error("CreditDefaultSwap: must provide fixed rate");
        const leg = library.cashflow_generator({
          notional: obj.notional,
          notional_exchange: false, // no notional exchange
          maturity: obj.maturity,
          effective_date: obj.effective_date,
          first_date: obj.first_date,
          next_to_last_date: obj.next_to_last_date,
          fixed_rate: fixed_rate,
          tenor: obj.tenor,
          calendar: obj.calendar,
          bdc: obj.bdc,
          dcc: obj.dcc,
          adjust_accrual_periods: obj.adjust_accrual_periods,
          disc_curve: obj.disc_curve,
        });

        // for standard CDS, the last accrual period extends one day longer
        const last_payment = leg.payments[leg.payments.length - 1];
        if (last_payment.date_end) {
          last_payment.date_end = library.add_days(last_payment.date_end, 1);
        }

        // create shallow copy and leave original object unchanged
        const tempobj = Object.assign({ legs: [leg] }, obj);
        super(tempobj);
      } else {
        super(obj);
      }
      if (1 !== this.legs.length)
        throw new Error("CreditDefaultSwap: must have exactly one leg");

      this.#survival_curve = library.string_or_empty(obj.survival_curve);
      this.#accrual_on_default = library.make_bool(obj.accrual_on_default);
      this.#recovery_rate = library.number_or_null(obj.recovery_rate);
      if (this.#recovery_rate === null)
        throw new Error("CreditDefaultSwap: must specify recovery rate");
      if (this.#recovery_rate < 0 || this.#recovery_rate > 1)
        throw new Error("CreditDefaultSwap: invalid recovery rate");
    }

    add_deps_impl(deps) {
      super.add_deps_impl(deps);
      if ("" != this.#survival_curve) deps.add_curve(this.#survival_curve);
    }

    value_impl(params, extras_not_used) {
      const dc = params.get_curve(this.legs[0].disc_curve);
      const sc = params.get_curve(this.#survival_curve);
      const isda = new library.IsdaCdsModel(dc, sc);

      let pv_premium = 0;
      let n = this.legs[0].payments.length;
      for (let i = 0; i < n; i++) {
        const p = this.legs[0].payments[i];
        if (!(p instanceof library.FixedRatePayment)) continue;
        const { date_pmt, date_end, date_value } = p;
        if (date_pmt <= library.valuation_date) continue;

        const t_pmt = library.time_from_now(date_pmt);
        const t_end =
          (i === n
            ? library.time_from_now(date_end)
            : library.time_from_now(date_value)) -
          1.0 / 365.0;

        const disc_factor = dc.get_df(t_pmt);
        const survival_prob = t_end > 0 ? sc.get_df(t_end) : 1.0;

        pv_premium += p.amount * disc_factor * survival_prob;

        if (this.#accrual_on_default) {
          const aod = isda.accrual_on_default_pv(p);
          pv_premium += aod;
        }
      }

      const notional = this.legs[0].payments[0].notional;
      const recovery_rate = this.#recovery_rate;
      let date_start = this.legs[0].payments[0].date_start;
      if (date_start < library.valuation_date)
        date_start = library.valuation_date;
      const date_end =
        this.legs[0].payments[this.legs[0].payments.length - 1].date_end;
      const pv_protection = isda.protection_pv({
        notional,
        recovery_rate,
        date_start,
        date_end,
      });

      return pv_protection - pv_premium;
    }
  }

  library.CreditDefaultSwap = CreditDefaultSwap;
})(this.JsonRisk || module.exports);
