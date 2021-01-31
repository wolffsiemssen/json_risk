#!/usr/bin/env node   //path to the interpreter
const fs=require('fs');
const jr=require('../lib/json_risk.min.js');

console.log("performance.js: Read curves file");
var curves=fs.readFileSync('params/curves.json', 'utf8');
curves=JSON.parse(curves);

console.log("performance.js: Read portfolio template");
var pf=fs.readFileSync('config/portfolio_template.json', 'utf8');
pf=JSON.parse(pf);

var i,j,k,d,pv_vector,res,n;
var z=JSON.parse(JSON.stringify(curves.zcs_hist)) //initialise curve array structure
var params={
	curves: {
		"ZINSKURVE": {
			labels: curves.labels,
			zcs: z
		}
	}
}

//set curves for portfolio
for (j=0;j<pf.length;j++){
	pf[j].disc_curve="ZINSKURVE";
	pf[j].fwd_curve="ZINSKURVE";
}

for (i=0;i<curves.dates.length;i++){
	//convert date string into date object
	d=jr.get_safe_date(curves.dates[i]);
	params.valuation_date=d;
	//update curve BASE scenario
	for (j=0;j<z[0].length;j++){
		z[0][j]=curves.zcs_hist[i][j];
	}

	//update curve hist scenarios
	for (j=0;j<z[0].length;j++){
		for(k=0;k<curves.zcs_scen.length;k++){
			z[k+1][j]=curves.zcs_hist[i][j]+curves.zcs_scen[k][j];
		}
	}

	// set params
	jr.store_params(params);

	//update maturity and effective date for portfolio, and price
	res={};
	for (j=0;j<pf.length;j++){
		pf[j].effective_date=d;
		pf[j].maturity=jr.add_months(d,pf[j].months);

		//price
		pv_vector=jr.vector_pricer(pf[j]);
		sub_portfolio=pf[j].sub_portfolio || "sub_portfolio NOT SET";
		if(res.hasOwnProperty(sub_portfolio)){
			for (k=0;k<z.length;k++){
				res[sub_portfolio][k]+=pv_vector[k];
			}
		}else{
			res[sub_portfolio]=pv_vector;
		}
	}
	console.log(res);
}
	
//fs.writeFileSync('performance.json', JSON.stringify(res));

