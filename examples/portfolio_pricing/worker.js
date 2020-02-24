importScripts('./json_risk.min.js');

onmessage = function(e) {
	var d=e.data;
	if (d.params){
		try{
			JsonRisk.store_params(d.params);
		}catch(ex){
			postMessage({error: true, msg: ex.message});
		}		
	}
	if (d.instrument){
		try{
			//default curve assignment
			assign_params(d.instrument);
			var res=JsonRisk.vector_pricer(d.instrument);
			postMessage({res: res, sub_portfolio: d.instrument.sub_portfolio});
		}catch(ex){
			postMessage({error: true, msg: ex.message, id: d.instrument.id});
		}
	}
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
		postMessage({warning: true, msg: msg, id: i.id})
	}else{
		msg="Could not find default discount curve " + cname + " in parameters.";
		postMessage({warning: true, msg: msg, id: i.id})
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
		postMessage({warning: true, msg: msg, id: i.id})
	}else{
		msg="Could not find default forward curve " + cname + " in parameters.";
		postMessage({warning: true, msg: msg, id: i.id})
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
		postMessage({warning: true, msg: msg, id: i.id})
	}else{
		msg="Could not find default surface " + cname + " in parameters.";
		postMessage({warning: true, msg: msg, id: i.id})
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
