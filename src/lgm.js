(function(library){

        /*
        
                JsonRisk LGM (a.k.a. Hull-White) model
                Reference: Hagan, Patrick. (2019). EVALUATING AND HEDGING EXOTIC SWAP INSTRUMENTS VIA LGM.
                
        */

	function h_factory(mean_rev){
		if (mean_rev===0) return function(t){return t;};
		return function(t){return (1-Math.exp(-mean_rev*t))/mean_rev;};		
	}

	function h(t){ return t;}

	library.lgm_dcf=function(cf_obj,t_exercise, curve, xi, state, spread_curve, residual_spread){
                /*

		Calculates the discounted cash flow present value for a given vector of states (reduced value according to formula 4.14b)

                requires cf_obj of type
                {
                        current_principal: array(double),
                        t_pmt: array(double),
                        pmt_total: array(double)
                }

		state must be an array of numbers
		
                */
		if(!Array.isArray(state)) throw new Error("lgm_dcf: state variable must be an array of numbers");                
		
                var i=0, j, df, dh;
		var res=new Array(state.length);
                while(cf_obj.t_pmt[i]<=t_exercise) i++; // move forward to first line after exercise date
		// include principal payment on or before exercise date
		df=library.get_df(curve, t_exercise);
		if(spread_curve) df*=library.get_df(spread_curve, t_exercise);
		if(residual_spread) df*=Math.pow(1+residual_spread, -t_exercise);
		for (j=0; j<state.length; j++){
			res[j] = - cf_obj.current_principal[i] * df;
		}

                while (i<cf_obj.t_pmt.length){
                        // include all payments after exercise date
			df=library.get_df(curve, cf_obj.t_pmt[i]);
			if(spread_curve) df*=library.get_df(spread_curve, cf_obj.t_pmt[i]);
			if(residual_spread) df*=Math.pow(1+residual_spread, -cf_obj.t_pmt[i]);
			dh=h(cf_obj.t_pmt[i])-h(0);
			for (j=0; j<state.length; j++){
        	                res[j]+=cf_obj.pmt_total[i] * df * Math.exp(-dh*state[j]-dh*dh*xi*0.5);
			}
                        i++;
                }
                return res;
	};

	library.lgm_european_call_on_cf=function(cf_obj,t_exercise, curve, xi){
                /*

		Calculates the european call option price on a cash flow (closed formula 5.7b).

                requires cf_obj of type
                {
                        current_principal: array(double),
                        t_pmt: array(double),
                        pmt_total: array(double)
                }

		state must be an array of numbers
		
                */
		if(t_exercise<1/512 || xi<0.000000064*t_exercise) return library.lgm_dcf(cf_obj,t_exercise, curve, 0, [0])[0];
		function func(x){
			return library.lgm_dcf(cf_obj,t_exercise, curve, xi, [x])[0];
		}
		var std_dev=Math.sqrt(xi);
		var one_std_dev=1/std_dev;
		var break_even=library.find_root_secant(func,-std_dev,std_dev);
		
                var i=0, df, dh;
		
                while(cf_obj.t_pmt[i]<=t_exercise) i++; // move forward to first line after exercise date
		// include principal payment on or before exercise date
		df=library.get_df(curve, t_exercise);
		var res = - cf_obj.current_principal[i] * df * library.cndf(break_even*one_std_dev);
		
                while (i<cf_obj.t_pmt.length){
                        // include all payments after exercise date
			df=library.get_df(curve, cf_obj.t_pmt[i]);
			dh=h(cf_obj.t_pmt[i])-h(0);
	                res+=cf_obj.pmt_total[i] * df * library.cndf((break_even+dh*xi)*one_std_dev);
                        i++;
                }
                return res;
	};

	var STD_DEV_RANGE=4;
	var RESOLUTION=20;

	library.lgm_european_call_on_cf_numeric=function(cf_obj,t_exercise, curve, xi){
                /*

		Calculates the european call option price on a cash flow (numeric integration according to martingale formula 4.14a).

                requires cf_obj of type
                {
                        current_principal: array(double),
                        t_pmt: array(double),
                        pmt_total: array(double)
                }

		state must be an array of numbers
		
                */
		if(t_exercise<1/512 || xi<0.000000064*t_exercise) return library.lgm_dcf(cf_obj,t_exercise, curve, 0, [0])[0];

		var std_dev=Math.sqrt(xi);
		var ds=std_dev/RESOLUTION;
		var n=2*STD_DEV_RANGE*RESOLUTION+1, i;
		var state=new Array(n);
		state[0]=-STD_DEV_RANGE*std_dev;
		for (i=1; i<n; i++){
			state[i]=state[0]+i*ds;
		}
		var payoff=library.lgm_dcf(cf_obj,t_exercise, curve, xi, state);
		
                var res=0;
		for (i=0; i<n; i++){
			if(payoff[i]>0){
				res+=payoff[i]*Math.exp(-0.5*state[i]*state[i]/xi);
			}
		}
		res*=ds;
		res/=Math.sqrt(2*Math.PI*xi);
		return res;
	};
        
}(this.JsonRisk || module.exports));


