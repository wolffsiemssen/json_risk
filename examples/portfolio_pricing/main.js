var app = angular.module('riskapp', []); 


app.controller('main_ctrl', ['$scope', function($scope) {

	$scope.portfolio=JSON.parse(JSON.stringify(test_pf));
	$scope.params=JSON.parse(JSON.stringify(test_params));
	$scope.available_params=null;
	$scope.selected_params=null;
	$scope.res=null;
	$scope.errors=null;
	wrk=[];
    
	$scope.load_test_pf=function(){
		$scope.portfolio=JSON.parse(JSON.stringify(test_pf));
		$scope.res=null;
		$scope.errors=null;
	}

	$scope.delete_pf=function(){
		$scope.portfolio=null;
		$scope.res=null;
		$scope.errors=null;
	}
	
	$scope.update_params_list=function(){
		load_params_list($scope);
		$scope.res=null;
		$scope.errors=null;
	}

	$scope.load_params=function(){
		load_params_from_server($scope);
		$scope.res=null;
		$scope.errors=null;
	}

	$scope.load_test_params=function(){
		$scope.params=JSON.parse(JSON.stringify(test_params));
		$scope.res=null;
		$scope.errors=null;
	}

	$scope.delete_params=function(){
		$scope.params={valuation_date: $scope.params.valuation_date};
		$scope.res=null;
		$scope.errors=null;
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
				"expiry",
				"current_accrued_interest",
				"first_call_date",
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
				}else{ //error
					if(!$scope.errors) $scope.errors=[];  //first error
					j=0;
					while(j<$scope.errors.length){
						if ($scope.errors[j].msg === e.data.msg){ //same error has already occured
							$scope.errors[j].count++;
							break;
						}
						j++;
					}
					if (j>=$scope.errors.length) $scope.errors.push({msg: e.data.msg, id: e.data.id, count: 1}); //new error
					
				}
				incomplete--;

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
	}

	$scope.update_params_list();
}]);

