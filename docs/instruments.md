# JSON Risk instruments guide

## Supported instruments

JSON Risk supports the instrument types below:
 
- Equities
  - Stock
  - Stock/Index Future
  - Stock/Index Forward
  - European Options
- Fixed income instruments
  - Fixed rate bonds
  - Floating rate bonds
  - Interest rate swaps
  - Bespoke leg instruments
- FX instruments
  - FX spot
  - FX forward
  - Cross-Currency Swap
- Callable fixed income instruments
  - Plain vanilla swaptions
  - Single callable and multicallable bond
- Credit
  - Credit default swaps
  
Fixed income, FX and Credit instruments support cash flow generation from terms and conditions as well as pre-defined leg structures.

## Instantiating instruments

Instruments are created from a JSON instrument definition either with their constructors or with the `make_instrument` library function which examines the `type` field to determine what instrument to construct. The `simulation` and `vector_pricer` function uses `make_instrument` under the hood. Here is a table of instruments, their types and their class names.

|Type / Class | Category / Superclass |Description |
|-------------|-------------|-------------|
|Equity|Equity|A stock or an index|
|EquityForward|Equity|A forward on a stock|
|EquityFuture|Equity|A future on a stock or an index|
|EquityOption|Equity|An option on a stock or an index|
|LegInstrument|LegInstrument|A generic instrument with legs|
|Bond|LegInstrument|A bond, i.e. a leg instrument with only fixed payments|
|Floater|LegInstrument|A floating rate note, i.e. a leg instrument with only notional and floating rate payments|
|Swap|LegInstrument|An interest rate swap, i.e., a leg instrument with two legs with certain limitations and features|
|Swaption|LegInstrument|A plain vanilla swaption|
|CallableBond|LegInstrument|A bond with single or multiple exercise rights|
|FxTerm|LegInstrument|An FX Spot, FX Forward, or FX Swap instrument|
|cds|LegInstrument|A credit default swap|

The `type` field is case-insensitive and underscores are ignored, so e.g. C style `equity_future` and C++ style `EquityFuture` are both supported. Example:

    // plain JSON without type field
    const equity_json = {
        quantity: 100.0,
        quote: "stock",
        disc_curve: "curve",
        spot_days: 2,
    };

    // call constructor directly
    let eq=new JsonRisk.Equity(equity_json);

    // add type
    equity_json.type="Equity";

    // use factory function
    eq=JsonRisk.make_instrument(equity_json);

    // use valuation with parameters and scenarios directly on the JSON
    let result=JsonRisk.vector_pricer(equity_json, params_json);

## Common logic for all instruments - the `Instrument` class

An Instrument instance stands for a financial instrument or a position in a financial instrument. All instruments support the optional `quantity` and `currency` fields. The quantity defaults to `1.0` and specifies the positive or negative size of the position. Valuation results are scaled with this quantity. The currency is empty per default and specifies the currency in which valuation results are calculated. If the currency is non-empty, valuation results are converted from the instrument currency to the main currency set in the parameters.
      
## Stocks - the `Equity` class

### Definition and parametrisation

Stock positions are defined with a `quantity`, a `currency` and the optional `spot_days` and `calendar` property. Valuation requires a discount curve and a quote to be present in the parameters, linked with the `disc_curve` and `quote` properties. The discount curve is used to transform the quote into a present value using the spot days.

### Examples

    // a plain equity position
    const equity_json = {
        type: "Equity",
        quantity: 100.0,
        quote: "stock",
        disc_curve: "curve",
        spot_days: 2,
        calendar: "TARGET"
    };

## Forwards and Futures on stocks and indices - the `EquityForward` and `EquityFuture` classes

### Definition and parametrisation

in addition to stocks, forwards and futures have an expiry (`expiry_date`) and an optional `price`. Moreover, you may link an optional repo curve in the parameters with the `repo_curve` attribute. The value of an EquityForward or EquityFuture position depends on the theoretical forward value. The theoretical forward is the quoted spot price, discounted down to today using the discount curve, discounted up forward to the expiry date. Then,

 - the present value of a forward position is the difference between theoretical forward and the given price, discounted down to today using the discount curve;
 - the present value of a futures position is the difference between theoretical forward and the given price.

### Examples

    // an equity forward position
    const forward_json = {
        type: "EquityForward",
        expiry: "2024/01/17",
        quantity: 100.0,
        quote: "stock1",
        disc_curve: "curve",
        repo_curve: "repo1",
        spot_days: 2,
        calendar: "TARGET"
    };

    // an equity futures position
    const future_json = {
        type: "EquityFuture",
        expiry: "2024/01/17",
        quantity: 100.0,
        quote: "stock2",
        disc_curve: "curve",
        repo_curve: "repo2",
        spot_days: 2,
        calendar: "TARGET"
    };

## Options on stocks and indices - the `EquityOption` class

### Definition and Parametrisation

In addition to forward and futures positions, the `EquityOption` requires a strike price `strike` and a flag `is_call` that indicates if the position is in a put option or in a call option. Moreover, a link to a `surface` in the paramters is required. That surface must be of type `ExpiryRelStrike` or `ExpiryAbsStrike`. The black model is used for valuation of stock options.

### Examples

    // a put option
    const put_json={
        quote: "stock",
        disc_curve: "discount",
        repo_curve: "repo",
        surface: "surface",
        spot_days: 2,
        strike: 100.0,
        is_call: false,
        expiry: "2024/01/17",
    }

    // a call option
    const call_json={
        quote: "stock",
        disc_curve: "discount",
        repo_curve: "repo",
        surface: "surface",
        spot_days: 2,
        strike: 100.0,
        is_call: true,
        expiry: "2024/01/17",
    }

## Leg instruments - the `LegInstrument` class and its derived classes

Leg instruments all contain a vector of one or more `legs`. Legs are collections of cash flows, e.g., notional payments, fixed rate and float rate coupons. Each leg may have its own currency, discount curve and discounting spreads. If the currency of a leg is different from the currency of the instrument, the leg value is converted automatically when evaluating the instrument.

The LegInstrument superclass requires the field `legs` to be populated in the JSON definition with pre-defined legs. All derived instruments accept pre-defined legs set in the JSON definition, but may impose restrictions on their number and contents. For example, a fixed rate bond must contain one and only one leg, and that leg must not contain float rate payments. Moreover, most classes derived from LegInstrument support generating their legs from terms and conditions. Specifics are described below for each instrument class.

### Example

Below is an example for a generic leg instrument in EUR with one leg. The leg has one fixed rate payment, two float-rate payments, one of which is already fixed and one of which still depends on an index, and one notional payment.

    {
      "type": "LegInstrument",
      "currency": "EUR",
      "legs": [
        {
          "disc_curve": "discount",
          "payments": [
            {
              "type": "fixed",
              "currency": "EUR",
              "notional": 100,
              "rate": 0.01,
              "date_pmt": "2000/01/02",
              "date_start": "1999/01/01",
              "date_end": "2000/01/01"
            },
            {
              "type": "float",
              "currency": "EUR",
              "notional": 100,
              "rate": 0.02,
              "spread": 0.01,
              "is_fixed": true,
              "date_pmt": "2000/01/02",
              "date_start": "1999/01/01",
              "date_end": "2000/01/01"
            },
            {
              "type": "float",
              "currency": "EUR",
              "notional": 100,
              "rate": null,
              "spread": 0.01,
              "is_fixed": false,
              "date_pmt": "2010/01/02",
              "date_start": "2009/01/01",
              "date_end": "2010/01/01",
              "index": "index"
            },
            {
              "type": "notional",
              "currency": "EUR",
              "notional": 100,
              "date_pmt": "2000/01/02",
              "date_value": "2000/01/01"
            }
          ],
          "indices": {
            "index": {
              "type": "simple",
              "fwd_curve": "forward"
            }
          }
        }
      ]
    }

## Fixed and floating rate bonds - the `Bond` and `Floater` classes.

Fixed and floating rate bonds provide a lot of flexibility to model a wide range of both banking book and trading book positons. When pre-defined `legs` are supplied, these instruments make sure `legs` contains one and only one leg. Pre-defined legs must contain notional payments for bonds and floaters. While bond legs must not contain float rate payments, floater legs must not contain fixed rate payments.

Next, we describe how bond and floater legs are generated from terms and conditions in case they are not pre-defined in the instrument definition JSON.

### Schedule generation

Within schedule generation, these instruments require `maturity` to be set generate schedules starting from `effective_date` (if unset, try to generate a schedule from maturity back into the past), and support a broad range of features:

- long and short implicit stubs (e.g., forward and backward roll out)
- explicit initial and final stubs
- completely independent generation of
  - interest rate schedule (fields `tenor`, `first_date`, `next_to_last_date`, `stub_long`, `stub_end`)
  - fixing schedule for floating rate instruments (fields `fixing_tenor`, `fixing_first_date`, `fixing_next_to_last_date`, `fixing_stub_long`, `fixing_stub_end`)
  - repayment schedule for amortizing instruments (fields `repay_tenor`, `repay_first_date`, `repay_next_to_last_date`, `repay_stub_long`, `repay_stub_end`)

If schedules do not align well, split accrual periods are generated.

### Amortization features

The amortization features below allow to define various notional profiles:

- bullet repayment upon maturity (default)
- step-down or step-up amortization linear amortization (field `repay_amount` specifies amounts, supports amounts varying over time)
- linear amortization (flag `linear_amortization`, supports phases with and without capitalization)
- interest capitalization (allowing to define annuity-type profiles, field `interest_capitalization`)

### Payments and rates

Coupons and payments are further specified by the terms and conditions below:

 - Initial notional (field `notional`)
 - Payment calendar (field `calendar`)
 - Business day convention (field `bdc`)
 - Day count convention (field `dcc`)
 - Fixed rate for bonds (field `fixed_rate`, supports rates varying over time)
 - Spread for floaters ( field `float_spread`, supports spreads varying over time)
 - Fixed or adjusted accrual periods (field `adjust_accrual_periods`)
 
 ### Parametrisation
 
 Parametrise the bond with a discount curve name (`disc_curve`), an optional (`spread_curve`) name, and an optional residual spread (`residual_spread`). Floaters need a reference to a forward curve (`forward_curve`). If the `legs` property is used, the leg is parametrised with the discounting curves and the forward curve is defined on the index within the `indices` property.


### Examples

Fixed rate bullet bond with yearly coupon. This mininal definition below pulls default values e.g., no amortization, `act/365` day count convention and backward rollout of the interest rate schedule.

        {
                notional: 100,
                tenor: 12,                              //yearly coupon
                fixed_rate: 0.01,
                maturity: "2025/01/01"
        }

Fixed rate bullet bond with semi-annual coupon, explicit issuance date and explicit initial and final stubs.

        {
                notional: 100,
                tenor: 6,                               //semiannual coupon
                fixed_rate: 0.01,
                dcc: "a/a",                             //explicit day count convention
                effective_date: "2015/01/01",
                first_date: "2015/06/15",               //first interest payment date (initial stub)
                next_to_last_date: "2024/06/15",        //penultimate interest payment date (final stub)
                maturity: "2025/01/01"
        }

Fixed rate bullet bond with quarterly coupon and yearly amortization.

        {
                notional: 100,
                tenor: 3,                               //quarterly coupon
                fixed_rate: 0.01,
                dcc: "a/a",
                effective_date: "2015/01/01",
                maturity: "2025/01/01",
                
                repay_amount: 5.0,                      //regular amortization amount...
                repay_tenor: 12,                        //paid every year...
                repay_next_to_last_date: "2024/06/15"   //on jun 15, remainder is paid at maturity.
        }

Floating rate bullet bond with semi-annual coupon, current fixing provided

        {
                notional: 100,
                tenor: 6,                               
                float_current_rate: 0.01,               //currently fixed rate
                float_spread: 0.025,                    //spread-over-float
                dcc: "a/a",                             
                maturity: "2025/01/01"
        }


## Interest rate swaps - the `Swap` class

A swap is a leg instrument with one fixed rate and one float rate leg. If `legs` are provided, the class makes sure two legs are present, one of them being fixed rate and one being float rate. It also verifies both legs do not have capitalizing interest rate payments, which is not supported for swaps. The library detects which of the legs is the fixed leg and which is the float leg, and if the swap is a payer swap or a receiver swap. More bespoke swap instruments without restrictions on the legs are supported using the LegInstrument superclass directly. The generic superclass supports definition of, e.g., basis swaps or cross currency swaps.

### Leg generation

If no `legs` are supplied in the instrument JSON definition, the library tries to generate the legs based on terms and conditions.

 - Define size and direction of the swap with the `notional` fields and the `is_payer` flag.
 - Set start and end of the swap with the `effective_date` and `maturity` date fields, and set a calendar with `calendar`.
 - Specify the fixed leg with `fixed_rate`, `tenor`, `bdc`, `dcc`
 - Specify the float leg with `float_spread`, `float_tenor`, `float_bdc`, `float_dcc`, `float_current_rate`
 - Parametrise the swap with `disc_curve` and `fwd_curve`.

### Examples

Receiver swap:

        {                
                notional: 100,                          //for both legs
                effective_date: "2015/01/01",
                maturity: "2025/01/01",
                calendar: "TARGET",

                tenor: 12,                              //fixed leg
                fixed_rate: 0.01,
                dcc: "act/360",
                bdc: "following",

                float_tenor: 12,                        //floating leg
                float_current_rate: 0.01,
                float_spread: 0.025,
                float_dcc: "act/360",
                float_bdc: "following"
        }

Payer swap:

        {                
                is_payer: true,
                notional: 100,                          //for both legs
                effective_date: "2015/01/01",
                maturity: "2025/01/01",
                calendar: "TARGET",

                tenor: 12,                              //fixed leg
                fixed_rate: 0.01,
                dcc: "act/360",
                bdc: "following",

                float_tenor: 12,                        //floating leg
                float_current_rate: 0.01,
                float_spread: 0.025,
                float_dcc: "act/360",
                float_bdc: "following"
        }



## Swaptions - the `Swaption` class

A swaption is a leg instrument with one fixed rate and one float rate leg. The legs are restricted in the same way as in the `Swap` class. In addition, a swaption has an exercise date (field `first_exercise_date`) and needs the reference to a surface object (field `surface`) for valuation with the bachelier model.

### Leg generation

If no `legs` are supplied in the instrument JSON definition, the library tries to generate the legs based on terms and conditions in the same way as the `Swap` class.

### Examples

Long receiver swaption:

        {                
                notional: 100,
                first_exercise_date: "2022/01/01",      //expiry date of the swaption
                maturity: "2025/01/01",
                calendar: "TARGET",

                tenor: 12,                              //underlying fixed leg
                fixed_rate: 0.01,
                dcc: "act/360",
                bdc: "following",

                float_tenor: 12,                        //underlying floating leg
                float_current_rate: 0.01,
                float_spread: 0.025,
                float_dcc: "act/360",
                float_bdc: "following"
        }

Short payer swaption:

        {                
                quantity: -1.0,
                is_payer: true,                
                notional: 100,
                first_exercise_date: "2022/01/01",      //expiry date of the swaption
                maturity: "2025/01/01",
                calendar: "TARGET",

                tenor: 12,                              //underlying fixed leg
                fixed_rate: 0.01,
                dcc: "act/360",
                bdc: "following",

                float_tenor: 12,                        //underlying floating leg
                float_current_rate: 0.01,
                float_spread: 0.025,
                float_dcc: "act/360",
                float_bdc: "following"
        }

## FX spot, forward, and swap positions - the `FxTerm` class

This class represents an fx spot, forward or swap position. The `legs` are restricted to be either one leg (the instrument represents just one currency side of the contract in this case) or two legs. If two legs are present, the instrument represents both sides of the contract, and the legs must have different currencies.

Legs can have one payment (fx spot or forward) or two payments (fx swap), and both legs must contain the same number of payments. All payments must be of type "NotionalPayment".

### Leg generation

If no `legs` are supplied, only one leg is supported and that leg is generated from terms and conditions:

 - `notional` and optional `notional_2` specify the payment amounts
 - `maturity` and optional `maturity_2` specify the payment times
 - parametrise the instrument with a discount curve (field `disc_curve`)

### Examples

FX spot or forward:

        {                
                notional: 100,
                maturity: "2025/01/01"
        }

FX swap:

        {                
                notional: 100,                  //near leg
                maturity: "2024/01/01",

                notional_2: 101.76,             //far leg
                maturity_2: "2027/01/01"
        }

## Callable bonds - the `callable_fixed_income` class

Callable bonds must be fixed rate bonds. Apart from that, all features from the `fixed_income` class are supported.

Callable bond Valuation is implemented with a Linear Gauss Markov (or, equivalently, Hull-White) model in the spirit of Hagan, Patrick; EVALUATING AND HEDGING EXOTIC SWAP INSTRUMENTS VIA LGM (2019). It calibrates to a basket of plain vanilla swaptions automatically generated under the hood.

### Valuation and usage

        //convenience Valuation functions without object instantiation
        var present_value=JsonRisk.pricer_callable_bond(json_object, disc_curve, spread_curve, fwd_curve, surface);

        //object instantiation
        var cb=new JsonRisk.callable_fixed_income(json_object);
        
        //Valuation
        present_value=cb.present_value(disc_curve, spread_curve, fwd_curve, surface);

        //access to underlying cash flow table
        var cfobject=cb.base.get_cash_flows();
        
### Examples

European callable bond:

        {
                notional: 100,                          //fixed rate bond definition
                tenor: 6,                               
                fixed_rate: 0.01,
                dcc: "a/a",                             
                effective_date: "2015/01/01",
                first_date: "2015/06/15",               
                next_to_last_date: "2024/06/15",        
                maturity: "2025/01/01",

                first_exercise_date: "2022/01/01",      //call feature definition
                call_tenor: 0                           //european call - default if no call_tenor given
        }


Multi-callable bond:

        {
                notional: 100,                          //fixed rate bond definition
                tenor: 6,                               
                fixed_rate: 0.01,
                dcc: "a/a",                             
                effective_date: "2015/01/01",
                first_date: "2015/06/15",               
                next_to_last_date: "2024/06/15",        
                maturity: "2025/01/01",

                first_exercise_date: "2022/01/01",      //call feature definition
                call_tenor: 12                          //bermudan style call every 12 Months rolling forward from first exercise date
        }

