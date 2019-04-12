
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
                this.swap=new library.swap(instrument);
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
                var std_dev=library.get_surface_rate(vol_surface, t_expiry, t_term)*Math.sqrt(t_expiry);
                
                var res;
                if (t_expiry<1/512 || std_dev<0.0001){
                        //degenerate case where swaption is already expiring or volatility is very low
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
                        var bond_internal=new library.simple_fixed_income(bond);  
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
