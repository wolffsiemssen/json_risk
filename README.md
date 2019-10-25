![#json_risk](pics/logo.png)

JSON / JavaScript financial risk and pricing library

## What is is
- a JSON data model and data format to describe financial instruments and valuation parameters
- a JavaScript pricing library that uses the data model for pricing and risk analysis of financial instruments

## How to include in node.js:

```
var JsonRisk=require('path/to/json_risk.js');

```

## How to include in browser:
 
```
<script src="path/to/json_risk.min.js"></script>
```

## How to use

```
var bond= {
        maturity: new Date(2028,0,1),
        notional: 100.0,
        fixed_rate: 0.05,
        tenor: 12,
        bdc: "following",
        dcc: "act/act",
        calendar: "TARGET",
        settlement_days: 2
        };

var discount_curve={
        type: "yield",
        labels: ["1Y", "2Y", "3Y", "10Y"],
        zcs: [0.01, 0.02, 0.025, 0.1]
        };
        

var spread_curve={
        type: "spread",
        labels: ["1Y", "2Y", "3Y", "10Y"],
        zcs: [0.01, 0.011, 0.012, 0.11]
        };

        
JsonRisk.valuation_date=new Date(2017,11,31);
var present_value=JsonRisk.pricer_bond(bond,discount_curve, spread_curve);

```

## Supported instruments

JSON Risk supports the instrument types below with a pricer function for each instrument:
 
- Fixed income instruments
  - Fixed rate bonds: pricer\_bond(instrument, disc\_curve, spread\_curve)
  - Floating rate bonds: pricer\_floater(instrument, disc\_curve, spread\_curve, forward\_curve)
  - Irregular fixed rate and floating rate bonds: pricer\_irregular\_bond(instrument, disc\_curve, spread\_curve, forward\_curve)
  - Interest rate swaps: pricer\_swap(instrument, disc\_curve, forward\_curve)
  - FX Spot/Forward: pricer\_fxterm(instrument, disc\_curve)
- Callable fixed income instruments
  - Plain vanilla swaptions (pricer\_swaption(instrument, disc\_curve, fwd\_curve, vol\_surface)
  - Single callable and multicallable bond (pricer\_callable\_bond((instrument, disc\_curve, fwd\_curve, spread\_curve, vol\_surface))

Fixed income instrument pricing supports features such as

- day count conventions
- business day conventions
- calendar
- schedules with long and short stubs
- settlement days offset

Irregular bonds pricing supports additional cash flow generation features such as

- step-down amortisation (regular repayments)
- interest capitalisation (allowing to define annuity-type profiles)
- repayment and fixing schedules independent of interest payment schedule (including appropriate handling of broken interest periods)

Callable bond pricing is implemented with a Linear Gauss Markov (or, equivalently, Hull-White) model in the spirit of Hagan, Patrick; EVALUATING AND HEDGING EXOTIC SWAP INSTRUMENTS VIA LGM (2019).

See [supported instruments](docs/instruments.md) for details and JSON format descriptions.

## Supported parameters

JSON Risk supports the parameter types below:

- Curves
  - Yield term structures (yield)
  - Spread curves (spread)
  - Bachelier, that is, normal swaption volatility surfaces (bachelier)
- The global parameter JsonRisk.valuation_date

See [supported parameters](docs/params.md) for details and JSON format descriptions.

## Library features

### Calendars

JSON Risk supports one built-in calendar (TARGET) as of now.

Adding custom calendars is as simple as

```

var holidays = [
                new Date(2018,11,1), //javascript date object
                "2018/12/12",        //valid YYYY/MM/DD date string
                "2019-12-01",        //valid YYYY/MM/DD date string
                "01.12.2020"         //valid DD.MM.YYYY date string
               ];

JsonRisk.add_calendar("CUSTOM", holidays);


```

Saturdays and Sundays are considered holidays in all custom calendars.

### Day count conventions

JSON Risk supports the day count conventions

- act/365,
- act/360,
- act/act (ICMA),
- 30E/360.

### Business day conventions

JSON Risk supports the business day conventions

- unadjusted,
- following,
- modified following,
- preceding.

