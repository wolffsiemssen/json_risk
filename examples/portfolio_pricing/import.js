var load_params_from_server=function(sc){
	if (!sc.available_params.selection){
		alert("No parameter set selected");
		return 0;
	}
	var req=new XMLHttpRequest();
	
	req.addEventListener('load', function(evt){
		if(req.status===200){
			sc.params=JSON.parse(req.responseText);
			sc.res=null;
			sc.errors=null;
			sc.warnings=null;
                        sc.$apply();
		}else{
			alert("Could not load params from server");
		}
	});

	
	req.addEventListener('error', function(evt){
		alert("Could not load params from server");
	});

	req.open('GET', '../jrparams/' + sc.available_params.selection);
	req.send();
}

var load_params_list=function(sc){
	var req=new XMLHttpRequest();
	
	req.addEventListener('load', function(evt){
		if(req.status===200){
			sc.available_params.list=JSON.parse(req.responseText);
			sc.available_params.selection=sc.available_params.list[0];
                        sc.$apply();
		}else{
			//silent error
			console.log("Could not load list of available params from server");
		}
	});

	
	req.addEventListener('error', function(evt){
		//silent error
		console.log("Could not load list of available params from server");
	});

	req.open('GET', '../jrparams/');
	req.send();
}

var import_data=function(fil, kind, sc){
        var pp_config={
	        header: false,
        	dynamicTyping: true,
	        worker: false,
        };
        
        if (kind==="scalar"){
                pp_config.complete=function(results,file){
                        var i,j;
                        var column;
                        
                        if (!sc.params) sc.params={};
                        if (!sc.params.scalars) sc.params.scalars={};
                
                        for (j=1;j<results.data[0].length;j++){
                                column=[];
                                for (i=1; i<results.data.length;i++){
                                        if (results.data[i].length!==results.data[0].length) continue;
                                        column.push(results.data[i][j]);
                                }
                                sc.params.scalars[results.data[0][j]]={
                                        type: "equity / fx",
                                        value: column
                                };
                        }
                        sc.$apply();
                }        
        }else if (kind==="curve"){
                pp_config.complete=function(results,file){
                        var i,j;
                        var labels=[];
                        var zcs=[];
                        var row;
                
                        for (j=1;j<results.data[0].length;j++){
                                labels.push(results.data[0][j]);
                        }
                        
                        for (i=1; i<results.data.length;i++){
                                if (results.data[i].length!==results.data[0].length) continue;
                                row=new Array(results.data[0].length-1);
                                for (j=0;j<row.length;j++){
                                        row[j]=results.data[i][j+1]/100;
                                }
                                zcs.push(row);
                        }
                        
                        if (!sc.params) sc.params={};
                        if (!sc.params.curves) sc.params.curves={};
                        sc.params.curves[results.data[0][0]]={
                                type: "yield / spread",
                                labels: labels,
                                zcs: zcs
                        }
                        sc.$apply();
                }
        
        }else if (kind==="surface"){
                pp_config.complete=function(results,file){
                        var i,j;
                        var labels_expiry=[];
                        var labels_term=[];
                        var values=[];
                        var row;
                
                        for (j=1;j<results.data[0].length;j++){
                                labels_term.push(results.data[0][j]);
                        }
                        
                        for (i=1; i<results.data.length;i++){
                                if (results.data[i].length!==results.data[0].length) continue;
                                row=new Array(results.data[0].length-1);
                                labels_expiry.push(results.data[i][0]);
                                for (j=0;j<row.length;j++){
                                        row[j]=results.data[i][j+1]/10000;
                                }
                                values.push(row);
                        }
                        
                        if (!sc.params) sc.params={};
                        if (!sc.params.surfaces) sc.params.surfaces={};
                        sc.params.surfaces[results.data[0][0]]={
                                type: "bachelier",
                                labels_expiry: labels_expiry,
                                labels_term: labels_term,
                                values: values
                        }
                        sc.$apply();
                }
        }else if (kind==="portfolio"){
                pp_config.complete=function(results,file){
                        if (!sc.portfolio) sc.portfolio=[];
                        var i,j, error_found;
                        for (i=0; i<results.data.length; i++){
                                error_found=false;
                                for (j=0; j<results.errors.length; j++){
                                        if (results.errors[j].row===i) error_found=true;
                                }
                                if (!error_found) sc.portfolio.push(results.data[i]);
                        }
                        sc.$apply();
                }
                pp_config.header=true;
        }else{
                return null;
        }
        

        if("string"===typeof(fil)){
                pp_config.download=true;
                Papa.parse(fil,pp_config);
        }else if(fil.name){
	        pp_config.download=false,
                Papa.parse(fil,pp_config)
        }
}
