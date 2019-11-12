var app = angular.module('riskapp', []); 


app.controller('main_ctrl', ['$scope', function($scope) {

	$scope.instrument={
		maturity: "2029-01-22",
		effective_date: "2019-01-22",
		notional: 100,
		rate_type: "fix",
		rate: 0.0875,
		get fixed_rate() { return (this.rate_type==='fix') ? this.rate : null;},
		current_rate: 0.0123,
		float_spread: 0,
		dcc: "Act/365",
		bdc: "unadjusted",
		calendar: "TARGET",
		tenor_string: "12",
		get tenor() { return parseInt(this.tenor_string);},
		repay_tenor_string: "12",
		get repay_tenor() { return parseInt(this.repay_tenor_string);},
		interest_capitalization_string: "No",
		get interest_capitalization() { return this.interest_capitalization_string==='Yes';},
		discount_curve: "EUR_OIS_DISCOUNT",
		forward_curve: "EUR_6M_FWD"
	}
	$scope.params={valuation_date: "2019-01-01"};
	$scope.available_params=null;
	$scope.selected_params=null;
	$scope.cashflows=null;
	$scope.res={};
	$scope.errors=[];

	
	function update(){
		JsonRisk.valuation_date=JsonRisk.get_safe_date($scope.params.valuation_date);
		$scope.errors=[];

		//curves
		var dc=null;
		var fc=null;
		if (!$scope.params.curves){
			$scope.errors.push("no curves available, must load valid parameter set");
			return ;
		}

		dc=$scope.params.curves[$scope.instrument.discount_curve] || null;
		fc=$scope.params.curves[$scope.instrument.forward_curve] || null;
		if (!dc){
			$scope.errors.push("discount curve not available, must load valid parameter set");
			return ;
		}

		if (!fc){
			$scope.errors.push("forward curve not available, must load valid parameter set");
			return ;
		}

		//chart
		update_chart_curves(dc, fc);

		//cashflows
		$scope.cashflows=null;
		$scope.res={};

		var jrinst;
		try{
			jrinst=new JsonRisk.irregular_fixed_income($scope.instrument)
			$scope.cashflows = jrinst.get_cash_flows(fc);
			update_chart_cashflows($scope.cashflows);

			$scope.res.ttm=JsonRisk.time_from_now($scope.cashflows.date_pmt[$scope.cashflows.date_pmt.length-1]);
		}catch(ex){
			$scope.errors.push(ex.message);
			return;
		}


		//analytics

		try{
			$scope.res.pv=jrinst.present_value(dc, null, fc);

			var dc_up=JsonRisk.add_curves(dc, {times: [1], zcs: [0.00005]});
			var dc_down=JsonRisk.add_curves(dc, {times: [1], zcs: [-0.00005]});
			var fc_up=JsonRisk.add_curves(fc, {times: [1], zcs: [0.00005]});
			var fc_down=JsonRisk.add_curves(fc, {times: [1], zcs: [-0.00005]});
			
			$scope.res.bpv_ir=jrinst.present_value(dc_up, null, fc_up)-jrinst.present_value(dc_down, null, fc_down);
			$scope.res.bpv_spr=jrinst.present_value(dc_up, null, fc)-jrinst.present_value(dc_down, null, fc);

			$scope.res.dur_ir=$scope.res.bpv_ir/$scope.res.pv*10000;
			$scope.res.dur_spr=$scope.res.bpv_spr/$scope.res.pv*10000;

		}catch(ex){
			$scope.errors.push(ex.message);
			return;
		}

		//bcbs 368 scenarios
		var bcbs368times=[0.0028,0.0417,0.1667,0.375,0.625,0.875,1.25,1.75,2.5,3.5,4.5,5.5,6.5,7.5,8.5,9.5,12.5,17.5,25];
		
		var curve_up={times:bcbs368times,zcs:[]};
		var curve_down={times:bcbs368times,zcs:[]};
		var curve_steepener={times:bcbs368times,zcs:[]};
		var curve_flattener={times:bcbs368times,zcs:[]};
		var curve_shortup={times:bcbs368times,zcs:[]};
		var curve_shortdown={times:bcbs368times,zcs:[]};
		
		var slong,sshort;
		for (var i=0;i<bcbs368times.length;i++){
		        curve_up.zcs.push(0.02);
		        curve_down.zcs.push(-0.02);
		        sshort=Math.exp(-bcbs368times[i]/4);
		        slong=1-sshort;
		        curve_shortup.zcs.push(0.025*sshort);
		        curve_shortdown.zcs.push(-0.025*sshort);
		        curve_steepener.zcs.push(-0.65*0.025*sshort+0.9*0.01*slong);
		        curve_flattener.zcs.push(0.8*0.025*sshort-0.6*0.01*slong);
		}

		try{
			var dc_up=JsonRisk.add_curves(dc, curve_up);
			var dc_down=JsonRisk.add_curves(dc, curve_down);
			var dc_shortup=JsonRisk.add_curves(dc, curve_shortup);
			var dc_shortdown=JsonRisk.add_curves(dc, curve_shortdown);
			var dc_steepener=JsonRisk.add_curves(dc, curve_steepener);
			var dc_flattener=JsonRisk.add_curves(dc, curve_flattener);
		
			var fc_up=JsonRisk.add_curves(fc, curve_up);
			var fc_down=JsonRisk.add_curves(fc, curve_down);
			var fc_shortup=JsonRisk.add_curves(fc, curve_shortup);
			var fc_shortdown=JsonRisk.add_curves(fc, curve_shortdown);
			var fc_steepener=JsonRisk.add_curves(fc, curve_steepener);
			var fc_flattener=JsonRisk.add_curves(fc, curve_flattener);

			$scope.res.pv_up=jrinst.present_value(dc_up, null, fc_up);
			$scope.res.pv_down=jrinst.present_value(dc_down, null, fc_down);
			$scope.res.pv_shortup=jrinst.present_value(dc_shortup, null, fc_shortup);
			$scope.res.pv_shortdown=jrinst.present_value(dc_shortdown, null, fc_shortdown);
			$scope.res.pv_steepener=jrinst.present_value(dc_steepener, null, fc_steepener);
			$scope.res.pv_flattener=jrinst.present_value(dc_flattener, null, fc_flattener);
	
			update_chart_scenarios($scope.res);
		}catch(ex){
			$scope.errors.push(ex.message);
			return;
		}

	}

	$scope.$watch('instrument', update, true);
	$scope.$watch('params', update, false);
	$scope.$watch('params.valuation_date', update, false);

	$scope.update_params_list=function(){
		load_params_list($scope);
	}

	$scope.load_params=function(){
		load_params_from_server($scope);
	}

	$scope.load_test_params=function(){
		$scope.params=JSON.parse(JSON.stringify(test_params));
	}

	$scope.delete_params=function(){
		$scope.params={valuation_date: $scope.params.valuation_date};
	}


	$scope.import_file=function(kind, url){
		if (url) return import_data(url, kind, $scope);
		var f = document.createElement('input');
		f.setAttribute('type', 'file');
		f.addEventListener('change', function(evt){import_data(evt.target.files[0], kind, $scope);}, false);
		f.click();
		return 0;
	}

	//watch selected_params only once
	var unwatch_selected_params=$scope.$watch('selected_params', function(){
		if (!$scope.selected_params) return 0;
		$scope.load_params();
		unwatch_selected_params();
	});

	$scope.update_params_list();
}]);

