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
 
- Fixed income instruments (fixed\_income)
 - Fixed rate bonds: pricer\_bond(disc\_curve, spread\_curve)
 - Floating rate bonds: pricer\_floater(disc\_curve, spread\_curve, forward\_curve)
 - Interest rate swaps: pricer\_swap(disc\_curve, forward\_curve)
 - FX Spot/Forward: pricer\_fxterm(disc\_curve)

Fixed income instrument pricing is implemented in a generic internal class _fixed\_income_. The pricing routine supports features such as

- day count conventions
- business day conventions
- calendar
- schedules with long and short stubs
- settlement days offset

See [supported instruments](docs/instruments.md) for details and JSON format descriptions.

## Supported parameters

JSON Risk supports the parameter types below:

- Curves
 - Yield term structures (yield)
- The global parameter JsonRisk.valuation_date

See [supported parameters](docs/params.md) for details and JSON format descriptions.

## Library features

### Calendars

JSON Risk supports one built-in calendar (TARGET) as of now.

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

