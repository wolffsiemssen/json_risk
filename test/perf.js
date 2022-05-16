var JsonRisk=require('../dist/json_risk.js');

var params=require('./params_example.js');
var portfolio=require('./portfolio_example.js');
JsonRisk.store_params(params);


console.log("Start...");
var n=JsonRisk.vector_pricer(portfolio[0]).length;
var t0 = new Date().getTime();
for (j=1;j<portfolio.length;j++){
	JsonRisk.vector_pricer(portfolio[j]);
	console.log(""+ (n*j) + " valuations...");
}

var t1 = new Date().getTime();
var m;

console.log("Valuations took " + (t1 - t0)/1000 + " seconds.");
console.log("1 Mio. instruments with " + n + " Valuations would take " + (1000000*(t1 - t0)/1000/60/60/portfolio.length).toFixed(2) + " hours.");

