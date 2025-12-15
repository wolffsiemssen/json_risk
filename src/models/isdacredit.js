(function (library) {
  class IsdaCdsModel {
    #disc_curve = null;
    #survival_curve = null;
    #timeline = null;
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
