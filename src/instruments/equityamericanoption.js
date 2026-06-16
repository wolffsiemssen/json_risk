(function (library) {
  // helper function
  const times_for_gaussian = function (t_start, t_end) {
    const res = [];
    let days = 1 + Math.trunc(t_end * 365);
    days = Math.min(days, 12);
    let months = 1 + Math.trunc(t_end * 12);
    months = Math.min(months, 48);
    const n = Math.max(days, months);
    for (let i = 1; i <= n; i++) {
      const s = (t_end * i) / n;
      if (s < t_start) continue;
      res.push(s);
    }
    return res;
  };

  /**
   * Class representing an american option on a stock or on an equity index
   * @memberof JsonRisk
   * @extends Equity
   */
  class EquityAmericanOption extends library.Equity {
    #first_exercise_date = null;
    #expiry = null;
    #repo_curve = "";
    #surface = "";
    #strike = 0.0;
    #q = 0.0;
    #is_call = true;
    #n = 10;
    #model = "";

    /**
     * Create an equity option instrument.
     * @param {obj} obj A plain object representing position in a financial instrument
     * @param {string} [obj.currency=""] the currency in which this instrument's value is represented
     * @param {number} [obj.quantity=1.0] the quantity with which the instrument's value is multiplied
     * @param {string} [obj.quote=""] reference to a quote object
     * @param {string} [obj.disc_curve=""] reference to a curve object
     * @param {string} [obj.repo_curve=""] reference to a curve object
     * @param {string} [obj.surface=""] reference to a surface object
     * @param {string} [obj.calendar=""] calendar name
     * @param {number} [obj.spot_days=0] spot days for the quote
     * @param {date} obj.expiry expiry date of the option
     * @param {number} [obj.strike=0.0] strke price payable at expiry
     * @param {boolean} [obj.is_call=false] flag indicating if this is a call option
     * @param {number} [obj.q=0.0] dividend yield, used to adjust the spot price to get the forward price at time t, and also to calculate the discount factor for dividends in the binomial model
     * @param {number} [obj.n=10] number of steps in the binomial tree, used to build the tree and to calculate the time step
     * @param {date} [obj.first_exercise_date=null] first exercise date for the option, if it is null, option can be exercised any time up to expiry. If it is equal to the expiry, we have a euripean option.
     */
    constructor(obj) {
      super(obj);
      this.#first_exercise_date = library.date_or_null(obj.first_exercise_date);
      this.#expiry = library.date_or_null(obj.expiry);
      this.#repo_curve = library.string_or_empty(obj.repo_curve);
      this.#surface = library.string_or_empty(obj.surface);
      this.#strike = library.number_or_null(obj.strike) || 0.0;
      this.#is_call = library.make_bool(obj.is_call);
      this.#q = library.number_or_null(obj.q) || 0.0;
      this.#n = library.number_or_null(obj.n) || 10;
      this.#model = library.string_or_empty(obj.model).toLowerCase() || "crr";
    }

    get repo_curve() {
      return this.#repo_curve;
    }

    add_deps_impl(deps) {
      super.add_deps_impl(deps);
      if ("" != this.#repo_curve) deps.add_curve(this.#repo_curve);
      if ("" != this.#surface) deps.add_surface(this.#surface);
    }

    value_impl(params, extras_not_used) {
      if (library.valuation_date >= this.#expiry) return 0.0;
      const quote = params.get_scalar(this.quote);
      const spot = quote.get_value();
      const dc = params.get_curve(this.disc_curve);
      const rc = this.#repo_curve ? params.get_curve(this.#repo_curve) : dc;
      const surface = params.get_surface(this.#surface);

      const forward = this.forward(quote.get_value(), this.#expiry, dc, rc);
      const t_start = this.#first_exercise_date
        ? library.time_from_now(this.#first_exercise_date)
        : 0.0;
      const t_end = library.time_from_now(this.#expiry);
      const vol = surface.get_rate(t_end, null, forward, this.#strike);

      if (this.#model == "crr") {
        const model = new library.CRRBinomialModel(
          t_start,
          t_end,
          vol,
          spot,
          this.#strike,
          this.#n,
          dc,
          this.#q,
        );
        const val = this.#is_call ? model.call_price() : model.put_price();
        return val;
      } else if (this.#model == "gaussian") {
        const times = times_for_gaussian(t_start, t_end);
        const xi = times.map((t) => vol * Math.sqrt(t));

        const strike = this.#strike;
        const payoff = this.#is_call
          ? function (t, v) {
              if (t < t_start) return 0.0;
              return Math.max(v - strike * dc.get_df(t), 0);
            }
          : function (t, v) {
              if (t < t_start) return 0.0;
              return Math.max(strike * dc.get_df(t) - v, 0);
            };

        const q = this.#q;
        const underlying = function (t, x) {
          const drift = -(q + 0.5 * vol * vol) * t;
          return spot * Math.exp(drift + x);
        };

        const num_std_devs = 4;
        const resolution = 16;
        const model = new library.GaussianModel({
          times,
          xi,
          underlying,
          payoff,
          num_std_devs,
          resolution,
        });
        const val = model.price();
        return val;
      }
    }
  }

  library.EquityAmericanOption = EquityAmericanOption;
})(this.JsonRisk || module.exports);
