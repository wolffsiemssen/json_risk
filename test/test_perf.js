var JsonRisk=require('../dist/json_risk.js');
var data=require('./params_example.json');
JsonRisk.store_params(data);

data=require('./portfolio_example.json');

console.log("Start...");
var n=JsonRisk.vector_pricer(data[0]).length;
var t0 = new Date().getTime();
for (j=1;j<data.length;j++){
	JsonRisk.vector_pricer(data[j]);
	console.log(""+ (n*j) + " valuations...");
}

var t1 = new Date().getTime();
var m;

console.log("Valuations took " + (t1 - t0)/1000 + " seconds.");
console.log("1 Mio. instruments with " + n + " Valuations would take " + (1000000*(t1 - t0)/1000/60/60/data.length).toFixed(2) + " hours.");

