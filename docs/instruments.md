# JSON Risk instruments guide
JSON Risk supports the instrument types below:

- Fixed rate bonds (bond)
- Floating rate bonds (floater)
- Interest rate swaps (swap)
- FX Spot/Forward (fxterm)
- Equity (equity)

## Single instrument JSON field definitions
### Bond

Fixed rate plain vanilla bond positions. Fields:

- maturity (date string (YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY))
- notional (number)
- fixed_rate (number, coupon rate for fixed rate bonds)
- tenor (number (0 for zerobond, 1 for one month, 3 for quarterly, 6 for semiannual and 12 for annual interest rate periods. Other positive integers are also interpreted as monthly periods)

Optional (improving pricing accuracy or adding features):

- effective\_date (date string)
- first\_date (date string)
- next\_to\_last\_date (date string)
- calendar (string)
- bdc (string)
- dcc (string)
- settlement_days (number)
- residual_spread (number, discounting spread over yield and spread curves)
- currency


### Floater

Floating rate plain vanilla bond positions. Fields:

- maturity (date string (YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY))
- notional (number)
- float_spread (number, coupon spread for floater)
- tenor (number (0 for zerobond, 1 for one month, 3 for quarterly, 6 for semiannual and 12 for annual interest rate periods. Other positive integers are also interpreted as monthly periods)

Optional (improving pricing accuracy or adding features):

- effective\_date (date string)
- first\_date (date string)
- next\_to\_last\_date (date string)
- calendar (string)
- bdc (string)
- dcc (string)
- settlement_days (number)
- current_rate (number, current rate for floater)
- residual_spread (number, discounting spread over yield and spread curves)
- currency


### Swap

Plain vanilla swap positions. Fields:

- is_payer (boolean, true for swap paying fixed rate, false for swap receiving fixed rate)
- maturity (date string (YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY))
- notional (number)
- fixed_rate (number, coupon rate for fixed rate bonds)
- fixed_tenor (number (0 for zerobond, 1 for one month, 3 for quarterly, 6 for semiannual and 12 for annual interest rate periods. Other positive integers are also interpreted as monthly periods)
- float_spread (number, spread above index for float leg)
- float_tenor (number (0 for zerobond, 1 for one month, 3 for quarterly, 6 for semiannual and 12 for annual interest rate periods. Other positive integers are also interpreted as monthly periods)

Optional (improving pricing accuracy or adding features):

- effective\_date (date string)
- calendar (string)
- fixed_bdc (string)
- float_bdc (string)
- fixed_dcc (string)
- float_dcc (string)
- float\_current\_rate (number, current rate for floater)
- residual_spread (number, discounting spread over yield and spread curves)
- currency

### FXTerm

OTC FX spot, forward and swap positions, one instrument for each currency. Fields:

- maturity (string (YYYY-MM-DD))
- notional (number, negative for pay leg)

Optional (adding FX swap feature)

- maturity_2 (string (YYYY-MM-DD))
- notional_2 (number, negative for pay leg)
- currency (string)


### Equity

Equity positions. Fields:

- quantity (number, number of pieces)
- currency

