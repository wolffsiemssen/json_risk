# JSON Risk instrument data types

------------------------------------------------------------------------------
## `Boolean`
Indicates true or false. JSON risk accepts

 - JSON `true` and `false` literals
 - JSON numbers, while `0` represents `false` and any other number represents `true`
 - JSON strings while `"true"`, `"yes"`, `"y"` and their uppercase or partial uppercase equivalents represent `true` and anything else represents `false`. Leading and trailing whiltespace is ignored.

------------------------------------------------------------------------------
## `Boolean vector`
A vector of `Boolean` values, as used in, e.g., the attribute `interest_capitalization`. JSON risk accepts

 - a single `Boolean` value as specified above, representing a single-entry vector
 - JSON arrays of `Boolean` values as specified above
 - JSON strings containing string representations of `Boolean` values as specified above, separated by one or more whitespace characters. The string `"true FALSE 0 1 yEs y"` is a valid example.


------------------------------------------------------------------------------
## `Date`
A value representing a calendar date. JSON risk accepts

 - Javascript date objects such as the one you get with `new Date(2020,0,27)`
 - JSON strings beginning with a DD.MM.YYYY style date such as `"27.01.2020"`
 - JSON strings beginning with a YYYY-MM-DD style date such as `"2020-01-27`
 - JSON strings beginning with a YYYY/MM/DD style date such as `"2020/01/27`

Consequently, a valid date is created when calling `JSON.parse()` on a JSON encoded date like `"2020-01-01T23:28:56.782Z"`. All examples represent January 1st, 2020 obviously.

------------------------------------------------------------------------------
## `Date vector`
A vector of `Date` values, as used in, e.g., the attribute `conditions_valid_until`. JSON risk accepts

 - a single `Date` value as specified above, representing a single-entry vector
 - JSON arrays of `Date` values as specified above
 - JSON strings containing string representations of `Date` values as specified above, separated by one or more whitespace characters. The string `"2020-01-01 2020/02/01 01.03.2020"` is a valid example.

------------------------------------------------------------------------------
## `Natural`
A numeric integer with zero or positive value. JSON risk accepts

 - JSON numbers such as `0`, `1`, `2` et cetera
 - JSON strings that the JavaScript `parseFloat` function converts to a natural number, `"0"`, `"1"` or `"2.000"` are valid examples.

------------------------------------------------------------------------------
## `Number`
A numeric value. JSON risk accepts

 - JSON numbers such as `0.1`, `1`, `-10.99` et cetera
 - JSON strings that can be converted to numbers by calling the JavaScript `parseFloat` function.

For convenience, any parseable string the last non-whitespace character of which contains the percentage sign is interpreted as a percentage. For example `"3.50%"`, `"3.5 %"` and `"0.035"` all represent the same value.

------------------------------------------------------------------------------
## `Number vector`
A vector of `Number` values, as used in, e.g., the attribute `fixed_rate`. JSON risk accepts

 - a single `Number` value as specified above, representing a single-entry vector
 - JSON arrays of `Number` values as specified above
 - JSON strings containing string representations of `Number` values as specified above, separated by one or more whitespace characters. The string `"0.01 1.5% 2%"` is a valid example.

------------------------------------------------------------------------------
## `Period string`
A JSON string representing a period. JSON risk accepts any string that
 - the JavaScript `parseInt()` function converts into an integer and
 - that is ended by `"y"`, `"m"`, `"w"` or `"d"` or their uppercase equivalents.

The letters represent years, months, weeks and days, respectively.

------------------------------------------------------------------------------
## `String`
A JSON string.


