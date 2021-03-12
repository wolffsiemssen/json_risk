#!/usr/bin/env node   //path to the interpreter

const fs=require('fs');
const jr=require('../lib/json_risk.min.js');

console.log("performance.js: Read curves file");
var curves=fs.readFileSync('params/curves.json', 'utf8');
curves=JSON.parse(curves);

console.log("performance.js: Read portfolio template");
var pf=fs.readFileSync('config/portfolio_template.json', 'utf8');
pf=JSON.parse(pf);

var i,j,k,d,pv_vector,res,tmp,n,annualized_yield_riskless;
var z=new Array(curves.zcs_hist.length);
var params={
	curves: {
		"ZINSKURVE": {
			labels: curves.labels,
			zcs: z
		}
	}
}

var equity = 1000*1000; // read from config.json later

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
var rows=[];


for (i=0;i<curves.dates.length-1;i++){ 
//for (i=0;i<10;i++){ 
	console.log("performance.js: Calculation date is " + d);
	const date_options = { year: 'numeric', month: 'numeric', day: 'numeric' };

	rows[i]=d.toLocaleDateString('de-DE', date_options);
	rows[i]=(d.getDate() < 10 ? "0" : "") + d.getDate() + "." + (d.getMonth()<9 ? "0" : "") + (d.getMonth()+1) + "." + d.getFullYear();
	
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
				risk: -(quantile(tmp[x],0.01)-mean(tmp[x])) * Math.sqrt(1)/ 2.32 * 3.09,
			  };
	}
	
	yield_riskless=jr.get_rate(jr.get_safe_curve({
		labels: params.curves.ZINSKURVE.labels,
		zcs: params.curves.ZINSKURVE.zcs[0]}),1/365);

	//update time only and reprice for end price
	//convert date string into date object
	d=jr.get_safe_date(curves.dates[i+1]);
	params.valuation_date=d;
	tmp=price();  
	for (x in tmp){
		res[i][x].pv_end=tmp[x][0]; 
		//res[i][x].pnl_monthly=res[i][x].pv_end-res[i][x].pv_start; 
		res[i][x].yield=(res[i][x].pv_end-res[i][x].pv_start)/res[i][x].pv_start*12;
 		res[i][x].yield_excess=res[i][x].yield - yield_riskless;
 		res[i][x].yield_riskless=yield_riskless;
		
		res[i][x].pnl_riskless=res[i][x].pv_start*yield_riskless;
		res[i][x].pnl=12*(res[i][x].pv_end-res[i][x].pv_start);
		res[i][x].pnl_excess=res[i][x].pnl-res[i][x].pnl_riskless;
				
		res[i][x].rorac=res[i][x].pnl_excess/res[i][x].risk;
		
		//leverage
		res[i][x].units=equity/res[i][x].risk;
		
		res[i][x].amount=res[i][x].units*res[i][x].pv_start;
		res[i][x].amount_riskless=-res[i][x].amount+equity;
		
		res[i][x].leverage=res[i][x].amount/equity;
		res[i][x].leveraged_pnl=res[i][x].amount*res[i][x].yield + res[i][x].amount_riskless*yield_riskless;
		res[i][x].leveraged_pnl_excess=res[i][x].leveraged_pnl - equity*yield_riskless;
		res[i][x].leveraged_yield=res[i][x].leveraged_pnl/equity;
		res[i][x].leveraged_yield_excess=res[i][x].leveraged_yield-yield_riskless;
		
		res[i][x].leveraged_rorac=res[i][x].leveraged_pnl_excess/equity;
	}

	//update market data and reprice for new price under new market data
	//update curve and hist scenarios
	update_scenarios(i+1);
	// price
	tmp=price(); 
	for (x in tmp){

		res[i][x].pv_end_new=tmp[x][0];
		res[i][x].pnl_market_effect=res[i][x].pv_end_new-res[i][x].pv_end;
	}
}
	
fs.writeFileSync('performance.json', JSON.stringify(res));

// generate rorac.js for graphics

	let keys=Object.keys(res);
	let subportfolio=Object.keys(res[0]);
	var export_data={};
	export_data['subportfolio']=subportfolio;
	export_data['values_names']=Object.keys(res[0][subportfolio[0]]);
	export_data['dates']=rows;
	export_data['values']=[];
	
	for (j=0;j<subportfolio.length;j++){ //subportfolio
		var data={};
		var tmp_data_2=[];	
		for (i=0;i<export_data.values_names.length;i++){ //value names
			var tmp_data_1=[];
			for(k=0;k<keys.length;k++){ //dates
				tmp_data_1[k]=res[k][subportfolio[j]][export_data.values_names[i]]; //values
			};
			tmp_data_2[i]=tmp_data_1;
		};
		data=tmp_data_2;
		export_data['values'][j]=data;
	
	
	
}
fs.writeFileSync('rorac.json', JSON.stringify(export_data));
fs.writeFileSync('rorac.js', 'var rorac=' +JSON.stringify(export_data));


