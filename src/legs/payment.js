(function (library) {
  // function that checks for valid notional
  function check_notional(unsafe_notional) {
    const res = library.number_or_null(unsafe_notional);
    if (res === null)
      throw new Error("Payment: notional must be a valid number");
    return res;
  }

  class NotionalPayment {
    #date_pmt = null;
    #date_value = null;
    #notional = 0.0;
    #currency = "";
    constructor(obj) {
      // notional
      this.#notional = check_notional(obj.notional);

      //payment date
      this.#date_pmt = library.date_or_null(obj.date_pmt);
      if (this.#date_pmt === null)
        throw new Error("Payment: date_pmt must be a valid date");

      // value date
      this.#date_value = library.date_or_null(obj.date_value) || this.#date_pmt;

      //currency
      this.#currency = library.string_or_empty(obj.currency);
    }

    set_notional(n) {
      this.#notional = check_notional(n);
    }

    // getter functions
    get is_fixed() {
      return true;
    }
    get date_pmt() {
      return this.#date_pmt;
    }
    get date_value() {
      return this.#date_value;
    }
    get notional() {
      return this.#notional;
    }
    get currency() {
      return this.#currency;
    }
    get amount() {
      return this.#notional;
    }
    get amount_interest() {
      return 0.0;
    }
    get amount_notional() {
      return this.#notional;
    }
    get amount_option() {
      return 0.0;
    }
  }

  class RatePayment extends NotionalPayment {
    #date_start = null;
    #date_end = null;
    #ref_start = null;
    #ref_end = null;
    #dcc = "";
    #yf = null;
    #yffunc = null;
    #capitalize = false;
    constructor(obj) {
      super(obj);
      // start and end dates
      this.#date_start = library.date_or_null(obj.date_start);
      if (this.#date_start === null)
        throw new Error("RatePayment: date_start must be a valid date");

      this.#date_end = library.date_or_null(obj.date_end);
      if (this.#date_end === null)
        throw new Error("RatePayment: date_end must be a valid date");

      // reference periods
      this.#ref_start = library.date_or_null(obj.ref_start) || this.#date_start;
      this.#ref_end = library.date_or_null(obj.ref_end) || this.#date_end;

      // sanity checks
      if (this.#date_start >= this.#date_end)
        throw new Error("RatePayment: date_start must be before date_end");
      if (this.#ref_start >= this.#ref_end)
        throw new Error("RatePayment: ref_start must be before ref_end");
      if (this.#date_start >= this.date_value)
        throw new Error("RatePayment: date_start must be before date_value");

      // dcc and year fraction
      this.#dcc = library.string_or_empty(obj.dcc);
      this.#yffunc = library.year_fraction_factory(this.#dcc);
      this.#yf = this.#yffunc(this.#date_start, this.#date_end);

      // capitalization
      this.#capitalize = library.make_bool(obj.capitalize);
    }

    //getter functions
    get date_start() {
      return this.#date_start;
    }
    get date_end() {
      return this.#date_end;
    }
    get ref_start() {
      return this.#ref_start;
    }
    get ref_end() {
      return this.#ref_end;
    }
    get yf() {
      return this.#yf;
    }
    get capitalize() {
      return this.#capitalize;
    }
  }

  class FixedRatePayment extends RatePayment {
    #rate = null;
    #amount = 0.0;
    constructor(obj) {
      super(obj);
      // rate
      this.#rate = library.number_or_null(obj.rate);
      if (this.#rate === null)
        throw new Error("FixedRatePayment: rate must be a valid number");

      // amount
      this.#amount = this.notional * this.#rate * this.yf;
    }

    //getter functions
    get rate() {
      return this.#rate;
    }
    get amount() {
      return this.capitalize ? 0.0 : this.#amount;
    }
    get amount_interest() {
      return this.#amount;
    }
    get amount_notional() {
      return this.capitalize ? -this.#amount : 0.0;
    }

    // set notional must update amount as well
    set_notional(n) {
      super.set_notional(n);
      this.#amount = this.notional * this.#rate * this.yf;
    }
  }

  class FloatRatePayment extends RatePayment {
    #index = "";
    #is_fixed = false;
    #spread = 0.0;
    #rate = 0.0;
    #reset_start = null;
    #reset_end = null;
    constructor(obj) {
      super(obj);

      // index
      this.#index = library.string_or_empty(obj.index);

      // is fixed
      this.#is_fixed = library.make_bool(obj.is_fixed);

      // fixing
      if (this.#is_fixed) {
        this.#rate = library.number_or_null(obj.rate);
        if (null === this.#rate)
          throw new Error(
            "FloatRatePayment: rate missing on payment that is already fixed",
          );
      }

      // spread
      this.#spread = library.number_or_null(obj.spread) || 0.0;

      // optional dates
      this.#reset_start =
        library.date_or_null(obj.reset_start) || this.date_start;
      this.#reset_end = library.date_or_null(obj.reset_end) || this.date_end;

      // sanity checks
      if (this.#reset_start >= this.#reset_end)
        throw new Error("RatePayment: reset_start must be before reset_end");
    }

    // getter functions
    get is_fixed() {
      return this.#is_fixed;
    }
    get index() {
      return this.#index;
    }
    get rate() {
      return this.#rate;
    }
    get amount() {
      return this.capitalize ? 0.0 : this.amount_interest;
    }
    get amount_interest() {
      return this.#rate * this.notional * this.yf;
    }
    get amount_notional() {
      return this.capitalize ? -this.amount_interest : 0.0;
    }

    // project rate
    project(indices) {
      if (this.#is_fixed) return this.#rate;
      if ("" === this.#index)
        throw new Error("FloatRatePayment: no index defined");
      const idx = indices[this.#index];
      if (undefined === idx)
        throw new Error(
          `FloatRatePayment: index ${this.#index} was not supplied`,
        );
      if (!(idx instanceof library.SimpleIndex))
        throw new Error(`FloatRatePayment: invalid index ${this.#index}`);
      this.#rate = idx.fwd_rate(this.#reset_start, this.#reset_end);
      this.#rate += this.#spread;
      return this.#rate;
    }
  }

  // FloatRatePaymentCapFloor(index_name, is_fixed, spread, rate_cap, rate_floor)

  // CapFloorPayment()
  library.NotionalPayment = NotionalPayment;
  library.FixedRatePayment = FixedRatePayment;
  library.FloatRatePayment = FloatRatePayment;
})(this.JsonRisk || module.exports);
