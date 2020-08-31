var app = angular.module('riskapp', []); 


app.controller('main_ctrl', ['$scope', function($scope) {

	$scope.instrument={
		maturity: "2029-01-22",
		effective_date: "2017-01-22",
		notional: 10000,
		rate_type: "fix",
		rate: 0.0275,
		get fixed_rate() { return (this.rate_type==='fix') ? this.rate : null;},
		float_current_rate: 0,
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

    call_tenor_string: "-1",
		get call_tenor() { return parseInt(this.call_tenor_string);},

    get type() { return (this.call_tenor<0) ? "bond" : "callable_bond" ;},

    opportunity_spread_string: "0.0",
    get opportunity_spread() { return parseFloat(this.opportunity_spread_string) || 0.0;},

		discount_curve: "EUR_OIS_DISCOUNT",
		forward_curve: "EUR_6M_FWD",
    surface: "CONST_10BP"
	}
	$scope.params={valuation_date: "2019-01-01"};
	$scope.available_params={list: null, selection: null};
	$scope.cashflows=null;
	$scope.res={};
	$scope.errors=[];
  
	
	function update(){
		JsonRisk.valuation_date=JsonRisk.get_safe_date($scope.params.valuation_date);
		$scope.errors=[];
    $scope.json=JSON.stringify($scope.instrument,null,'  ');

		//curves
		var dc=null; //discount
		var fc=null; //forward
		var sc=null; //valuation spread
		var rc=null; //refinancing spread
		if (!$scope.params.curves){
			$scope.errors.push("no curves available, must load valid parameter set");
			return ;
		}

		dc=$scope.params.curves[$scope.instrument.discount_curve] || null;
		fc=$scope.params.curves[$scope.instrument.forward_curve] || null;
		sc=$scope.params.curves[$scope.instrument.spread_curve] || null;
		rc=$scope.params.curves[$scope.instrument.refinancing_spread_curve] || null;
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
      if($scope.instrument.type==='bond'){
  			jrinst=new JsonRisk.fixed_income($scope.instrument);
        base=jrinst;
        su=null;
      }else{
        jrinst=new JsonRisk.callable_fixed_income($scope.instrument);
        base=jrinst.base;
        su=$scope.params.surfaces[$scope.instrument.surface] || null;
        if (!su){
    			$scope.errors.push("volatility surface not available, must load valid parameter set");
		    	return ;
		    }
      }
      $scope.cashflows = base.get_cash_flows(fc);
			update_chart_cashflows($scope.cashflows);

			$scope.res.ttm=JsonRisk.time_from_now($scope.cashflows.date_pmt[$scope.cashflows.date_pmt.length-1]);
		}catch(ex){
			$scope.errors.push(ex.message);
			return;
		}


		//analytics

		try{
			$scope.res.pv=jrinst.present_value(dc, sc, fc, su);
      $scope.res.pv_opt=$scope.res.pv-base.present_value(dc,sc,fc);

			var dc_up=JsonRisk.add_curves(dc, {times: [1], zcs: [0.00005]});
			var dc_down=JsonRisk.add_curves(dc, {times: [1], zcs: [-0.00005]});
			var fc_up=JsonRisk.add_curves(fc, {times: [1], zcs: [0.00005]});
			var fc_down=JsonRisk.add_curves(fc, {times: [1], zcs: [-0.00005]});
			
			$scope.res.bpv_ir=jrinst.present_value(dc_up, sc, fc_up, su)-jrinst.present_value(dc_down, sc, fc_down, su);
			$scope.res.bpv_spr=jrinst.present_value(dc_up, sc, fc, su)-jrinst.present_value(dc_down, sc, fc, su);
      $scope.res.bpv_ir_opt=$scope.res.bpv_ir-base.present_value(dc_up, sc, fc_up)+base.present_value(dc_down, sc, fc_down)
      $scope.res.bpv_spr_opt=$scope.res.bpv_spr-base.present_value(dc_up, sc, fc)+base.present_value(dc_down, sc, fc);

			$scope.res.dur_ir=-$scope.res.bpv_ir/$scope.res.pv*10000;
			$scope.res.dur_spr=-$scope.res.bpv_spr/$scope.res.pv*10000;

      //
			//FTP Analysis
      //

      
		  var overnight=new JsonRisk.fixed_income({
                  notional: 100,
                  effective_date: $scope.params.valuation_date,
                  maturity: JsonRisk.add_days(JsonRisk.get_safe_date($scope.params.valuation_date), 1),
                  tenor: 1,
                  fixed_rate: 0.0,
                  calendar: $scope.instrument.calendar,
                  bdc: "f",
                  dcc: $scope.instrument.dcc,
                  adjust_accrual_periods: true
              });
      var e1=overnight.fair_rate_or_spread(dc, null, null);
      
      var fixing=0;
      var fixing_overnight=0;

      if (base.is_float){
        fixing=base.float_current_rate || 0.0;
        fixing_overnight=e1;
      }     

      var e2=base.fair_rate_or_spread(dc, null, dc)+fixing_overnight;
      var e2b=base.fair_rate_or_spread(dc, null, fc)+fixing;
      var e3=base.fair_rate_or_spread(dc, rc, fc)+fixing;
      var e4=base.fair_rate_or_spread(dc, sc, fc)+fixing;

			$scope.res.eq_charge=e1;
			$scope.res.maturity_charge=e2-e1;
			$scope.res.basis_charge=e2b-e2;			
			$scope.res.liquidity_charge=e3-e2b;
			$scope.res.credit_charge=e4-e3;
			$scope.res.fair_rate=e4-fixing;

			
			//get current rate or spread dependent on condition change dates
			var current_rate_or_spread=($scope.instrument.rate_type==='fix') ? base.fixed_rate : base.float_spread;
			var i=0;			
			while (base.conditions_valid_until[i]<$scope.params.valuation_date) i++;
			$scope.res.margin=current_rate_or_spread[i]  - $scope.res.fair_rate;

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

			$scope.res.pv_up=jrinst.present_value(dc_up, sc, fc_up, su);
			$scope.res.pv_down=jrinst.present_value(dc_down, sc, fc_down, su);
			$scope.res.pv_shortup=jrinst.present_value(dc_shortup, sc, fc_shortup, su);
			$scope.res.pv_shortdown=jrinst.present_value(dc_shortdown, sc, fc_shortdown, su);
			$scope.res.pv_steepener=jrinst.present_value(dc_steepener, sc, fc_steepener, su);
			$scope.res.pv_flattener=jrinst.present_value(dc_flattener, sc, fc_flattener, su);
	
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

	$scope.export_curve=function(curve_name){
		export_curve_to_csv($scope.params.curves[curve_name],curve_name,curve_name+'.csv');
	}

	//watch selected_params only once
	var unwatch_selected_params=$scope.$watch('available_params.selection', function(){
		if (!$scope.available_params.selection) return 0;
		$scope.load_params();
		unwatch_selected_params();
	});

	$scope.update_params_list();
}]);

