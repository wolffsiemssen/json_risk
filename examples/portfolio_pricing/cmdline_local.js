#!/usr/bin/env node

//library
var JsonRisk=require('./json_risk.min.js');

if (process.argv.length < 4){
	console.error("Usage:");
	console.error("  cmdline_local.js params.json portfolio.json");
	process.exit(1);
}

//params given on the first command line argument
var params=require('./' + process.argv[2]);
if (!JsonRisk.get_safe_date(params.valuation_date)){
	console.error("ERROR: Invalid parameter file, should at least contain an object valid valuation_date entry.");
	process.exit(1);
}

JsonRisk.store_params(params);

//portfolio given on the second command line argument
portfolio=require('./' + process.argv[3]);
if (!Array.isArray(portfolio)){
	console.error("ERROR: Invalid portfolio file, should at least contain an array.");
	process.exit(1);
}

assign_disc_curve=function(i){
	p=JsonRisk.get_params();
	var msg;

	//a valid curve has already been assigned
	if(i.disc_curve in p.curves) return 0;

	//need assignment
	cname=(i.currency || "EUR") + "_OIS_DISCOUNT"; //default curve name
	if(cname in p.curves){
		//assign default

		msg="Assigning default discount curve " + cname + ".";
		if (i.disc_curve) msg+=" Originally assigned curve was not found in parameters.";
		i.disc_curve=cname;
		add_warning(msg, i.id||"");
	}else{
		msg="Could not find default discount curve " + cname + " in parameters.";
		add_warning(msg, i.id||"");
	}
}

assign_fwd_curve=function(i){
	p=JsonRisk.get_params();
	var msg;

	//a valid curve has already been assigned
	if(i.fwd_curve in p.curves) return 0;

	//need assignment
	cname=(i.currency || "EUR") + "_";
	var tenor=i.float_tenor || i.tenor || 6;
	switch(tenor){
		case 1:
			cname+="1M_";
			break;
		case 3:
			cname+="3M_";
			break;
		default:
			cname+="6M_";
	}
	cname+="FWD";
		
	if(cname in p.curves){
		//assign default

		msg="Assigning default forward curve " + cname + ".";
		if (i.fwd_curve) msg+=" Originally assigned curve was not found in parameters.";
		i.fwd_curve=cname;
		add_warning(msg, i.id||"");
	}else{
		msg="Could not find default forward curve " + cname + " in parameters.";
		add_warning(msg, i.id||"");
	}
}

assign_surface=function(i){
	p=JsonRisk.get_params();
	var msg;

	//a valid curve has already been assigned
	if(i.surface in p.surfaces) return 0;

	//need assignment
	cname="CONST_10BP"; //default surface name
	if(cname in p.surfaces){
		//assign default

		msg="Assigning default surface " + cname + ".";
		if (i.surface) msg+=" Originally assigned surface was not found in parameters.";
		i.surface=cname;
		add_warning(msg, i.id||"");
	}else{
		msg="Could not find default surface " + cname + " in parameters.";
		add_warning(msg, i.id||"");
	}
}

assign_params=function(i){
	switch(i.type){
                case "callable_bond":
                case "swaption":
			assign_surface(i);
                case "floater":
                case "swap":
			assign_fwd_curve(i);
		case "bond":
                case "fxterm":
			assign_disc_curve(i);
	}
}

var add_error=function(msg, id){
	var j=0;
	while(j<output.errors.length){
		if (output.errors[j].msg === msg){ //same error has already occured
			output.errors[j].count++;
			break;
		}
		j++;
	}
	if (j>=output.errors.length) output.errors.push({msg: msg, id: id, count: 1}); //new error
}

var add_warning=function(msg, id){
	var j=0;
	while(j<output.warnings.length){
		if (output.warnings[j].msg === msg){ //same warning has already occured
			output.warnings[j].count++;
			break;
		}
		j++;
	}
	if (j>=output.warnings.length) output.warnings.push({msg: msg, id: id, count: 1}); //new warning
}

// main program
console.error("INFO: Start...");
var t0 = new Date().getTime();
var output={
	res:{},
	warnings: [],
	errors: []
}
var n=0, sub_portfolio, pv_vector, i, j;
for (j=0;j<portfolio.length;j++){
	try{
		//default curve assignment
		assign_params(portfolio[j]);
                //pricing
		pv_vector=JsonRisk.vector_pricer(portfolio[j]);
		if(0===n) n=pv_vector.length;
		sub_portfolio=portfolio[j].sub_portfolio || "";
		if(output.res.hasOwnProperty(sub_portfolio)){
			for (i=0;i<n;i++){
				output.res[sub_portfolio][i]+=pv_vector[i];
			}
		}else{
			output.res[sub_portfolio]=pv_vector;
		}
	}catch(ex){
		add_error(ex.message, portfolio[j].id || "");
	}
	if (0===j%100 || portfolio.length-j < 100) console.error(`INFO: ${j} instruments priced, ${portfolio.length-j} instruments remaining`);
}

var t1 = new Date().getTime();
console.log(JSON.stringify(output));
console.error("INFO: Done. Valuations took " + (t1 - t0)/1000 + " seconds.");

