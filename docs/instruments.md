# JSON Risk instruments guide
JSON Risk supports the instrument types below:

- Bonds (bond)
- Equity (equity)
- FX Spot/Forward (fxterm)

## Single instrument JSON field definitions
### Bond

Fixed and Floating rate plain vanilla bond positions. Fields:

- maturity (date string (YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY))
- notional (number)
- fixed_rate (number, coupon rate for fixed rate bonds)
- float_spread (number, coupon spread for floater)
- freq (number (0 for zerobond, 1 for one month, 3 for quarterly, 6 for semiannual and 12 for annual interest rate periods. Other positive integers are also interpreted as monthly periods)

Optional (improving pricing accuracy):

- effective\_date (date string)
- first\_date (date string)
- next\_to\_last\_date (date string)
- calendar (string)
- bdc (string)
- dcc (string)
- settlement_days (number)
- current_rate (number, current rate for floater)
- residual_spread (number, discounting spread over yield and spread curves)
- mvalue (number, market value (dirty))

Optional (for automatic parameter assignment):

- tag\_disc\_curve (string, hint for discount curve assignment)
- tag\_spread\_curve (string, hint for spread curve assignment)
- tag\_fwd\_curve (string, hint for forward curve assignment)
- currency

### Equity

Equity positions. Fields:

- quantity (number, number of pieces)

Optional

- tag (string, hint for risk factor assignment)
- mvalue (number, market value (dirty))


### FX Spot / Forward

OTC FX Spot and Forward positions. Fields:

- maturity (string (YYYY-MM-DD))
- notional_1 (number)
- notional_2 (number)
- currency_1 (string)
- currency_2 (string)

Optional:

- mvalue (number, market value (dirty))

Optional (for automatic parameter assignment):

- tag\_curve_1 (string, hint for discount curve assignment)
- tag\_curve_2 (string, hint for spread curve assignment)

