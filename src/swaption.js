
(function(library){

        library.swaption=function(instrument){
                this.phi=instrument.is_payer ? -1 : 1;
                this.sign=instrument.is_short ? -1 : 1;
                this.maturity=library.get_initialised_date(instrument.maturity);       
                if(!this.maturity)
                        throw new Error("swaption: must provide valid maturity date.");
                this.swap_fixed_leg=new library.simple_fixed_income({
                        notional: instrument.notional,
                        maturity: instrument.maturity,
                        fixed_rate: instrument.fixed_rate,
                        tenor: instrument.fixed_tenor,
                        effective_date: instrument.expiry,
                        calendar: instrument.calendar,
                        bdc: instrument.fixed_bdc,
                        dcc: instrument.fixed_dcc
                });
                this.swap_fixed_leg_1bp=new library.simple_fixed_income({
                        notional: instrument.notional,
                        maturity: instrument.maturity,
                        fixed_rate: 0.0001,
                        tenor: instrument.fixed_tenor,
                        effective_date: instrument.expiry,
                        calendar: instrument.calendar,
                        bdc: instrument.fixed_bdc,
                        dcc: instrument.fixed_dcc
                });
                
                this.swap_float_leg=new library.simple_fixed_income({
                        notional: - instrument.notional,
                        maturity: instrument.maturity,
                        float_spread: instrument.float_spread,
                        tenor: instrument.float_tenor,
                        effective_date: instrument.expiry,
                        calendar: instrument.calendar,
                        bdc: instrument.float_bdc,
                        dcc: instrument.float_dcc,
                        current_rate: instrument.float_current_rate
                });
                this.expiry=library.get_initialised_date(instrument.expiry);
                if(!this.expiry)
                        throw new Error("swaption: must provide valid expiry date.");
                

        };

        library.swaption.prototype.present_value=function(disc_curve, fwd_curve, vol_surface){
                if (null===library.valuation_date) throw new Error("swaption.present_value: valuation_date must be set");
                
                //obtain times
                var default_yf=library.year_fraction_factory(null);
                var t_maturity=default_yf(library.valuation_date, this.maturity);
                var t_expiry=default_yf(library.valuation_date, this.expiry);
                var t_term=t_maturity-t_expiry;
                if (t_term<1/512){
                        return 0;
                }       
                //obtain fwd rate, that is, fair swap rate
                var pv_notional=library.get_df(disc_curve, t_maturity)*this.swap_fixed_leg.notional;
                var pv_float=this.swap_float_leg.present_value(disc_curve, null, fwd_curve)+pv_notional;
                var pv_fix=this.swap_fixed_leg.present_value(disc_curve, null, null)-pv_notional;
                var annuity=(this.swap_fixed_leg_1bp.present_value(disc_curve, null, null)-pv_notional) / 0.0001;
                var fair_rate=-pv_float/annuity;
                
                //obtain volatility in terms of standard deviation
                var std_dev=library.get_surface_rate(vol_surface, t_expiry, t_term)*Math.sqrt(t_expiry);
                
                var res;
                if (t_expiry<1/512 || std_dev<0.0001){
                        //degenerate case where swaption is already expiring or volatility is very low
                        res=Math.max(this.phi*(this.swap_fixed_leg.fixed_rate - fair_rate), 0);
                }else{
                //bachelier formula      
                        var d1 = (this.swap_fixed_leg.fixed_rate - fair_rate) / std_dev;
                        res=this.phi*(this.swap_fixed_leg.fixed_rate - fair_rate)*library.cndf(this.phi*d1)+std_dev*library.ndf(d1);
                }
                res*=annuity;
                res*=this.sign;
                //res*=library.get_df(disc_curve, t_expiry);
                return res;
        };
 
        library.pricer_swaption=function(swaption, disc_curve, fwd_curve, vol_surface){
                var swaption_internal=new library.swaption(swaption);
                return swaption_internal.present_value(disc_curve, fwd_curve, vol_surface);
        };

}(this.JsonRisk || module.exports));

