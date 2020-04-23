var app = angular.module('riskapp', []); 


app.controller('main_ctrl', ['$scope', function($scope) {

	$scope.portfolio=JSON.parse(JSON.stringify(test_pf));
	$scope.available_params={list: null, selection: null}
	$scope.res=null;
	$scope.errors=null;
	$scope.warnings=null;

        $scope.filter={text: ""};
        $scope.editor={json: null,index: -1}

	wrk=[];
    
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
	
	$scope.update_params_list=function(){
		load_params_list($scope);
	}

	$scope.load_params=function(){
		load_params_from_server($scope);
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
		export_to_json_file($scope.params, "params.json");
	}

	$scope.export_portfolio=function(format){
		if(format==='json'){
			export_to_json_file($scope.portfolio, "portfolio.json");
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
			export_to_csv_file($scope.portfolio, "portfolio.csv", columns);
		}
	}

	$scope.export_results=function(){
		var columns=Object.keys($scope.res[0]);
		for (var i=0;i<columns.length;i++){
			if(columns[i]==='TOTAL') columns.splice(i,1)
		}
		columns.sort();
		columns.unshift('TOTAL');
		export_to_csv_file($scope.res, "results.csv", columns);
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

	$scope.import_file=function(kind, url){
		if (url) return import_data(url, kind, $scope);
		var f = document.createElement('input');
		f.setAttribute('type', 'file');
		f.addEventListener('change', function(evt){import_data(evt.target.files[0], kind, $scope);}, false);
		f.click();
		return 0;
	}

	$scope.clear_errors=function(){
		$scope.errors=null;
	}

	$scope.clear_warnings=function(){
		$scope.warnings=null;
	}

	$scope.add_error=function(message, id){
		if(!$scope.errors) $scope.errors=[];  //first error
		var j=0;
		while(j<$scope.errors.length){
			if ($scope.errors[j].msg === message){ //same error has already occured
				$scope.errors[j].count++;
				break;
			}
			j++;
		}
		if (j>=$scope.errors.length) $scope.errors.push({msg: message, id: id, count: 1}); //new error
//		$scope.$apply();
	}

	$scope.add_warning=function(message, id){
		if(!$scope.warnings) $scope.warnings=[];  //first warning
		var j=0;
		while(j<$scope.warnings.length){
			if ($scope.warnings[j].msg === message){ //same warning has already occured
				$scope.warnings[j].count++;
				break;
			}
			j++;
		}
		if (j>=$scope.warnings.length) $scope.warnings.push({msg: message, id: id, count: 1}); //new warning
//		$scope.$apply();
	}


        function repl(key,value){
	        if (key==='$$hashKey') return undefined; //exclude angluarJS internal variable
	        return value;
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


        function is_unique_id(str){
                for(j=0; j<$scope.portfolio.length;j++){
                        if($scope.portfolio[j].id===str) return false;
                }
                return true;
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

	$scope.calculate=function(){
		$scope.busy=true;
		$scope.conc=navigator.hardwareConcurrency;
		var t0 = new Date().getTime(), t1;
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
					$scope.add_warning(e.data.msg, e.data.id);
				}else{ //error
					$scope.add_error(e.data.msg || "unknown error", e.data.id || "unknown");
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
				if(incomplete % 100 === 0 || incomplete<100){ //every now and then, update display and stats
				        t1 = new Date().getTime();
				        $scope.calctime=(t1 - t0)/1000;
				        $scope.remaining=incomplete;
				        $scope.$apply();
				}
				if(unsent > 0){ // queue next instrument while not done
				        this.postMessage({instrument: $scope.portfolio[unsent-1]});
				        unsent--;
				}
			}

			//worker process error handling
			wrk[i].onerror=function(e){
				$scope.add_error("An error occurred in the worker process. " + (e.message || "") , 'unknown');
			}

			//send params to worker
			wrk[i].postMessage({params: $scope.params});
			
			//post initial instrument
			wrk[i].postMessage({instrument: $scope.portfolio[unsent-1]});
			unsent--;
		}
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
	
	$scope.update_params_list();
}]);

