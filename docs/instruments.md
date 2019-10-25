# JSON Risk instruments guide
JSON Risk supports the instrument types below:

- Fixed rate bonds (bond)
- Floating rate bonds (floater)
- Interest rate swaps (swap)
- FX Spot/Forward (fxterm)
- Irregular bond (irregular_bond)
- Equity (equity, to be implemented)

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
- stub_end (boolean, defaults to false, used if no explicit stubs are given and indicates that stub is at end, i.e.,schedule is rolled out forwards from effective date)
- stub_long (boolean, defaults to false, used if no explicit stubs are given and indicates that stub is long)
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
- float\_current\_rate (number, current rate for floater)
- residual_spread (number, discounting spread over yield and spread curves)
- currency


### Swap

Plain vanilla swap positions. Fields:

- is_payer (boolean, true for swap paying fixed rate, false for swap receiving fixed rate)
- maturity (date string (YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY))
- notional (number)
- fixed_rate (number, coupon rate for fixed leg)
- tenor (number (0 for zerobond, 1 for one month, 3 for quarterly, 6 for semiannual and 12 for annual interest rate periods. Other positive integers are also interpreted as monthly periods)
- float_spread (number, spread above index for float leg)
- float_tenor (number (0 for zerobond, 1 for one month, 3 for quarterly, 6 for semiannual and 12 for annual interest rate periods. Other positive integers are also interpreted as monthly periods)

Optional (improving pricing accuracy or adding features):

- effective\_date (date string)
- calendar (string)
- bdc (string)
- float_bdc (string)
- dcc (string)
- float_dcc (string)
- float\_current\_rate (number, current rate for float leg)
- residual_spread (number, discounting spread over yield and spread curves)
- currency

### Swaption

Vanilla swaption positions. Fields:

- is_payer (boolean, true if underlying swap pays fixed rate, false if underlying swap receives fixed rate)
- is_short (boolean, true for short swaption, false for long swaptions which is the default)
- maturity (date string (YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY) representing the final maturity date of the underlying swap)
- expiry (date string (YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY) representing the swaption expiry date, i.e., the settlement-upon-exercise date)
- notional (number)
- fixed_rate (number, coupon rate for fixed leg)
- tenor (number (0 for zerobond, 1 for one month, 3 for quarterly, 6 for semiannual and 12 for annual interest rate periods. Other positive integers are also interpreted as monthly periods)
- float_spread (number, spread above index for float leg)
- float_tenor (number (0 for zerobond, 1 for one month, 3 for quarterly, 6 for semiannual and 12 for annual interest rate periods. Other positive integers are also interpreted as monthly periods)

Optional (improving pricing accuracy or adding features):

- effective\_date (date string)
- calendar (string)
- bdc (string)
- float_bdc (string)
- dcc (string)
- float_dcc (string)
- float\_current\_rate (number, current rate for float leg)
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

### Irregular bond

Fixed or floating rate irregular bond positions, supporting amortisation structures. Fields:

- effective\_date (date string)
- maturity (date string (YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY))
- notional (number)
- fixed_rate (number, coupon rate for fixed rate loans, empty for floating rate loans)
- tenor (number (0 for zerobond, 1 for one month, 3 for quarterly, 6 for semiannual and 12 for annual interest rate periods. Other positive integers are also interpreted as monthly periods)

Optional (improving pricing accuracy or adding features):


- repay_tenor (number (0 for bullet repayment, 1 for one month, 3 for quarterly, 6 for semiannual and 12 for annual repayment schedules. Other positive integers are also interpreted as monthly periods)
- repay_amount (non-negative number representing the amount repaid at each repayment date, defaults to zero)
- linear_amortization (boolean, defaults to "false". overrides repay\_amount if true)
- interest_capitalization (boolean, defaults to "false")
- first\_date (date string representing the first or next interest payment date)
- next\_to\_last\_date (date string)
- stub_end (boolean, defaults to false, used if no explicit stubs are given and indicates that stub is at end, i.e.,schedule is rolled out forwards from effective date)
- stub_long (boolean, defaults to false, used if no explicit stubs are given and indicates that stub is long)
- repay\_first\_date (date string representing the first or next repayment date)
- repay\_next\_to\_last\_date (date string)
- repay\_stub\_end (boolean, defaults to false, used if no explicit stubs are given and indicates that stub is at end, i.e., schedule is rolled out forwards from effective date)
- repay\_stub\_long (boolean, defaults to false, used if no explicit stubs are given and indicates that stub is long)
- fixing\_first\_date (date string representing the first or next fixing date)
- fixing\_next\_to\_last\_date (date string)
- fixing\_stub\_end (boolean, defaults to false, used if no explicit stubs are given and indicates that stub is at end, i.e.,schedule is rolled out forwards from effective date)
- fixing\_stub\_long (boolean, defaults to false, used if no explicit stubs are given and indicates that stub is long)
- float_spread (number, coupon spread for floater)
- cap_rate (number)
- floor_rate (number)
- current\_accrued\_interest (number)
- calendar (string)
- bdc (string)
- dcc (string)
- residual_spread (number, discounting spread over yield and spread curves)
- currency

Optionally, this instrument type supports predetermined conditions. This requires an additional field:

- conditions\_valid\_until (array of date string representing the dates when conditions change. Last array element must match maturity)

If conditions\_valid\_until is set, the fields below can optionally contain arrays instead of scalars. Length must be one or the length of conditions\_valid\_until:

- fixed_rate
- interest_capitalization
- repay_amount
- float_spread
- cap_rate
- floot_rate

### Equity

Equity positions. Fields:

- quantity (number, number of pieces)
- currency

