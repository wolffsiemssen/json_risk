
(function(library){

       library.swap=function(instrument){
                this.phi=instrument.is_payer ? -1 : 1;
                
                this.fixed_rate=instrument.fixed_rate;
                //the fixed leg of the swap
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
