#!/usr/bin/env node

//
// initialization
//
var today=new Date(2019,10,22);
var JR=require('./json_risk.js');
JR.valuation_date=today;

var tags=["1D", "1W", "3M", "1Y", "2Y", "3Y", "10Y"];	
var quotes=[-0.0060, -0.0040, -0.0030, -0.0020, 0.0010, 0.0110];

var target_holidays=JR.is_holiday_factory("TARGET");

//
// instruments definition
//
var instruments=[];
var times=[];

//overnight deposit
instruments[0]={
	notional: 1,
	effective_date: today,
	maturity: JR.add_business_days(today, 1, target_holidays),
	fixed_rate: quotes[0],
	dcc: "Act/360",
	tenor: 0
};
times[0]=JR.time_from_now(instruments[0].maturity);

//swaps
var effective_date=JR.add_business_days(today, 2, target_holidays);
var maturity;

for (i=1;i<quotes.length; i++){

	maturity=JR.add_period(effective_date, tags[i]);
	maturity=JR.adjust(maturity, "following", target_holidays);

	instruments[i]={
		notional: 1,
		type: "swap",
		effective_date: effective_date,
		maturity: new Date(maturity),
		fixed_rate: quotes[i],
		float_current_rate: 0,
		dcc: "Act/360",
		tenor: 12,
		float_tenor: 12
	};
	times[i]=JR.time_from_now(maturity);
}

//
// bootstrapping
//

//initialization
var curve={
	times: times,
	dfs: quotes.slice()
}

// overnight deposit
var func_price=function(df){
	curve.dfs[0]=df;
	return 1- JR.pricer_bond(instruments[0], curve);
}

JR.find_root_secant(func_price  // function to find root for
			, 1     // start value 1
			, 0.9   // start value 2
			, 10    // max iterations
			, 1E-12 //accuracy
		    );
console.log("Discount factor t0: " + curve.dfs[0].toFixed(10));
console.log("Deposit price   t0: " + (1- JR.pricer_bond(instruments[0], curve)).toFixed(10));

//swaps
for (var i=1; i<quotes.length;i++){

	func_price=function(df){
		curve.dfs[i]=df;
		return JR.pricer_swap(instruments[i], curve, curve);
	}

	JR.find_root_secant(func_price  // function to find root for
				, 1     // start value 1
				, 0.9   // start value 2
				, 10    // max iterations
				, 1E-12 //accuracy
		    	    );
	console.log("Discount factor t" + i + ": " + curve.dfs[i].toFixed(10));
	console.log("Swap price      t" + i + ": " + JR.pricer_swap(instruments[i], curve, curve).toFixed(10));
}


