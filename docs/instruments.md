# JSON Risk instruments guide

JSON Risk supports the instrument types below:
 
- Fixed income instruments
  - Fixed rate bonds (`bond`)
  - Floating rate bonds (`floater`)
  - Interest rate swaps (`swap`)
  - FX spot and forwards contracts (`fxterm`)
- Callable fixed income instruments
  - Plain vanilla swaptions (`swaption`)
  - Single callable and multicallable bond (`callable_bond`)

Generally, an instrument is represented by a plain JSON object.

## Fixed and floating rate bonds - the `fixed_income` class.

Fixed and floating rate bonds provide a lot of flexibility to model a wide range of both banking book and trading book positons.

### Schedule generation

Within schedule generation, these instruments support

- long and short implicit stubs (e.g., forward and backward roll out)
- explicit initial and final stubs
- completely independent generation of
  - interest rate schedule
  - fixing schedule for floating rate instruments
  - repayment schedule for amortizing instruments

### Amortization features

The amortization features below allow to define various notional profiles:

- bullet repayment upon maturity
- step-down or linear amortization (regular repayments)
- interest capitalization (allowing to define annuity-type profiles)

### Pricing and usage

        //convenience pricing functions without object instantiation
        var present_value=JsonRisk.pricer_bond(json_object, disc_curve, spread_curve);
        var present_value=JsonRisk.pricer_floater(json_object, disc_curve, spread_curve, fwd_curve);

        //object instantiation
        var fi=new JsonRisk.fixed_income(json_object);
        
        //pricing
        present_value=fi.present_value(disc_curve, spread_curve, fwd_curve);

        //access to cash flow table
        var cfobject=fi.get_cash_flows(fwd_curve /* only needed for floaters */);

        //fair rate derivation - returns fair spread over float for floaters
        var fair_rate=fi.fair_rate_or_spread(disc_curve, spread_curve, fwd_curve /* only needed for floaters */);


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
                first_date: "2015/06/15",               //first interest payment date
                next_to_last_date: "2024/06/15",        //penultimate interest payment date
                maturity: "2025/01/01"
        }

Fixed rate bullet bond with quarterly coupon and yearly amortization.

        {
                notional: 100,
                tenor: 3,                               //monthly coupon
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


## Interest rate swaps - the `swap` class

Instead of representing swaps leg-wise with the `fixed_income` class, the `swap` class captures both fixed and floating leg in one class. This is convenient for functionalities that require combining both legs, e.g., fair swap rate derivation.


### Pricing and usage

        //convenience pricing function without object instantiation
        var present_value=JsonRisk.pricer_swap(json_object, disc_curve, fwd_curve);

        //object instantiation
        var sw=new JsonRisk.swap(json_object);
        
        //pricing
        present_value=sw.present_value(disc_curve, fwd_curve);

        //access to cash flow tables
        var cfobject_fix=sw.fixed_leg.get_cash_flows();
        var cfobject_float=sw.float_leg.get_cash_flows(fwd_curve);
        var cfobject_both=sw.get_cash_flows(fwd_curve); // returns object of the form {fixed_leg: cfobject_fixed, float_leg: cfobject_float}

        //fixed leg annuity
        var annuity=sw.annuity(disc_curve);

        //determine fair swap rate
        var fair_rate=sw.fair_rate(disc_curve, fwd_curve);


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



### Swaptions - the `swaption` class

Vanilla swaption positions. Swaptions are priced using the bachelier model.

### Pricing and usage

        //convenience pricing function without object instantiation
        var present_value=JsonRisk.pricer_swaption(json_object, disc_curve, fwd_curve, surface);

        //object instantiation
        var swptn=new JsonRisk.swaption(json_object);
        
        //pricing
        present_value=swptn.present_value(disc_curve, fwd_curve, surface);

        //access to underlying swap
        var swap=swptn.base;

## Examples

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
                is_short: true,
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

## FX spot, forward, and swap positions - the `fxterm` class

This class represents a single-currency-side of an fx spot, forward or swap position.

### Pricing and usage

        //convenience pricing function without object instantiation
        var present_value=JsonRisk.pricer_fxterm(json_object, disc_curve);

        //object instantiation
        var fxt=new JsonRisk.fxterm(json_object);
        
        //pricing
        present_value=fxt.present_value(disc_curve);

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

Callable bond pricing is implemented with a Linear Gauss Markov (or, equivalently, Hull-White) model in the spirit of Hagan, Patrick; EVALUATING AND HEDGING EXOTIC SWAP INSTRUMENTS VIA LGM (2019). It calibrates to a basket of plain vanilla swaptions automatically generated under the hood.

### Pricing and usage

        //convenience pricing functions without object instantiation
        var present_value=JsonRisk.pricer_callable_bond(json_object, disc_curve, spread_curve, fwd_curve, surface);

        //object instantiation
        var cb=new JsonRisk.callable_fixed_income(json_object);
        
        //pricing
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

