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

  class FixedRatePayment extends NotionalPayment {
    #date_start = null;
    #date_end = null;
    #ref_start = null;
    #ref_end = null;
    #rate = null;
    #dcc = "";
    #yf = null;
    #yffunc = null;
    #capitalize = false;
    #amount = 0.0;
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

      // rate
      this.#rate = library.number_or_null(obj.rate);
      if (this.#rate === null)
        throw new Error("RatePayment: rate must be a valid number");

      // dcc and year fraction
      this.#dcc = library.string_or_empty(obj.dcc);
      this.#yffunc = library.year_fraction_factory(this.#dcc);
      this.#yf = this.#yffunc(this.#date_start, this.#date_end);

      // capitalization
      this.#capitalize = library.make_bool(this.capitalize);

      // amount
      this.#amount = this.notional * this.#rate * this.#yf;
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
    get rate() {
      return this.#rate;
    }

    get amount() {
      return this.#capitalize ? 0.0 : this.#amount;
    }
    get amount_interest() {
      return this.#amount;
    }
    get amount_notional() {
      return this.#capitalize ? -this.#amount : 0.0;
    }

    set_notional(n) {
      super.set_notional(n);
      this.#amount = this.notional * this.#rate * this.#yf;
    }
  }

  // FloatRatePayment(index_name, is_fixed, rate_spread)

  // FloatRatePaymentCapFloor(index_name, is_fixed, spread, rate_cap, rate_floor)

  // CapFloorPayment()
  library.NotionalPayment = NotionalPayment;
  library.FixedRatePayment = FixedRatePayment;
})(this.JsonRisk || module.exports);
