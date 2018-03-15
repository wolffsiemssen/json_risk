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
        fixed_rate: Kupon[i]/100,
        freq: 12,
        bdc: "following",
        dcc: "act/act",
        calendar: "TARGET",
        settlement_days: 2
        };

var discount_curve={
        type: "yield",
        labels: ["1Y", "2Y", "3Y", "10Y"],
        values: [0.01, 0.02, 0.025, 0.1]
        };
        

var spread_curve={
        type: "yield",
        labels: ["1Y", "2Y", "3Y", "10Y"],
        values: [0.01, 0.011, 0.012, 0.11]
        };

var z_spread=0.01;
        
JsonRisk.valuation_date=new Date(2017,11,31);
var present_value=JsonRisk.bond_dirty_value(bond,discount_curve, spread_curve, z_spread);

```
