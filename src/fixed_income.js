
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
                //cuve initialisation and fallbacks
                var dc=library.get_initialised_curve(disc_curve);
                var sc=library.get_initialised_curve(spread_curve);
                if(typeof residual_spread !== "number") residual_spread=0;
                var sd=library.get_initialised_date(settlement_date);
                if (!sd) sd=library.valuation_date;

                //sanity checks
                if (undefined===cf_obj.times || undefined===cf_obj.amounts) throw new Error("dcf: invalid cashflow object");
                if (cf_obj.times.length !== cf_obj.amounts.length) throw new Error("dcf: invalid cashflow object");
                
                var res=0;
                var i=0;
                var df_d;
                var df_s;
                var df_res;
                while(cf_obj.dates[i]<=sd) i++;
                while (i<cf_obj.times.length){
                        df_d=library.get_df(dc,cf_obj.times[i]);
                        df_s=library.get_df(sc,cf_obj.times[i]);
                        df_res=Math.exp(-cf_obj.times[i]*residual_spread);
                        res+=cf_obj.amounts[i]*df_d*df_s*df_res;
                        i++;
                }
                return res;
        };

        library.fixed_income=function(instrument){
                var maturity=library.get_initialised_date(instrument.maturity);       
                if(!maturity)
                        throw new Error("fixed_income: must provide maturity date.");
                        
                if(typeof instrument.notional !== 'number')
                        throw new Error("fixed_income: must provide valid notional.");
                this.notional=instrument.notional;
                
                if(typeof instrument.tenor !== 'number')
                        throw new Error("fixed_income: must provide valid tenor.");
                
                if(instrument.tenor < 0 || instrument.tenor!==Math.floor(instrument.tenor))
                        throw new Error("fixed_income: must provide valid tenor.");
                var tenor=instrument.tenor;
                
                this.type=(typeof instrument.type==='string') ? instrument.type : 'unknown';
                
                this.is_holiday_func=library.is_holiday_factory(instrument.calendar || "");
                this.year_fraction_func=library.year_fraction_factory(instrument.dcc || "");
                this.bdc=instrument.bdc || "";
                var effective_date=library.get_initialised_date(instrument.effective_date); //null allowed
                var first_date=library.get_initialised_date(instrument.first_date); //null allowed
                var next_to_last_date=library.get_initialised_date(instrument.next_to_last_date); //null allowed
                var settlement_days=(typeof instrument.settlement_days==='number') ? instrument.settlement_days: 0;
                this.settlement_date=library.adjust(library.add_days(library.valuation_date,
                                                                    settlement_days),
                                                                    "following",
                                                                    this.is_holiday_func);
                var residual_spread=(typeof instrument.residual_spread=='number') ? instrument.residual_spread : 0;
                var currency=instrument.currency || "";


                if(typeof instrument.fixed_rate === 'number'){
                        //fixed rate instrument
                        this.is_float=false;
                        this.fixed_rate=instrument.fixed_rate;
                }else{
                        //floating rate instrument
                        this.is_float=true;
                        this.float_spread=(typeof instrument.float_spread === 'number') ? instrument.float_spread : 0;
                }
                
                this.schedule=library.backward_schedule(effective_date, 
                                                 maturity,
                                                 tenor,
                                                 this.is_holiday_func,
                                                 this.bdc,
                                                 first_date,
                                                 next_to_last_date);

                this.cash_flows=null;
                if(!this.is_float) this.cash_flows=library.fix_cash_flows(this.schedule,
                                                                    this.bdc,
                                                                    this.is_holiday_func,
                                                                    this.year_fraction_func,
                                                                    this.notional,
                                                                    this.fixed_rate);
        };

        
        library.fixed_income.prototype.get_cash_flows=function(fwd_curve){
                if (this.is_float) return library.float_cash_flows(this.schedule,
                                                              this.bdc,
                                                              this.is_holiday_func,
                                                              this.year_fraction_func,
                                                              this.notional,
                                                              this.current_rate,
                                                              this.float_spread,
                                                              fwd_curve );
                return this.cash_flows;
        };
        
        library.fixed_income.prototype.get_present_value=function(disc_curve, spread_curve, fwd_curve){
                return library.dcf(this.get_cash_flows(),
                                   disc_curve,
                                   spread_curve,
                                   this.residual_spread,
                                   this.settlement_date);
        };

}(this.JsonRisk || module.exports));
