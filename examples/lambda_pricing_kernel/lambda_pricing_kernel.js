const jr=require('/opt/nodejs/json_risk');
const https = require('https');
let params_global={};



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function calculation(params,portfolio,time){
	

var output={
	res:{},
	warnings: [],
	errors: [],
	times:{}
};




	///////////////////////////// error and warning functions //////////////////////////////////////////////////////////////
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
		};

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
	};

	///////////////////////////////////////////////////Main logic///////////////////////////////////////////////////////////
	
	var t0_c =new Date().getTime();
	
	
	var n=0, sub_portfolio, pv_vector, i, j;
	for (var j=0;j<portfolio.length;j++){
		try{
			//default curve assignment
			assign_params(portfolio[j]);
			pv_vector=jr.vector_pricer(portfolio[j]);

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
	}

var t1_c =(new Date().getTime() - t0_c)/1000;
output.times['calc']=t1_c;




	///////////////////////////////////////////////////////assign instrument functions//////////////////////////////////////////////////////////////////
	function assign_params(instrument){
		switch(instrument.type){
	                case "callable_bond":
	                case "swaption":
				assign_surface(instrument);
	                case "floater":
	                case "swap":
				assign_fwd_curve(instrument);
			case "bond":
	                case "fxterm":
				assign_disc_curve(instrument);
		}
	}


	function assign_disc_curve (instrument){
		var	params=jr.get_params();
		var msg;
		
		//a valid curve has already been assigned
		if (instrument.disc_curve in params.curves) return 0;
	
		//need assignment
		var	cname=(instrument.currency || "EUR") + "_OIS_DISCOUNT"; // default curve name
		if(cname in params.curves) {
			//assign default
			msg="Assigning default discount curve " + cname + ".";
			if (instrument.disc_curve) msg+=" Originally assigned curve was not found in parameters";
			instrument.disc_curve=cname;
			add_warning(msg, instrument.id||"");
		}else{
			msg="Could not find default discount curve " + cname + "in parameters.";
			add_warning(msg, instrument.id||"");
		}	
	}


	function assign_fwd_curve(instrument){
    	var	params=jr.get_params();
		var msg;

		//a valid curve has already been assigned
		if(instrument.fwd_curve in params.curves) return 0;
	
		//need assignment
		var cname=(instrument.currency || "EUR") + "_";
		var tenor=instrument.float_tenor || instrument.tenor || 6;
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
		
		if(cname in params.curves){
			//assign default
			msg="Assigning default forward curve " + cname + ".";
			if (instrument.fwd_curve) msg+=" Originally assigned curve was not found in parameters.";
			instrument.fwd_curve=cname;
			add_warning(msg, instrument.id||"");
		}else{
			msg="Could not find default forward curve " + cname + " in parameters.";
			add_warning(msg, instrument.id||"");
		}
	}

	function assign_surface(instrument){
		var params=jr.get_params();
		var msg;

		//a valid curve has already been assigned
		if(instrument.surface in params.surfaces) return 0;

		//need assignment
		var cname="CONST_10BP"; //default surface name
		if(cname in params.surfaces){
			//assign default

			msg="Assigning default surface " + cname + ".";
			if (instrument.surface) msg+=" Originally assigned surface was not found in parameters.";
			instrument.surface=cname;
			add_warning(msg, instrument.id||"");
		}else{
			msg="Could not find default surface " + cname + " in parameters.";
			add_warning(msg, instrument.id||"");
		}
	}	

	return output;

	
}




/////////////////////Handler function///////////////////////////////////////////////////////////////////////////////////

exports.handler =  function(event, context, callback) {
    
var input = event.body;
var t0_e =new Date().getTime();
var res={};

if(input.paramsurl) {

	if (params_global[input.paramsurl.url]==undefined){
				https.get(input.paramsurl.url, (resp) => {
    				let body = '';

    				// A chunk of data has been recieved.
    				resp.on('data', (chunk) => {
        				body += chunk;
    				});

    				// The whole response has been received. Print out the result.
    				resp.on('end', () => {
						jr.store_params(JSON.parse(body));
						params_global[input.paramsurl.url] = jr.get_params();  
    					res=calculation(params_global[input.paramsurl.url],input.portfolio);
    					res.times['exec']=(new Date().getTime() - t0_e)/1000;
						callback(null, res);
    				});

    			}).on("error", (err) => {
    				console.log("Error: " + err.message);
    				callback(Error(err));
    			});
	}else{
		jr.set_params(params_global[input.paramsurl.url]);
	    res=calculation(params_global[input.paramsurl.url], input.portfolio);
		res.times['exec']=(new Date().getTime() - t0_e)/1000;
		callback(null, res);
	}
	}else{ // Benutze angelieferte params.
		jr.store_params(input.jrparams);
		res=calculation(input.jrparams,input.portfolio);
		res.times['exec']=(new Date().getTime() - t0_e)/1000;
		callback(null, res);
		}



};









