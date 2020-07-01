(function(library){

		/**
		 	* creates an internal swaption object (including swap) from input data
			* @param {object} instrument instrument
			* @memberof library
			* @public
		*/   
        library.swaption=function(instrument){
                this.sign=instrument.is_short ? -1 : 1;
                
                //maturity of the underlying swap
                this.maturity=library.get_safe_date(instrument.maturity);       
                if(!this.maturity)
                        throw new Error("swaption: must provide valid maturity date.");
  
                //first_exercise_date (a.k.a. expiry) of the swaption
                this.first_exercise_date=library.get_safe_date(instrument.first_exercise_date);
                if(!this.first_exercise_date)
                        throw new Error("swaption: must provide valid first_exercise_date date.");

                //underlying swap object
		this.swap=new library.swap({
			is_payer: instrument.is_payer,
                        notional: instrument.notional,
			effective_date: this.first_exercise_date,
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
		/**
		 	* calculates the present value for internal swaption (object)
			* @param {object} disc_curve discount curve
			* @param {object} fwd_curve forward curve
			* @param {object} vol_surface volatility surface
			* @returns {number} present value
			* @memberof library
			* @public
		*/  
        library.swaption.prototype.present_value=function(disc_curve, fwd_curve, vol_surface){
                library.require_vd();
                
                //obtain times
                var t_maturity=library.time_from_now(this.maturity);
                var t_first_exercise_date=library.time_from_now(this.first_exercise_date);
                var t_term=t_maturity-t_first_exercise_date;
                if (t_term<1/512){
                        return 0;
                }       
                //obtain fwd rate, that is, fair swap rate
                var fair_rate=this.swap.fair_rate(disc_curve, fwd_curve);
                
                //obtain time-scaled volatility
		if(typeof vol_surface!=='object' || vol_surface===null) throw new Error("swaption.present_value: must provide valid surface");
                var std_dev=library.get_surface_rate(vol_surface, t_first_exercise_date, t_term)*Math.sqrt(t_first_exercise_date);
                
                var res;
		if (t_first_exercise_date<0){
			//degenerate case where swaption has expired in the past
			return 0;
		}else if (t_first_exercise_date<1/512 || std_dev<0.0001){
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
		/**
		 	* ...
			* @param {object} swaption Instrument
			* @param {object} disc_curve discount curve
			* @param {object} fwd_curve forward curve
			* @param {object} vol_surface volatility surface
			* @returns {number} present value
			* @memberof library
			* @public
		*/    
        library.pricer_swaption=function(swaption, disc_curve, fwd_curve, vol_surface){
                var swaption_internal=new library.swaption(swaption);
                return swaption_internal.present_value(disc_curve, fwd_curve, vol_surface);
        };
		/**
		 	* ...
			* @param {object} cf_obj cash flow object
			* @param {date} first_exercise_date first exercise date
			* @param {object} conventions conventions
			* @returns {object} ...
			* @memberof library
			* @public
		*/           
        library.create_equivalent_regular_swaption=function(cf_obj, first_exercise_date, conventions){
                //sanity checks
                if (undefined===cf_obj.date_pmt || undefined===cf_obj.pmt_total || undefined===cf_obj.current_principal) throw new Error("create_equivalent_regular_swaption: invalid cashflow object");
                if (cf_obj.t_pmt.length !== cf_obj.pmt_total.length || cf_obj.t_pmt.length !== cf_obj.current_principal.length) throw new Error("create_equivalent_regular_swaption: invalid cashflow object");
		library.require_vd();//valuation date must be set
                if (!conventions) conventions={};
                var tenor=conventions.tenor || 6;
                var bdc=conventions.bdc || "unadjusted";
                var calendar=conventions.calendar || "";

                //retrieve outstanding principal on first_exercise_date (corresponds to regular swaption notional)
                var outstanding_principal=0;
                var i=0;
		while (cf_obj.date_pmt[i]<=first_exercise_date) i++;
                outstanding_principal=cf_obj.current_principal[i];

                if (outstanding_principal===0) throw new Error("create_equivalent_regular_swaption: invalid cashflow object or first_exercise_date, zero outstanding principal");
                //compute internal rate of return for remaining cash flow including settlement payment
                var irr=library.irr(cf_obj, first_exercise_date, -outstanding_principal);
                
                //regular swaption rate (that is, moneyness) should be equal to irr converted from annual compounding to simple compounding
                irr=12/tenor*(Math.pow(1+irr,tenor/12)-1);
                
                //compute forward effective duration of remaining cash flow
                var tte=library.time_from_now(first_exercise_date);
                var cup=library.get_const_curve(irr+0.0001);
                var cdown=library.get_const_curve(irr-0.0001);
                var npv_up=library.dcf(cf_obj, cup, null, null, first_exercise_date);
                npv_up/=library.get_df(cup,tte);
                var npv_down=library.dcf(cf_obj, cdown, null, null, first_exercise_date);
                npv_down/=library.get_df(cdown,tte);
                var effective_duration_target=10000.0*(npv_down-npv_up)/(npv_down+npv_up);
                
                //brief function to compute forward effective duration
                var ed=function(bond){   
                        var bond_internal=new library.fixed_income(bond);  
                        npv_up=bond_internal.present_value(cup);
                        npv_up/=library.get_df(cup,tte);
                        npv_down=bond_internal.present_value(cdown);
                        npv_down/=library.get_df(cdown,tte);
                        var res=10000.0*(npv_down-npv_up)/(npv_down+npv_up);
                        return res;
                };
                
                //find bullet bond maturity that has approximately the same effective duration               
                //start with analytic best estimate
                var ttm=(Math.abs(irr)<0.00000001) ? effective_duration_target : -Math.log(1-effective_duration_target*irr)/irr;
                var maturity=library.add_days(first_exercise_date, Math.round(ttm*365));

                var bond={
                          maturity: maturity,
                          effective_date: first_exercise_date,
                          settlement_date: library.adjust(first_exercise_date,bdc,library.is_holiday_factory(calendar)), //exclude initial disboursement cashflow from valuation
                          notional: outstanding_principal,
                          fixed_rate: irr,
                          tenor: tenor,
                          calendar: calendar,
                          bdc: bdc
                };
                var effective_duration=ed(bond);
                var iter=10;

                //alter maturity until we obtain effective duration target value
                while (Math.abs(effective_duration-effective_duration_target)>1/512 && iter>0){
                        ttm=ttm*effective_duration_target/effective_duration;
                        maturity=library.add_days(first_exercise_date, Math.round(ttm*365));
                        bond.maturity=maturity;
                        effective_duration=ed(bond);
                        iter--;
                }

                return {
                        is_payer: false,
                        maturity: maturity,
                        first_exercise_date: first_exercise_date,
			effective_date: first_exercise_date,
			settlement_date: first_exercise_date,
                        notional: outstanding_principal,
                        fixed_rate: irr,
                        tenor: tenor,
                        float_spread: 0.00,
                        float_tenor: conventions.float_tenor || 6,
                        float_current_rate: 0.00,
                        calendar: calendar,
                        bdc: bdc,
                        float_bdc: bdc
                }; 
        };

}(this.JsonRisk || module.exports));
