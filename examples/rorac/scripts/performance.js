#!/usr/bin/env node   //path to the interpreter
const fs=require('fs');
const jr=require('../lib/json_risk.min.js');

console.log("performance.js: Read curves file");
var curves=fs.readFileSync('params/curves.json', 'utf8');
curves=JSON.parse(curves);

console.log("performance.js: Read portfolio template");
var pf=fs.readFileSync('config/portfolio_template.json', 'utf8');
pf=JSON.parse(pf);

var i,j,k,d,pv_vector,res,tmp,n,annualized_riskless_yield;
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

var price=function(){  // Für jedes subportfolio gibt es einen eigenen pv_vector zu dem aktuellen Szenario.
	// set params
	jr.store_params(params);
	var tmp={};
	for (j=0;j<pf.length;j++){   //Länge Portfolio, d.h. # Instrumente
		//price
		pv_vector=jr.vector_pricer(pf[j]);// Preise für ein Szenario für ein Instrument, d.h. ein Vektor
		sub_portfolio=pf[j].sub_portfolio || "sub_portfolio NOT SET"; 
		if(tmp.hasOwnProperty(sub_portfolio)){ // Wenn subportfolio schon vorhanden dann aufsummieren
			for (k=0;k<z.length;k++){  //Szenariolänge
				tmp[sub_portfolio][k]+=pv_vector[k]; //Aufsummieren für jede einzelne Stützstelle
			}
		}else{
			tmp[sub_portfolio]=pv_vector; //subportfolio noch nicht in tmp vorhanden
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


for (i=0;i<curves.dates.length-1;i++){ //Anzahl Szenarien
	console.log("performance.js: Calculation date is " + d);
	const date_options = { year: 'numeric', month: 'numeric', day: 'numeric' };

	rows[i]=d.toLocaleDateString('de-DE', date_options);
	
	//update maturity and effective date for portfolio, and price
	for (j=0;j<pf.length;j++){
		pf[j].effective_date=d;
		pf[j].maturity=jr.add_months(d,pf[j].months);
	}
	
	//price
	tmp=price();   //Pricing mit curvesdata i

	res[i]={};
	for (x in tmp){  // für jedes subportfolio in tmp (=jedes subportfolio hat pv_vector zum aktuellen Szenario
		res[i][x]={  // Für jedes Szenario einen Eintrag pro Subportfolio
				pv_start: tmp[x][0], //Start Barwert (erste Stützstelle Szenario)
				mean: mean(tmp[x]),
				risk: -(quantile(tmp[x],0.01)-mean(tmp[x])) * Math.sqrt(1)/ 2.32 * 3.09  //Ist Betrag
			  };
	}
	
	annualized_riskless_yield=jr.get_rate(jr.get_safe_curve({
		labels: params.curves.ZINSKURVE.labels,
		zcs: params.curves.ZINSKURVE.zcs[0]}),1/365);

	//update time only and reprice for end price
	//convert date string into date object
	d=jr.get_safe_date(curves.dates[i+1]);
	params.valuation_date=d;
	tmp=price();  //Neues pricing mit nächstem Szenario (i+1)
	for (x in tmp){
		res[i][x].pv_end=tmp[x][0]; 
		res[i][x].pnl=res[i][x].pv_end-res[i][x].pv_start; 
		res[i][x].annualized_yield=res[i][x].pnl/res[i][x].pv_start*12;
 		res[i][x].annualized_excess_yield=res[i][x].annualized_yield - annualized_riskless_yield;
		res[i][x].pnl_riskless=res[i][x].pnl*(res[i][x].annualized__excess_yield);
		res[i][x].pnl_risky=res[i][x].pnl*(annualized_riskless_yield);
		res[i][x].rorac=res[i][x].annualized_excess_yield/res[i][x].risk;
		res[i][x].rorac_betrag=res[i][x].pnl_riskless/res[i][x].risk;
		res[i][x].units=equity/res[i][x].risk;
		res[i][x].amount_risky=res[i][x].units*res[i][x].pv_start;
		res[i][x].amount_riskless=-res[i][x].amount_risky+equity;
		res[i][x].leverage=res[i][x].amount_risky/equity;
		res[i][x].leveraged_pnl_annualized=res[i][x].amount_risky*res[i][x].annualized_yield + res[i][x].amount_riskless*annualized_riskless_yield;
		res[i][x].annualized_riskless_yield=annualized_riskless_yield;
		res[i][x].annualized_leveraged_yield=res[i][x].leveraged_pnl_annualized/equity;
		res[i][x].annualized_leveraged_excess_yield=res[i][x].annualized_leveraged_yield-annualized_riskless_yield;
		res[i][x].leveraged_rorac=res[i][x].annualized_leveraged_excess_yield/equity;		
	}

	//update market data and reprice for new price under new market data
	//update curve and hist scenarios
	update_scenarios(i+1);
	// price
	tmp=price();  //Pricing mit curvedata i+1
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
	export_data['dates']=rows;
	export_data['values_names']=Object.keys(res[0][subportfolio[0]]);
	export_data['values']=[];
	export_data['subportfolio']=subportfolio;
	for (j=0;j<subportfolio.length;j++){
		var data={};
		var tmp_data_2=[];	
		for (i=0;i<export_data.values_names.length;i++){
		var tmp_data_1=[];
			for(k=0;k<keys.length;k++){
				tmp_data_1[k]=res[k][subportfolio[j]][export_data.values_names[i]];
			};
			tmp_data_2[i]=tmp_data_1;
		};
		data=tmp_data_2;
		export_data['values'][j]=data;
	
	
	
}
fs.writeFileSync('rorac.json', JSON.stringify(export_data));
fs.writeFileSync('rorac.js', 'var test=' +JSON.stringify(export_data));

