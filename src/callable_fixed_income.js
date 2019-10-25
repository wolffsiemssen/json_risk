
(function(library){

       library.callable_fixed_income=function(instrument){
       		/*
		
		callable fixed income consists of
		  -- an internal simple_fixed_income base instrument
		  -- a call schedule
		  -- a calibration basket of internal swaptions
		  

		*/
		
		//only fixed rate instruments 
		if(typeof instrument.fixed_rate !== 'number') throw new Error("callable_fixed_income: must provide valid fixed_rate.");
		
		var fcd=library.get_safe_date(instrument.first_call_date);
		if (null===fcd) throw new Error("callable_fixed_income: must provide first call date");
	        this.base=new library.simple_fixed_income(instrument);
		this.call_schedule=library.schedule(fcd, 
						     library.get_safe_date(instrument.maturity), 
						     instrument.call_tenor || 0, //european call by default
						     this.base.adj);
		this.call_schedule.pop(); //pop removes maturity from call schedule as maturity is not really a call date
		var i;

		//basket generation
		this.basket=new Array(this.call_schedule.length);
		for (i=0; i<this.call_schedule.length; i++){
			//basket instruments are co-terminal swaptions with standard conditions
			this.basket[i]=new library.swaption({
		                is_payer: false,
		                maturity: instrument.maturity,
		                expiry: this.call_schedule[i],
		                notional: instrument.notional,
		                fixed_rate: instrument.fixed_rate,
		                tenor: 12,
		                float_spread: 0.00,
		                float_tenor: 6,
		                float_current_rate: 0.00,
		                calendar: "TARGET",
		                bdc: "u",
		                float_bdc: "u",
		                dcc: "act/365",
		                float_dcc: "act/365"
		        });
		}
        };
        
        library.callable_fixed_income.prototype.present_value=function(disc_curve, spread_curve, fwd_curve, surface){
                var res=0;
                var i;
		//eliminate past call dates and derive time to exercise
		library.require_vd(); //valuation date must be set
		var t_exercise=[], tte;
		for (i=0; i<this.call_schedule.length; i++){
			tte=library.time_from_now(this.call_schedule[i]);
			if(tte>1/512) t_exercise.push(tte);  //non-expired call date
		}
				
		//calibrate lgm model - returns xi for non-expired swaptions only
		if(typeof surface!=='object' || surface===null) throw new Error("callable_fixed_income.present_value: must provide valid surface");
		var xi_vec=library.lgm_calibrate(this.basket, disc_curve, fwd_curve, surface);

		//derive call option price
		if (1===xi_vec.length){
			//european call, use closed formula
			res=-library.lgm_european_call_on_cf(this.base.get_cash_flows(),
							     t_exercise[0],
							     disc_curve,
							     xi_vec[0],
							     spread_curve,
							     null);
		}else if (1<xi_vec.length){
			//bermudan call, use numeric integration

			res=-library.lgm_bermudan_call_on_cf(this.base.get_cash_flows(),
								t_exercise,
								disc_curve,
								xi_vec,
								spread_curve,
								null);
		} //if xi_vec.length===0 all calls are expired, no value subtracted
		
		//add bond base price
		res+=this.base.present_value(disc_curve, spread_curve, null);
                return res;
        };
         
        
        library.pricer_callable_bond=function(bond, disc_curve, spread_curve, fwd_curve, surface){
                var cb_internal=new library.callable_fixed_income(bond);
                return cb_internal.present_value(disc_curve, spread_curve, fwd_curve, surface);
        };
        

}(this.JsonRisk || module.exports));
