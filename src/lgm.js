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

	library.lgm_dcf=function(cf_obj,t_exercise, disc_curve, xi, state, spread_curve, residual_spread){
                /*

		Calculates the discounted cash flow present value for a given vector of states (reduced value according to formula 4.14b)

                requires cf_obj of type
                {
                        current_principal: array(double),
                        t_pmt: array(double),
                        pmt_total: array(double),
			pmt_interest: array(double)
                }

		state must be an array of numbers
		
                */
		if(!Array.isArray(state)) throw new Error("lgm_dcf: state variable must be an array of numbers");                

                var i=0, j, df, dh;
		var res=new Array(state.length);
		// move forward to first line after exercise date
                while(cf_obj.t_pmt[i]<=t_exercise) i++;

		//include accrued interest if interest payment is part of the cash flow object
		var accrued_interest=0;		
		if (cf_obj.pmt_interest){
			accrued_interest=(i===0) ? 0 : cf_obj.pmt_interest[i]*(t_exercise-cf_obj.t_pmt[i-1])/(cf_obj.t_pmt[i]-cf_obj.t_pmt[i-1]);
		}
		// include principal payment on exercise date
		df=library.get_df(disc_curve, t_exercise);
		if(spread_curve) df*=library.get_df(spread_curve, t_exercise);
		if(residual_spread) df*=Math.pow(1+residual_spread, -t_exercise);
		for (j=0; j<state.length; j++){
			res[j] = - (cf_obj.current_principal[i]+accrued_interest) * df;
		}

                // include all payments after exercise date
                while (i<cf_obj.t_pmt.length){
			df=library.get_df(disc_curve, cf_obj.t_pmt[i]);
			if(spread_curve) df*=library.get_df(spread_curve, cf_obj.t_pmt[i]);
			if(residual_spread) df*=Math.pow(1+residual_spread, -cf_obj.t_pmt[i]);
			dh=h(cf_obj.t_pmt[i])-h(t_exercise);
			for (j=0; j<state.length; j++){
        	                res[j]+=(cf_obj.pmt_total[i]) * df * Math.exp(-dh*state[j]-dh*dh*xi*0.5);
			}
                        i++;
                }
                return res;
	};

	function log_trans(x){
		var y=Math.abs(x);
		y=Math.log(1+y);
		return (x>0) ? y : -y;
	}

	library.lgm_european_call_on_cf=function(cf_obj,t_exercise, disc_curve, xi, spread_curve, residual_spread){
                /*

		Calculates the european call option price on a cash flow (closed formula 5.7b).

                requires cf_obj of type
                {
                        current_principal: array(double),
                        t_pmt: array(double),
                        pmt_total: array(double)
			pmt_interest: array(double)
                }
		
                */
		if(t_exercise<0) return 0; //expired option		
		if(t_exercise<1/512 || xi<1e-15) return library.lgm_dcf(cf_obj,t_exercise, disc_curve, 0, [0], spread_curve, residual_spread)[0];
		function func(x){
			return library.lgm_dcf(cf_obj,t_exercise, disc_curve, xi, [x], spread_curve, residual_spread)[0];
		}
		var std_dev=Math.sqrt(xi);
		var one_std_dev=1/std_dev;
	
		//find break even point
		var break_even, dh, guess, lower, upper;
		dh=h(cf_obj.t_pmt[cf_obj.t_pmt.length-1])-h(t_exercise);
		guess=-0.5*xi*dh-Math.log(library.get_df(disc_curve,t_exercise))/dh+
			     Math.log(library.get_df(disc_curve,cf_obj.t_pmt[cf_obj.t_pmt.length-1]))/dh;
		if (Math.abs(guess)<1E-10) guess=-std_dev;
		if(func(guess)>0){
			upper=guess;
			lower=0.5*guess;
			while(func(lower)>0) lower=upper-2*lower;
		}else{
			lower=guess;
			upper=2*guess;
			while(func(lower)<0) upper=2*upper;
		}
		break_even=library.find_root_ridders(func, upper, lower, 100);
                var i=0, df;
		
		// move forward to first line after exercise date
                while(cf_obj.t_pmt[i]<=t_exercise) i++;

		//include accrued interest if interest payment is part of the cash flow object
		var accrued_interest=0;		
		if (cf_obj.pmt_interest){
			accrued_interest=(i===0) ? 0 : cf_obj.pmt_interest[i]*(t_exercise-cf_obj.t_pmt[i-1])/(cf_obj.t_pmt[i]-cf_obj.t_pmt[i-1]);
		}

		// include principal payment on or before exercise date
		df=library.get_df(disc_curve, t_exercise);
		var res = - (cf_obj.current_principal[i]+accrued_interest) * df * library.cndf(break_even*one_std_dev);

		// include all payments after exercise date
                while (i<cf_obj.t_pmt.length){
			df=library.get_df(disc_curve, cf_obj.t_pmt[i]);
			dh=h(cf_obj.t_pmt[i])-h(t_exercise);
	                res+=(cf_obj.pmt_total[i]) * df * library.cndf((break_even*one_std_dev)+(dh*std_dev));
                        i++;
                }
                return res;
	};

	library.lgm_european_swaption_adjusted_cashflow=function(swaption,disc_curve, fwd_curve, fair_rate){
		//correction for multi curve valuation - move basis spread to fixed leg
		var swap_rate_singlecurve=swaption.swap.fair_rate(disc_curve, disc_curve);
		var fixed_rate;
		if(fair_rate){
			fixed_rate=swap_rate_singlecurve;
		}else{
			var swap_rate_multicurve=swaption.swap.fair_rate(disc_curve, fwd_curve);		
			fixed_rate=swaption.swap.fixed_rate-swap_rate_multicurve+swap_rate_singlecurve;

		}
		//recalculate cash flow amounts to account for new fixed rate
		var cf_obj=swaption.swap.fixed_leg_1bp.get_cash_flows();		
		var pmt_total=new Array(cf_obj.pmt_total.length);
		var pmt_interest=new Array(cf_obj.pmt_interest.length);
		for (var i=0;i<cf_obj.pmt_total.length; i++){
			pmt_interest[i]=cf_obj.pmt_interest[i]*fixed_rate*10000;
			pmt_total[i]=pmt_interest[i];
		}
		//add notional payment in the end
		pmt_total[i-1]+=cf_obj.current_principal[i-1];

		return {
			current_principal: cf_obj.current_principal, // original principals
			t_pmt: cf_obj.t_pmt, 			     // original times
			date_pmt: cf_obj.date_pmt, 		     // original dates
			pmt_interest: pmt_interest,		     // adjusted interest payment
			pmt_total: pmt_total 			     // adjusted total payment
		};
	};

	library.lgm_european_swaption=function(swaption,t_exercise, disc_curve, xi, fwd_curve){
		//retrieve adjusted cash flows
		var cf_obj=library.lgm_european_swaption_adjusted_cashflow(swaption,disc_curve, fwd_curve);
		
		//now use lgm model on cash flows
		return library.lgm_european_call_on_cf(cf_obj,t_exercise, disc_curve, xi, null, null);
	};

	library.lgm_calibrate=function(basket, disc_curve, fwd_curve, surface){
		library.require_vd();
		var xi, xi_vec=[];
		var cf_obj, std_dev_bachelier, tte, ttm, deno, target, root, i, j, min_value, max_value;

		var func=function(rt_xi){
			var val=library.lgm_european_call_on_cf(cf_obj,tte, disc_curve, rt_xi*rt_xi, null, null);
			return val-target;
		};
		for (i=0; i<basket.length; i++){
			if (library.time_from_now(basket[i].expiry)>1/512){
				tte=library.time_from_now(basket[i].expiry);
				ttm=library.time_from_now(basket[i].maturity);
				//first step: derive initial guess based on Hagan formula 5.16c
				//get swap fixed cash flow adjusted for basis spread
				cf_obj=library.lgm_european_swaption_adjusted_cashflow(basket[i],disc_curve, fwd_curve, false);
				deno=0;
				for (j=0;j<cf_obj.t_pmt.length;j++){
					deno+=cf_obj.pmt_total[j]*
					      library.get_df(disc_curve, cf_obj.t_pmt[j])*
					      (h(cf_obj.t_pmt[j])-h(tte));
				}
				std_dev_bachelier=library.get_surface_rate(surface, tte, ttm-tte)*Math.sqrt(tte);
				xi=Math.pow(std_dev_bachelier*basket[i].swap.annuity(disc_curve)/deno,2);

				//second step: calibrate, but be careful with infeasible bachelier prices below min and max
				min_value=library.lgm_dcf(cf_obj, tte, disc_curve, 0, [0], null, null)[0];
				//max value is value of the payoff without redemption payment
				max_value=min_value+basket[i].swap.fixed_leg.notional*library.get_df(disc_curve, tte);
				//min value (attained at vola=0) is maximum of zero and current value of the payoff
				if(min_value<0) min_value=0;

				target=basket[i].present_value(disc_curve, fwd_curve, surface);
				if(target<min_value) target=min_value;
				if(target>max_value) target=max_value;

				try{
					root=library.find_root_secant(func, Math.sqrt(xi), Math.sqrt(xi*0.5), 100);
					//throws error if secant method fails
					xi = root*root; //if secant method was successful
				}catch(e){
					
				}

				if(xi_vec.length>0 && xi_vec[xi_vec.length-1]<xi) xi=xi_vec[xi_vec.length-1]; //fallback if monotonicity is violated
				xi_vec.push(xi);
			}
		}
		return xi_vec;
	};


	var STD_DEV_RANGE=4;
	var RESOLUTION=20;

	library.lgm_european_call_on_cf_numeric=function(cf_obj,t_exercise, disc_curve, xi, spread_curve, residual_spread){
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
		if(t_exercise<1/512 || xi<1e-15) return library.lgm_dcf(cf_obj,
  											 t_exercise,
											 disc_curve, 
											 0,
											 [0],
											 spread_curve,
											 residual_spread)[0];

		var std_dev=Math.sqrt(xi);
		var ds=std_dev/RESOLUTION;
		var n=2*STD_DEV_RANGE*RESOLUTION+1, i;
		var state=new Array(n);
		state[0]=-STD_DEV_RANGE*std_dev;
		for (i=1; i<n; i++){
			state[i]=state[0]+i*ds;
		}
		var payoff=library.lgm_dcf(cf_obj,
					   t_exercise,
 					   disc_curve,
					   xi,
					   state);
		
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


