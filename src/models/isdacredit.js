(function (library) {
  /**
   * Class representing an ISDA credit model
   * @memberof JsonRisk
   */
  class IsdaCdsModel {
    #disc_curve = null;
    #survival_curve = null;
    #timeline = null;

    /**
     * Create an ISDA credit model
     * @param {Curve} disc_curve discount curve object
     * @param {Curve} survival_curve survival curve object, discount factors represent survival probabilities, should use the linear_rt interpolation method.
     */
    constructor(disc_curve, survival_curve) {
      this.#disc_curve = disc_curve;
      this.#survival_curve = survival_curve;

      const times = new Set();
      for (const t of this.#disc_curve.times) times.add(t);
      for (const t of this.#survival_curve.times) times.add(t);
      this.#timeline = Array.from(times);
      this.#timeline.sort();
      Object.freeze(this.#timeline);
    }

    /**
     * Create a time line from t_start to t_end including t_start, t_end and all support points of the discount curve and the survival curve
     * @param {date} t_start start time
     * @param {date} t_end end time
     */
    timeline(t_start, t_end) {
      const res = [t_start];
      for (const t of this.#timeline) {
        if (t <= t_start) continue;
        if (t >= t_end) continue;
        res.push(t);
      }
      res.push(t_end);
      return res;
    }

    /**
     * Calculate the present value of accrual on default for a rate payment
     * @param {Payment} pmt the payment
     * @param {date} pmt.date_start the accrual start date
     * @param {date} pmt.date_end the accrual end date
     * @param {date} pmt.date_pmt the payment date
     * @param {number} pmt.amount the payment amount
     */
    accrual_on_default_pv(pmt) {
      const { date_start, date_end, date_pmt, amount } = pmt;
      const t_pmt = library.time_from_now(date_pmt);
      if (t_pmt <= 0) return 0.0;
      const t_start = library.time_from_now(date_start);
      const t_end = library.time_from_now(date_end);

      // accrual amount
      const annualized_amount = amount / (t_end - t_start);

      // sub-timeline
      const timeline = this.timeline(t_start, t_end);

      // initialize loop
      let res = 0.0;
      let t0 = Math.max(0.0, t_start);
      let df0 = this.#disc_curve.get_df(t0);
      let sp0 = this.#survival_curve.get_df(t0);

      // loop over all payments
      for (let i = 1; i < timeline.length; i++) {
        const t1 = Math.max(timeline[i], 0);
        const df1 = this.#disc_curve.get_df(t1);
        const sp1 = this.#survival_curve.get_df(t1);

        const forward = Math.log(df0 / df1);
        const hazard = Math.log(sp0 / sp1);
        const dfsp0 = df0 * sp0;
        const dfsp1 = df1 * sp1;
        const fh = forward + hazard;
        let tmp = 0.0;

        if (Math.abs(fh) > 1e-4) {
          // regular case
          tmp =
            (hazard / fh) *
            ((t1 - t0) * ((dfsp0 - dfsp1) / fh - dfsp1) +
              (t0 - t_start) * (dfsp0 - dfsp1));
        } else {
          // taylor expansion for small fh
          const fh_2 = fh * fh;
          tmp =
            hazard *
            dfsp0 *
            ((t0 - t_start) *
              (1.0 - 0.5 * fh + (1.0 / 6.0) * fh_2 - (1.0 / 24.0) * fh_2 * fh) +
              (t1 - t0) *
                (0.5 -
                  (1.0 / 3.0) * fh +
                  (1.0 / 8.0) * fh_2 -
                  (1.0 / 30.0) * fh_2 * fh));
        }

        res += tmp;
        t0 = t1;
        df0 = df1;
        sp0 = sp1;
      }

      return res * annualized_amount;
    }

    /**
     * Calculate the present value of a protetion period
     * @param {object} period the period
     * @param {date} period.date_start protection start date
     * @param {date} period.date_end protection end date
     * @param {number} period.notional the notional
     * @param {number} period.recovery_rate the recovery rate
     */
    protection_pv(period) {
      const { date_start, date_end, notional, recovery_rate } = period;
      const t_start = library.time_from_now(date_start);
      const t_end = library.time_from_now(date_end);
      if (t_end <= 0) return 0.0;

      // sub-timeline
      const timeline = this.timeline(t_start, t_end);

      // initialize loop
      let res = 0.0;
      let t0 = Math.max(0.0, t_start);
      let df0 = this.#disc_curve.get_df(t0);
      let sp0 = this.#survival_curve.get_df(t0);

      // loop over all payments
      for (let i = 1; i < timeline.length; i++) {
        const t1 = Math.max(timeline[i], 0);
        const df1 = this.#disc_curve.get_df(t1);
        const sp1 = this.#survival_curve.get_df(t1);

        const forward = Math.log(df0 / df1);
        const hazard = Math.log(sp0 / sp1);
        const dfsp0 = df0 * sp0;
        const dfsp1 = df1 * sp1;
        const fh = forward + hazard;
        let tmp = 0.0;

        if (Math.abs(fh) > 1e-4) {
          // regular case
          tmp = (hazard / fh) * (dfsp0 - dfsp1);
        } else {
          // taylor expansion for small fh
          const fh_2 = fh * fh;
          tmp =
            hazard *
            dfsp0 *
            (t0 - t_start) *
            (1.0 -
              0.5 * fh +
              (1.0 / 6.0) * fh_2 -
              (1.0 / 24.0) * fh_2 * fh +
              (1.0 / 120.0) * fh_2 * fh_2);
        }

        res += tmp;
        t0 = t1;
        df0 = df1;
        sp0 = sp1;
      }

      return res * notional * (1 - recovery_rate);
    }
  }
  library.IsdaCdsModel = IsdaCdsModel;
})(this.JsonRisk || module.exports);
