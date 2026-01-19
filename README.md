A JSON / JavaScript financial risk and pricing library

## Why to use a JavaScript financial risk and pricing library
Here are three reasons for using a financial risk and pricing library in JavaScript.

 - As one of the key technologies of the web, JavaScript is ubiquitous and heavily supported by the leading tech companies and by a large open source community.
 - Web applications required to have access to financial math logic both on the client and on the server side are largely bound to use JavaScript, as JavaScript is the only programming language natively supported in all major web browsers.
 - With JSON being a native subset of JavaScript, data interchange in JavaScript applications is almost as easy as calling the Javascript `JSON.parse` and `JSON.stringify` functions, making any parsing and serialization logic obsolete for most applications.

## How to include in node.js:

        const JsonRisk=require('path/to/json_risk.js');


## How to include in browser:
 
        <script src="path/to/json_risk.min.js"></script>


## Exemplary use - present value of a bond

	const bond = new JsonRisk.Bond({
		maturity: new Date(2028,0,1),           //final maturity of the bond
		notional: 100.0,                        //notional
		fixed_rate: 0.05,                       //interest rate 5%
		tenor: 12,                              //yearly interest payments
		bdc: "following",                       //business day convention
		dcc: "act/act",                         //day count convention
		calendar: "TARGET",                     //holiday calendar
		disc_curve: "DISCOUNT"                  //name reference to the discount curve
	});

	const discount_curve={
		labels: ["1Y", "2Y", "3Y", "10Y"],      //times encoded as labels
		zcs: [0.01, 0.02, 0.025, 0.1]           //zero-coupon rates act/365 annual compounding
	};
	
	const params=new JsonRisk.Params({
	    valuation_date: "2019/12/31",           //one of the supported date string formats
	    curves: {
	        "DISCOUNT": discount_curve          //the discount curve defined above
	    }
	});
		
	const present_value=bond.value(params);     

See the [documentation](https://www.jsonrisk.de/01_Documentation.html) for details and examples.

## Library features

### Supported instruments

JSON Risk supports the instrument types below:
 
- Fixed income instruments
  - Fixed rate bonds
  - Floating rate bonds
  - Interest rate swaps
  - Bespoke leg instruments
- FX instruments
  - FX spot
  - FX forward
  - Cross-Currency Swap
- Callable fixed income instruments
  - Plain vanilla swaptions
  - Bermudan swaptions
  - Single callable and multicallable bond
  - Single callable and multicallable swaps
- Equities
  - Stock
  - Stock/Index Future/Forward
  - European Options
- Credit
  - Credit default swaps
  
Fixed income, FX and Credit instruments support cash flow generation from terms and conditions as well as pre-defined leg structures.

Pricing of complex interest rate derivatives is implemented with a Linear Gauss Markov (or, equivalently, Hull-White) model in the spirit of Hagan, Patrick; EVALUATING AND HEDGING EXOTIC SWAP INSTRUMENTS VIA LGM (2019).

### Amortization

- bullet repayment upon maturity
- step-down amortization (regular repayments)
- interest capitalization (allowing to define annuity-type profiles)

### Schedule generation

- long and short implicit stubs (e.g., forward and backward roll out)
- explicit initial and final stubs
- completely independent generation of
  - interest rate schedule
  - fixing schedule for floating rate instruments
  - repayment schedule for amortizing instruments

### Day count conventions

JSON Risk supports the day count conventions

 - act/act according to the ISDA 2006 rules in section 4.16 (b), also recognized by JSON Risk as actual/actual or a/a
 - act/365 according to the ISDA 2006 rules in section 4.16 (d), also recognized by JSON Risk as actual/365, a/365, actual/365 (fixed) or act/365 (fixed)
 - act/360 according to the ISDA 2006 rules in section 4.16 (e), also recognized by JSON Risk as actual/360, a/360, or french
 - 30u/360 according to the ISDA 2006 rules in section 4.16 (f), also recognized by JSON Risk as 30/360, bond basis, or bond
 - 30e/360 according to the ISDA 2006 rules in section 4.16 (g), also recognized by JSON Risk as eurobond basis or eurobond
 - 30g/360 according to the ISDA 2006 rules in section 4.16 (h), also recognized by JSON Risk as 30e/360 (ISDA) or 30/360 German

JSON Risk is case insensitive when parsing day count conventions on instrument data.

### Business day conventions

JSON Risk supports the business day conventions

- unadjusted,
- following,
- modified following,
- preceding.

### Calendars

JSON Risk supports one built-in calendar (TARGET) as of now.

Adding custom calendars is as simple as


	const holidays = [
		        new Date(2018,11,1), //javascript date object
		        "2018/12/12",        //valid YYYY/MM/DD date string
		        "2019-12-01",        //valid YYYY/MM/DD date string
		        "01.12.2020"         //valid DD.MM.YYYY date string
	];

	JsonRisk.add_calendar("CUSTOM", holidays);


Saturdays and Sundays are considered holidays in all custom calendars.

## Documentation

 - The [Instruments guide](https://www.jsonrisk.de/01_Documentation/01_Instruments.html) summarizes supported instruments and features
 - The [Fields guide](https://www.jsonrisk.de/01_Documentation/02_Fields.html) contains a complete list of JSON fields for describing instrument terms and conditions
 - The [Data types guide](https://www.jsonrisk.de/01_Documentation/03_Data_types.html) explains the data types used in the JSON fields
 - The [Parameters guide](https://www.jsonrisk.de/01_Documentation/02_Parameters.html) explains how to represent parameters for valuation, e.g., yield curves and surfaces.
 - The [Schedule generation guide](https://www.jsonrisk.de/01_Documentation/05_Schedule_generation.html) explains how JSON risk generates schedules for interest rate instruments.
