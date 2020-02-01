importScripts('./json_risk.min.js');

onmessage = function(e) {
	var d=e.data;
	if (d.params){
		try{
			JsonRisk.store_params(d.params);
		}catch(ex){
			postMessage({msg: ex.message});
		}		
	}
	if (d.instrument){
		try{
			var res=JsonRisk.vector_pricer(d.instrument);
			postMessage({res: res, sub_portfolio: d.instrument.sub_portfolio});
		}catch(ex){
			postMessage({msg: ex.message, id: d.instrument.id});
		}
	}
}

