(function (library) {
  // function that checks for valid notional
  function check_notional(unsafe_notional) {
    const res = library.number_or_null(unsafe_notional);
    if (res === null)
      throw new Error("Payment: notional must be a valid number");
    return res;
  }

  /**
   * Class representing a notional a.k.a. principal payment
   * @memberof JsonRisk
   */
  class NotionalPayment {
    #date_pmt = null;
    #date_value = null;
    #notional = 0.0;
    #pv = 0.0;
    #currency = "";

    /**
     * Create a notional payment.
     * @param {obj} obj A plain object representing the payment.
     * @param {date} obj.date_pmt the payment date
     * @param {date} [obj.date_value=obj.date_pmt] the value date, i.e., the date when this payment changes the balance for rate payments
     * @param {number} obj.notional the payment amount
     * @param {string} [obj.currency=""] currency of the payment.
     */
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

    set_pv(n) {
      this.#pv = n;
    }

    get pv() {
      return this.#pv;
    }

    get is_fixed() {
      return true;
    }
    get date_pmt() {
      return this.#date_pmt;
    }
    get date_value() {
      return this.#date_value;
    }
    get date_start() {
      return this.#date_value;
    }
    get date_end() {
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

    // serialisation
    toJSON() {
      return {
        type: "Notional",
        notional: this.#notional,
        date_pmt: library.date_to_date_str(this.#date_pmt),
        date_value: library.date_to_date_str(this.#date_value),
        currency: this.#currency,
        amount_interest: this.amount_interest, // uses derived class getter
        amount_notional: this.amount_notional, // uses derived class getter
        amount: this.amount, // uses derived class getter
        pv: this.#pv,
      };
    }
  }

  class RatePayment extends NotionalPayment {
    #date_start = null;
    #date_end = null;
    #date_roll = null;
    #tenor = null;
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

      // reference period calculations
      this.#date_roll = library.date_or_null(obj.date_roll) || this.#date_start;
      this.#tenor = library.natural_number_or_null(obj.tenor);

      // sanity checks
      if (this.#date_start.getTime() >= this.#date_end.getTime())
        throw new Error("RatePayment: date_start must be before date_end");
      if (this.#date_start.getTime() >= this.date_value.getTime())
        throw new Error("RatePayment: date_start must be before date_value");

      // dcc and year fraction
      const dcc = library.string_or_empty(obj.dcc);
      this.#yffunc = library.year_fraction_factory(dcc);
      this.#yf = this.#yffunc(
        this.#date_start,
        this.#date_end,
        this.#date_roll,
        this.#tenor,
      );

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
    get date_roll() {
      return this.#date_roll;
    }
    get tenor() {
      return this.#tenor;
    }
    get yf() {
      return this.#yf;
    }
    get capitalize() {
      return this.#capitalize;
    }

    // serialisation
    toJSON() {
      const res = super.toJSON();
      delete res.type;
      res.date_start = library.date_to_date_str(this.#date_start);
      res.date_end = library.date_to_date_str(this.#date_end);
      res.yf = this.#yf;
      res.dcc = this.#yffunc.canonical_name;
      // optional members
      if (this.#capitalize) res.capitalize = true;
      if (this.#date_roll)
        res.date_roll = library.date_to_date_str(this.#date_roll);
      if (this.#tenor) res.tenor = this.#tenor;
      return res;
    }
  }

  /**
   * Class representing a fixed rate payment
   * @memberof JsonRisk
   */
  class FixedRatePayment extends RatePayment {
    #rate = null;
    #amount = 0.0;

    /**
     * Create a fixed rate payment.
     * @param {obj} obj A plain object representing the payment.
     * @param {date} obj.date_pmt the payment date
     * @param {date} [obj.date_value=obj.date_pmt] the value date, i.e., the date when this payment changes the balance for other rate payments, only relevant for capitalizing payments.
     * @param {date} obj.date_start the accrual start date
     * @param {date} [obj.ref_start=obj.date_start] the reference period start date, needed for some day count conventions
     * @param {date} obj.date_end the accrual start date
     * @param {date} [obj.ref_end=obj.date_end] the reference period start date, needed for some day count conventions
     * @param {number} obj.notional the payment amount
     * @param {string} [obj.currency=""] currency of the payment.
     * @param {number} obj.rate fixed rate of the payment.
     * @param {string} [obj.dcc=""] day count convention of the payment.
     * @param {boolean} [obj.calitalize=false] falg indicating if this payment capitalizes
     */
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

    // serialise
    toJSON() {
      const res = super.toJSON();
      res.type = "Fixed";
      res.rate = this.#rate;
      return res;
    }
  }

  /**
   * Class representing a float rate payment
   * @memberof JsonRisk
   */
  class FloatRatePayment extends RatePayment {
    #index = "";
    #is_fixed = false;
    #spread = 0.0;
    #rate = 0.0;
    #reset_start = null;
    #reset_end = null;

    /**
     * Create a float rate payment.
     * @param {obj} obj A plain object representing the payment.
     * @param {date} obj.date_pmt the payment date
     * @param {date} [obj.date_value=obj.date_pmt] the value date, i.e., the date when this payment changes the balance for other rate payments, only relevant for capitalizing payments.
     * @param {date} obj.date_start the accrual start date
     * @param {date} [obj.ref_start=obj.date_start] the reference period start date, needed for some day count conventions
     * @param {date} [obj.reset_start=obj.date_start] the reset period start date
     * @param {date} obj.date_end the accrual start date
     * @param {date} [obj.ref_end=obj.date_end] the reference period start date, needed for some day count conventions
     * @param {date} [obj.reset_end=obj.date_end] the reset period end date
     * @param {number} obj.notional the payment amount
     * @param {string} [obj.currency=""] currency of the payment.
     * @param {string} [obj.index=""] named reference to an index of the payment.
     * @param {number} [obj.spread=0.0] fixed spread rate of the payment.
     * @param {string} [obj.dcc=""] day count convention of the payment.
     * @param {boolean} [obj.calitalize=false] flag indicating if this payment capitalizes
     */
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

    // setter functions
    set_rate(r) {
      this.#rate = library.number_or_null(r) || 0.0;
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
    get spread() {
      return this.#spread;
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

    // serialise
    toJSON() {
      const res = super.toJSON();
      res.type = "Float";
      res.is_fixed = this.#is_fixed;
      res.index = this.#index;
      res.spread = this.#spread;
      res.rate = this.#rate;
      res.reset_start = library.date_to_date_str(this.#reset_start);
      res.reset_end = library.date_to_date_str(this.#reset_end);
      return res;
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

  class CapFloorPayment extends FloatRatePayment {
    #volatility = null; // number
    #strike = null; // number
    
    constructor(obj) {
      super(obj);

      // this.#volatility = null; // library.number_or_null(obj.volatility); // ??? for test case?
      // I do not need volatility here as property of this class
      // and I do not need to pass it to the toJSON method: volatility is 
      // derived from the surface, already known to the index
      // I only need to complete the SimpleIndex class with a method for computing volatility
      // out of the surface
      this.#strike = library.number_or_null(obj.strike);

    }

    // setter functions
    // set_volatility(vola) { // I will probably not need this eventually
    //   this.#volatility = library.number_or_null(vola) || 0.0;  // TODO or null?
    // }

    // getter functions
    // get volatility() { // I will probably not need this eventually
    //   return this.#volatility;
    // }
    get strike() {
      return this.#strike;
    }

    toJSON() {
      const res = super.toJSON();
      // res.volatility = this.#volatility; // actually I do not need this. Volatility is calculated from the index, that knows the surface, 
      // the same way as the forward rate is computed from the curve
      // should not belong to this class, but just be part of the leg instrument, like forward rate
      res.strike = this.#strike;
      return res;
    }

    /**
     * Workaround to prevent instantiating this class, making it de-facto an abstract class. 
     * Only Caplet Floorlet children classes can be instantiated
     */
    project(indices) {
      throw new Error(`${this.constructor.name}: Method 'project()' must be implemented in child class.`);
    }


  }

  class CapletPayment extends CapFloorPayment {
    constructor(obj) {
      super(obj);
    }

    toJSON() {
      const res = super.toJSON();
      res.type = "Caplet";
      return res;
    }

    // project rate
    project(indices) {
      if (this.is_fixed) return this.rate;
      if ("" === this.index)
        throw new Error(`${this.constructor.name}: no index defined`);
      const idx = indices[this.index];
      if (undefined === idx)
        throw new Error(
          `${this.constructor.name}: index ${this.index} was not supplied`,
        );

      if (!(idx instanceof library.SimpleIndex))
        throw new Error(`${this.constructor.name}: invalid index ${this.index}`);
      const fwd_rate =  idx.fwd_rate(this.reset_start, this.reset_end) + (this.spread || 0.0);
      const volatility = idx.volatility(this.reset_start, this.reset_end, fwd_rate, this.strike);
      
      let option_rate = 0.0;
      if (this.strike && volatility > 0) {
        const value_date = library.valuation_date;
        const diff_ms = this.reset_start.getTime() - value_date.getTime();
        const t = diff_ms / (365.25 * 24 * 60 * 60 * 1000);
        const t_expiry = t > 0 ? t : 0.0001;

        const black = new library.Black76(t_expiry, volatility);
        option_rate = black.call_price(fwd_rate, this.strike);
      }
      
      this.set_rate(option_rate);
      return this.rate;
    }
  }

  class FloorletPayment extends CapFloorPayment {
    constructor(obj) {
      super(obj);
    }

    toJSON() {
      const res = super.toJSON();
      res.type = "Floorlet";
      return res;
    }

    // project rate
    project(indices) {
      if (this.is_fixed) return this.rate;
      if ("" === this.index)
        throw new Error(`${this.constructor.name}: no index defined`);
      const idx = indices[this.index];
      if (undefined === idx)
        throw new Error(
          `${this.constructor.name}: index ${this.index} was not supplied`,
        );

      if (!(idx instanceof library.SimpleIndex))
        throw new Error(`${this.constructor.name}: invalid index ${this.index}`);
      const fwd_rate =  idx.fwd_rate(this.reset_start, this.reset_end) + (this.spread || 0.0);
      const volatility = idx.volatility(this.reset_start, this.reset_end, fwd_rate, this.strike);
      
      let option_rate = 0.0;
      if (this.strike && volatility > 0) {
        const value_date = library.valuation_date;
        const diff_ms = this.reset_start.getTime() - value_date.getTime();
        const t = diff_ms / (365.25 * 24 * 60 * 60 * 1000);
        const t_expiry = t > 0 ? t : 0.0001;

        const black = new library.Black76(t_expiry, volatility);
        option_rate = black.floor_price(fwd_rate, this.strike);
      }
      
      this.set_rate(option_rate);
      return this.rate;
    }

  }

  library.NotionalPayment = NotionalPayment;
  library.FixedRatePayment = FixedRatePayment;
  library.FloatRatePayment = FloatRatePayment;
  library.CapFloorPayment = CapFloorPayment;
  library.CapletPayment = CapletPayment;
  library.FloorletPayment = FloorletPayment;

  library.payment_compare = function (a, b) {
    // sort by start date first while notional payments use date_value instead
    const astart = a.date_start.getTime();
    const bstart = b.date_start.getTime();
    if (astart != bstart) return astart - bstart;

    // sort by end date first while notional payments use date_value instead
    const aend = a.date_end.getTime();
    const bend = b.date_end.getTime();
    if (aend != bend) return aend - bend;

    // sort by value date
    if (a.date_value.getTime() != b.date_value.getTime())
      return a.date_value < b.date_value;

    // sort the remaining payments by their type
    const na = a.constructor.name;
    const nb = b.constructor.name;
    return na < nb ? 1 : na > nb ? -1 : 0;
  };
})(this.JsonRisk || module.exports);
