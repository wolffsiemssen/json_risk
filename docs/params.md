# JSON Risk parameters guide
JSON Risk supports the parameter types below:

- Curves
  - Yield term structures (yield)
  - Spread curves (spread)
- Scalars (to be implemented)
  - Equity or index prices (equity)
  - FX spot prices (fx)
- Surfaces
  - Bachelier, that is, normal interest rate volatility (bachelier)
  - Black-76, that is, log-normal interest rate volatility (black, to be implemented)
  - Black-Scholes volatility (bs, to be implemented)

## Parameter Field definitions
### Scalars

Fields:

- type (string (equity or fx))
- value (number)

Optional (e.g., for automatic parameter assignment):

- currency (string)
- tag (string)

### Curves

Fields:

- type (string (yield, spread or fxterm))
- times (array of number) Note: If times are not provided, but optional days, dates or labels are provided, times are reconstructed from days (preferrably), dates (if days are not given) or labels (if neither times, days ot dates are given)
- dfs (discount factors, array of number) Note: If discount factors are not provided, but optional zero coupon rates are, then discount factors are calculated from zero coupon rates

Optional: 

- days (array of integer)
- dates (array of date string (e.g., 2010-01-15, 2010/01/15, 15.01.2010))
- labels (array of period string (e.g., 1D, 3M, 1Y, 10Y))
- zcs (zero coupon rates, array of number)

Optional (e.g., for automatic parameter assignment):

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

Optional (e.g., for automatic parameter assignment):

- currency (string)
- tag (string used for parameter assignment)

_All arrays must be sorted by times (expiry, term) in ascending order_

