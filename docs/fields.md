# JSON Risk instrument fields guide

## adjust\_accrual\_periods `boolean`
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable\_bond`
### Meaning
If `true`, interest is calculated on adjusted coupon periods, i.e., from start and end of each accrual period _after_ adjustment according to `bdc` and `calendar` attributes. 

## bdc `string`
### Domain
JSON Risk recognizes `unadjusted`, `following`, `modified following`, `preceding`. In fact, JSON Risk interprets only the first letter and ignores case. That is, for `m` and `M`, JSON Risk assumes the modified folling business day convention.
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable\_bond`
### Meaning
This field determines how dates generated within schedule generation are adjusted, dependent on the field `calendar`. The conventions have the usual meaning.

## calendar `string`
### Domain
Contains the string `target`, case insensitive, or the identifier of any calendar previously registered using the `library.add_calendar` functionality.
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable\_bond`
### Meaning
Reference to the calendar used to adjust dates generated within schedule generation.

## call\_tenor `Integer`
### Domain
Any positive integer.
### Instruments
Relevant for `callable\_bond`
### Meaning
The exercise dates for the instrument type `callable_bond` are determined by the attribute `first_exercise_date` which represents the first date the bond can be called, and the attribute `call_tenor`.
If `call_tenor`is not zero, the bond is callable every on the date represented by `first_exercise_date` and every `call_tenor` months after that date.
## cap\_rate
This field has no meaning in the current implementation but is reserved for representing a cap rate or cap rate schedule on the interest rate of floating rate instruments.

## conditions\_valid\_until `date vector`
### Domain
Any array of dates or date strings representing the dates when conditions change.

### Instruments
Relevant for many cash flow generating instruments, i.e., `bond`, `floater`, `callable\_bond`.

### Meaning
To be done.

## currency `string`
### Context
Only relevant in the context of vector pricing.
### Domain
Any string representing any currency the conversion rate was previously registered in the parameters object for vector pricing.
## dcc
### Domain
JSON Risk recognizes `Act/360`, `Act/365`, `30/360` and `Act/Act`. In fact, JSON Risk ignores case and accepts the string `a` instead of `act`. The conventions `a/360`and `a/365` have the usual meaning, `a/a` refers to the Act/Act (ICMA) day count convention and `30/360` refers to the 30/360 European convention.
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable\_bond`
### Meaning
Determines how interest amounts are calculated for eah accrual period generated within schedule generation.
## disc\_curve
### Context
Only relevant in the context of vector pricing.
### Domain
Any string representing any curve previously registered in the parameters object for vector pricing.

## effective\_date `date`
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable\_bond`
### Meaning
Start date for schedule generation.
## first\_date
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable\_bond`

## first\_exercise\_date
## fixed\_rate
## fixing\_first\_date
## fixing\_next\_to\_last\_date
## fixing\_stub\_end
## fixing\_stub\_long
## float\_bdc
## float\_current\_rate
## float\_dcc
## float\_spread
## float\_tenor
## floor\_rate
## fwd\_curve
## interest\_capitalization
## is\_payer
## is\_short
## linear\_amortization
## market\_value
## maturity
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable\_bond`

## next\_to\_last\_date
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable\_bond`

## notional
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable\_bond`


## quantity
## repay\_amount
## repay\_first\_date
## repay\_next\_to\_last\_date
## repay\_stub\_end
## repay\_stub\_long
## repay\_tenor
## residual\_spread
## settlement\_days
## spread\_curve
## stub\_end
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable\_bond`

## stub\_long
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable\_bond`

## surface
## tenor
### Instruments
Relevant for all cash flow generating instruments, i.e., `bond`, `floater`, `swap`, `swaption`, `callable\_bond`

## type
