
(function(library){
        
        library.fix_cash_flows=function(schedule, bdc, is_holiday_func, year_fraction_func, notional, rate ){
                if (null===library.valuation_date) throw new Error("fix_cash_flows: valuation_date must be set");
                var dates=new Array(schedule.length-1);
                var times=new Array(schedule.length-1);
                var amounts=new Array(schedule.length-1);
                var i;
                var adj=function(d){
                        return library.adjust(d,bdc,is_holiday_func);
                };
                var default_yf=library.year_fraction_factory(null);
                for(i=1;i<schedule.length;i++){
                        dates[i-1]=adj(schedule[i]);
                        times[i-1]=default_yf(library.valuation_date,dates[i-1]);
                        amounts[i-1]=notional*rate*year_fraction_func(schedule[i-1],schedule[i]);
                }
                amounts[amounts.length-1]+=notional;
                return {schedule: schedule, dates: dates, amounts: amounts, times: times};
        };
        
        library.float_cash_flows=function(schedule, bdc, is_holiday_func, year_fraction_func, notional, current_rate, float_spread, fwd_curve ){
                if (null===library.valuation_date) throw new Error("float_cash_flows: valuation_date must be set");
                var dates=new Array(schedule.length-1);
                var times=new Array(schedule.length-1);
                var amounts=new Array(schedule.length-1);
                var i;
                var rate;
                var adj=function(d){
                        return library.adjust(d,bdc,is_holiday_func);
                };
                var default_yf=library.year_fraction_factory(null);
                for(i=1;i<schedule.length;i++){
                        if(1==i){
                                amounts[i-1]=notional*current_rate*year_fraction_func(schedule[i-1],schedule[i]);
                        }
                        dates[i-1]=adj(schedule[i]);
                        times[i-1]=default_yf(library.valuation_date,dates[i-1]);
                }
                library.update_float_cash_flows({schedule: schedule, dates: dates, amounts: amounts});
                return {schedule: schedule, dates: dates, amounts: amounts, times: times};
        };
        
        library.update_float_cash_flows=function(cf_obj,year_fraction_func, notional, float_spread, fwd_curve){
                var i;
                for(i=2;i<cf_obj.schedule.length;i++){ //i=1 is fixed, i=0 is before valuation date
                        cf_obj.amounts[i-1]=notional*library.get_fwd_amount(fwd_curve,cf_obj.schedule[i-1],cf_obj.schedule[i])*yf(cf_obj.schedule[i-1],cf_obj.schedule[i]);
                }
                cf_obj.amounts[cf_obj.amounts.length]+=notional;
        };
        
        library.dcf=function(cf_obj, disc_curve, spread_curve, residual_spread, settlement_date){
                if (null===library.valuation_date) throw new Error("dcf: valuation_date must be set");
                //fallbacks
                if(null==disc_curve) disc_curve=library.get_const_curve(0);
                if(null==spread_curve) spread_curve=library.get_const_curve(0);
                if(typeof residual_spread !== "number") residual_spread=0;
                var sd=(settlement_date instanceof Date)? settlement_date : library.valuation_date;

                //sanity checks
                if (undefined===cf_obj.times || undefined===cf_obj.amounts) throw new Error("dcf: invalid cashflow object");
                if (cf_obj.times.length !== cf_obj.amounts.length) throw new Error("dcf: invalid cashflow object");
                
                var res=0;
                var i=0;
                var dr;
                var sr;
                var df;
                while(cf_obj.dates[i]<=sd) i++;
                while (i<cf_obj.times.length){
                        dr=library.get_rate(disc_curve,cf_obj.times[i]);
                        sr=library.get_rate(spread_curve,cf_obj.times[i]);
                        df=Math.pow(1+dr+sr+residual_spread,-cf_obj.times[i]); 
                        res+=cf_obj.amounts[i]*df;
                        i++;
                }
                return res;
        };


}(this.JsonRisk || module.exports));
