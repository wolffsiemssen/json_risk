# JSON Risk parameters guide
JSON Risk supports the parameter types below:

- Scalars
 - Equity or index prices (equity)
 - FX spot prices (fx)
- Curves
 - Yield term structures (yield)
 - Spread curves (spread)
 - FX term structures (fxterm)
- Surfaces
 - Black-Scholes volatility (bs)
 - Black-76 interest rate volatility (black)
 - Bachelier interest rate volatility (bachelier)

## Parameter Field definitions
### Scalars

Fields:

- type (string (equity or fx))
- value (number)

Optional (for automatic parameter assignment):

- currency (string)
- tag (string)

### Curves

Fields:

- type (string (yield, spread or fxterm))
- times (array of number) Note: If times are not provided, but optional days, dates or labels are provided, times are reconstructed from days (preferrably), dates (if days are not given) or labels (if neither times, days ot dates are given)
- values (array of number)

Optional: 

- days (array of integer)
- dates (array of date string (e.g., 2010-01-15, 2010/01/15, 15.01.2010))
- labels (array of period string (e.g., 1D, 3M, 1Y, 10Y))

Optional (for automatic parameter assignment):

- currency (string)
- tag (string)
- tenor (period string (typically 1D, 3M, 6M))


_All arrays must be sorted by times in ascending order_


### Surfaces

Fields:

- type (string (bs, black, bachelier))
- expiries (array of number) Note: If expiries are not provided, but optional labels\_expiry are provided, expiries are reconstructed from labels\_expiry
- terms (array of number) Note: If terms are not provided, but optional labels\_expiry are provided, terms are reconstructed from labels\_expiry
- values (array of array of number)

Optional: 

- labels_expiry (array of period string (e.g., 1D, 3M, 1Y, 10Y))
- labels_term (array of period string (e.g., 1D, 3M, 1Y, 10Y))

Optional (for automatic parameter assignment):

- tenor (black only)
- currency (string)
- tag (string used for parameter assignment)

_All arrays must be sorted by times (expiry, term) in ascending order_

