/*!
	JSON Risk
	v0.0.0
	https://github.com/tilwolff/json_risk
	License: MIT
*/
(function(root, factory)
{
        if (typeof module === 'object' && typeof exports !== 'undefined')
	{
		// Node
		module.exports = factory();
	}
	else
	{
		// Browser
		root.JsonRisk = factory();
	}
}(this, function()
{


        var JsonRisk = {
                valuation_date: null
        };

        JsonRisk.require_vd=function(){
		if(!(JsonRisk.valuation_date instanceof Date)) throw new Error("JsonRisk: valuation_date must be set");
        };

        
        
        return JsonRisk;

}));
;
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
	        this.base=new library.fixed_income(instrument);
		this.call_schedule=library.schedule(fcd, 
						     library.get_safe_date(instrument.maturity), 
						     instrument.call_tenor || 0, //european call by default
						     this.base.adj);
		this.call_schedule.pop(); //pop removes maturity from call schedule as maturity is not really a call date
		this.opportunity_spread=(typeof instrument.opportunity_spread==='number' ) ? instrument.opportunity_spread : 0;

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
		                fixed_rate: instrument.fixed_rate-this.opportunity_spread,
		                tenor: instrument.tenor,
		                float_spread: 0.00,
		                float_tenor: 6,
		                float_current_rate: 0.00,
		                calendar: instrument.calendar,
		                bdc: instrument.bdc,
		                float_bdc: instrument.bdc,
		                dcc: instrument.dcc,
		                float_dcc: instrument.dcc
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

		if(typeof fwd_curve !== 'object' || fwd_curve===null) throw new Error("callable_fixed_income.present_value: must provide forward curve for calibration");
				
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
							     this.base.residual_spread,
							     this.opportunity_spread);
		}else if (1<xi_vec.length){
			//bermudan call, use numeric integration

			res=-library.lgm_bermudan_call_on_cf(this.base.get_cash_flows(),
								t_exercise,
								disc_curve,
								xi_vec,
								spread_curve,
								this.base.residual_spread,
								this.opportunity_spread);
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
;(function(library){        
        var default_yf=null;

        library.get_const_curve=function(value){
                if(typeof value !== 'number') throw new Error("get_const_curve: input must be number."); 
                if(value <= -1) throw new Error("get_const_curve: invalid input."); 
                return {
                                type: "yield", 
                                times: [1], 
                                dfs: [1/(1+value)] //zero rates are act/365 annual compounding
                       };
        };
        
        function get_time_at(curve, i){
                if (!curve.times){
                        //construct times from other parameters in order of preference
                        //curve times are always act/365
                        if (curve.days) return curve.days[i]/365;               
                        if (curve.dates){
                                default_yf=default_yf || library.year_fraction_factory("a/365");
                                return default_yf(library.get_safe_date(curve.dates[0]),library.get_safe_date(curve.dates[i]));
                        }
                        if (curve.labels) return library.period_str_to_time(curve.labels[i]);
                        throw new Error("get_time_at: invalid curve, cannot derive times");
                }
                return curve.times[i];
        }
        
        library.get_curve_times=function(curve){
                var i=(curve.times || curve.days || curve.dates || curve.labels || []).length;
                if (!i) throw new Error("get_curve_times: invalid curve, need to provide valid times, days, dates, or labels");
                var times=new Array(i);
                while (i>0){
                        i--;
                        times[i]=get_time_at(curve, i);
                }
                return times;
        };
        
        function get_df_at(curve, i){
                if (Array.isArray(curve.dfs)) return curve.dfs[i];
                if (Array.isArray(curve.zcs)) return Math.pow(1+curve.zcs[i],-get_time_at(curve,i));
                throw new Error("get_df: invalid curve, must provide dfs or zcs");
        }
        
        function get_curve_dfs(curve){
                var i=(curve.times || curve.days || curve.dates || curve.labels || []).length;
                if (!i) throw new Error("get_curve_dfs: invalid curve, need to provide valid times, days, dates, or labels");
                if(curve.dfs){
                        if (curve.dfs.length !== i) throw new Error("get_curve_dfs: invalid curve, dfs length must match times length");
                }else{
                        if (curve.zcs.length !== i) throw new Error("get_curve_dfs: invalid curve, zcs length must match times length");
                }
                var dfs=new Array(i);
                while (i>0){
                        i--;
                        dfs[i]=curve.dfs ? curve.dfs[i] :get_df_at(curve, i);
                        if (typeof dfs[i] != 'number') throw new Error("get_curve_dfs: invalid curve, must provide numeric zcs or dfs");
                }
                return dfs;
        }
        
        library.get_safe_curve=function(curve){
                //if valid curve is given, returns validated curve in most efficient form {type, times, dfs}, 
                //if null or other falsy argument is given, returns constant zero curve
                if (!curve) return library.get_const_curve(0.0);
                return {
                                type: "yield", 
                                times: library.get_curve_times(curve),
                                dfs: get_curve_dfs(curve)
                        };
        };

        
        library.get_df=function(curve,t,imin,imax){
                if (undefined===imin) imin=0;
                if (undefined===imax) imax=(curve.times || curve.days || curve.dates || curve.labels).length-1;
                
                //discount factor is one for infinitesimal time (less than a day makes no sense, anyway)
                if (t<1/512) return 1.0;
                //curve only has one support point
                if (imin===imax) return (t===get_time_at(curve,imin)) ? get_df_at(curve,imin) : Math.pow(get_df_at(curve,imin), t/get_time_at(curve,imin));
                //extrapolation (constant on zero coupon rates)
                if (t<get_time_at(curve,imin)) return Math.pow(get_df_at(curve,imin), t/get_time_at(curve,imin));
                if (t>get_time_at(curve,imax)) return Math.pow(get_df_at(curve,imax), t/get_time_at(curve,imax));
                //interpolation (linear on discount factors)
                if (imin+1===imax){
                        if(get_time_at(curve,imax)-get_time_at(curve,imin)<1/512) throw new Error("get_df_internal: invalid curve, support points must be increasing and differ at least one day");
                        return get_df_at(curve,imin)*(get_time_at(curve,imax)-t)/(get_time_at(curve,imax)-get_time_at(curve,imin))+
                               get_df_at(curve,imax)*(t-get_time_at(curve,imin))/(get_time_at(curve,imax)-get_time_at(curve,imin));
                }
                //binary search and recursion
                imed=Math.ceil((imin+imax)/2.0);
                if (t>get_time_at(curve,imed)) return library.get_df(curve,t,imed,imax);
                return library.get_df(curve,t,imin,imed);
        };

        library.get_rate=function(curve,t){
                if (t<1/512) return 0.0;
                return Math.pow(library.get_df(curve,t),-1/t)-1;
        };

        library.get_fwd_rate=function(curve,tstart,tend){
                if (tend-tstart<1/512) return 0.0;
                return Math.pow(library.get_df(curve,tend) / library.get_df(curve,tstart),-1/(tend-tstart))-1;
        };


	library.add_curves=function(c1, c2){
		var t1=library.get_curve_times(c1);
		var t2=library.get_curve_times(c2);
		var times=[], i1=0, i2=0, tmin;
		var zcs=[];
		while(true){
			tmin=Number.POSITIVE_INFINITY;
			if(i1<t1.length) tmin=Math.min(t1[i1], tmin);
			if(i2<t2.length) tmin=Math.min(t2[i2], tmin);
			times.push(tmin);
			zcs.push(library.get_rate(c1,tmin)+library.get_rate(c2, tmin));
			if(tmin===t1[i1] && i1<t1.length) i1++;
			if(tmin===t2[i2] && i2<t2.length) i2++;
			if(i1===t1.length && i2===t2.length) break;
		}
		return {times:times, zcs: zcs};
	};


}(this.JsonRisk || module.exports));
;
(function(library){
        
        library.dcf=function(cf_obj, disc_curve, spread_curve, residual_spread, settlement_date){
                /*
                requires cf_obj of type
                {
                        date_pmt: array(date),
                        t_pmt: array(double),
                        pmt_total: array(double)
                }
                requires safe curves
                
                */
                var dc=disc_curve || library.get_safe_curve(null);
                var sc=spread_curve || library.get_safe_curve(null);
		library.require_vd(); //valuation date must be set
                //curve initialisation and fallbacks
                if(typeof residual_spread !== "number") residual_spread=0;
                var sd=library.get_safe_date(settlement_date);
                if (!sd) sd=library.valuation_date;

                //sanity checks
                if (undefined===cf_obj.t_pmt || undefined===cf_obj.pmt_total) throw new Error("dcf: invalid cashflow object");
                if (cf_obj.t_pmt.length !== cf_obj.pmt_total.length) throw new Error("dcf: invalid cashflow object");
                
                var res=0;
                var i=0;
                var df_d;
                var df_s;
                var df_residual;
                while(cf_obj.date_pmt[i]<=sd) i++; // only consider cashflows after settlement date
                while (i<cf_obj.t_pmt.length){
                        df_d=library.get_df(dc,cf_obj.t_pmt[i]);
                        df_s=library.get_df(sc,cf_obj.t_pmt[i]);
                        df_residual=Math.pow(1+residual_spread, -cf_obj.t_pmt[i]);
                        res+=cf_obj.pmt_total[i]*df_d*df_s*df_residual;
                        i++;
                }
                return res;
        };
        
        library.irr=function(cf_obj, settlement_date, payment_on_settlement_date){
		library.require_vd(); //valuation date must be set
                if (!payment_on_settlement_date) payment_on_settlement_date=0;
                
                var tset=library.time_from_now(settlement_date);
                var func=function(x){
                        return library.dcf(cf_obj,null,null,x, settlement_date)+
                               payment_on_settlement_date*Math.pow(1+x,-tset);
                };
                
                var ret=library.find_root_secant(func,0,0.0001);
                return ret;
        };
}(this.JsonRisk || module.exports));
;(function(library){
        library.fixed_income=function(instrument){

                var maturity=library.get_safe_date(instrument.maturity);       
                if(!maturity)
                        throw new Error("fixed_income: must provide maturity date.");


                var effective_date=library.get_safe_date(instrument.effective_date); //null allowed
                
                if(typeof instrument.notional !== 'number')
                        throw new Error("fixed_income: must provide valid notional.");
                this.notional=instrument.notional;

		//include notional exchange unless explicitly set to false (e.g., for swaps)
		this.notional_exchange=(instrument.notional_exchange===false) ? false : true;

		//interest related fields
                var tenor=library.get_safe_natural(instrument.tenor);
                if(null===tenor)
                        throw new Error("fixed_income: must provide valid tenor.");
		
                var first_date=library.get_safe_date(instrument.first_date); //null allowed
                var next_to_last_date=library.get_safe_date(instrument.next_to_last_date); //null allowed
		var stub_end=instrument.stub_end || false;
		var stub_long=instrument.stub_long || false;

                this.current_accrued_interest = instrument.current_accrued_interest || 0;

                this.type=(typeof instrument.type==='string') ? instrument.type : 'unknown';

                this.is_holiday_func=library.is_holiday_factory(instrument.calendar || "");
                this.year_fraction_func=library.year_fraction_factory(instrument.dcc || "");
                this.bdc=instrument.bdc || "";
		this.adjust_accrual_periods=instrument.adjust_accrual_periods || false;

		this.adj = function(d){
		        return library.adjust(d,this.bdc,this.is_holiday_func);  
		};

		//amortisation related fields
                var repay_tenor=library.get_safe_natural(instrument.repay_tenor);
                if(null===repay_tenor) repay_tenor=tenor;

                var linear_amortization = instrument.linear_amortization || false;
		
                this.repay_amount = (typeof instrument.repay_amount==='number') ? instrument.repay_amount : 0; //defaults to zero
		//if (this.repay_amount<0) throw new Error("fixed_income: invalid negative repay_amount");
                
		this.interest_capitalization=(true===instrument.interest_capitalization) ? true : false;

                var repay_first_date=library.get_safe_date(instrument.repay_first_date) || this.first_date;
                var repay_next_to_last_date=library.get_safe_date(instrument.repay_next_to_last_date) || this.next_to_last_date;
		var repay_stub_end=instrument.stub_end || false;
		var repay_stub_long=instrument.stub_long || false;

		//condition arrays
		var i;
                if(Array.isArray(instrument.conditions_valid_until)){ 
			this.conditions_valid_until = new Array(instrument.conditions_valid_until.length-1);

			for(i=0;i<this.conditions_valid_until.length;i++){ 
				this.conditions_valid_until[i]=library.get_safe_date(instrument.conditions_valid_until[i]);
				if(!this.conditions_valid_until[i]) throw new Error("fixed_income: invalid set of dates provided under conditions_valid_until.");
			}
			if(this.conditions_valid_until[i-1].getTime() !==maturity.getTime()) throw new Error("fixed_income: last date provided under conditions_valid_until must match maturity");
		}else{
			this.conditions_valid_until=[maturity];
		}

                var settlement_days=library.get_safe_natural(instrument.settlement_days) || 0;
                this.settlement_date=library.add_business_days(library.valuation_date, settlement_days, this.is_holiday_func);

                this.residual_spread=(typeof instrument.residual_spread=='number') ? instrument.residual_spread : 0;
                var currency=instrument.currency || "";
		
		// interest rate schedule
                this.schedule=library.schedule(effective_date, 
                                                        maturity,
                                                        tenor,
                                                        this.adj,
                                                        first_date,
                                                        next_to_last_date,
							stub_end,
							stub_long);


		// fixing schedule
		if(typeof instrument.fixed_rate === 'number'){
                        //fixed rate instrument
                        this.is_float=false;
                        this.fixed_rate=instrument.fixed_rate; // can be number or array, arrays to be impleented
			this.float_spread=0;
			this.cap_rate=0;
			this.floor_rate=0;
			this.fixing_schedule=[this.schedule[0], maturity];
                }else{
                        //floating rate instrument
                        this.is_float=true;
			this.fixed_rate=null;
                        this.float_spread=(typeof instrument.float_spread === 'number') ? instrument.float_spread : 0; // can be number or array, arrays to be impleented
                        if(typeof instrument.float_current_rate !== 'number')
                                throw new Error("fixed_income: must provide valid float_current_rate.");
                        this.float_current_rate=instrument.float_current_rate;               


			//fixing schedule related fields

		        var fixing_tenor=library.get_safe_natural(instrument.fixing_tenor);
		        if(null===fixing_tenor) fixing_tenor=tenor;

		        var fixing_first_date=library.get_safe_date(instrument.fixing_first_date) || this.first_date;
		        var fixing_next_to_last_date=library.get_safe_date(instrument.fixing_next_to_last_date) || this.next_to_last_date;
			var fixing_stub_end=instrument.fixing_stub_end || false;
			var fixing_stub_long=instrument.fixing_stub_long || false;

                        this.cap_rate = (typeof instrument.cap_rate === 'number') ? instrument.cap_rate : Number.POSITIVE_INFINITY; // can be number or array, arrays to be implemented
                        this.floor_rate = (typeof instrument.floor_rate === 'number') ? instrument.floor_rate : Number.POSITIVE_INFINITY; // can be number or array, arrays to be implemented
			this.fixing_schedule =library.schedule(this.schedule[0], 
                                                        maturity,
                                                        fixing_tenor,
                                                        this.adj,
                                                        fixing_first_date,
                                                        fixing_next_to_last_date);

                }

		// repay schedule
		if(this.repay_amount===0 && !this.interest_capitalization && !linear_amortization){
			this.repay_schedule=[this.schedule[0], maturity];
		}else{
                	this.repay_schedule = library.schedule(this.schedule[0], 
		                                                maturity,
		                                                repay_tenor,
		                                                this.adj,
		                                                repay_first_date,
		                                                repay_next_to_last_date,
								repay_stub_end,
								repay_stub_long);
		}
		if(linear_amortization) this.repay_amount=this.notional / (this.repay_schedule.length - 1);

                this.cash_flows = this.initialize_cash_flows(); // pre-initializes cash flow table

                if (!this.is_float) this.cash_flows=this.finalize_cash_flows(null); // finalize cash flow table only for fixed rate instruments, for floaters this is done in present_value()
        };


	library.fixed_income.prototype.initialize_cash_flows=function(){
		library.require_vd(); //valuation date must be set

		var date_accrual_start=new Array(this.schedule.length-1);
		var date_accrual_end=new Array(this.schedule.length-1);
		var is_interest_date=new Array(this.schedule.length-1);
		var is_repay_date=new Array(this.schedule.length-1);
		var is_fixing_date=new Array(this.schedule.length-1);
		var is_condition_date=new Array(this.schedule.length-1);
		/* arrays are possibly longer than schedule
		   as schedule is just the pure interest payment schedule.
		   for better performance, generate all other columns later when size is known.
		 */

		var i=0, i_int=1, i_rep=1, i_fix=1, i_cond=0;
		while(true){
		        date_accrual_start[i]=(i>0) ? date_accrual_end[i-1] : this.schedule[0];
		        date_accrual_end[i]=new Date(Math.min(this.schedule[i_int],
		                           this.repay_schedule[i_rep],
		                           this.fixing_schedule[i_fix],
		                           this.conditions_valid_until[i_cond]));

		        //end date is interest date?
		        if(i_int<this.schedule.length && date_accrual_end[i].getTime()===this.schedule[i_int].getTime()){
		                is_interest_date[i]=true;
		                i_int++;
		        }else{
		                is_interest_date[i]=false;
		        }

		        //end date is repay date?
		        if(i_rep<this.repay_schedule.length && date_accrual_end[i].getTime()===this.repay_schedule[i_rep].getTime()){
		                is_repay_date[i]=true;
		                i_rep++;
		        }else{
		                is_repay_date[i]=false;
		        }

		        //end date is fixing date?
		        if(i_fix<this.fixing_schedule.length && date_accrual_end[i].getTime()===this.fixing_schedule[i_fix].getTime()){
		                is_fixing_date[i]=true;
		                i_fix++;
		        }else{
		                is_fixing_date[i]=false;
		        }

		        //end date is condition date?
		        if(i_cond<this.conditions_valid_until.length && date_accrual_end[i].getTime()===this.conditions_valid_until[i_cond].getTime()){
		                is_condition_date[i]=true;
		                i_cond++;
		        }else{
		                is_condition_date[i]=false;
		        }
		
		        if (i_int===this.schedule.length &&
		            i_rep===this.repay_schedule.length &&
		            i_fix===this.fixing_schedule.length) break; // done when all schedules have reached their end

			i++; //move to next date

		}
		//now, generate all other fields based on the dates generated above
                var date_pmt=new Array(date_accrual_start.length);
                var t_accrual_start=new Array(date_accrual_start.length);
                var t_accrual_end=new Array(date_accrual_start.length);
                var t_pmt=new Array(date_accrual_start.length);
                var current_principal=new Array(date_accrual_start.length);
		var accrual_factor=new Array(date_accrual_start.length);
                var interest_current_period=new Array(date_accrual_start.length);
                var accrued_interest=new Array(date_accrual_start.length);
                var pmt_principal=new Array(date_accrual_start.length);
                var pmt_interest=new Array(date_accrual_start.length);
                var pmt_total=new Array(date_accrual_start.length);

		//populate rate-independent fields and adjust dates if necessary
                for(i=0;i<date_accrual_start.length;i++){
			if(this.adjust_accrual_periods){
				date_accrual_start[i]=this.adj(date_accrual_start[i]);
				date_accrual_end[i]=this.adj(date_accrual_end[i]);
			}
                        date_pmt[i]=this.adj(date_accrual_end[i]);
                        t_pmt[i]=library.time_from_now(date_pmt[i]);
                        t_accrual_start[i]=library.time_from_now(date_accrual_start[i]);
                        t_accrual_end[i]=library.time_from_now(date_accrual_end[i]);
			accrual_factor[i]=this.year_fraction_func(date_accrual_start[i],date_accrual_end[i]);
                }

                //returns pre-initialized cash flow table object
                return {
			//rate independent fields
			date_accrual_start: date_accrual_start,
                        date_accrual_end: date_accrual_end,
                        date_pmt: date_pmt,
                        t_accrual_start: t_accrual_start,
                        t_accrual_end: t_accrual_end,
                        t_pmt: t_pmt,
                        is_interest_date: is_interest_date,
                        is_repay_date: is_repay_date,
                        is_fixing_date: is_fixing_date,
                        is_condition_date: is_condition_date,
			accrual_factor: accrual_factor,
			//rate dependent fields
                        current_principal: current_principal,
                        interest_current_period: interest_current_period,
                        accrued_interest: accrued_interest,
                        pmt_principal: pmt_principal,
                        pmt_interest: pmt_interest,
                        pmt_total: pmt_total
                };
                
	 };


        library.fixed_income.prototype.finalize_cash_flows=function(fwd_curve, override_rate_or_spread){
		library.require_vd(); //valuation date must be set

                var default_yf=library.year_fraction_factory(null);
		var c=this.cash_flows;
		var n=c.date_accrual_start.length;
                var current_principal=new Array(n);
                var interest_current_period=new Array(n);
                var accrued_interest=new Array(n);
                var pmt_principal=new Array(n);
                var pmt_interest=new Array(n);
                var pmt_total=new Array(n);

		var sign=(this.notional >= 0) ? 1 : -1;                

                // initialize conditions
		var icond=0;
		while(this.conditions_valid_until[icond] < c.date_accrual_start[0]) icond++;

                var current_repay = (typeof this.repay_amount  === 'number')? this.repay_amount: this.repay_amount[icond];  
                var current_capitalization = (typeof this.interest_capitalization == "boolean") ? this.interest_capitalization: this.interest_capitalization[icond];
            	var current_cap_rate = (typeof this.cap_rate  === 'number')? this.cap_rate: this.cap_rate[icond];
		var current_floor_rate = (typeof this.floor_rate  === 'number')? this.floor_rate: this.floor_rate[icond];

		//initialize interest rate
                var current_rate, get_rate_or_spread, j;
		if(!this.is_float) {
			var r=this.fixed_rate;
			if (typeof r === 'number'){
				get_rate_or_spread=function(){return r;};
			}else{
				get_rate_or_spread=function(){return r[icond];};
			}
		}else{
			var s=this.float_spread;
			if (typeof s === 'number'){
				get_rate_or_spread=function(){return s;};
			}else{
				get_rate_or_spread=function(){return s[icond];};
			}
		}

		//override rate if needed
		if (typeof override_rate_or_spread === 'number'){
			get_rate_or_spread=function(){return override_rate_or_spread;};
		}
		
		if(!this.is_float){
			current_rate=get_rate_or_spread();
		}else{
	                if (c.date_accrual_start[0] <= library.valuation_date){
				//effective date is now or in the past, use current_rate
	                        current_rate=this.float_current_rate;
	                }else{
				//effective date in the future, use forward curve from effective date until next fixing date
				j=0;
				while(!c.is_fixing_date[j] && j<c.is_fixing_date.length) j++;

	                        current_rate=library.get_fwd_rate(fwd_curve,
								       c.t_accrual_start[0],
								       c.t_accrual_end[j])+
								       get_rate_or_spread();
	                }
		}
                
		var i;
		for(i=0;i<n;i++){
			//update principal
			current_principal[i]=(i>0) ? current_principal[i-1]-pmt_principal[i-1] : this.notional;

			//pay principal if repay date
                        if(c.is_repay_date[i]){
				pmt_principal[i]=current_repay * sign;
			}else{
				pmt_principal[i]=0;
			}

			//calculate interest amount for the current period
                        interest_current_period[i]=current_principal[i]*current_rate*c.accrual_factor[i];
			
			//accrue interest
			accrued_interest[i]=(i>0 ? accrued_interest[i-1] : 0 ) + interest_current_period[i];
				
			//pay or capitalize interest
                        if(c.is_interest_date[i]){
				pmt_interest[i]=accrued_interest[i];
				accrued_interest[i]=0;
				if(current_capitalization){
					pmt_principal[i]=pmt_principal[i]-pmt_interest[i];
				}
			}else{
				pmt_interest[i]=0;
			}

			//make sure principal is not overpaid and all principal is paid back in the end
			if((i<n-1 && pmt_principal[i] * sign > current_principal[i] * sign) || (i===n-1)){
				pmt_principal[i]=current_principal[i];
			}

                        pmt_total[i]=pmt_interest[i];
			if(this.notional_exchange===true){
				pmt_total[i]+=pmt_principal[i];
			}

			//update conditions for next period
			if(c.is_condition_date[i]){
				icond++;
				current_repay = (typeof this.repay_amount == "number")? this.repay_ampount: this.repay_amount[icond];  
				current_capitalization = (typeof this.interest_capitalization == "boolean") ? this.interest_capitalization: this.interest_capitalization[icond];  
				current_cap_rate = (typeof this.cap_rate == "number")? this.cap_rate: this.cap_rate[icond];
				current_floor_rate = (typeof this.floor_rate == "number")? this.floor_rate: this.floor_rate[icond];
			}

			//update interest rate for next period
			if(!this.is_float){
				current_rate=get_rate_or_spread();
			}else{
		                if (c.date_accrual_start[i] <= library.valuation_date){
					//period beginning in the past or now, use current rate
		                        current_rate=this.float_current_rate;
		                }else if (c.is_fixing_date[i]){
					//effective date in the future, use forward curve from now until next fixing date
					j=0;
					while(!c.is_fixing_date[i+j] && i+j<c.is_fixing_date.length) j++;

		                        current_rate=library.get_fwd_rate(fwd_curve,
								       c.t_accrual_start[i],
								       c.t_accrual_end[i+j])+
								       get_rate_or_spread();
		                }
			}
                }
                //returns finalized cash flow table object
                return {
			//rate independent fields
			date_accrual_start: c.date_accrual_start,
                        date_accrual_end: c.date_accrual_end,
                        date_pmt: c.date_pmt,
                        t_accrual_start: c.t_accrual_start,
                        t_accrual_end: c.t_accrual_end,
                        t_pmt: c.t_pmt,
                        is_interest_date: c.is_interest_date,
                        is_repay_date: c.is_repay_date,
                        is_fixing_date: c.is_fixing_date,
                        is_condition_date: c.is_condition_date,
			accrual_factor: c.accrual_factor,
			//rate dependent fields
                        current_principal: current_principal,
                        interest_current_period: interest_current_period,
                        accrued_interest: accrued_interest,
                        pmt_principal: pmt_principal,
                        pmt_interest: pmt_interest,
                        pmt_total: pmt_total
                };
	};

	library.fixed_income.prototype.get_cash_flows=function(fwd_curve){
		if(this.is_float){
			if(typeof fwd_curve !== 'object' || fwd_curve===null) throw new Error("fixed_income.get_cash_flows: Must provide forward curve when evaluating floating rate interest stream");
			return this.finalize_cash_flows(fwd_curve);
		}
		return this.cash_flows;
	};
    
        library.fixed_income.prototype.present_value=function(disc_curve, spread_curve, fwd_curve){
                return library.dcf(this.get_cash_flows(library.get_safe_curve(fwd_curve) || null),
                                   library.get_safe_curve(disc_curve),
                                   library.get_safe_curve(spread_curve),
                                   this.residual_spread,
                                   this.settlement_date);
        };

        library.fixed_income.prototype.fair_rate_or_spread=function(disc_curve, spread_curve, fwd_curve){
		library.require_vd(); //valuation date must be set
		var fc=library.get_safe_curve(fwd_curve) || library.get_const_curve(0);
		var cf=this.get_cash_flows(fc);

                //retrieve outstanding principal on valuation date
                var outstanding_principal=0;
                var i=0;
		while (cf.date_pmt[i]<=library.valuation_date) i++;
                outstanding_principal=cf.current_principal[i];
		
		//approximate solution via annuity - will be exact if no interest rate capitalization
		var guess;		
		guess=outstanding_principal - library.dcf(cf,
		                           disc_curve,
		                           spread_curve,
		                           this.residual_spread,
		                           this.settlement_date);
		guess/=this.annuity(disc_curve, spread_curve, fc);
		guess+=this.is_float ? this.float_spread : this.fixed_rate;
		return guess;
		/*
		var tmp=this;
		var optfunc=function(rate){
			cf=tmp.finalize_cash_flows(fc, rate); //use override_rate_or_spread

		        return outstanding_principal - library.dcf(cf,
		                           disc_curve,
		                           spread_curve,
		                           this.residual_spread,
		                           this.settlement_date);
		};

		return library.find_root_secant(optfunc, guess, guess+0.0001, 20, 0.0000001);
		*/
        };

        library.fixed_income.prototype.annuity=function(disc_curve, spread_curve, fwd_curve){
		/*
			returns the annuity of the fixed income stream,
			that is, the present value of all interest payments assuming
			the interest rate is 100%.
			In case of interest capitalizing instruments, this function
			uses the notional structure implied by the original fixed rate
			or, for floaters, uses the supplied forward curve plus spread
		*/
		
                var c=this.get_cash_flows(library.get_safe_curve(fwd_curve) || library.get_const_curve(0));
		var pmt=new Array(c.pmt_total.length);
		var accrued=0;		
		var i;
		for (i=0;i<pmt.length;i++){
			pmt[i]=0;

			//calculate interest amount for the current period based on 100% interest rate
                        accrued+=c.current_principal[i]*c.accrual_factor[i];
				
			//pay interest
                        if(c.is_interest_date[i]){
				pmt[i]+=accrued;
				accrued=0;
			}
		}
		return library.dcf({
					date_pmt: c.date_pmt,
					t_pmt: c.t_pmt,
					pmt_total: pmt
				},
				library.get_safe_curve(disc_curve),
				library.get_safe_curve(spread_curve),
				this.residual_spread,
				this.settlement_date);
        };


        library.pricer_irregular_bond=function(bond, disc_curve, spread_curve, fwd_curve){
                var bond_internal=new library.fixed_income(bond);
                return bond_internal.present_value(disc_curve, spread_curve, fwd_curve);
        };
       
        library.pricer_bond=function(bond, disc_curve, spread_curve){
                var bond_internal=new library.fixed_income(bond);
                return bond_internal.present_value(disc_curve, spread_curve, null);
        };
        
        library.pricer_floater=function(floater, disc_curve, spread_curve, fwd_curve){
                var floater_internal=new library.fixed_income(floater);
                return floater_internal.present_value(disc_curve, spread_curve, fwd_curve);
        };

}(this.JsonRisk || module.exports));
;
(function(library){

       library.fxterm=function(instrument){
                
                //the near payment of the swap
                this.near_leg=new library.fixed_income({
                        notional: instrument.notional, // negative if first leg is pay leg
                        maturity: instrument.maturity,
                        fixed_rate: 0,
                        tenor: 0
                });
                
                //the far payment of the swap
                if (typeof(instrument.notional_2) === "number" && library.get_safe_date(instrument.maturity_2)){
                        this.far_leg=new library.fixed_income({
                                notional: instrument.notional_2, // negative if first leg is pay leg
                                maturity: instrument.maturity_2,
                                fixed_rate: 0,
                                tenor: 0
                        });
                }else{
                        this.far_leg=null;
                }
        };
        
        library.fxterm.prototype.present_value=function(disc_curve){
                var res=0;
                res+=this.near_leg.present_value(disc_curve, null, null);
                if(this.far_leg) res+=this.far_leg.present_value(disc_curve, null, null);
                return res;
        };
        
        library.pricer_fxterm=function(fxterm, disc_curve){
                var fxterm_internal=new library.fxterm(fxterm);
                return fxterm_internal.present_value(disc_curve);
        };
        

}(this.JsonRisk || module.exports));
;(function(library){

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

	var strike_adjustment=function(cf_obj, t_exercise, disc_curve, opportunity_spread){
		if(!opportunity_spread) return 0;                
		var i=0, df;
		var res=0;
		// move forward to first line after exercise date
                while(cf_obj.t_pmt[i]<=t_exercise) i++;

                // include all payments after exercise date

                while (i<cf_obj.t_pmt.length){
			df=library.get_df(disc_curve, cf_obj.t_pmt[i]);
			if(spread_curve) df*=library.get_df(spread_curve, -cf_obj.t_pmt[i]);
			if(residual_spread) df*=Math.pow(1+residual_spread, -cf_obj.t_pmt[i]);
		        res+=cf_obj.current_principal[i] * df * opportunity_spread * (cf_obj.t_pmt[i]-Math.max(cf_obj.t_pmt[i-1], t_exercise));
			i++;
                }

		df=library.get_df(disc_curve, t_exercise);
		if(spread_curve) df*=library.get_df(spread_curve, t_exercise);
		if(residual_spread) df*=Math.pow(1+residual_spread, -t_exercise);
                res/=df;
		return res;
	};
	
	/*
	strike_adjustment=function(cf_obj, t_exercise, disc_curve, opportunity_spread){
		if(!opportunity_spread) return 0;                
		var i=0, df;
		var add=0, subtract=0;
		// move forward to first line after exercise date
                while(cf_obj.t_pmt[i]<=t_exercise) i++;

                // include all payments after exercise date
                while (i<cf_obj.t_pmt.length){
			df=library.get_df(disc_curve, cf_obj.t_pmt[i]);
		        add+=cf_obj.pmt_principal[i] * df;
		        subtract+=cf_obj.pmt_principal[i] * df * Math.pow(1+opportunity_spread, -(cf_obj.t_pmt[i]-t_exercise));
			i++;
                }
                return add-subtract;
	};
	*/

	library.lgm_dcf=function(cf_obj,t_exercise, disc_curve, xi, state, spread_curve, residual_spread, opportunity_spread){
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
		var sadj=strike_adjustment(cf_obj, t_exercise, disc_curve, opportunity_spread);
		for (j=0; j<state.length; j++){
			res[j] = - (cf_obj.current_principal[i]+accrued_interest+sadj) * df;
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

	library.lgm_european_call_on_cf=function(cf_obj,t_exercise, disc_curve, xi, spread_curve, residual_spread, opportunity_spread){
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
		if(t_exercise<1/512 || xi<1e-15) return Math.max(0,library.lgm_dcf(cf_obj,t_exercise, disc_curve, 0, [0], spread_curve, residual_spread, opportunity_spread)[0]);
		function func(x){
			return library.lgm_dcf(cf_obj,t_exercise, disc_curve, xi, [x], spread_curve, residual_spread, opportunity_spread)[0];
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
		var sadj=strike_adjustment(cf_obj, t_exercise, disc_curve, opportunity_spread);
		var res = - (cf_obj.current_principal[i]+accrued_interest+sadj) * df * library.cndf(break_even*one_std_dev);

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
		var cf_obj=swaption.swap.fixed_leg.finalize_cash_flows(null, fixed_rate);		
		cf_obj.pmt_total[cf_obj.pmt_total.length-1]+=cf_obj.current_principal[cf_obj.pmt_total.length-1];

		return cf_obj;
	};

	library.lgm_european_swaption=function(swaption,t_exercise, disc_curve, xi, fwd_curve){
		//retrieve adjusted cash flows
		var cf_obj=library.lgm_european_swaption_adjusted_cashflow(swaption,disc_curve, fwd_curve);
		
		//now use lgm model on cash flows
		return library.lgm_european_call_on_cf(cf_obj,t_exercise, disc_curve, xi, null, null, null);
	};

	library.lgm_calibrate=function(basket, disc_curve, fwd_curve, surface){
		library.require_vd();
		var xi, xi_vec=[];
		var cf_obj, std_dev_bachelier, tte, ttm, deno, target, root, i, j, min_value, max_value;

		var func=function(rt_xi){
			var val=library.lgm_european_call_on_cf(cf_obj,tte, disc_curve, rt_xi*rt_xi, null, null, null);
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
				min_value=library.lgm_dcf(cf_obj, tte, disc_curve, 0, [0], null, null, null)[0];
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

	library.lgm_bermudan_call_on_cf=function(cf_obj,t_exercise_vec, disc_curve, xi_vec, spread_curve, residual_spread, opportunity_spread){
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
		if(t_exercise_vec[t_exercise_vec.length-1]<1/512){
			return Math.max(0,library.lgm_dcf(cf_obj,
							t_exercise_vec[t_exercise_vec.length-1],
							disc_curve,
							0,
							[0],
							spread_curve,
							residual_spread, opportunity_spread)[0]); //expiring option
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
						   residual_spread,
						   opportunity_spread);
			
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
;
(function(library){
	'use strict';
        
        var RT2PI = Math.sqrt(4.0*Math.acos(0.0));
        var SPLIT = 7.07106781186547;
        var N0 = 220.206867912376;
        var N1 = 221.213596169931;
        var N2 = 112.079291497871;
        var N3 = 33.912866078383;
        var N4 = 6.37396220353165;
        var N5 = 0.700383064443688;
        var N6 = 3.52624965998911e-02;
        var M0 = 440.413735824752;
        var M1 = 793.826512519948;
        var M2 = 637.333633378831;
        var M3 = 296.564248779674;
        var M4 = 86.7807322029461;
        var M5 = 16.064177579207;
        var M6 = 1.75566716318264;
        var M7 = 8.83883476483184e-02;


	library.get_safe_positive=function(n){ //returns positive number if a valid positive number is entered and null otherwise
		if(typeof n !== 'number') return null;
		if(n <= 0) return null;
		return n;
	};

	library.get_safe_natural=function(n){ //returns natural number if a valid natural number is entered and null otherwise
		if(typeof n !== 'number') return null;
		if(n < 0 || n!==Math.floor(n)) return null;
		return n;
	};
        
        library.ndf=function(x){
          return Math.exp(-x*x/2.0)/RT2PI;
        };
        
        
        /*
                Cumulative normal distribution function with double precision
                according to
                Graeme West, BETTER APPROXIMATIONS TO CUMULATIVE NORMAL FUNCTIONS, 2004
        */         
        library.cndf=function(x){
                var z = Math.abs(x);
                var c;

                if(z<=37.0){
                        var e = Math.exp(-z*z/2.0);
                        if(z<SPLIT)
                        {
                                var n = (((((N6*z + N5)*z + N4)*z + N3)*z + N2)*z +N1)*z + N0;
                                var d = ((((((M7*z + M6)*z + M5)*z + M4)*z + M3)*z + M2)*z + M1)*z + M0;
                                c = e*n/d;
                        }
                        else{
                                var f = z + 1.0/(z + 2.0/(z + 3.0/(z + 4.0/(z + 13.0/20.0))));
                                c = e/(RT2PI*f);
                        }
                }else if(z>37.0){
                        c=0;
                }else{
			throw new Error("cndf: invalid input.");
		}
                return x<=0.0 ? c : 1-c;
        };
        
        library.find_root_secant=function(func, start, next, max_iter, threshold){
                var x=start, xnext=next, temp=0, iter=max_iter||20, t=threshold||0.00000001;
                var f=func(x), fnext=func(xnext);
		if(Math.abs(fnext)>Math.abs(f)){
			//swap start values if start is better than next
			temp=x;
			x=xnext;
			xnext=temp;
			temp=f;
			f=fnext;
			fnext=temp;
		}
                while (Math.abs(fnext)>t && iter>0){
			temp=(x-xnext)*fnext/(fnext-f);
			x=xnext;
			f=fnext;
                        xnext=x+temp;
			fnext=func(xnext);

                        iter--;
                }
                if (iter<=0) throw new Error("find_root_secant: failed, too many iterations");
		if (isNaN(xnext)) {
			throw new Error("find_root_secant: failed, invalid result");
		}
		return xnext;      
        };

	function signum(x){
		if (x>0) return 1;
		if (x<0) return -1;
		return 0;
	}

        library.find_root_ridders=function(func, start, next, max_iter, threshold){
                var x=start, y=next, z=0, w=0, r=0, iter=max_iter||20, t=threshold||0.00000001;
                var fx=func(x), fy=func(y), fz, fw;
		if(fx*fy>0) throw new Error("find_root_ridders: start values do not bracket the root");
		if(Math.abs(fx)<t) return x;
		if(Math.abs(fy)<t) return y;
                while (iter>0){
                        iter--;
			z=(x+y)*0.5;			
			fz=func(z);
			if(Math.abs(fz)<t) return z;
			r=Math.sqrt((fz*fz)-(fy*fx));
			if(0===r) return z;
			w=(z-x)*signum(fx-fy)*fz/r + z;
			if(isNaN(w)) w=z;
			fw=func(w);
			if(Math.abs(fw)<t) return w;
			if(fz*fw<0){
				x=w;
				fx=fw;
				y=z;
				fy=fz;
				continue;
			}
			if(fx*fw<0){
				y=w;
				fy=fw;
				continue;
			}
			if(fy*fw<0){
				x=w;
				fx=fw;
				continue;
			}
                }
                if (iter<=0) throw new Error("find_root_ridders: failed, too many iterations");
        };

}(this.JsonRisk || module.exports));
;
(function(library){
	'use strict';
	/*
        
        Schedule functions used by simple and irregular fixed income instruments.
        
        */

	var forward_rollout=function(start, end, tenor, adjust_func){
		//creates a forward schedule from start up to but excluding end, using tenor as frequency
		var res=[start];
		var i=1, dt=library.add_months(start, tenor);
		while(dt.getTime()<end.getTime()){
			res.push(dt);
			i++;
			dt=library.add_months(start, i*tenor);
		}
		if(adjust_func(end).getTime() <= adjust_func(res[res.length-1]).getTime()) res.pop(); //make sure end is excluded after adjustments
		return res;
	};

	var backward_rollout=function(start, end, tenor, adjust_func){
		//creates a backward schedule from end down to but excluding start, using tenor as frequency
		var res=[end];
		var i=1, dt=library.add_months(end, -tenor);
		while(dt.getTime()>start.getTime()){
			res.unshift(dt);
			i++;
			dt=library.add_months(end, -i*tenor);
		}
		if(adjust_func(start).getTime() >= adjust_func(res[0]).getTime()) res.shift(); //make sure start is excluded after adjustments
		return res;

	};


        library.schedule=function(eff_dt, maturity, tenor, adjust_func, first_dt, next_to_last_dt, stub_end, stub_long){
                if(!(maturity instanceof Date)) throw new Error ("schedule: maturity must be provided");
	
                if(!(eff_dt instanceof Date)){
                        //effective date is strictly needed if valuation date is not set
                        if (null===library.valuation_date) throw new Error("schedule: if valuation_date is unset, effective date must be provided");
                        //effective date is strictly needed if first date is given (explicit stub at beginning)
                        if (first_dt instanceof Date) throw new Error("schedule: if first date is provided, effective date must be provided");
			//effective date is strictly needed if next_to_last_date is not given and stub_end is true (implicit stub in the end)
                        if (!(next_to_last_dt instanceof Date) && stub_end) throw new Error("schedule: if next to last date is not provided and stub in the end is specified, effective date must be provided");
                }
                if ((eff_dt instanceof Date && maturity<eff_dt) || (library.valuation_date instanceof Date && maturity < library.valuation_date)) 
                        throw new Error("schedule: maturity is before valution or effective date.");
                if(typeof tenor !== "number")
                        throw new Error("schedule: tenor must be a nonnegative integer, e.g., 6 for semiannual schedule, 0 for zerobond/iam schedule");
                if(tenor<0 || Math.floor(tenor) !== tenor)
                        throw new Error("schedule: tenor must be a nonnegative integer, e.g., 6 for semiannual schedule, 0 for zerobond/iam schedule");
                if (0===tenor) return [(eff_dt instanceof Date) ? eff_dt : library.valuation_date, maturity];

		var res;
		if (first_dt instanceof Date && !(next_to_last_dt instanceof Date)){
			// forward generation with explicit stub at beginning
			res=forward_rollout(first_dt, maturity, tenor, adjust_func);
			//add maturity date
			res.push(maturity);
			//add effective date
			if(eff_dt.getTime() !== first_dt.getTime()) res.unshift(eff_dt);
		}else if (next_to_last_dt instanceof Date && !(first_dt instanceof Date)){
			// backward generation with explicit stub at end
			res=backward_rollout((eff_dt instanceof Date) ? eff_dt : library.valuation_date, next_to_last_dt, tenor, adjust_func);
			//add maturity date
			if(maturity.getTime() !== next_to_last_dt.getTime()) res.push(maturity);
			//add effective date if given
			if(eff_dt instanceof Date) res.unshift(eff_dt);
			//if effective date is not given, add another period
			if(!(eff_dt instanceof Date))res.unshift(library.add_months(res[0], -tenor));
		}else if (first_dt instanceof Date && next_to_last_dt instanceof Date){
			// backward generation with both explicit stubs
			res=backward_rollout(first_dt, next_to_last_dt, tenor, adjust_func);
			//add maturity date
			if(maturity.getTime() !== next_to_last_dt.getTime()) res.push(maturity);
			//add first date
			res.unshift(first_dt);
			//add effective date
			res.unshift(eff_dt);
		}else if (stub_end){
			// forward generation with implicit stub, effective date always given
			res=forward_rollout(eff_dt, maturity, tenor, adjust_func);
			//remove last item if long stub and more than one date present
			if (stub_long && res.length>1) res.pop();
			//add maturity date if not already included (taking into account adjustments)
			res.push(maturity);
		}else{
			// backward generation with implicit stub
			res=backward_rollout((eff_dt instanceof Date) ? eff_dt : library.valuation_date, maturity, tenor, adjust_func);
			//remove first item if long stub and more than one date present
			if (stub_long && res.length>1) res.shift();
			//add effective date if given
			if(eff_dt instanceof Date) res.unshift(eff_dt);
			//if effective date is not given and beginning of schedule is still after valuation date, add another period
			if(!(eff_dt instanceof Date)) res.unshift(library.add_months(res[0], -tenor));
		}
		return res;
	};
        
}(this.JsonRisk || module.exports));
;(function(library){

        library.get_const_surface=function(value, type){
                if(typeof value !== 'number') throw new Error("get_const_surface: input must be number."); 
                return {
                                type: type || "", 
                                expiries: [1],
                                terms: [1],
                                values: [[value]]
                       };
        };
        
        function get_term_at(surface, i){
                //construct terms from labels_term if terms are not defined
                if (surface.terms) return surface.terms[i];
                if (surface.labels_term) return library.period_str_to_time(surface.labels_term[i]);
                throw new Error("get_term_at: invalid surface, cannot derive terms");
        }
        
        function get_expiry_at(surface, i){
                //construct expiries from labels_expiry if expiries are not defined
                if (surface.expiries) return surface.expiries[i];
                if (surface.labels_expiry) return library.period_str_to_time(surface.labels_expiry[i]);
                throw new Error("get_expiry_at: invalid surface, cannot derive expiries");
        }
        
        function get_terms(surface){
                var i=(surface.terms || surface.labels_term || []).length;
                if (!i) throw new Error("get_surface_terms: invalid surface, need to provide valid terms or labels_term");
                var terms=new Array(i);
                while (i>0){
                        i--;
                        terms[i]=get_term_at(surface, i);
                }
                return terms;
        }
        
        function get_expiries(surface){
                var i=(surface.expiries || surface.labels_expiry || []).length;
                if (!i) throw new Error("get_surface_terms: invalid surface, need to provide valid expiries or labels_expiry");
                var expiries=new Array(i);
                while (i>0){
                        i--;
                        expiries[i]=get_expiry_at(surface, i);
                }
                return expiries;
        }
        
        library.get_safe_surface=function(surface){
                //if valid surface is given, returns surface in initialised form {type, expiries, terms, values}
                //if null or other falsy argument is given, returns constant zero surface
                if (!surface) return library.get_const_surface(0.0);
                return {
                                type: surface.type || "", 
                                expiries: get_expiries(surface),
                                terms: get_terms(surface),
                                values: surface.values
                        };
        };
        
        function get_slice_rate(surface,i_expiry,t_term,imin,imax){
                imin=imin || 0;
                imax=imax || (surface.terms || surface.labels_term || []).length-1;
                
                var sl=surface.values[i_expiry];
		if (!Array.isArray(sl)) throw new Error("get_slice_rate: invalid surface, values property must be an array of arrays");
                //slice only has one value left
                if (imin===imax) return sl[imin];
                //extrapolation (constant)
                if (t_term<get_term_at(surface, imin)) return sl[imin];
                if (t_term>get_term_at(surface, imax)) return sl[imax];
                //interpolation (linear)
                if (imin+1===imax){
                        return sl[imin]*(get_term_at(surface, imax)-t_term)/(get_term_at(surface, imax)-get_term_at(surface, imin))+
                               sl[imax]*(t_term-get_term_at(surface, imin))/(get_term_at(surface, imax)-get_term_at(surface, imin));
                }
                //binary search and recursion
                imed=Math.ceil((imin+imax)/2.0);
                if (t_term>get_term_at(surface,imed)) return get_slice_rate(surface,i_expiry,t_term,imed,imax);
                return get_slice_rate(surface,i_expiry, t_term,imin,imed);
        }

        library.get_surface_rate=function(surface,t_expiry,t_term,imin,imax){
                imin=imin || 0;
                imax=imax || (surface.expiries || surface.labels_expiry || []).length-1;

                //surface only has one slice left
                if (imin===imax) return get_slice_rate(surface, imin, t_term);
                //extrapolation (constant)
                if (t_expiry<get_expiry_at(surface, imin)) return get_slice_rate(surface, imin, t_term);
                if (t_expiry>get_expiry_at(surface, imax)) return get_slice_rate(surface, imax, t_term);
                //interpolation (linear)
                if (imin+1===imax){
                        return get_slice_rate(surface, imin, t_term)*(get_expiry_at(surface, imax)-t_expiry)/(get_expiry_at(surface, imax)-get_expiry_at(surface, imin))+
                               get_slice_rate(surface, imax, t_term)*(t_expiry-get_expiry_at(surface, imin))/(get_expiry_at(surface, imax)-get_expiry_at(surface, imin));
                }
                //binary search and recursion
                imed=Math.ceil((imin+imax)/2.0);
                if (t_expiry>get_expiry_at(surface,imed)) return library.get_surface_rate(surface,t_expiry,t_term,imed,imax);
                return library.get_surface_rate(surface,t_expiry,t_term,imin,imed);
        };


}(this.JsonRisk || module.exports));
;
(function(library){

       library.swap=function(instrument){
                this.phi=instrument.is_payer ? -1 : 1;
                
                this.fixed_rate=instrument.fixed_rate;
                //the true fixed leg of the swap
                this.fixed_leg=new library.fixed_income({
                        notional: instrument.notional * this.phi,
			notional_exchange : false,
                        maturity: instrument.maturity,
                        fixed_rate: instrument.fixed_rate,
                        tenor: instrument.tenor,
                        effective_date: instrument.effective_date,
                        calendar: instrument.calendar,
                        bdc: instrument.bdc,
                        dcc: instrument.dcc
                });
                
                //the floating rate leg of the swap
                this.float_leg=new library.fixed_income({
                        notional: - instrument.notional * this.phi,
			notional_exchange : false,
                        maturity: instrument.maturity,
                        float_spread: instrument.float_spread,
                        tenor: instrument.float_tenor,
                        effective_date: instrument.effective_date,
                        calendar: instrument.calendar,
                        bdc: instrument.float_bdc,
                        dcc: instrument.float_dcc,
                        float_current_rate: instrument.float_current_rate
                });
        };
        
        library.swap.prototype.fair_rate=function(disc_curve, fwd_curve){
                //returns fair rate, that is, rate such that swap has zero present value
                var pv_float=this.float_leg.present_value(disc_curve, null, fwd_curve);
                return - this.phi * pv_float / this.annuity(disc_curve);
        };
        
        library.swap.prototype.annuity=function(disc_curve){
                //returns always positive annuity regardless of payer/receiver flag
		return this.fixed_leg.annuity(disc_curve) * this.phi;
        };
        
        library.swap.prototype.present_value=function(disc_curve, fwd_curve){
                var res=0;
                res+=this.fixed_leg.present_value(disc_curve, null, null);
                res+=this.float_leg.present_value(disc_curve, null, fwd_curve);
                return res;
        };
        
        library.swap.prototype.get_cash_flows=function(fwd_curve){
                return{
                        fixed_leg: this.fixed_leg.get_cash_flows(),
                        float_leg: this.float_leg.get_cash_flows(fwd_curve)
                };
        };
         
        
        library.pricer_swap=function(swap, disc_curve, fwd_curve){
                var swap_internal=new library.swap(swap);
                return swap_internal.present_value(disc_curve, fwd_curve);
        };
        

}(this.JsonRisk || module.exports));
;
(function(library){

        library.swaption=function(instrument){
                this.sign=instrument.is_short ? -1 : 1;
                
                //maturity of the underlying swap
                this.maturity=library.get_safe_date(instrument.maturity);       
                if(!this.maturity)
                        throw new Error("swaption: must provide valid maturity date.");
  
                //expiry of the swaption
                this.expiry=library.get_safe_date(instrument.expiry);
                if(!this.expiry)
                        throw new Error("swaption: must provide valid expiry date.");

                //underlying swap object
		this.swap=new library.swap({
			is_payer: instrument.is_payer,
                        notional: instrument.notional,
			effective_date: this.expiry,
			settlement_date: this.expiry,
                        maturity: instrument.maturity,
                        fixed_rate: instrument.fixed_rate,
                        tenor: instrument.tenor,
                        calendar: instrument.calendar,
                        bdc: instrument.bdc,
                        dcc: instrument.dcc,
                        float_spread: instrument.float_spread,
                        float_tenor: instrument.float_tenor,
                        float_bdc: instrument.float_bdc,
                        float_dcc: instrument.float_dcc,
                        float_current_rate: instrument.float_current_rate
		});
        };

        library.swaption.prototype.present_value=function(disc_curve, fwd_curve, vol_surface){
                library.require_vd();
                
                //obtain times
                var t_maturity=library.time_from_now(this.maturity);
                var t_expiry=library.time_from_now(this.expiry);
                var t_term=t_maturity-t_expiry;
                if (t_term<1/512){
                        return 0;
                }       
                //obtain fwd rate, that is, fair swap rate
                var fair_rate=this.swap.fair_rate(disc_curve, fwd_curve);
                
                //obtain time-scaled volatility
		if(typeof vol_surface!=='object' || vol_surface===null) throw new Error("swaption.present_value: must provide valid surface");
                var std_dev=library.get_surface_rate(vol_surface, t_expiry, t_term)*Math.sqrt(t_expiry);
                
                var res;
		if (t_expiry<0){
			//degenerate case where swaption has expired in the past
			return 0;
		}else if (t_expiry<1/512 || std_dev<0.0001){
                        //degenerate case where swaption is almost expiring or volatility is very low
                        res=Math.max(this.swap.phi*(this.swap.fixed_rate - fair_rate), 0);
                }else{
                        //bachelier formula      
                        var d1 = (this.swap.fixed_rate - fair_rate) / std_dev;
                        res=this.swap.phi*(this.swap.fixed_rate - fair_rate)*library.cndf(this.swap.phi*d1)+std_dev*library.ndf(d1);
                }
                res*=this.swap.annuity(disc_curve);
                res*=this.sign;
                return res;
        };
 
        library.pricer_swaption=function(swaption, disc_curve, fwd_curve, vol_surface){
                var swaption_internal=new library.swaption(swaption);
                return swaption_internal.present_value(disc_curve, fwd_curve, vol_surface);
        };
        
        library.create_equivalent_regular_swaption=function(cf_obj, expiry, conventions){
                //sanity checks
                if (undefined===cf_obj.date_pmt || undefined===cf_obj.pmt_total || undefined===cf_obj.current_principal) throw new Error("create_equivalent_regular_swaption: invalid cashflow object");
                if (cf_obj.t_pmt.length !== cf_obj.pmt_total.length || cf_obj.t_pmt.length !== cf_obj.current_principal.length) throw new Error("create_equivalent_regular_swaption: invalid cashflow object");
		library.require_vd();//valuation date must be set
                if (!conventions) conventions={};
                var tenor=conventions.tenor || 6;
                var bdc=conventions.bdc || "unadjusted";
                var calendar=conventions.calendar || "";

                //retrieve outstanding principal on expiry (corresponds to regular swaption notional)
                var outstanding_principal=0;
                var i=0;
		while (cf_obj.date_pmt[i]<=expiry) i++;
                outstanding_principal=cf_obj.current_principal[i];

                if (outstanding_principal===0) throw new Error("create_equivalent_regular_swaption: invalid cashflow object or expiry, zero outstanding principal");
                //compute internal rate of return for remaining cash flow including settlement payment
                var irr=library.irr(cf_obj, expiry, -outstanding_principal);
                
                //regular swaption rate (that is, moneyness) should be equal to irr converted from annual compounding to simple compounding
                irr=12/tenor*(Math.pow(1+irr,tenor/12)-1);
                
                //compute effective duration of remaining cash flow
                var cup=library.get_const_curve(irr+0.0001);
                var cdown=library.get_const_curve(irr-0.0001);
                var npv_up=library.dcf(cf_obj, cup, null, null, expiry);
                var npv_down=library.dcf(cf_obj, cdown, null, null, expiry);
                var effective_duration_target=10000.0*(npv_down-npv_up)/(npv_down+npv_up);
                
                //brief function to compute effective duration
                var ed=function(bond){   
                        var bond_internal=new library.fixed_income(bond);  
                        npv_up=bond_internal.present_value(cup);
                        npv_down=bond_internal.present_value(cdown);
                        var res=10000.0*(npv_down-npv_up)/(npv_down+npv_up);
                        return res;
                };
                
                //find bullet bond maturity that has approximately the same effective duration               
                // start with analytic best estimate
                var t_maturity=(Math.abs(irr)<0.00000001) ? effective_duration_target : -Math.log(1-effective_duration_target*irr)/irr;
                var maturity=library.add_days(library.valuation_date, Math.round(t_maturity*365));
                var bond={
                          maturity: maturity,
                          effective_date: expiry,
                          settlement_date: expiry,
                          notional: outstanding_principal,
                          fixed_rate: irr,
                          tenor: tenor,
                          calendar: calendar,
                          bdc: bdc,
                          dcc: "act/365",
                        };
                var effective_duration=ed(bond);
                var iter=10;
                //alter maturity until we obtain effective duration target value
                while (Math.abs(effective_duration-effective_duration_target)>1/512 && iter>0){
                        t_maturity=t_maturity*effective_duration_target/effective_duration;
                        maturity=library.add_days(library.valuation_date, Math.round(t_maturity*365));
                        bond.maturity=maturity;
                        effective_duration=ed(bond);
                        iter--;
                }

                return {
                        is_payer: false,
                        maturity: maturity,
                        expiry: expiry,
			effective_date: expiry,
			settlement_date: expiry,
                        notional: outstanding_principal,
                        fixed_rate: irr,
                        tenor: tenor,
                        float_spread: 0.00,
                        float_tenor: 6,
                        float_current_rate: 0.00,
                        calendar: calendar,
                        bdc: bdc,
                        float_bdc: bdc,
                        dcc: "act/365",
                        float_dcc: "act/365"
                }; 
        };

}(this.JsonRisk || module.exports));
;(function(library){

        /*
        
                JsonRisk date and time functions
                
                
        */


	'use strict';

        var dl=1000*60*60*24; // length of one day in milliseconds
        var one_over_dl=1.0/dl;

        function is_leap_year(y){
                if(y%4!==0) return false;
                if(y===2000) return true;
                return (y%100!==0);
        }

        function days_in_month(y,m){
                return new Date(y,m+1,0).getDate();
        }
        
        library.period_str_to_time=function(str){
                var num=parseInt(str, 10);
		if(isNaN(num)) throw new Error('period_str_to_time(str) - Invalid time period string: ' + str);
                var unit=str.charAt(str.length-1);
                if( unit === 'Y' || unit === 'y') return num;
                if( unit === 'M' || unit === 'm') return num/12;
                if( unit === 'W' || unit === 'w') return num/52;
                if( unit === 'D' || unit === 'd') return num/365;
                throw new Error('period_str_to_time(str) - Invalid time period string: ' + str);
        };
        
        library.date_str_to_date=function(str){
                var rr=null,d,m,y;
                if ((rr = /^([1-2][0-9]{3})[\/-]([0-9]{1,2})[\/-]([0-9]{1,2})/.exec(str)) !== null) { // YYYY/MM/DD or YYYY-MM-DD
                        y=parseInt(rr[1], 10);
                        m=parseInt(rr[2], 10)-1;
                        d=parseInt(rr[3], 10);
                }else if ((rr = /^([0-9]{1,2})\.([0-9]{1,2})\.([1-2][0-9]{3})/.exec(str)) !== null) { // DD.MM.YYYY
                        y=parseInt(rr[3], 10);
                        m=parseInt(rr[2], 10)-1;
                        d=parseInt(rr[1], 10);
                }
                if (null===rr) throw new Error('date_str_to_time(str) - Invalid date string: ' + str);
                if (m<0 || m>11) throw new Error('date_str_to_time(str) - Invalid month in date string: ' + str);
                if (d<0 || d>days_in_month(y,m)) throw new Error('date_str_to_time(str) - Invalid day in date string: ' + str);
                return new Date(y,m,d);
        };
        
        library.get_safe_date=function(d){
                //takes a valid date string, a javascript date object, or an undefined value and returns a javascript date object or null
                if(!d) return null;
                if(d instanceof Date) return d;
                if((d instanceof String) || typeof d === 'string') return library.date_str_to_date(d);
                throw new Error("get_safe_date: invalid input.");
        };
        
        /*!
        
                Year Fractions
        
        */
        function days_between(from, to){
                return Math.round((to-from)  * one_over_dl);
        }

        function yf_act365(from,to){
                return days_between(from,to)  / 365;
        }
        
        
        function yf_act360(from,to){
                return days_between(from,to)  / 360;
        }
        
        function yf_30E360(from,to){
                return ((to.getFullYear()-from.getFullYear())*360 + 
                        (to.getMonth()-from.getMonth()) * 30 + 
                        (Math.min(to.getDate(),30)-Math.min(from.getDate(),30)))  / 360;
        }
        
        function yf_actact(from,to){
                if (from-to===0) return 0;
                if (from>to) return -yf_actact(to, from);
                var yfrom=from.getFullYear();
                var yto=to.getFullYear();
                if(yfrom===yto) return days_between(from,to)/((is_leap_year(yfrom))? 366 : 365);
                var res=yto-yfrom-1;
                res+=days_between(from, new Date(yfrom+1,0,1))/((is_leap_year(yfrom))? 366 : 365);
                res+=days_between(new Date(yto,0,1), to)/((is_leap_year(yto))? 366 : 365);
                return res;
        }
        
        library.year_fraction_factory=function(str){
                if(!(str instanceof String) && typeof(str)!== 'string') return yf_act365; //default dcc
                var sl=str.toLowerCase();
                if( sl.charAt(0) === "a"){
                        if (sl==="actual/365" || sl==="act/365" || sl==="a/365" || sl=== "act/365 (fixed)" || sl==="actual/365 (fixed)"){
                                return yf_act365;
                        }

                        if (sl==="act/360" || sl==="a/360"){
                                return yf_act360;
                        }
                        if (sl==="act/act" || sl==="a/a"){
                                return yf_actact;
                        }
                }
                if( sl.charAt(0) === "3"){
                        if (sl==="30e/360"){
                                return yf_30E360;
                        }
                }
                //Fallback to default dcc
                return yf_act365;
        };

	library.time_from_now=function(d){
		library.require_vd();
		return yf_act365(library.valuation_date, d); 
	};

        
        /*!
        
                Date rolling
        
        */
        
        library.add_days=function(from, ndays){
                return new Date(from.getFullYear(),
				from.getMonth(),
				from.getDate()+ndays);
        };
        
        
        library.add_months=function(from, nmonths, roll_day){ 
                var y=from.getFullYear(), m=from.getMonth()+nmonths, d;
                while (m>=12){
                        m=m-12;
                        y=y+1;
                }
                while (m<0){
                        m=m+12;
                        y=y-1;
                }
                if(!roll_day){
                        d=from.getDate();
                }else{
                        d=roll_day;
                }
                return new Date(y,m,Math.min(d, days_in_month(y,m)));
        };

        library.add_period=function(from, str){
                var num=parseInt(str, 10);
		if(isNaN(num)) throw new Error('period_str_to_time(str) - Invalid time period string: ' + str);
                var unit=str.charAt(str.length-1);
                if( unit === 'Y' || unit === 'y') return library.add_months(from, 12*num);
                if( unit === 'M' || unit === 'm') return library.add_months(from, num);
                if( unit === 'W' || unit === 'w') return library.add_days(from, 7*num);
                if( unit === 'D' || unit === 'd') return library.add_days(from, num);
                throw new Error('period_str_to_time(str) - Invalid time period string: ' + str);
        };
        
                
        /*!
        
                Calendars
        
        */
        
        function easter_sunday(y) {
                var f=Math.floor,
                    c = f(y/100),
                    n = y - 19*f(y/19),
                    k = f((c - 17)/25);
                var i = c - f(c/4) - f((c - k)/3) + 19*n + 15;
                i = i - 30*f((i/30));
                i = i - f(i/28)*(1 - f(i/28)*f(29/(i + 1))*f((21 - n)/11));
                var j = y + f(y/4) + i + 2 - c + f(c/4);
                j = j - 7*f(j/7);
                var l = i - j,
                    m = 3 + f((l + 40)/44),
                    d = l + 28 - 31*f(m/4);
                return new Date(y,m-1,d);
        }
        
        function is_holiday_default(dt){
                var wd=dt.getDay();
                if(0===wd) return true;
                if(6===wd) return true;
                return false;
        }
        
        function is_holiday_target(dt){
                if (is_holiday_default(dt)) return true;             
                                
                var d=dt.getDate();
                var m=dt.getMonth();
                if (1 === d  && 0 === m) return true; //new year
                if (25 === d && 11 === m) return true; //christmas

                var y=dt.getFullYear();
                if(1998===y || 1999===y || 2001===y){
                        if(31===d && 11===m) return true; // December 31
                }
                if(y>2000){
                        if ((1 === d  && 4 === m)|| (26 === d && 11 === m)) return true; //labour and goodwill
                        var es=easter_sunday(y);
                        if (dt.getTime()===library.add_days(es,-2).getTime()) return true; //Good Friday
                        if (dt.getTime()===library.add_days(es,1).getTime())  return true; //Easter Monday
                }
                return false;
        }
        
        var calendars={};
        
        library.add_calendar=function(name, dates){
                if(!(name instanceof String || typeof name === 'string')) throw new Error("add_calendar: invalid input.");
                if(!Array.isArray(dates)) throw new Error("add_calendar: invalid input.");
                var n=dates.length, i, ht_size;
                var holidays=[];
                var dt;
                //only consider array items that are valid dates or date strings and that are no default holidays, i.e., weekend days
                for (i=0;i<n;i++){
                       dt=library.get_safe_date(dates[i]);
                       if (!dt) continue;
                       if (is_holiday_default(dt)) continue;
                       holidays.push(dt);
                }
                n=holidays.length;
                /*
                        Determine hash table size, must be prime number greater than number of holidays.
                        According to one of euclid's formulae, i*i - i + 41 is prime when i<41.
                        Max size is 1601 which is way enough for all reasonable calendars.
                        
                */
                i=1;
                while( i < 41){
                        ht_size=i*i - i +41;
                        if (ht_size>=n/10) break;
                        i++;
                }
                
                //populate hash table
                var hash_table=new Array(ht_size);
                for (i=0;i<ht_size;i++){
                        hash_table[i]=[];
                }
                var ht_index;
                for (i=0;i<n;i++){
                       ht_index=Math.floor(holidays[i].getTime() * one_over_dl) % ht_size;
                       hash_table[ht_index].push(holidays[i].getTime());
                }
                
                //tie new hash table to calendars list and return size for informational purposes
                calendars[name.toLowerCase()]=hash_table;
                return ht_size;
        };
        
        library.is_holiday_factory=function(str){
                var sl=str.toLowerCase();
                //builtin target calendar
                if(sl==="target") return is_holiday_target;
                //generic hash lookup function for stored calendars
                if (Array.isArray(calendars[sl])){
                        var cal=calendars[sl];
                        return function(dt){
                                if (is_holiday_default(dt)) return true;
                                var ms=dt.getTime();
                                var ht_index=Math.floor(ms * one_over_dl) % cal.length;
                                for (var i=0;i<cal[ht_index].length;i++){
                                        if (ms===cal[ht_index][i]) return true;
                                }
                                return false;
                        };
                }
                //fallback
                return is_holiday_default;
        };

                
        /*!
        
                Business Day Conventions
        
        */
        
        library.adjust=function(dt,bdc,is_holiday_function){
                var s=(bdc || "u").charAt(0).toLowerCase();
                var adj=new Date(dt);
                if(s==="u") return adj;                                  //unadjusted

                var m;
                if(s==="m") m=adj.getMonth();                            //save month for modified following
                if(s==="m" || s==="f"){
                        while (is_holiday_function(adj)) adj=library.add_days(adj,1);
                }
                if(s==="f") return adj;                                  //following
                if(s==="m" && m===adj.getMonth()) return adj;             //modified following, still in same month
                if(s==="m") adj=library.add_days(adj,-1);                        //modified following, in next month
                while (is_holiday_function(adj)) adj=library.add_days(adj,-1);    //modified following or preceding
                return adj;
        };

	library.add_business_days=function(from, n, is_holiday_function){
		var res=from, i=n;
		while (i>0){
			res=library.adjust(library.add_days(res, 1), "f", is_holiday_function);
			i--;
		}
		return res;
	};

        

}(this.JsonRisk || module.exports));


;(function(library){

        /*
        
                JsonRisk vector pricing
                
                
        */
        
        var stored_params=null; //hidden variable for parameter storage
        
        var normalise_scalar=function(obj){ //makes value an array of length one if it is not an array
                return (Array.isArray(obj.value)) ? {value: obj.value} : {value: [obj.value]};
        };
        
        var normalise_curve=function(obj){ // constructs times from days, dates or labels and makes dfs and zcs an array of length one if it is not an array
                return {
                        times: library.get_curve_times(obj),
                        dfs: obj.dfs ? ((Array.isArray(obj.dfs[0])) ? obj.dfs : [obj.dfs]) : null,
                        zcs: obj.zcs ? ((Array.isArray(obj.zcs[0])) ? obj.zcs : [obj.zcs]) : null
                };
        };
        
        var normalise_surface=function(obj){ // constructs terms from labels_term, expiries from labels_expiry and makes value an array of length one if it is not an array
                var safe_surface=library.get_safe_surface(obj); //has terms and expiries
                return {
                        expiries: safe_surface.expiries,
                        terms: safe_surface.terms,
                        values: (Array.isArray(obj.values[0][0])) ? obj.values : [obj.values]
                };
        };
        
        var update_vector_length=function(len){
                if (1===len) return;
                if (1===stored_params.vector_length){
                        stored_params.vector_length = len;
                        return;
                }
                if (len !== stored_params.vector_length) throw new Error("vector_pricing: parameters need to have the same length or length one");
        };
        
        library.store_params=function(params){
                stored_params={vector_length: 1,
			       scalars: {},
			       curves: {},
			       surfaces: {}
			      };

                var keys, i;
                //valuation date
                stored_params.valuation_date=library.get_safe_date(params.valuation_date);
                //scalars
                if (typeof(params.scalars) === 'object'){
                        keys=Object.keys(params.scalars);
                        for (i=0; i< keys.length;i++){
                                stored_params.scalars[keys[i]]=normalise_scalar(params.scalars[keys[i]]);
                                update_vector_length(stored_params.scalars[keys[i]].value.length);
                        }
                }
                //curves
                if (typeof(params.curves) === 'object'){
                        keys=Object.keys(params.curves);
                        var obj,len;
                        for (i=0; i< keys.length;i++){
                                obj=normalise_curve(params.curves[keys[i]]);
                                stored_params.curves[keys[i]]=obj;
                                len=obj.dfs ? obj.dfs.length : obj.zcs.length;
                                update_vector_length(len);
                        }
                }
                
                //surfaces
                if (typeof(params.surfaces) === 'object'){
                        keys=Object.keys(params.surfaces);
                        for (i=0; i< keys.length;i++){
                                stored_params.surfaces[keys[i]]=normalise_surface(params.surfaces[keys[i]]);
                                update_vector_length(stored_params.surfaces[keys[i]].values.length);
                        }
                }
        
        };
        
        library.get_params=function(){
                return stored_params;
        };
        
        var get_scalar_curve=function(vec_curve, i){
                if (!vec_curve) return null;
                return { times: vec_curve.times,
                        dfs: vec_curve.dfs ? (vec_curve.dfs[vec_curve.dfs.length>1 ? i : 0]) : null,
                        zcs: vec_curve.zcs ? (vec_curve.zcs[vec_curve.zcs.length>1 ? i : 0]) : null
                };
        };
        
        var get_scalar_surface=function(vec_surface, i){
                if (!vec_surface) return null;
                return { expiries: vec_surface.expiries,
                         terms: vec_surface.terms,
                         values: vec_surface.values[vec_surface.values.length>1 ? i : 0]
                };
        };
        
        var get_internal_object=function(instrument){
                switch (instrument.type.toLowerCase()){
                        case "bond":
                        case "floater":
			case "irregular_bond":
			return new library.fixed_income(instrument);
                        case "swap":
                        return new library.swap(instrument);
                        case "swaption":
                        return new library.swaption(instrument);
                        case "fxterm":
                        return new library.fxterm(instrument);
                        case "callable_bond":
                        return new library.callable_fixed_income(instrument);
                        default:
                        throw new Error ("vector_pricer: invalid instrument type");
                }
        };
        
        library.vector_pricer=function(instrument){
                if (typeof(instrument.type)!== 'string') throw new Error ("vector_pricer: instrument object must contain valid type");
                library.valuation_date=stored_params.valuation_date;
                var obj=get_internal_object(instrument);
                var vec_dc=stored_params.curves[instrument.disc_curve || ""] || null;
                var vec_sc=stored_params.curves[instrument.spread_curve || ""] || null;
                var vec_fc=stored_params.curves[instrument.fwd_curve || ""] || null;
                var vec_surface=stored_params.surfaces[instrument.surface || ""] || null;
                var vec_fx=stored_params.scalars[instrument.currency || ""] || null;
                var dc, sc, fc, su, fx;
                var res=new Array(stored_params.vector_length);
                for (var i=0; i< stored_params.vector_length; i++){
                        dc=get_scalar_curve(vec_dc, i);
                        sc=get_scalar_curve(vec_sc, i);
                        fc=get_scalar_curve(vec_fc, i);
                        su=get_scalar_surface(vec_surface, i);
                        switch (instrument.type.toLowerCase()){
                                case "bond":
                                case "floater":
                                case "fxterm":
				case "irregular_bond":
                                res[i]=obj.present_value(dc,sc,fc);
                                break;
                                case "swap":
                                case "swaption":
                                res[i]=obj.present_value(dc,fc,su);
				break;
                                case "callable_bond":
                                res[i]=obj.present_value(dc,sc,fc,su);
                                break;
                        }
                        if (vec_fx) res[i]/=vec_fx.value[vec_fx.value.length>1 ? i : 0];
                }
                return res;
        };
        
}(this.JsonRisk || module.exports));


