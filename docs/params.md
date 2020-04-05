# JSON Risk parameters guide
JSON Risk supports the parameter types below:

- Scalars
- Curves
- Surfaces


## Parameter Field definitions
### Scalars

Fields:

- type (JSON string, purely informative)
- value (JSON number or, in the context of vector pricing, JSON array of numbers.)

Regular example:

        {
                type: "FX",
                value: [1.038]
        }

Vector pricing example with three scenarios:

        {
                type: "FX",
                value: [1.038, 1.045, 0.9934]
        }


### Curves

Fields:

- type (JSON string, purely informative)
- times (JSON array of numbers) Note: If times are not provided, but optional days, dates or labels are provided, times are reconstructed from days (preferrably), dates (if days are not given) or labels (if neither times, days ot dates are given)
- dfs (discount factors, JSON array of numbers) Note: If discount factors are not provided, but optional zero coupon rates are, then discount factors are calculated from zero coupon rates

Optional: 

- days (JSON array of integers)
- dates (JSON array of `Date`, first date must correspond to valuation date)
- labels (JSON array of `Period string` values)
- zcs (zero coupon rates, JSON array of number)

_All arrays must be sorted by times in ascending order_

Example with times and discount factors:

        {
                type: "yield",
                days: [1, 2, 10],
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

Vector pricing example with four scenarios:

        {
                type: "yield",
                days: [1, 2, 10],
                dfs: [
                        [-0.00023, 0.00001, 0.0045],
                        [-0.00024, 0.00001, 0.0045],
                        [-0.00023, 0.00002, 0.0045],
                        [-0.00023, 0.00001, 0.0046]
                ]
                
        }

### Surfaces

Fields:

- type (JSON string, purely informative)
- expiries (JSON array of numbers) Note: If expiries are not provided, but optional labels\_expiry are provided, expiries are reconstructed from labels\_expiry
- terms (JSON array of numbers) Note: If terms are not provided, but optional labels\_expiry are provided, terms are reconstructed from labels\_expiry
- values (JSON array of arrays of numbers)

Optional: 

- labels_expiry (JSON array of `Period string` values)
- labels_term (JSON array of `Period string` values)

_All arrays must be sorted by times (expiry, term) in ascending order_

Example with expiries and terms:

        {
                type: "swaption",
                expiries: [1, 2, 5],
                terms: [0.5, 1],
                values: [
                                [0.002, 0.003, 0.004],
                                [0.0021, 0.0032, 0.0043],
                                [0.0025, 0.0035, 0.0044],
                ]
                
        }



Example with labels:


        {
                type: "swaption",
                labels_expiry: ["1Y", "2Y", "5Y"],
                labels_term: ["6M", "1Y"],
                values: [
                                [0.002, 0.003, 0.004],
                                [0.0021, 0.0032, 0.0043],
                                [0.0025, 0.0035, 0.0044],
                ]
                
        }

Vector pricing example with two scenarios:

        {
                type: "swaption",
                expiries: [1, 2, 5],
                terms: [0.5, 1],
                values: [
                        [
                                [0.002, 0.003, 0.004],
                                [0.0021, 0.0032, 0.0043],
                                [0.0025, 0.0035, 0.0044],
                        ],
                        [
                                [0.0025, 0.0035, 0.0045],
                                [0.0026, 0.0037, 0.0048],
                                [0.0030, 0.0040, 0.0049],
                        ]
                ]
                
        }

## Conventions and pricing accuracy

JSON risk interprets zero coupon rates with the convention `act/365` and annual compounding. That is, discount factors are calculated with the formula

        dfs[i]=Math.pow(1 + zcs[i], -times[i])

when converting from zero coupon rates.

Internally, JSON risk always calculates with times. Times represent years. JSON risk converts

 - days to times by dividing by `365`, consistent with the `act/365` day count convention
 - dates to times by assigning the first date a value of zero and compute all other dates into times with the `act/365` day count convention
 - labels to times by parsing leading integers and dividing monthly values by `12`, weekly values by `52` and daily values by `365`, consistent with the `act/365` day count convention. Yearly values are not further converted, e.g., the period string `"1Y"` just represents one.

When delivering yield curve or surface data from a source system, the easiest way to achieve maximum accuracy is to supply days and either discount factors or zero coupon rates with the convention `act/365` and annual compounding. Correct delivery of times or dates achieves the same accuracy. Labels are a convenient way for approximate pricing.




