(function(library){
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
