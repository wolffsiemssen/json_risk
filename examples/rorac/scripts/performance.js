#!/usr/bin/env node   //path to the interpreter
const fs=require('fs');
const jr=require('../lib/json_risk.min.js');

console.log("performance.js: Read curves file");
var curves=fs.readFileSync('params/curves.json', 'utf8');
curves=JSON.parse(curves);

console.log("performance.js: Read portfolio template");
var pf=fs.readFileSync('config/portfolio_template.json', 'utf8');
pf=JSON.parse(pf);

var i,j,k,d,pv_vector,res,tmp,n;
var z=new Array(curves.zcs_hist.length);
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

//computes quantile. warning - sorts and thus changes input array!!!
var quantile=function(vec,q){
        vec.sort(function(a,b){return a-b;});
        if (q>1) q=1;
        if (q<0) q=0;
        var n=vec.length;
        var i=Math.floor((n - 1)*q);
        var delta=(n-1)*q - i;
        return (1 - delta)*vec[i] + delta*vec[i+1];
}

//computes mean
var mean=function(vec){
	var res=0;
	for (var i=0;i<vec.length;i++){
		res+=vec[i];
	}
	return res/vec.length;
}


var update_scenarios=function(timeindex){
	//update base scenario
	z[0]=new Array(curves.zcs_hist[0].length);
	for (j=0;j<z[0].length;j++){
		z[0][j]=curves.zcs_hist[timeindex][j];
	}
	//update curve hist scenarios
	for(k=0;k<curves.zcs_scen.length;k++){
		z[k+1]=new Array(z[0].length);
		for (j=0;j<z[0].length;j++){
			z[k+1][j]=curves.zcs_hist[timeindex][j]+(Math.sqrt(12)*curves.zcs_scen[k][j]);
	
		}
	}	
}

var price=function(){
	// set params
	jr.store_params(params);
	var tmp={};
	for (j=0;j<pf.length;j++){
		//price
		pv_vector=jr.vector_pricer(pf[j]);
		sub_portfolio=pf[j].sub_portfolio || "sub_portfolio NOT SET";
		if(tmp.hasOwnProperty(sub_portfolio)){
			for (k=0;k<z.length;k++){
				tmp[sub_portfolio][k]+=pv_vector[k];
			}
		}else{
			tmp[sub_portfolio]=pv_vector;
		}
	}
	return tmp;
}

res=[];

//convert date string into date object
d=jr.get_safe_date(curves.dates[0]);
params.valuation_date=d;

//update curve and hist scenarios
update_scenarios(0);


for (i=0;i<curves.dates.length-1;i++){
	console.log("performance.js: Calculation date is " + d);
	
	//update maturity and effective date for portfolio, and price
	for (j=0;j<pf.length;j++){
		pf[j].effective_date=d;
		pf[j].maturity=jr.add_months(d,pf[j].months);
	}
	
	//price
	tmp=price();

	res[i]={};
	for (x in tmp){
		res[i][x]={
				pv_start: tmp[x][0],
				mean: mean(tmp[x]),
				risk: -quantile(tmp[x],0.01)+mean(tmp[x])
			  };
	}

	//update time only and reprice for end price
	//convert date string into date object
	d=jr.get_safe_date(curves.dates[i+1]);
	params.valuation_date=d;
	tmp=price();
	for (x in tmp){
		res[i][x].pv_end_old=tmp[x][0];
		res[i][x].pnl_time_effect=res[i][x].pv_end_old-res[i][x].pv_start;
	}

	//update market data and reprice for new price under new market data
	//update curve and hist scenarios
	update_scenarios(i+1);
	// price
	tmp=price();
	res[i]["RISKLESS"].pv_end_new=tmp["RISKLESS"][0];
	res[i]["RISKLESS"].pnl_market_effect=res[i]["RISKLESS"].pv_end_new-res[i]["RISKLESS"].pv_end_old;
	res[i]["RISKLESS"].pnl=res[i]["RISKLESS"].pv_end_new-res[i]["RISKLESS"].pv_start;
	res[i]["RISKLESS"].units=100/res[i]["RISKLESS"].pv_start;
	res[i]["RISKLESS"].pnl_leveraged=res[i]["RISKLESS"].pnl*res[i]["RISKLESS"].units;
	res[i]["RISKLESS"].pnl_leveraged_cumulative=res[i]["RISKLESS"].pnl_leveraged+( (i>0) ? res[i-1]["RISKLESS"].pnl_leveraged_cumulative : 0 );
	res[i]["RISKLESS"].pnl_leveraged_annualized=res[i]["RISKLESS"].pnl_leveraged_cumulative*0.12/(i+1);
	for (x in tmp){
		if (x==="RISKLESS") continue;
		res[i][x].pv_end_new=tmp[x][0];
		res[i][x].pnl_market_effect=res[i][x].pv_end_new-res[i][x].pv_end_old;
		res[i][x].pnl=res[i][x].pv_end_new-res[i][x].pv_start;
		res[i][x].units=100 / res[i][x].risk;
		res[i][x].units_riskless=(100 - (res[i][x].units*res[i][x].pv_start))/res[i]["RISKLESS"].pv_start;
		res[i][x].pnl_leveraged=res[i][x].pnl*res[i][x].units + res[i]["RISKLESS"].pnl*res[i][x].units_riskless ;
		res[i][x].pnl_leveraged_cumulative=res[i][x].pnl_leveraged+( (i>0) ? res[i-1][x].pnl_leveraged_cumulative : 0 );
		res[i][x].pnl_leveraged_annualized=res[i][x].pnl_leveraged_cumulative*0.12/(i+1);
	}
}
	
fs.writeFileSync('performance.json', JSON.stringify(res));

