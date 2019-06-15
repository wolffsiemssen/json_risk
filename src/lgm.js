(function(library){

        /*
        
                JsonRisk LGM (a.k.a. Hull-White) model
                Reference: Hagan, Patrick. (2019). EVALUATING AND HEDGING EXOTIC SWAP INSTRUMENTS VIA LGM.
                
        */

	'use strict';

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
		if(t_exercise<1/512 || xi<1e-15) return Math.max(0,library.lgm_dcf(cf_obj,t_exercise, disc_curve, 0, [0], spread_curve, residual_spread)[0]);
		function func(x){
			return library.lgm_dcf(cf_obj,t_exercise, disc_curve, xi, [x], spread_curve, residual_spread)[0];
		}
		var std_dev=Math.sqrt(xi);
		var one_std_dev=1/std_dev;
	
		//find break even point and good initial guess for it
		var t_maturity=cf_obj.t_pmt[cf_obj.t_pmt.length-1];
		var break_even, dh, guess, lower, upper;
		dh=h(cf_obj.t_pmt[cf_obj.t_pmt.length-1])-h(t_exercise);
		guess=-0.5*xi*dh;
		guess-=Math.log(library.get_df(disc_curve,t_exercise))/dh;
		guess+=Math.log(library.get_df(disc_curve,t_maturity))/dh;
		if(spread_curve){
			guess-=Math.log(library.get_df(spread_curve,t_exercise))/dh;
			guess+=Math.log(library.get_df(spread_curve,t_maturity))/dh;
		}
		if(residual_spread){
			guess+=t_exercise*residual_spread;
			guess-=t_maturity*residual_spread;
		}
		if (guess>-1E-10) guess=-std_dev; //do not want very small or positive guess
		if(func(guess)>0){
			upper=guess;
			lower=0.9*guess;
			while(func(lower)>0) lower=upper-2*lower;
		}else{
			lower=guess;
			upper=2*guess;
			while(func(lower)<0) upper=2*upper;
		}
		break_even=library.find_root_ridders(func, upper, lower, 100);
		//console.log("BREAK EVEN:" + break_even);
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
		if(spread_curve) df*=library.get_df(spread_curve, t_exercise);
		if(residual_spread) df*=Math.pow(1+residual_spread, -t_exercise);
		var res = - (cf_obj.current_principal[i]+accrued_interest) * df * library.cndf(break_even*one_std_dev);

		// include all payments after exercise date
                while (i<cf_obj.t_pmt.length){
			df=library.get_df(disc_curve, cf_obj.t_pmt[i]);
			if(spread_curve) df*=library.get_df(spread_curve, cf_obj.t_pmt[i]);
			if(residual_spread) df*=Math.pow(1+residual_spread, -cf_obj.t_pmt[i]);
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
					root=library.find_root_secant(func, Math.sqrt(xi), Math.sqrt(xi*0.9), 100);
					//throws error if secant method fails
					xi = root*root; //if secant method was successful
				}catch(e){
					
				}

				if(xi_vec.length>0 && xi_vec[xi_vec.length-1]>xi) xi=xi_vec[xi_vec.length-1]; //fallback if monotonicity is violated
				xi_vec.push(xi);
			}
		}
		return xi_vec;
	};


	var STD_DEV_RANGE=4;
	var RESOLUTION=15;

	library.lgm_bermudan_call_on_cf=function(cf_obj,t_exercise_vec, disc_curve, xi_vec, spread_curve, residual_spread){
                /*

		Calculates the bermudan call option price on a cash flow (numeric integration according to martingale formula 4.14a).

                requires cf_obj of type
                {
                        current_principal: array(double),
                        t_pmt: array(double),
                        pmt_total: array(double)
                }

		state must be an array of numbers
		
                */

		if(t_exercise_vec[t_exercise_vec.length-1]<0) return 0; //expired option		
		if(t_exercise_vec[t_exercise_vec.length-1]<1/512 || xi_vec[xi_vec.length-1]<1e-15){
			return Math.max(0,library.lgm_dcf(cf_obj,
							t_exercise_vec[t_exercise_vec.length-1],
							disc_curve,
							0,
							[0],
							spread_curve,
							residual_spread)[0]); //expiring option
		}


		function make_state_vector(){ //repopulates state vector and ds measure
			var res=new Array(n);			
			res[0]=-STD_DEV_RANGE*std_dev;
			for (i=1; i<n; i++){
				res[i]=res[0]+i*ds;
			}
			return res;
		}

		function update_value(){ //take maximum of payoff and hold values
			var i_d=0;
			for (i=0; i<n; i++){
				value[i]=Math.max(hold[i], payoff[i]);
				if(!i_d && i>0){
					if((payoff[i]-hold[i])*(payoff[i-1]-hold[i-1])<0){
						i_d=i; //discontinuity where payoff-hold changes sign
					}
				}
			}
			//account for discontinuity if any
			if(i_d){
				var max_0=value[i_d-1], max_1=value[i_d];
				var min_0=Math.min(payoff[i_d-1],hold[i_d-1]),min_1=Math.min(payoff[i_d],hold[i_d]);
				var cross=(max_0-min_0)/(max_1-min_1+max_0-min_0);
				var err=0.25*(cross*(max_1-min_1)+(1-cross)*(max_0-min_0));
				value[i_d]-=cross*err;
				value[i_d-1]-=(1-cross)*err;
			}
		}

		function numeric_integration(j){ //simple implementation of lgm martingale formula
			if(xi_last-xi<1E-15) return value[j];
		        var temp=0, dp_lo=0, dp_hi, norm_scale=1/Math.sqrt(xi_last-xi);
			for (i=0; i<n; i++){
				dp_hi= (i===n-1) ? 1 : library.cndf((state_last[i]-state[j]+0.5*ds)*norm_scale);	
				temp+=value[i]*(dp_hi-dp_lo);
				dp_lo=dp_hi; // for next iteration
			}
			return temp;
		}


		var n=2*STD_DEV_RANGE*RESOLUTION+1;
		var j, i, n_ex;
		var xi, xi_last=0, std_dev, ds, ds_last;
		var state, state_last;
		var payoff;
		var value=new Array(n);
		var hold=new Array(n);
	


		//n_ex starts at last exercise date
		n_ex=xi_vec.length-1;		

		//iterate backwards through call dates if at least one call date is left	
		while (n_ex >= 0){
			//set volatility and state parameters
			xi=xi_vec[n_ex];
			std_dev=Math.sqrt(xi);
			ds=std_dev/RESOLUTION;
			state=make_state_vector();

			//payoff is what option holder obtains when exercising
			payoff=library.lgm_dcf(cf_obj,
						   t_exercise_vec[n_ex],
	 					   disc_curve,
						   xi,
						   state,
						   spread_curve,
						   residual_spread);
			
			//hold is what option holder obtains when not exercising
			if(n_ex<xi_vec.length-1){
				for (j=0; j<n; j++){
					hold[j]=numeric_integration(j); //hold value is determined by martingale formula
				}
			}else{
				for (j=0; j<n; j++){
					hold[j]=0; //on last exercise date, hold value is zero (no more option left to hold).
				}
			}
			
			//value is maximum of payoff and hold
			update_value();

			//prepare next iteration
			xi_last=xi;
			state_last=state;
			ds_last=ds;
			n_ex--;			
		}

		//last integration for time zero, state zero
		state=[0];

		xi=0;
		hold=numeric_integration(0); //last integration according to martingale formula
		return hold;
	};
        
}(this.JsonRisk || module.exports));



