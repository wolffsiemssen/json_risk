
var app = angular.module('riskapp', []); 


/*
associated scripts: index.html, import.js, export.js, worker.js, testdata.js (aws lambda function jr_portfoliopricer, aws api jr_portfoliopricer)

structure of main.js

I. functions called by index.html orderd by tabs (portfolio, parameters, results) and corresponding functions
    i. tab Portfolio
        $scope.load_test_pf()                       load test portfolio from test_data.js
        $scope.delete_pf()                          delete portfolio, i.e. no instrument is displayed and $scope.portfolio is null 
        $scope.export_portfolio                     export portfolio (csv or json)
        $scope.view(item)                           display selected instrument (json format) 
        $scope.create()                             add new instrument to portfolio (edit corresponding json object with all available fields)
        $scope.edit(item)                           change selected instrument of portfolio (edit corresponding json object with all available fields)
        $scope.remove(item)                         delete selected instrument from portfolio
        $scope.add_as_new()                         add new instrument to portfolio (duplicate an instrument with new id)               
        $scope.save()                               save changes after editing an instrument (create, edit, add_as_new)
        $scope.cancel_editor()                      cancel changes as create, edit, add_as_new 
        $scope.$watch
        repl(key,value)                             Die Funtion wird aktuell nicht verwendet?!
        is_unique_id(str)                           check if id of an instrument is unique (only used in $scope.add_as_new())
    ii. tab Parameters
	    $scope.update_params_list()                 load list of available curves (jsonrisk.de/jrparams/)
	    $scope.load_params()                        download selected params from server (jsonrisk.de/jrparams/) 	    
	    $scope.load_test_params()                   load test params from test_data.js  
	    $scope.load_test_params()                   load test params 
	    $scope.delete_params()                      delete params, i.e. no params are displayed and $scope.params is null)		   
	    $scope.export_params()                      export params (json format)	    
	    $scope.count_scenarios_curve(curve)         count scenarios given by params-curves (curves)    
	    $scope.count_scenarios_surface(surface)     count scenarios given by params-surfaces (surfaces)  
	    $scope.count_scenarios_scalar(scalar)       count scenarios given by params-scalars (scalar)  
    iii. tab results
        $scope.export_results()                     export results (csv)
	    $scope.clear_errors()                       delete errors from calulation ($scope.errors is null)
	    $scope.clear_warnings()                     delete warnings from calulation ($scope.warnings is null) 
	    $scope.cancel()                             cancel calculation
	    $scope.delete_results()                     delete results ($scope.res is null)
        $scope.add_error(obj)                       add new error to $scope.errors  (only used in $scope.calculate_lambda() and $scope.calculate()) 
        $scope.add_warning(obj)                     add new warnings to $scope.warnings
        $scope.calculate()                          calculate present values for given $scope.portfolio and $scope.params on local maschine 
        $scope.calculate_lambda()                   calculate present values for given $scope.portfolio and $scope.params in aws (amazon web services)
II. general functions
        $scope.import_file                          import data (portfolio or params)
*/



app.controller('main_ctrl', ['$scope', function($scope) { // Controller für index.html



    /* definition of scope und worker (worker.js) */
	$scope.portfolio=JSON.parse(JSON.stringify(test_pf));  // Portfolio, was der Berechnung auf Reiter results zu grunde liegt
	$scope.available_params={list: null, selection: null}
	$scope.res=null;
	$scope.errors=null;
	$scope.warnings=null;

    $scope.options_aws = {  // xmlhttprequest options for aws (amazon web services)
        hostname: 'https://vflj5ognch.execute-api.eu-central-1.amazonaws.com',  // hostname aws API
        path: '/test/test',                                                     // path
        method: 'POST',                                                         // request method
        method_test: 'GET',                                                    // request method to test the apikey
        apikey: 'tMU4FEJGIG1EgKkCaD92J27nwdDq6kM61PXdnZ1u'                
        //apikey:'your API-key for aws'                                                        // API-key
     };  
    $scope.filter={text: ""};
    $scope.editor={json: null,index: -1}

	wrk=[]; 

    /* I. functions called by index.html orderd by tabs (portfolio, parameters, results) and corresponding functions */

        /*  I.i. tab Portfolio  */
        $scope.load_test_pf=function(){ 
		    $scope.portfolio=JSON.parse(JSON.stringify(test_pf));
		    $scope.res=null;
		    $scope.errors=null;
		    $scope.warnings=null;
	    }

	    $scope.delete_pf=function(){ 
		    $scope.portfolio=null;
		    $scope.res=null;
		    $scope.errors=null;
		    $scope.warnings=null;
	    }

        $scope.export_portfolio=function(format){ 
		        if(format==='json'){
			        export_to_json_file($scope.portfolio, "portfolio.json"); // function in export.js
		        }else if(format==='csv')   {
			        columns=["id",
				        "type",
				        "sub_portfolio",
				        "notional",
				        "quantity",
				        "market_value",
				        "currency",
				        "maturity",
				        "tenor",
				        "fixed_rate",
				        "float_current_rate",
				        "float_spread",
				        "calendar",
				        "dcc",
				        "bdc",
				        "float_tenor",
				        "float_dcc",
				        "float_bdc",
				        "effective_date",
				        "first_date",
				        "next_to_last_date",
				        "stub_end",
				        "stub_long",
				        "repay_amount",
				        "repay_tenor",
				        "repay_first_date",
				        "repay_next_to_last_date",
				        "repay_stub_end",
				        "repay_stub_long",
				        "interest_capitalization",
				        "linear_amortization",
				        "fixing_first_date",
				        "fixing_next_to_last_date",
				        "fixing_stub_end",
				        "fixing_stub_long",
				        "conditions_valid_until",
				        "residual_spread",
				        "disc_curve",
				        "fwd_curve",
				        "surface",
				        "spread_curve",
				        "settlement_days",
				        "cap_rate",
				        "floor_rate",
				        "is_payer",
				        "is_short",
				        "current_accrued_interest",
				        "first_exercise_date",
				        "call_tenor",
				        "opportunity_spread"];
			        export_to_csv_file($scope.portfolio, "portfolio.csv", columns); // function in export.js
		        }
	        }

            $scope.view=function(item){  
                    $scope.editor.index=-1;
                    $scope.editor.json=JSON.stringify(item, repl, 1);
                    window.scrollTo(0, 0); 
            }

            $scope.create=function(){ 
                    $scope.view({
                            id: 'new_item',
                            type: 'bond',
                            sub_portfolio: 'bonds',
                            notional: 10000,
                            quantity : null,
                            market_value : null,
                            currency : 'EUR',
                            maturity: '2030-01-01',
                            tenor : 1,
                            fixed_rate : 0.01,
                            float_current_rate : null,
                            float_spread : null,
                            calendar : null,
                            dcc : null,
                            bdc : null,
                            float_tenor : null,
                            float_dcc : null,
                            float_bdc : null,
                            effective_date : null,
                            first_date : null,
                            next_to_last_date : null,
                            stub_end : null,
                            stub_long : null,
                            repay_amount : null, 
                            repay_tenor : null,
                            repay_first_date : null,
                            repay_next_to_last_date : null,
                            repay_stub_end : null,
                            repay_stub_long : null,
                            interest_capitalization : null,
                            linear_amortization : null,
                            fixing_first_date : null,
                            fixing_next_to_last_date : null,
                            fixing_stub_end : null,
                            fixing_stub_long : null,
                            conditions_valid_until : null,
                            residual_spread : null,
                            disc_curve : null,
                            fwd_curve : null,
                            surface : null,
                            spread_curve : null,
                            settlement_days : null,
                            cap_rate : null,
                            floor_rate : null,
                            is_payer : null,
                            is_short : null,
                            first_exercise_date : null,
                            call_tenor : null,
                            opportunity_spread : null
                    });
            }

            $scope.edit=function(item){  
                    $scope.editor.index=$scope.portfolio.indexOf(item);
                    $scope.editor.json=JSON.stringify(item, repl, 1);
                    window.scrollTo(0, 0);
            }

            $scope.remove=function(item){  
                    var i=$scope.portfolio.indexOf(item);
                    $scope.portfolio.splice(i,1);
            }

            $scope.add_as_new=function(){
                    if ($scope.editor.json){
                            if($scope.portfolio===null) $scope.portfolio=[];
                            var item=JSON.parse($scope.editor.json)
                            var i=0,id=item.id||'';
                            while(!is_unique_id(id)){
                                    id=item.id+'_'+i;
                                    i++;
                            }
                            item.id=id;
                            $scope.portfolio.unshift(item);
                            $scope.editor.index=-1;
                    }
            }

            $scope.save=function(){
                    if ($scope.editor.json && $scope.editor.index>=0){
                            $scope.portfolio[$scope.editor.index]=JSON.parse($scope.editor.json);
                            $scope.editor.index=-1;
                    }
            }

            $scope.cancel_editor=function(){
                    $scope.editor={json: null,index: -1}
            }


            $scope.$watch('editor.json', function(){

                    $scope.editor.valid=false;
                    $scope.editor.msg="";
                    try{
                            JsonRisk.valuation_date=new Date(2000,0,1);
                            JsonRisk.get_internal_object(JSON.parse($scope.editor.json)); //test if JSON is valid at all and if instrument is valid

                    }catch(e){
                            $scope.editor.msg=e.message;
                            return 0;
                    }
                    $scope.editor.valid=true;
            }, true);

            function repl(key,value){  
	            if (key==='$$hashKey') return undefined; //exclude angluarJS internal variable
	            return value;
            }

            function is_unique_id(str){ 
                    for(j=0; j<$scope.portfolio.length;j++){
                            if($scope.portfolio[j].id===str) return false;
                    }
                    return true;
            }



        /*  I.ii. tab parameters  */

	    $scope.update_params_list=function(){ 
		    load_params_list($scope);  // function in import.js
	    }

	    $scope.update_params_list();

	    $scope.load_params=function(){ 
		    load_params_from_server($scope);    // function in import.js
	    }

	    $scope.load_test_params=function(){ 
		    $scope.params=JSON.parse(JSON.stringify(test_params));
		    $scope.params.curves['EUR_1M_FWD']=$scope.params.curves['EUR_OIS_DISCOUNT'];
		    $scope.params.curves['EUR_3M_FWD']=$scope.params.curves['EUR_OIS_DISCOUNT'];
		    $scope.params.curves['EUR_6M_FWD']=$scope.params.curves['EUR_OIS_DISCOUNT'];
		    $scope.params.curves['USD_OIS_DISCOUNT']=$scope.params.curves['EUR_OIS_DISCOUNT'];
		    $scope.params.curves['USD_1M_FWD']=$scope.params.curves['EUR_OIS_DISCOUNT'];
		    $scope.params.curves['USD_3M_FWD']=$scope.params.curves['EUR_OIS_DISCOUNT'];
		    $scope.params.curves['USD_6M_FWD']=$scope.params.curves['EUR_OIS_DISCOUNT'];
		    $scope.res=null;
		    $scope.errors=null;
		    $scope.warnings=null;
	    }

	    $scope.load_test_params();

	    $scope.delete_params=function(){ 
		    $scope.params={valuation_date: $scope.params.valuation_date};
		    $scope.res=null;
		    $scope.errors=null;
		    $scope.warnings=null;
	    }

	    $scope.export_params=function(){ 
		    export_to_json_file($scope.params, "params.json"); // Funktion aus export.js
	    }

	    $scope.count_scenarios_curve=function(curve){  
		    return Array.isArray((curve.dfs || curve.zcs)[0]) ? (curve.dfs || curve.zcs).length : 1;
	    }

	    $scope.count_scenarios_surface=function(surface){  
		    return Array.isArray(surface.values[0][0]) ? surface.values.length : 1;
	    }

	    $scope.count_scenarios_scalar=function(scalar){ 
		    return Array.isArray(scalar.value) ? scalar.value.length : 1;
	    }

	
        /*  I.ii. tab results  */


	    $scope.export_results=function(){ 
		    var columns=Object.keys($scope.res[0]);
		    for (var i=0;i<columns.length;i++){
			    if(columns[i]==='TOTAL') columns.splice(i,1)
		    }
		    columns.sort();
		    columns.unshift('TOTAL');
		    export_to_csv_file($scope.res, "results.csv", columns); // function in export.js
	    }

	    $scope.clear_errors=function(){ 
		    $scope.errors=null;
	    }

	    $scope.clear_warnings=function(){ 
		    $scope.warnings=null;
	    }

	    $scope.cancel=function(){ 
		    while (wrk.length){
			    wrk[0].terminate();
			    wrk.shift();
		    }
		    $scope.busy=false;
		    $scope.res=null;
		    $scope.$apply();
	    }

	    $scope.delete_results=function(){ 
		    $scope.res=null;
		    $scope.errors=null;
		    $scope.warnings=null;
	    }

	    $scope.add_error=function(obj){ 
		    if(!$scope.errors) $scope.errors=[];  //first error
		    var j=0;
		    while(j<$scope.errors.length){
			    if ($scope.errors[j].msg === obj.msg){ //same error has already occured
                    $scope.errors[j].count+=obj.count;                
				    break;
			    }
			    j++;
		    }
		    if (j>=$scope.errors.length) {
                   $scope.errors.push(obj); //new error           
            }
        }

        $scope.add_warning=function(obj){ 
            if(!$scope.warnings) $scope.warnings=[];
	        var j=0;
	        while(j<$scope.warnings.length){
		        if ($scope.warnings[j].msg === obj.msg){ //same warning has already occured
			        $scope.warnings[j].count+=obj.count;
			        break;
		        }
		        j++;
	        }
	        if (j>=$scope.warnings.length) $scope.warnings.push(obj); //new warning
        }


	    $scope.calculate=function(){ 

		    $scope.busy=true;
		    $scope.conc=navigator.hardwareConcurrency;
		    var t0 = new Date().getTime(), t1, t1_last;
		    var i,j;
		    var sub_portfolio;
		    var unsent=$scope.portfolio.length;
		    var incomplete=unsent;

		    for (i=0; i<$scope.conc; i++){
			    wrk[i]=new Worker('./worker.js');
			    wrk[i].onmessage=function(e){
				    if(e.data.res){ //success
					    sub_portfolio=e.data.sub_portfolio;
					    if (sub_portfolio === 'TOTAL') sub_portfolio='_TOTAL_'; //avoid conflict with TOTAL column
				            if (!$scope.res){ //first result
						    $scope.res=new Array(e.data.res.length);
					            for (j=0;j<e.data.res.length; j++){ //make object structure allowing to distinguish subportfolios
							    $scope.res[j]={};	                                	
							    $scope.res[j][sub_portfolio]=e.data.res[j];
				                    	$scope.res[j]["TOTAL"]=e.data.res[j];
						    }
					    }else{ //result to be added
					            for (j=0;j<e.data.res.length; j++){
							    $scope.res[j][sub_portfolio]=($scope.res[j][sub_portfolio] || 0 )+e.data.res[j];
				                    	$scope.res[j]["TOTAL"]=$scope.res[j]["TOTAL"]+e.data.res[j];
						    }
				            }
					    incomplete--;
				    }else if(e.data.warning){ //warning
					    
                        $scope.add_warning({msg: e.data.msg, id: e.data.id, count: 1});
				    }else{ //error
					    $scope.add_error({msg: e.data.msg || "unknown error", id: e.data.id || "unknown", count:1});
					    incomplete--;
				    }

				    if (0===incomplete){ //all done, terminate workers and exit
				            while (wrk.length){
				                    wrk[0].terminate();
				                    wrk.shift();
				            }

				            $scope.busy=false;            
				            $scope.$apply();
				    }
				    if(incomplete % 100 === 0 ){ //every now and then, update display and stats
                                            t1 = new Date().getTime();
				            $scope.calctime=(t1 - t0)/1000;
				            $scope.remaining=incomplete;
                                            if( t1-t1_last > 5000 && t1_last>0){
                                                $scope.$apply();
                                                t1_last=t1;
                                            }
				    }
				    if(unsent > 0){ // queue next instrument while not done
				            this.postMessage({instrument: $scope.portfolio[unsent-1]});
				            unsent--;
				    }
			    }

			    //worker process error handling
			    wrk[i].onerror=function(e){
				    $scope.add_error({msg:"An error occurred in the worker process. " + (e.message || "") , id: 'unknown', count:1});
			    }

			    //send params to worker
			    wrk[i].postMessage({params: $scope.params});
			
			    //post initial instrument
			    wrk[i].postMessage({instrument: $scope.portfolio[unsent-1]});
			    unsent--;
		    }

	    }

        $scope.calculate_lambda=function(){ 

            /*
            structure of $scope.calculate_lambda():
                1. configurations/options           
                2. functions:
                    handle_response_lambda(data, chunk)                 handle response from aws for each chunk (subset of $scope.portolio) and aggregate results for the whole portfolio 
                                                                        input: data=results from aws, chunk=subset of $scope.portfolio
                                                                        output: $scope.res, $scope.warnings, $scope.errors, $scope.remaining, $scope.calctime
                                                                        invocation: new_request_with_chunk_lambda(chunk, num_retries)
                                                                        remarks: data and $scope.res have different formats
                    new_request_lambda()                                compile chunks 
                                                                        invocation: main logic and handle_response_lambda(data, chunk)
                    new_request_with_chunk_lambda(chunk, num_retries)   send chunks and params-url to aws 
                                                                        input: chunk=chunk from new_request_lambda(), num_retries=max. number of retries sending a chunk to aws
                                                                        output: chunk and paramsurl to aws
                                                                        invocation: new_request_lambda()
                3. Main logic                                           proofs setting for aws and uploads params ($scope.params) to jsonrisk.de/jrparams/ invoke new_request_lambda()                                             
            */

            $scope.busy=true;  

            const config={
	          chunk_size: 50,       // max. number of instruments send in one aws request
	          max_requests: 1000,   // max. number of aws requests, i.e. a portfolio may have max. max_requests*chunk_size instruments
	          max_retries: 2        // max. number of retries sending a chunk to aws
            };
                                                                                                                                                       
            const options_aws_header={  // header aws request
                reqheader: {'0':['x-api-key', $scope.options_aws.apikey], '1':['x-amz-docs-region','eu-central-1'],'2':['content-type', 'application/json'], '3':['Content-Encoding', 'gzip']},// '4': ['Accept-Encoding', 'gzip,identity']},  // header
                reqheader_count: '4'                                                                                                                    // number of header
            };


            const options_jrparams = {  // xmlhttprequest options for uploading params to jsonrisk.de/jrparams/
                hostname: 'www.jsonrisk.de',
                port: 443,
                path: '/jrparams/',
                method: 'POST',
            };


            var handle_response_lambda=function(data, chunk){          
                running--;
            	remaining-=chunk.length;
            	data=JSON.parse(data);
            	//aggregate results
            	if (undefined===data.res || undefined===data.errors || undefined===data.warnings || undefined===data.times){
                    $scope.add_error({ msg: `Request with ${chunk.length} instruments does not return any valid data`, id: chunk[0].id || "", count: chunk.length});
                }else{
                    console.log(`INFO: Response with ${chunk.length} instruments received, ${portfolio_in.length} instruments remaining to send, ${remaining} instruments remaining to receive, ${running}   requests currently running`);
                    //$scope.$apply();    	    	
                    // write aws response to $scope.res    
                    var keys=Object.keys(data.res);
                        for(var k=0;k<keys.length;k++) { 
                            var sub_port = keys[k];
                            if (sub_port === 'TOTAL') sub_port='_TOTAL_'; //avoid conflict with TOTAL column
                            if (!$scope.res) $scope.res=new Array(data.res[sub_port].length);
				            for (var j=0;j<data.res[sub_port].length; j++){                          
                                if(undefined===$scope.res[j]) $scope.res[j]={};                              
                                $scope.res[j][sub_port]=($scope.res[j][sub_port] || 0)+data.res[sub_port][j];
                                if(undefined===$scope.res[j]["TOTAL"]) $scope.res[j]["TOTAL"]=0;
                                $scope.res[j]["TOTAL"]=$scope.res[j]["TOTAL"]+data.res[sub_port][j];
                        };   	                       
                    } 

		            // aggregate times (only for analysis)
		            aws_analysis.times['calc']=aws_analysis.times['calc']+data.times['calc'];
                    aws_analysis.times['exec']=aws_analysis.times['exec']+data.times['exec'];

	
                    // warnings and errors
                    for (n=0;n<data.warnings.length;n++) $scope.add_warning(data.warnings[n]);
                    for (n=0;n<data.errors.length;n++) $scope.add_error(data.errors[n]);          
                    

                    // progress informations
                    t1 = new Date().getTime();
		    $scope.calctime=(t1 - t0)/1000;
                    $scope.remaining=remaining;
                    if (t1_last===0) t1_last=t1;
                    if( t1-t1_last > 5000 && t1_last>0){
                        $scope.$apply();
                        t1_last=t1;
                    }
                }

	            if(0===remaining){
	                //program ends here
                    console.log('aws-times: ');
                    console.log(aws_analysis.times);  
	            t1 = new Date().getTime();
                    $scope.calctime=(t1 - t0)/1000;            
                    $scope.busy=false;  
                    $scope.$apply();
                }else if(portfolio_in.length){
	            	    new_request_lambda();
	            }
            };

            var new_request_lambda=function(){ 
                j=config.chunk_size;
                var instrument;
                let chunk=[];
                while(portfolio_in.length && j>0){
                	instrument=portfolio_in.shift();
                	chunk.push(instrument);          
                	if(instrument.type==="callable_bond"){
                		j-=25;
                	}else{
                		j--;
                	}
                }
                new_request_with_chunk_lambda(chunk,0);            
            };


            var new_request_with_chunk_lambda=function(chunk, num_retries){
                running++;
	            console.log(`INFO: Request  with ${chunk.length} instruments sent, ${portfolio_in.length} instruments remaining to send, ${remaining} instruments remaining to receive, ${running} requests currently running`);
	
                var data='';
                var xmlhttp_aws = new XMLHttpRequest();
                xmlhttp_aws.open($scope.options_aws.method, $scope.options_aws.hostname + $scope.options_aws.path);
                for (m=0;m<options_aws_header.reqheader_count;m++) xmlhttp_aws.setRequestHeader(options_aws_header.reqheader[m][0], options_aws_header.reqheader[m][1]); //Header setzen

                xmlhttp_aws.addEventListener('load', function(evt){
                    if(xmlhttp_aws.status===200){
                        handle_response_lambda(this.responseText, chunk);                                           
                    };
                });
                xmlhttp_aws.onerror = function() {
                    running--;
            		if(num_retries<config.max_retries){
            		    new_request_with_chunk_lambda(chunk, num_retries+1);
            		}else{
            		    $scope.add_error({ msg: `ERROR: Problem with request: ${e.message} , max retries reached.`, id: chunk[0].id || "", count: chunk.length});
            		    remaining-=chunk.length;
            		}
                };

                xmlhttp_aws.send(pako.gzip(JSON.stringify({paramsurl: {url: paramsurl},portfolio: chunk}, {level:9})));  // Senden des Requests
           }


            // main program
            const t0 = new Date().getTime();
            $scope.add_warning({msg:"INFO: Start: " + new Date(new Date().toUTCString())});
            
            var t1, t1_last=0,i,j;
            var aws_analysis={ // only for analysis
	            times:{'calc':0.00000,'exec':0.00000}
            };

            var portfolio_in=$scope.portfolio.slice(); 
            var end = 0;
            var tmp=[];
            for (j=0;j<portfolio_in.length;j++){
	            if (portfolio_in[j].type==='callable_bond') tmp.push(portfolio_in[j]);
            }

            for (j=0;j<portfolio_in.length;j++){
	            if (portfolio_in[j].type!=='callable_bond') tmp.push(portfolio_in[j]);
            }
            var remaining=portfolio_in.length;
            var running=0;
            var paramsurl;            

            $scope.remaining=remaining;
            $scope.calctime=0;


                var xmlhttp_aws_test = new XMLHttpRequest(); //sending a OPTIONS requests to aws to see if settings are correct
                xmlhttp_aws_test.open($scope.options_aws.method_test, $scope.options_aws.hostname + $scope.options_aws.path);
                for (m=0;m<options_aws_header.reqheader_count;m++) xmlhttp_aws_test.setRequestHeader(options_aws_header.reqheader[m][0], options_aws_header.reqheader[m][1]); //Header setzen

                xmlhttp_aws_test.addEventListener('load', function(evt){
                    if(xmlhttp_aws_test.status===200){

                        var xmlhttp_params=new XMLHttpRequest();
                        var form_params = new FormData();
                        var params_blob=new Blob([JSON.stringify($scope.params)], {type : 'application/json'}) ;
                        form_params.append("file",params_blob);
                        form_params.append("temp","true");

                        xmlhttp_params.addEventListener('load', function(evt){
                            if(xmlhttp_params.status===200){  //response status 200
                                var data=JSON.parse(xmlhttp_params.responseText);
                                if (data.path){
                                    paramsurl='https://' + options_jrparams.hostname + options_jrparams.path + data.path;
                                    console.log("INFO: params made available under " + paramsurl);
                                    while (portfolio_in.length>0 && (running<2*config.max_requests)){                        
                                        new_request_lambda();
                                    };
                                    
                                }else{ // error handling analog cmdline_lambda
                                    console.error("ERROR: Could not upload params, jrparams returns: " +data.message);
			                        process.exit(1);
                                }
                            }else if(xmlhttp_params.status===400){
                                    console.log("Error: an error occurred, but the error message could not be retrieved.");
                            }else{
                                    console.log("Error: an unexpected error ocurred.");
                            }
                        });
                        xmlhttp_params.addEventListener('error', function(evt){
                                console.log("Error: could not send data to server.");

                        });
                        xmlhttp_params.open(options_jrparams.method, 'https://' + options_jrparams.hostname + options_jrparams.path);
                        xmlhttp_params.send(form_params);                                        
                                };

                                if(xmlhttp_aws_test.status===403){ //response status 403 (invalid apikey)
                                    if (JSON.parse(this.responseText).type ==='invalid apikey') {
                                        $scope.add_error({ msg: "Please use a valid apikey.", id: "", count: 1});
                                        $scope.$apply();
                                    };
                                };
                            });
                xmlhttp_aws_test.send(); 

//




          

        }



    /* II. general functions */
	$scope.import_file=function(kind, url){
		if (url) return import_data(url, kind, $scope);
		var f = document.createElement('input');
		f.setAttribute('type', 'file');
		f.addEventListener('change', function(evt){import_data(evt.target.files[0], kind, $scope);}, false);
		f.click();
		return 0;
	}



     
}]);

