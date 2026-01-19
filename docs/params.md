# JSON Risk parameters guide
JSON Risk supports the parameter types below:

- Scalars
- Curves
- Surfaces

A Parameter set stores the parameters above along with scenarios. Parameters and scenarios are described in this document.
 
## Parameter Field definitions

### Fields for all parameter types
The `tags` field is supported by all parameter types and is used for matching scenarios with params. It is an Array of strings.

### Scalars

Fields:

- type (string, SHOULD be "scalar")
- value (`Number`)

Example:

        {
                type: "scalar",
                value: 1.038
        }

### Curves

Fields:

- type (``String``, SHOULD be "yield")
- times (array of `Number`s) Note: If times are not provided, but optional days, dates or labels are provided, times are reconstructed from days (preferrably), dates (if days are not given) or labels (if neither times, days ot dates are given)
- dfs (discount factors, array of `Number`s) Note: If discount factors are not provided, but optional zero coupon rates are, then discount factors are calculated from zero coupon rates

Optional: 

- days (array of integers)
- dates (array of `Date`, first date must correspond to valuation date)
- labels (array of `Period string` values)
- zcs (zero coupon rates, array of `Number`)
- intp (`String`, must be "linear\_zc" for linear interpolation on zero coupon rates, "linear\_rt" for raw interpolation, or "linear\_df" for linear interpolation on discount factors, or "bessel" or "hermite", both referring to Bessel-Hermite cubic spline interpolation. Linear on discounts is the default. All these options are case insensitive.)
- compounding (`String`, must be "a" or "annual" for annual compounding, or "c" or "continuous" for continuous compounding, all case insensitive.)
- short\_end\_flat (`Boolean` flag indicating if extrapolation on the short end should be flat on zero rates instead of being implied by the interpolation method, defaults to true. When interpolation is linear on discounts or raw, extrapolation is always flat. )
- long\_end\_flat (`Boolean` flag indicating if extrapolation on the long end should be flat on zero rates instead of being implied by the interpolation method, defaults to true.  When interpolation is linear on discounts or raw, extrapolation is always flat.)

_Axis arrays must be sorted by times in ascending order_

Example with times and discount factors:

        {
                type: "yield",
                times: [1.0, 2.0, 10.0],
                dfs: [1.0003, 0.99994, 0.9992]
                
        }

Example with days and discount factors:

        {
                type: "yield",
                days: [365, 730, 3650],
                dfs: [1.0003, 0.99994, 0.9992]
                
        }

Example with dates and discount factors:

        {
                type: "yield",
                dates: ["2019/01/01", "2020/01/01", "2021/01/01", "2030/01/01"],
                dfs: [1, 1.0003, 0.99994, 0.9992]
                
        }

Example with labels and zero coupon rates:


        {
                type: "yield",
                labels: ["1Y", "2Y", "10Y"],
                zcs: [-0.00023, 0.00001, 0.0045]
                
        }

Example with interpolation, extrapolation and continuous compounding:

        {
                type: "yield",
                times: [1.0, 2.0, 10.0],
                zcs: [-0.00023, 0.00001, 0.0045],
                compounding: "c",
                intp: "bessel",
                short_end_flat: true,
                long_end_flat: false
        }

### Expiry-Term Surfaces

This surface is used for the valuation of swaptions.

Fields:

- type (JSON `String`, SHOULD be "expiry_term")
- expiries (JSON array of `Number`s) Note: If expiries are not provided, but optional labels\_expiry are provided, expiries are reconstructed from labels\_expiry
- terms (JSON array of `Number`s) Note: If terms are not provided, but optional labels\_expiry are provided, terms are reconstructed from labels\_expiry
- values (JSON array of arrays of `Number`s)

Optional: 

- labels_expiry (JSON array of `Period string` values)
- labels_term (JSON array of `Period string` values)

_Axis arrays must be sorted by times (expiry, term) in ascending order_

Example with expiries and terms:

        {
                type: "expiry_term",
                expiries: [1.0, 2.0, 5.0],
                terms: [0.5, 1.0],
                values: [
                                [0.002, 0.003],
                                [0.0021, 0.0032],
                                [0.0025, 0.0035],
                ]
                
        }



Example with labels:


        {
                type: "expiry_term",
                labels_expiry: ["1Y", "2Y", "5Y"],
                labels_term: ["6M", "1Y"],
                values: [
                                [0.002, 0.003],
                                [0.0021, 0.0032],
                                [0.0025, 0.0035],
                ]
                
        }

### Expiry-Strike surfaces

This surface is used for the valuation of caplets and floorlets as well as stock and index options. The type determines if moneyness is parametrised as relative or absolute strikes.

Fields:

- type (JSON `String`, MUST be "expiry\_rel\_strike" or "expiry\_abs\_strike")
- expiries (JSON array of `Number`s) Note: If expiries are not provided, but optional labels\_expiry are provided, expiries are reconstructed from labels\_expiry
- moneyness (JSON array of `Number`s)
- values (JSON array of arrays of `Number`s)

Optional: 

- labels_expiry (JSON array of `Period string` values)

_Axis arrays must be sorted by times (expiry) and moneyness in ascending order_

Example with expiries and relative strikes:

        {
                type: "expiry_rel_strike",
                expiries: [1.0, 2.0, 5.0],
                moneyness: [-0.01, -0.005, 0.0, 0.005, 0.001],
                values: [
                                [0.002, 0.003, 0.004, 0.004],
                                [0.0021, 0.0032, 0.0043, 0.0045],
                                [0.0025, 0.0035, 0.0044, 0.0045],
                ]                
        }



Example with labels and absolute strikes:


        {
                type: "expiry_abs_strike",
                labels_expiry: ["1Y", "2Y", "5Y"],
                moneyness: [90.0, 95.0, 100.0, 105.0, 110.0],
                values: [
                                [0.002, 0.003, 0.004, 0.004],
                                [0.0021, 0.0032, 0.0043, 0.0045],
                                [0.0025, 0.0035, 0.0044, 0.0045],
                ]
        }


## Scenarios

### Defintion of a scenario group
A scenario group must have a name that consists of letters, numbers, dashes and underscores only. A scenario group consists of one or more scenarios. A single scenario consists of a name and one or more rules. The rules are used to determine the risk factors (i.e., parameters) to which the scenarios should be applied and what shock to apply.

Here is an outline of the structure of a scenario:
 - **Scenario group**: A collection of scenarios
 - **Scenario**: an object with a name (without blank spaces) and a collection of rules
 - **Rule(s)**: an object that contains
   - a list of **Risk factors**: The rule applies to each of the risk factors (i.e. scalars, curves, surfaces).
   - a list of **Tags**: all scalars, curves and surfaces that have ALL of the tags in this list attached are affected by this rule.
   - a **Model**: Either **additive**, **multiplicative** or **absolute**. If additive, the values of this rule are added to each affected risk factor. If multiplicative, the values of this rule are multiplied with the values of each affected risk factor. If absolute, the values of this rule replace the values of each affected risk factor.
   - a **Values** table:
     - **X-axis labels**: for curves these are the support points; for surfaces these are the expiries of the option. For scalars, only one label should be used.
     - **Y-axis labels**: for curves these labels have no meaning; for surfaces these are the terms of the underlying of the option. For scalars, only one label should be used.
     - **Values**: an array of arrays of values corresponding to labels.
     
## Example parameters set with scenarios
Find below an example of a scenario group in JSON format.


        [
         {
          "name": "EXAMPLE_SCENARIO",
          "rules": [
           {
            "model": "additive",
            "labels_x": [
             "1W",
             "3M"
            ],
            "labels_y": [
             "1M"
            ],
            "values": [
             [
              0.0001,
              0
             ]
            ],
            "risk_factors": [
             "TEST"
            ],
            "tags": [
             "yield"
            ],
           },
           {}
          ]
         },
         {
          ...
         }
        ]




