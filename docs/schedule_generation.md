# Schedule generation

This page describes how JSON risk generates interest rate schedules, fixing schedules and repayment schedules.

Schedules are more or less regular streams of dates, typically beginning with the issue or effective date of a financial instrument and ending with its maturity.

- Interest rate schedules describe the dates when interest accrual periods start and end
- Fixing schedules describe when changing variable rates become effective
- Repayment schedules describe when pricipal is paid, i.e., amortization occurs

JSON risk generates the three schedules independently from each other and merges the schedules for cash flow generation. While merging the schedules, JSON risk takes care of split interest accrual periods which arise whenever fixings or repayments occur between two dates of the interest rate schedule.

## Relevant fields

The fields below are relevant for schedule generation.

<table class="table table-bordered table-hover">
<thead>
 <tr>
  <th></th><th>Interest</th><th>Fixing</th><th>Repayment</th>
 <tr>
</thead>
<tbody>
 <tr>
  <td>Beginning</td><td colspan="3"><code>effective_date</code></td>
 </tr>
 <tr>
  <td>End</td><td colspan="3"><code>maturity</code></td>
 <tr>
  <td>Frequency</td><td><code>tenor</code></td><td><code>fixing_tenor</code></td><td><code>repay_tenor</code></td>
 </tr>
 <tr>
  <td>Explicit initial stub</td><td><code>first_date</code></td><td><code>fixing_first_date</code></td><td><code>repay_first_date</code></td>
 </tr>
 <tr>
  <td>Explicit final stub</td><td><code>next_to_last_date</code></td><td><code>fixing_next_to_last_date</code></td><td><code>repay_next_to_last_date</code></td>
 </tr>
 <tr>
  <td>Implicit stub and rollout direction</td><td><code>stub_end</code></td><td><code>fixing_stub_end</code></td><td><code>repay_stub_end</code></td>
 </tr>
 <tr>
  <td>Implicit stub long</td><td><code>stub_long</code></td><td><code>fixing_stub_long</code></td><td><code>repay_stub_long</code></td>
 </tr>
</tbody>
</table>

## Generation logic

The sections below describe interest rate schedule generation logic in different constallations. For fixing and repayment schedule generation, the same logic is used.

### Default behaviour

Per default, that is, when only `effective_date`, `maturity` and `term` are provided, JSON risk rolls out backward from `maturity` in regular monthly periods the length of which is determined by `term` until `effective_date` is reached or preceded. In the special case when `term` is zero, the schedule consists of `effective_date` and `maturity` only.

![Default](../pics/schedule_default.png)

### Long implicit stub

When `stub_long` is true, the generated date just after `effective_date` is removed from the schedule, resulting in a long initial period.

![Long Stub](../pics/schedule_longstub.png)

### Forward rollout

When `stub_end` is true, JSON risk rolls out forward from `effective_date` in regular monthly periods the length of which is determined by `term` until `maturity` is reached or exceded.

![End Stub](../pics/schedule_endstub.png)

### Forward rollout with long implicit stub

When `stub_end` is true and `stub_long` is true, the generated date just before `maturity` is removed from the schedule, resulting in a long final period.

![Long end stub](../pics/schedule_longendstub.png)

### Explicit final stub

when `next_to_last_date` is set, JSON risk rolls out backward from `next_to_last_date` in regular monthly periods the length of which is determined by `term` until `effective_date` is reached or preceded.

Like in the case without `next_to_last_date` set, the field `stub_long` determines the length of the initial period.

![Next to last date](../pics/schedule_nexttolastdate.png)

### Explicit initial stub

When `first_date` is set, JSON risk rolls out forward from `first_date` in regular monthly periods the length of which is determined by `term` until `maturity` is reached or preceded.

Like in the standard forward rollout case, that is, when `stub_end` is true, but `first_date` is unset, the field `stub_long` determines the length of the final period.

![First date](../pics/schedule_firstdate.png)

### Two explicit stubs

When both `first_date` and `next_to_last_date` are set, JSON risk rolls out backward from `next_to_last_date` in regular monthly periods the length of which is determined by `term` until `first_date` is reached or preceded. In this case, `next_to_last_date` and `first_date` are expected to regularly align with the monthly periods. If they do not, there will be an additional irregular period after `first_date`. The field `stub_long` determines the length of this period.

![Two stubs](../pics/schedule_twostubs.png)

### Schedule generation without `effective_date` set

Even if `effective_date` is unset, JSON risk rolls out a decent schedule for fixed income instruments in many cases. This makes sense in analyses where past payments are not of interest and works under the following conditions:

 - The valuation date `library.valuation_date` must be set
 - The explicit initial stub date `first_date` must be unset
 - The attribute `stub_end` must be false or unset unless `next_to_last_date` is set

If any of these conditions are violated, JSON risk will throw an error. Otherwise, JSON risk first rolls out the interest rate schedule backward from `maturity` or `next_to_last_date` in regular monthly periods the length of which is determined by `term` until the valuation date is reached or preceded. This yields a schedule with a regular first period starting in the past or at valuation date.

In the special case where `tenor` is zero, the resulting schedule consists of the valuation date and `maturity` only.

If fixing or repayment schedules are required, these are rolled out with `effective_date` substituted by the first date in the interest rate schedule. Consequently, all three schedules start and end at the same dates.

