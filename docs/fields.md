# JSON Risk instrument fields guide

------------------------------------------------------------------------------
## adjust\_accrual\_periods `Boolean`
### Instruments
Relevant for most cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable_bond`
### Meaning
If `true`, interest is calculated on adjusted coupon periods, i.e., from start and end of each accrual period _after_ adjustment according to `bdc` and `calendar` attributes. Refer cash flow generation for details.


------------------------------------------------------------------------------
## bdc `String`
### Domain
JSON Risk recognizes `unadjusted`, `following`, `modified following`, `preceding`. For convenience, JSON Risk interprets only the first letter and ignores case. That is, for `m` and `M`, JSON Risk assumes the modified folling business day convention.
### Instruments
Relevant for most cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable_bond`
### Meaning
This field determines how dates generated within schedule generation are adjusted, dependent on the field `calendar`. Refer cash flow generation for details.


------------------------------------------------------------------------------
## calendar `String`
### Domain
Contains the string `target`, case insensitive, or the identifier of any calendar previously registered using the `library.add_calendar` functionality.
### Instruments
Relevant for most cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable_bond`
### Meaning
Reference to the calendar used to adjust dates generated within cash flow generation.

------------------------------------------------------------------------------
## call\_tenor `Natural`
### Domain
Any positive integer.
### Instruments
Relevant for `callable_bond`
### Meaning
The exercise dates for the instrument type `callable_bond` are determined by the attribute `first_exercise_date` which represents the first date the bond can be called, and the attribute `call_tenor`.
If `call_tenor`is not zero, the bond is callable on the date represented by `first_exercise_date` and every `call_tenor` months after that date. If `call_tenor`is zero, the bond is callable on the date represented by `first_exercise_date` only.

------------------------------------------------------------------------------
## cap\_rate
This field has no meaning in the current implementation but is reserved for representing a cap rate or cap rate schedule on the interest rate of floating rate instruments.

------------------------------------------------------------------------------
## conditions\_valid\_until `Date vector`
### Domain
Any array of dates or date strings representing the dates when conditions change.
### Instruments
Relevant for many cash flow generating instruments, i.e., `bond`, `floater`, `callable_bond`.
### Meaning
Specified the dates when conditions, e.g., `fixed_rate`, `float_spread` or `interest_capitalization`, change within a cashflow stream. Refer to cash flow generation for details.

------------------------------------------------------------------------------
## currency `String`
### Context
Only relevant in the context of vector pricing.
### Domain
Any string representing any currency the conversion rate was previously registered in the parameters object for vector pricing.

------------------------------------------------------------------------------
## dcc
### Domain
JSON Risk recognizes `Act/360`, `Act/365`, `30/360` and `Act/Act`. For convenience, JSON Risk ignores case and accepts the string `a` instead of `act`. The conventions `a/360`and `a/365` have the usual meaning, `a/a` refers to the Act/Act (ICMA) day count convention and `30/360` refers to the 30/360 European convention.
### Instruments
Relevant for most cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable_bond`
### Meaning
Determines how interest amounts are calculated for each accrual period generated within schedule generation.

------------------------------------------------------------------------------
## disc\_curve `String`
### Context
Only relevant in the context of vector pricing.
### Domain
Any string representing any curve previously registered in the parameters object for vector pricing.
### Meaning
The curve referenced by this field is applied for discounting cash flows. For the instruments `bond`, `floater` and `callable_bond`, discounting is additionally affected by `spread_curve` as well as `residual_spread`.

------------------------------------------------------------------------------
## effective\_date `Date`
### Instruments
Relevant for most cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable_bond`
### Meaning
Start date for schedule generation.


------------------------------------------------------------------------------
## exclude\_base `Boolean`
### Instruments
Relevant for `callable_bond`
### Meaning
If `true`, present value returns only the embedded option price. Defaults to false.

------------------------------------------------------------------------------
## first\_date `Date`
### Instruments
Relevant for most cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable_bond`
### Meaning
Used fo specifying an explicit initial stub for the interest schedule. Marks the end date of the initial interest rate period within schedule generation.

------------------------------------------------------------------------------
## first\_exercise\_date `Date`
### Instruments
Relevant for `swaption` and `callable_bond`.
### Meaning
For `swaption` instruments, this is the expiry date, i.e., the date when the swaption is exercised. The exercise dates for the instrument type `callable_bond` are determined by the attribute `first_exercise_date` which represents the first date the bond can be called, and the attribute `call_tenor`.

------------------------------------------------------------------------------
## fixed\_rate `Number` or `Number vector`
### Instruments
Relevant for most cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable_bond`
### Meaning
Represents the fixed rate paid on a `bond` instrument, a `callable_bond` instrument or the fixed leg of a `swap` or `swaption` instrument. For a `floater` instrument, this must be left empty, otherwise the floater is treated as a fixed rate bond.
When the field `conditions_valid_until` is populated with a vector of dates, `fixed_rate` may contain a vector of numbers of the same length and each entry in `fixed_rate` is considered the valid interest rate until the corresponding entry in `conditions_valid_until`.

------------------------------------------------------------------------------
## fixing\_first\_date `Date`
### Instruments
Relevant for all instruments paying floating rate coupons, i.e., `floater`, `swap`, `swaption`
### Meaning
Used fo specifying an explicit initial stub for the fixing schedule. Marks the end date of the initial fixing period within schedule generation.

------------------------------------------------------------------------------
## fixing\_next\_to\_last\_date `Date`
### Instruments
Relevant for all instruments paying floating rate coupons, i.e., `floater`, `swap`, `swaption`
### Meaning
Used fo specifying an explicit final stub for the fixing schedule. Marks the start date of the final fixing period within schedule generation.

------------------------------------------------------------------------------
## fixing\_stub\_end `Boolean`
### Instruments
Relevant for all instruments paying floating rate coupons, i.e., `floater`, `swap`, `swaption`
### Meaning
Used fo specifying an implicit final stub for the fixing schedule. A value of `true` causes the fixing schedule to be rolled out forward within schedule generation. Ignored when `fixing_next_to_last_date` is populated.

------------------------------------------------------------------------------
## fixing\_stub\_long `Boolean`
### Instruments
Relevant for all instruments paying floating rate coupons, i.e., `floater`, `swap`, `swaption`
### Meaning
If start and end dates within fixing schedule generation are not aligned with `fixing_tenor`, a value of `true` specifies a long stub to be generated instead of a short stub.

------------------------------------------------------------------------------
## float\_bdc `String`
### Domain
JSON Risk recognizes `unadjusted`, `following`, `modified following`, `preceding`. For convenience, JSON Risk interprets only the first letter and ignores case. That is, for `m` and `M`, JSON Risk assumes the modified folling business day convention.
### Instruments
Relevant for `swap` and `swaption`
### Meaning
Relevant for the floating rate leg only. This field determines how dates generated within schedule generation are adjusted, dependent on the field `calendar`. Refer cash flow generation for details.

------------------------------------------------------------------------------
## float\_current\_rate `Number`
### Instruments
Relevant for `floater`, `swap` and `swaption`
### Meaning
This field specifies the interest rate to be used on floating rate legs for fixing periods starting in the past.

------------------------------------------------------------------------------
## float\_dcc `String`
### Domain
JSON Risk recognizes `Act/360`, `Act/365`, `30/360` and `Act/Act`. For convenience, JSON Risk ignores case and accepts the string `a` instead of `act`. The conventions `a/360`and `a/365` have the usual meaning, `a/a` refers to the Act/Act (ICMA) day count convention and `30/360` refers to the 30/360 European convention.
### Instruments
Relevant for `swap` and `swaption`
### Meaning
Relevant for the floating rate leg only. Determines how interest amounts are calculated for each accrual period generated within schedule generation.

------------------------------------------------------------------------------
## float\_spread `Number` or `Number vector`
### Instruments
Relevant for `floater`, `swap` and `swaption`
### Meaning
Relevant for the floating rate leg only. Represents a spread over the floating rate. 

When the field `conditions_valid_until` is populated with a vector of dates, `float_spread` may contain a vector of numbers of the same length and each entry in `float_spread` is considered the valid spread over float until the corresponding entry in `conditions_valid_until`.

------------------------------------------------------------------------------
## float\_tenor `Natural`
### Domain
Must be zero or positive.
### Instruments
Relevant for `swap` and `swaption`
### Meaning
Only relevant for the floating rate leg. A value of zero indicates interest is paid at maturity. Any other positive value is used within schedule generation for rolling out monthly dates.

------------------------------------------------------------------------------
## floor\_rate `Number`
This field has no meaning in the current implementation but is reserved for representing a cap rate or cap rate schedule on the interest rate of floating rate instruments.

------------------------------------------------------------------------------
## fwd\_curve `String`
### Context
Only relevant in the context of vector pricing.
### Domain
Any string representing any curve previously registered in the parameters object for vector pricing.

------------------------------------------------------------------------------
## interest\_capitalization `Boolean` or `Boolean vector`
### Instruments
Relevant for `bond`, `floater`, `callable_bond`
### Meaning
If true, a notional payment is generated at each interest payment date within cash flow generation. The amount of the generated notional payment is calculated by changing the sign of the interest payment.

When the field `conditions_valid_until` is populated with a vector of dates, `interest_capitalization` may contain a vector of booleans of the same length and each entry in `interest_capitalization` is considered valid until the corresponding entry in `conditions_valid_until`.

------------------------------------------------------------------------------
## is\_payer `Boolean`
### Instruments
Relevant for `swap`, `swaption`
### Meaning
A value of `true` marks a `swap`instrument as a payer swap and marks a `swaption` instrument as a payer swaption. Defaults to `false`, implying a receiver swap or, respecitvely, a receiver swaption.

------------------------------------------------------------------------------
## is\_short `Boolean`
### Instruments
Relevant for `swaption`
### Meaning
A value of `true` marks a swaption as short, that is, the counterparty holds th eexercise right.

------------------------------------------------------------------------------
## linear\_amortization `Boolean`
### Instruments
Relevant for `bond`, `floater`, `callable_bond`
### Meaning
If `true`, the field `repay_amount` is overriden and the repayment amount is calculated by dividing the `notional` by the number of repayments implied by the repayment schedule.

------------------------------------------------------------------------------
## market\_value
This field has no meaning in the current implementation but is reserved for representing the market value or, respectively, the dirty price of a position.

------------------------------------------------------------------------------
## maturity `Date`
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable_bond`, `fxterm`
### Meaning
The date when all remaining notionals are paid back. In case of `fxterm` instruments, this is the date when `notional` is paid, as opposed to `notional_2` which is paid at `maturity_2`.

For all instruments except `fxterm`, the final payment date is subject to the business day convention in `bdc`, whereas the unadjusted maturity is used for schedule generation.

------------------------------------------------------------------------------
## maturity_2 `Date`
### Instruments
Only relevant for `fxterm`
### Meaning
The date when `notional_2` is paid, as opposed to `notional` which is paid at `maturity`.

------------------------------------------------------------------------------
## next\_to\_last\_date `Date`
### Instruments
Relevant for most cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable_bond`
### Meaning
Used fo specifying an explicit final stub for the interest schedule. Marks the start date of the final interest accrual period within schedule generation.

------------------------------------------------------------------------------
## notional `Number`
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable_bond`, `fxterm`
### Meaning
The notional of an instrument. In case of amortizing instruments, this is the initial notional. In case of `fxterm` instruments, this is the near leg notional, i.e., the notional paid at `maturity` as opposed to `maturity_2`

------------------------------------------------------------------------------
## notional_2 `Number`
### Instruments
Only relevant for `fxterm`
### Meaning
Corresponds to the far leg notional of an `fxterm` instrument, i.e., the notional paid at `maturity_2`.

------------------------------------------------------------------------------
## quantity `Number`
This field has no meaning in the current implementation but is reserved for representing the quantity for, e.g., an equity position.

------------------------------------------------------------------------------
## repay\_amount `Number`
### Domain
Zero, positive and negative valued accepted.
### Instruments
Relevant for `bond`, `floater`, `callable_bond`
### Meaning
The amount repaid at each date implied by the repayment schedule. If `notional` is positive, a positive value marks cash inflows. If `notional` is negative, a positive value marks cash outflows. A zero value switsches off amortization.

When the field `conditions_valid_until` is populated with a vector of dates, `repay_amount` may contain a vector of numbers of the same length and each entry in `repay_amount` is considered valid until the corresponding entry in `conditions_valid_until`.

------------------------------------------------------------------------------
## repay\_first\_date `Date`
### Instruments
Relevant for `bond`, `floater`, `callable_bond`
### Meaning
Used fo specifying an explicit initial stub for the repayment schedule. Marks first date when repayments occur within schedule generation.

------------------------------------------------------------------------------
## repay\_next\_to\_last\_date `Date`
### Instruments
Relevant for `bond`, `floater`, `callable_bond`
### Meaning
Used fo specifying an explicit final stub for the repayment schedule. Marks the last date before maturity where repayment occors within schedule generation.

------------------------------------------------------------------------------
## repay\_stub\_end `Boolean`
### Instruments
Relevant for `bond`, `floater`, `callable_bond`
### Meaning
Used fo specifying an implicit final stub for the repayment schedule. A value of `true` causes the repayment schedule to be rolled out forward within schedule generation. Ignored when `repay_next_to_last_date` is populated.

------------------------------------------------------------------------------
## repay\_stub\_long `Boolean`
### Instruments
Relevant for `bond`, `floater`, `callable_bond`
### Meaning
If start and end dates within repayment schedule generation are not aligned with `repay_tenor`, a value of `true` specifies a long stub to be generated instead of a short stub.

------------------------------------------------------------------------------
## repay\_tenor `Natural`
### Domain
Must be zero or positive.
### Instruments
Relevant for `bond`, `floater`, `callable_bond`
### Meaning
A value of zero indicates a bullet instrument, i.e., all notional is paid back at maturity. Any other positive value is used within repayment schedule generation for rolling out monthly dates.

------------------------------------------------------------------------------
## residual\_spread `Number`
### Instruments
Relevant for `bond`, `floater`, `callable_bond`
### Meaning
Within discounted cash flow valuation, this number is interpreted as an additional spread with day count convention `act/365` and annual compounding that is added on top of the discount curve and the spread curve.

------------------------------------------------------------------------------
## settlement\_days `Natural`
### Domain
Must be zero or positive
### Instruments
Relevant for `bond`, `floater`, `callable_bond`
## Meaning
Within discounted cash flow valuation, this specifies a number of business days where payments are not included in the present value.

------------------------------------------------------------------------------
## spread\_curve `String`
### Context
Only relevant in the context of vector pricing
### Instruments
Relevant for `bond`, `floater`, `callable_bond`
### Domain
Any string representing any curve previously registered in the parameters object for vector pricing.
### Meaning
The curve referenced by this field is applied for discounting cash flows, in addition to the curve specified under `disc_curve` as well as the `residual_spread`.

------------------------------------------------------------------------------
## stub\_end `Boolean`
### Instruments
Relevant for most cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable_bond`
### Meaning
Used fo specifying an implicit final stub for the interest schedule. A value of `true` causes the interest schedule to be rolled out forward within schedule generation. Ignored when `next_to_last_date` is populated.

------------------------------------------------------------------------------
## stub\_long `Boolean`
### Instruments
Relevant for most cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable_bond`
### Meaning
If start and end dates within interest schedule generation are not aligned with `tenor`, a value of `true` specifies a long stub to be generated instead of a short stub.

------------------------------------------------------------------------------
## surface `String`
### Context
Only relevant in the context of vector pricing.
### Instruments
Relevant for `swaption` and `callable_bond` instruments.
### Domain
Any string representing any surface previously registered in the parameters object for vector pricing.
### Meaning
Bachelier volatility curve object used for valuation.

------------------------------------------------------------------------------
## tenor `Natural`
### Domain
Must be zero or positive.
### Instruments
Relevant for most cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable_bond`
### Meaning
A value of zero indicates interest is paid at maturity. Any other positive value is used within schedule generation for rolling out monthly dates.

------------------------------------------------------------------------------
## type `String`
### Context
Only relevant in the context of vector pricing.
### Domain
Either `bond`, `floater`, `swap`, `swaption`, `callable_bond` or `fxterm`
### Meaning
The vector pricing algorithm uses this field to determine

 - what internal class to use for pricing;
 - what parameters to assign and apply for pricing.

For example, 

 - for a `bond` type instrument, a `fixed_income` internal object is created and a discount curve and a spread curve are assigned,
 - for a `swap` type instrument, a `swap` internal object is created and a discount curve and a forward curve are assigned,
 - for a `floater` type instrument, a `fixed_income` internal object is created and a discount curve, a spread curve and a forward curve are assigned,
 - for a `callable_bond` type instrument, a `callable_fixed_income` internal object is created and a discount curve, a forward curve, a spread curve and a surface are assigned.

