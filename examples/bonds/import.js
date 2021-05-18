var load_params_from_server=function(sc){
	if (!sc.available_params.selection) return 0;
	if (sc.available_params.selection==="TEST PARAMETERS"){
		sc.params={
			valuation_date: "2018-08-31",
			curves: {
			  EUR_OIS_DISCOUNT: {
			   type: "yield",
			   labels: [
			    "1Y","2Y","3Y","4Y","5Y","7Y","10Y","15Y","20Y","25Y"
			   ],
			   zcs: [
			     -0.00795291,
			     -0.0077878800000000005,
			     -0.00699913,
			     -0.00569703,
			     -0.00413626,
			     -0.00099492,
			     0.00268452,
			     0.00620335,
			     0.00803145,
			     0.00912026
			    ]},
			  EUR_3M_FWD: {
			     type: "yield",
			     labels: [
			      "1Y","2Y","3Y","4Y","5Y","7Y","10Y","15Y","20Y","25Y"
			     ],
			     zcs: [
			       -0.00695291,
			       -0.0067878800000000005,
			       -0.00599913,
			       -0.00469703,
			       -0.00313626,
			       -0.00009492,
			       0.00368452,
			       0.00720335,
			       0.00903145,
			       0.01012026
			      ]},
			  EUR_6M_FWD: {
			     type: "yield",
			     labels: [
			      "1Y","2Y","3Y","4Y","5Y","7Y","10Y","15Y","20Y","25Y"
			     ],
			     zcs: [
			       -0.00595291,
			       -0.0057878800000000005,
			       -0.00499913,
			       -0.00369703,
			       -0.00213626,
			       -0.00000492,
			       0.00468452,
			       0.00820335,
			       0.01003145,
			       0.01112026
			      ]}
			  },
    surfaces: {
      CONST_0BP: {
        type: "bachelier",
        labels_term: ["1Y"],
        labels_expiry: ["1Y"],
        values: [[0.0]]
      },
      CONST_10BP: {
        type: "bachelier",
        labels_term: ["1Y"],
        labels_expiry: ["1Y"],
        values: [[0.001]]
      },
      CONST_20BP: {
        type: "bachelier",
        labels_term: ["1Y"],
        labels_expiry: ["1Y"],
        values: [[0.002]]
      }
     }    
		};
		return 0;
	}

	var req=new XMLHttpRequest();
	
	req.addEventListener('load', function(evt){
		if(req.status===200){
			
			sc.params=JSON.parse(req.responseText);
                        sc.$apply();
		}else{
			alert("Could not load params from server");
		}
	});

	
	req.addEventListener('error', function(evt){
		alert("Could not load params from server");
	});

	req.open('GET', 'https://www.jsonrisk.de/jrparams/' + sc.available_params.selection);
	req.send();
}

var load_params_list=function(sc){
	var req=new XMLHttpRequest();
	
	var err_handler=function(){
		//silent error
		console.log("Could not load list of available params from server");
		//only add test params
		sc.available_params.list=["TEST PARAMETERS"];
		sc.available_params.selection=sc.available_params.list[0];
                sc.$apply();
	}
	
	req.addEventListener('load', function(evt){
		if(req.status===200){
			var result=JSON.parse(req.responseText);
			sc.available_params.list=[];
			for (var i=0;i<result.length;i++){
				if (result[i].toLowerCase().includes("base")) sc.available_params.list.push(result[i]);
			}
			sc.available_params.list.push("TEST PARAMETERS");
			sc.available_params.selection=sc.available_params.list[0];
                        sc.$apply();
		}else{
			err_handler();
		}
	});

	
	req.addEventListener('error', err_handler);

	req.open('GET', 'https://www.jsonrisk.de/jrparams/');
	req.send();
}

var import_data=function(fil, kind, sc){
        var pp_config={
	        header: false,
        	dynamicTyping: true,
	        worker: false,
        };
        
	      if (kind==="curve"){
                pp_config.complete=function(results,file){
                        var i,j;
                        var labels=[];
                        var zcs=[];
                        var row;
                
                        for (j=1;j<results.data[0].length;j++){
                                labels.push(results.data[0][j]);
                                zcs.push(results.data[1][j]);
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
                                        row[j]=results.data[i][j+1];
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
