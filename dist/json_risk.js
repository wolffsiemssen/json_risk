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

        JsonRisk.pricer=function(instrument, parameters){

                return null;
                
        };

        
        
        return JsonRisk;

}));
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
                if (curve.dfs) return curve.dfs[i];
                if (curve.zcs) return Math.pow(1+curve.zcs[i],-get_time_at(curve,i));
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


}(this.JsonRisk || module.exports));
;
(function(library){

       library.fxterm=function(instrument){
                
                //the near payment of the swap
                this.near_leg=new library.simple_fixed_income({
                        notional: instrument.notional, // negative if first leg is pay leg
                        maturity: instrument.maturity,
                        fixed_rate: 0,
                        tenor: 0
                });
                
                //the far payment of the swap
                if (typeof(instrument.notional_2) === "number" && library.get_safe_date(instrument.maturity_2)){
                        this.far_leg=new library.simple_fixed_income({
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
;
(function(library){
        
 
        library.irregular_fixed_income=function(instrument){
                
                var maturity=library.get_safe_date(instrument.maturity);       
                if(!maturity)
                        throw new Error("irregular_fixed_income: must provide maturity date.");
                        
                if(typeof instrument.notional !== 'number')
                        throw new Error("irregular_fixed_income: must provide valid notional.");
                this.notional=instrument.notional;
                
                if(typeof instrument.tenor !== 'number')
                        throw new Error("irregular_fixed_income: must provide valid tenor.");
                
                if(instrument.tenor < 0 || instrument.tenor!==Math.floor(instrument.tenor))
                        throw new Error("irregular_fixed_income: must provide valid tenor.");
                var tenor=instrument.tenor;
            
                this.amortization = typeof(instrument.amortization) === 'string' ? instrument.amortization.toLowerCase(): 'bullet';

                //parameters for amortising instruments
                var repay_tenor=instrument.repay_tenor;     
                if(this.amortization==="annuity" || this.amortization==="stepdown") {
                
                        if(instrument.repay_tenor < 0 || instrument.repay_tenor!==Math.floor(instrument.repay_tenor))
                                throw new Error("irregular_fixed_income: must provide valid repay_tenor.");
                        repay_tenor=instrument.repay_tenor;
                    
                        this.repay_amount = instrument.repay_amount;
                }else{
                        this.repay_amount= 0;
                }
                this.current_accrued_interest = instrument.current_accrued_interest || 0.0;
            
            
                this.type=(typeof instrument.type==='string') ? instrument.type : 'unknown';  // AG what is instrument.type, something like "loan" or "deposit" ?
                
                this.is_holiday_func=library.is_holiday_factory(instrument.calendar || "");
                this.year_fraction_func=library.year_fraction_factory(instrument.dcc || "");
                this.bdc=instrument.bdc || "";
                var effective_date=library.get_safe_date(instrument.effective_date); //null allowed
                var first_date=library.get_safe_date(instrument.first_date); //null allowed
                var next_to_last_date=library.get_safe_date(instrument.next_to_last_date); //null allowed
            
            
            // AG addition
            
                var repay_first_date=library.get_safe_date(instrument.repay_first_date); //null allowed
                var repay_next_to_last_date=library.get_safe_date(instrument.repay_next_to_last_date); //null allowed
            
                var fixing_first_date=library.get_safe_date(instrument.fixing_first_date); //null allowed
                var fixing_next_to_last_date=library.get_safe_date(instrument.fixing_next_to_last_date); //null allowed
            
                if(instrument.conditions_valid_until != null){ 
                    this.conditions_valid_until = new Array(instrument.conditions_valid_until.length-1);
                    for(i=0;i<instrument.conditions_valid_until;i++){
                                this.conditions_valid_until[i]=
                                    library.get_safe_date(instrument.conditions_valid_until[i]);
                                }
                    }
            
            // AG addition end
            
            
            
                var settlement_days=(typeof instrument.settlement_days==='number') ? instrument.settlement_days: 0;
                this.settlement_date=library.adjust(library.add_days(library.valuation_date,
                                                                    settlement_days),
                                                                    "following",
                                                                    this.is_holiday_func);
                var residual_spread=(typeof instrument.residual_spread=='number') ? instrument.residual_spread : 0;
                var currency=instrument.currency || "";


                if(typeof instrument.fixed_rate === 'number' || instrument.fixed_rate.length>1  /* AG account for multiconditions*/){
                        //fixed rate instrument
                        this.is_float=false;
                        this.fixed_rate=instrument.fixed_rate;
                        this.fixing_tenor=0;
                }else{
                        //floating rate instrument
                        this.is_float=true;
                        this.float_spread=(typeof instrument.float_spread === 'number' || instrument.float_spread.length>1 /*AG account for multiconditions*/) ? instrument.float_spread : 0;
                        if(typeof instrument.current_rate !== 'number')
                                throw new Error("irregular_fixed_income: must provide valid current_rate.");
                        this.current_rate=instrument.current_rate;                 
                    
                        // AG addition to floater constructor
                    
                        this.cap_rate = instrument.cap_rate; // can be number or array, entries can be null
                        this.floor_rate = instrument.floor_rate; // can be number or array, entries can be null
                    
                        this.fixing_tenor = instrument.fixing_tenor;
                        this.fixing_first_date = library.get_safe_date(instrument.fixing_first_date);
                        this.fixing_next_to_last_date = library.get_safe_date(instrument.fixing_next_to_last_date);
                    
                        // AG end of addition to floater constructor
                    
                }
                
                this.schedule=library.backward_schedule(effective_date, 
                                                 maturity,
                                                 tenor,
                                                 this.is_holiday_func,
                                                 this.bdc,
                                                 first_date,
                                                 next_to_last_date);
            
            
            // AG modified
            
            
                if(this.is_float==true){
                                        this.fixing_schedule = 
                                                library.backward_schedule(this.fixing_first_date,this.fixing_next_to_last_date,this.fixing_tenor,
                                                        this.is_holiday_func,this.bdc,this.fixing_first_date,this.fixing_next_to_last_date);
                                        }

                          
                this.repay_schedule = library.backward_schedule(effective_date, 
                                                     maturity,
                                                     repay_tenor,
                                                     this.is_holiday_func,
                                                     this.bdc,
                                                     repay_first_date,
                                                     repay_next_to_last_date);
            
                this.merged_schedule = this.get_merged_schedule(this.schedule,this.repay_schedule,this.is_float,tenor,this.fixing_tenor,fixing_first_date);
            
                this.cash_flows=this.fixflt_cash_flows(this.merged_schedule, 
                                                       this.bdc,
                                                       this.is_holiday_func,
                                                       this.year_fraction_func,
                                                       this.notional,
                                                       (this.is_float) ? this.current_rate : this.fixed_rate,
                                                       null);
            
       
           
            // AG end of modification and addition
                        
            
        };

        library.irregular_fixed_income.prototype.fixflt_cash_flows=function(schedule, bdc, is_holiday_func, year_fraction_func, notional, rate,fwd_curve ){
            
            
                if (null===library.valuation_date) throw new Error("fix_cash_flows: valuation_date must be set");
            
                var default_yf=library.year_fraction_factory(null);

                var current_principal=new Array(schedule.date_accrual_start.length-1);
                var interest_current_period=new Array(schedule.date_accrual_start.length-1);
                var accrued_interest=new Array(schedule.date_accrual_start.length-1);
                var pmt_principal=new Array(schedule.date_accrual_start.length-1);
                var pmt_interest=new Array(schedule.date_accrual_start.length-1);
                var pmt_total=new Array(schedule.date_accrual_start.length-1);
            
            
            
                    /* introduce temporary workable and
                                    overridable variables */
                
                this.temp_rate = rate || rate[0];  
                this.temp_notional = notional;  
                this.temp_int_accrual = this.current_accrued_interest;  
                this.temp_payment = this.repay_amount || this.repay_amount[0];  
                this.temp_amortization = this.amortization || this.amortization[0];  
                
                
                if(this.is_float==true){
                    //this.float_rate_series = this.create_float_rate_series(fwd_curve);
                    this.float_rate_series = this.get_fwd_rate_series(fwd_curve);
                    this.rate_pos = 0;
                    
                    if (this.float_spread != null){
                        this.temp_float_spread = this.float_spread || this.float_spread[0];
                    }
                    
                    if (this.cap_rate != null) {
                        this.temp_cap_rate = this.cap_rate || this.cap_rate[0]; // consider it can be an array, replaces this.actual_cap in cf_step 
                    }
                    if (this.floor_rate != null) {
                        this.temp_floor_rate = this.floor_rate || this.floor_rate[0]; // consider it can be an array, replaces this.actual_cap in cf_step 
                    }
                    
                    
                }
                
                    //then do the following loop of computations
            
            
                var pos_condition_series = 0;        
                                    
                for (var j = 0; j < schedule.date_accrual_start.length; j++ ) {
                    
                                 if (schedule.is_condition_date[j]==true)  {
                                        pos_condition_series++; 
                                        this.temp_amortization = this.amortization[pos_condition_series] ;  
                                        this.temp_payment = this.repay_amount[pos_condition_series] ; 
                                                                /*if end date is condition date go one position further
                                                                in the conditions series and override the amortization 
                                                                conditions for interest and notional payment, not for rate calculation*/
                                 }
                    
                                 cf_step= this.cf_step(this.temp_notional,this.temp_int_accrual,
                                                       schedule.date_accrual_start[j],
                                                       schedule.date_accrual_end[j],
                                                       schedule.is_interest_date[j],
                                                       schedule.is_repay_date[j],
                                                       schedule.is_fixing_date[j],
                                                       schedule.is_condition_date[j],
                                                       
                                                       year_fraction_func,this.temp_rate,this.temp_amortization,this.temp_payment);
                    
                
                       // write the [j].th entries of the market-dependent part of the table as computed by cf_step function
                    
                        current_principal[j]=cf_step.current_principal;
                        interest_current_period[j]=cf_step.interest_current_period;
                        accrued_interest[j]=cf_step.accrued_interest;
                        pmt_principal[j]=cf_step.pmt_principal;
                        pmt_interest[j]=cf_step.pmt_interest;
                        pmt_total[j]=cf_step.pmt_principal + cf_step.pmt_interest; 
                    
                    /*At each change of deal conditions this.rate and the amortization must be appropriately updated before the next cashflow computation step. This is done by the following code*/
              
                    if (schedule.is_condition_date==true) { 
                
                
                         this.temp_amortization = this.amortization[pos_condition_series] ;  
                                /* pos_condition_series is the index of the new condition properties in the condition array */
                         this.temp_rate = rate[pos_condition_series]? rate[pos_condition_series] : this.temp_rate ;                            
                                       /*in this way the rate is changed only if there is a new condition rate. In particular, this allows
                                       floaters to deal correctly situations in which the next fixing may occur either before or after a new
                                       condition date*/
                         this.temp_payment = this.repay_amount[pos_condition_series] ; 
                          
                       
                     }      /*  update condition deal conditions at condition date, before beginning of new condition  */
     
                    
                    
                    
                    
                if (this.is_float == true)  { 
                
                            /*the cf_step method always uses this.rate for the computations. In case of floaters, this quantity already includes the spread, cap and floor contribution. After each computation, its value must be appropriately updated before the next cashflow computation step. This is done by the following code*/


                                            if (schedule.is_fixing_date[j]==true) {  

                                                this.temp_rate = this.float_rate_series[this.rate_pos]; 
                                                if(this.rate_pos < this.float_rate_series.length-1) this.rate_pos++; 
                                                            }



                            if (schedule.is_condition_date[j]==true){ /* update temporary spread cap and floor*/  

                                                this.temp_float_spread = this.float_spread[pos_condition_series];
                                                this.temp_cap_rate = this.cap_rate[pos_condition_series];
                                                this.temp_floor_rate = this.floor_rate[pos_condition_series];

                            }/* pos_condition_series is the index of the new condition properties in the array of conditions */

                            if (isNaN(this.temp_floor_rate)&&isNaN(this.temp_cap_rate)) {this.temp_rate += (this.temp_float_spread||0);}

                                            else if (isNaN(this.temp_floor_rate)&&((typeof this.temp_cap_rate)=="number")) {
                                                    this.temp_rate = Math.max(this.temp_rate,this.temp_cap_rate - (this.temp_float_spread||0))+(this.temp_float_spread||0);
                                                                            }
                                            else if (isNaN(this.temp_cap_rate)&&((typeof this.temp_floor_rate)=="number")) {
                                                    this.temp_rate = Math.min(this.temp_rate,this.temp_floor_rate - (this.temp_float_spread||0))+(this.temp_float_spread||0);
                                                                            }

                                            else {
                                                        this.temp_rate = Math.min(Math.max(this.temp_rate,this.temp_floor_rate- (this.temp_float_spread||0)),this.temp_cap_rate - (this.temp_float_spread||0) )+(this.temp_spread_spread||0);
                                                     }

                      
                    } // end line if floater condition    
                           
                
                }// end of the for j loop
                       
            
            // finally output to the cashflow object
                
                return {
                        date_accrual_start: schedule.date_accrual_start,
                        date_accrual_end: schedule.date_accrual_end,
                        date_pmt: schedule.date_pmt,
                        t_accrual_start: schedule.t_accrual_start,
                        t_accrual_end: schedule.t_accrual_end,
                        t_pmt: schedule.t_pmt,
                        is_interest_date: schedule.is_interest_date,
                        is_repay_date: schedule.is_repay_date,
                        is_fixing_date: schedule.is_fixing_date,
                        is_condition_date: schedule.is_condition_date,
                    
                        current_principal: current_principal,
                        interest_current_period: interest_current_period,
                        accrued_interest: accrued_interest,
                        pmt_principal: pmt_principal,
                        pmt_interest: pmt_interest,
                        pmt_total: pmt_total
                };          
                
        };
        
        library.irregular_fixed_income.prototype.get_cash_flows=function(fwd_curve){
            
           
            return this.cash_flows;
                    
            
        };
        
        library.irregular_fixed_income.prototype.present_value=function(disc_curve, spread_curve, fwd_curve){
                return library.dcf(this.get_cash_flows(fwd_curve || null),
                                   disc_curve,
                                   spread_curve,
                                   this.residual_spread,
                                   this.settlement_date);
        };
        
         library.pricer_loan=function(loan, disc_curve, spread_curve, fwd_curve){
                var loan_internal=new library.irregular_fixed_income(loan);
                return loan_internal.present_value(disc_curve, spread_curve, fwd_curve);
        };
    
    
    
    //AG methods
    
    library.irregular_fixed_income.prototype.get_merged_schedule = function(interest_schedule,repay_schedule,is_float,tenor,fixing_tenor,fixing_first_date){
        
        
                var ft_ratio = fixing_tenor / tenor;
                   
                var schedul =[];
                    for(var p=0; p< interest_schedule.length; p++) schedul.push([interest_schedule[p],0]);  
                    for(var q=0; q< repay_schedule.length; q++) schedul.push([repay_schedule[q],1]); 
                    /* collects interest and notional schedules together*/
        
                if (this.conditions_valid_until != null){
                    if (this.conditions_valid_until.length > 1){
                                for (var j=0;j<this.conditions_valid_until.length-1;j++) schedul.push([this.conditions_valid_until[j],0.5,j]);
                                }
                    } /* adds condition dates with array condition number, 0.5 is just chosen to be different from the other indices. maturity does not belong to the array */
        
                
                schedul.sort(function(a,b) {if (a[0] > b[0]) return 1; if (a[0] < b[0]) return -1; return 0;});/* sort by increasing date*/
      
               /* the following code merges interest and notional schedules into a unique series with index, and indexes condition dates with
                        a second index, whose value is the condition number, starting from 0 (first condition) */ 
    
                        for (var l = 0; l < schedul.length - 1; l++) {
                        
                                  
                               while ((schedul[l+1]) && Math.abs(schedul[l][0]-schedul[l+1][0]) < 1000) {  
                                   /* equality of dates up to one second*/
                  
                                       if (schedul[l].length == 2 && schedul[l+1].length == 2) 
                                            { 
                                              schedul[l] = [schedul[l][0],2];
                                              schedul.splice(l+1,1); 
                                             }
                                       else if( schedul[l+1].length == 3 ) 
                                            { 
                                              schedul[l] = [schedul[l][0],schedul[l][1],schedul[l+1][2]];
                                              schedul.splice(l+1,1);                  
                                            }
                                       else if( schedul[l].length == 3 ) 
                                            { 
                                              schedul[l] = [schedul[l+1][0],schedul[l+1][1],schedul[l][2]];
                                              schedul.splice(l+1,1); 
                                            }  // end line if */ 
                        
                                   }  // end line while
                            
                                }    // end line for        
                    
                    
                    /* the code of above eliminates double dates, joining into a single date with interest and notional index
                        interest date = 0, notional date = 1, interest AND notional date = 2
                         takes condition dates into account with a second index */
        
     
        if (null===library.valuation_date) throw new Error("fix_cash_flows: valuation_date must be set");
        
        var length = schedul.length-1;
        var default_yf = library.year_fraction_factory(null);
        
        
        var date_accrual_start=new Array(length);
        var date_accrual_end=new Array(length);
        var date_pmt=new Array(length);        
        var t_accrual_start=new Array(length);
        var t_accrual_end=new Array(length);
        var t_pmt=new Array(length);       
        var is_interest_date=new Array(length);
        var is_repay_date=new Array(length);
        var is_fixing_date=new Array(length);
        var is_condition_date=new Array(length);
        
        var adj=function(d){
                        return library.adjust(d,this.bdc,this.is_holiday_func);
                };
        
        
       for (var i=0;i<length;i++){
            date_accrual_start[i]=schedul[i][0];
            date_accrual_end[i]=schedul[i+1][0];
            date_pmt[i]= ((schedul[i+1][1] <= 0) || (schedul[i+1][1] == 1) || (schedul[i+1][1] >= 2)) ? 
                                        adj(schedul[i+1][0]): null;
            t_accrual_start[i]=default_yf(library.valuation_date,schedul[i][0]);
            t_accrual_end[i]=default_yf(library.valuation_date,schedul[i+1][0]);
            t_pmt[i]=(date_pmt[i] != null) ? default_yf(library.valuation_date,date_pmt[i]) :null;
            is_interest_date[i]= ((schedul[i+1][1] <= 0) || (schedul[i+1][1] >= 2)) ? true: false;
            is_repay_date[i]= ((schedul[i+1][1] == 1) || (schedul[i+1][1] >= 2)) ? true: false;
            is_fixing_date[i]= false; 
            is_condition_date[i]= (schedul[i+1].length == 3) ? true: false;       
        }
        
        
        
                    /* here below floater fixing dates are implemented */
        
        if (is_float == true) {
            
            /*determine first interest date after next fixing*/
            
                        var index_next_fixing;
                        var condition_next_fixing;
            
                        for (var r=0; r< length;r++) {
                            
                            if (is_interest_date[r]==true) {
                                if ((date_accrual_end[r] - fixing_first_date)>1000) {
                                                              index_next_fixing = r; 
                                                              break;} 
                                                            } 
                                               }
     
                        condition_next_fixing = 2*ft_ratio -1; 
                                 
            // set index for any interest date which is also fixing date by looping over just the interest dates 
            
                        for (var s=0;s< length;s++)  {
                            if ((is_interest_date[s]==true) && (s >= index_next_fixing)) {
                                condition_next_fixing++;     
                                /*at any interest date condition_next_fixing increases by one, and only when it reaches the next multiple of
                                fixing/interest tenor the date is indexed as next fixing date*/
                                if ((condition_next_fixing % ft_ratio) == 0){  
                                    is_fixing_date = true;
                                }      
                            }     
                        }
                    }  
                                
        

        return {
            date_accrual_start: date_accrual_start,
            date_accrual_end: date_accrual_end,
            date_pmt: date_pmt,
            t_accrual_start: t_accrual_start,
            t_accrual_end: t_accrual_end,
            t_pmt: t_pmt,
            is_interest_date: is_interest_date,
            is_repay_date: is_repay_date,
            is_fixing_date: is_fixing_date,
            is_condition_date: is_condition_date
        };
        
      
            
    };  
   
    
    
    library.irregular_fixed_income.prototype.get_fwd_rate_series = function(fwd_curve){
        
                var default_yf=library.year_fraction_factory(null);
                var rate_series=[];
                for(var i =0; i < this.fixing_schedule.length-1; i++  ) {
                                     // the following works if valuation_date < fixing_first_date
                    
                    if ((this.fixing_schedule[i]-library.valuation_date) > 1000) {
                        rate_series.push(library.get_fwd_rate(fwd_curve, default_yf(library.valuation_date,this.fixing_schedule[i]),
                                                        default_yf(library.valuation_date,this.fixing_schedule[i+1]))) ;
                                                        }
                                              } 
                return rate_series;
    }; 
    
    
    
    
    library.irregular_fixed_income.prototype.cf_step = function(notional,int_acc,
                                                                 start_date,
                                                                 end_date,
                                                                 is_interest_date,
                                                                 is_repay_date,
                                                                 is_fixing_date,
                                                                 is_condition_date,
                                                                 year_fraction_func,rate,amort_type,payment){
             var Nnew;
             var Int;
             var Int_step;
             var NPayment;
             var IPayment;
             var effPayment=0; // effective annuity payment (can differ from the established payment, e.g. if notional <= 0)   
     
            switch(amort_type){
                    case 'bullet':  // no interest capitalization
                
                            Int_step = notional * year_fraction_func(start_date,end_date)*rate;
                            Int = int_acc + Int_step;
                            Nnew = notional;
                            IPayment = is_interest_date==true ? (Int + int_acc) : 0;                             
                            int_acc = (is_condition_date==true && is_interest_date==false) ? Int : 0; 
                            /* at the first interest payment date, accrued interest is set to zero for all the next computations;
                            at condition change date which is not interest date interest is cumulated. is_repay_date boolean is here irrelevant */
                            NPayment = 0;
            
                    break;
                
                
                    case 'capitalization': // bullet with interest capitalization
        
                            Int_step = notional * year_fraction_func(start_date,end_date)*rate;
                            Int = int_acc + Int_step;
                            Nnew = (is_condition_date== true && is_interest_date==false) ? notional: Math.max(notional + Int, 0);
                            /* if date is condition change date but not interest date the notional remains unvaried, otherwise
                            interest is capitalized */              
                            int_acc =  (is_interest_date == false) ? Int : 0;
                            /* if date is not interest (capitalization) date, interest is accrued, for instance at a condition change date,
                            otherwise it is capitalized and not accrued.is_repay_date boolean is here irrelevant */
                
             
                            IPayment = 0;
                            NPayment = 0;
                            
                    break;
                   
                    case 'stepdown': // interest is not capitalized
                            Int_step = notional * year_fraction_func(start_date,end_date)*rate;
                            Int = int_acc + Int_step;
                            Nnew = is_repay_date==true ? Math.max(notional - payment, 0) : notional;  
                            NPayment = is_repay_date == true ? Math.min(payment,notional) : 0; 
                            IPayment = is_interest_date == true ? Int : 0;
                            int_acc = is_interest_date == false ? Int : 0; 
                            /*if interest is not paid, it is cumulated */
                    break;
        

                    case 'annuity': // interest is capitalized
                            Int_step = notional * year_fraction_func(start_date,end_date)*rate;
                            Int = int_acc + Int_step;
                            if (is_repay_date==true && is_interest_date==false) {
                                Nnew = Math.max(notional - payment, 0);
                                } /* only notional payment date */
                            else if (is_repay_date==true && is_interest_date==true) {
                                Nnew = Math.max(notional + Int - payment, 0);
                                } /* notional payment and interest capitalization date */
                            else if (is_repay_date==false && is_interest_date==true) {
                                Nnew = Math.max(notional + Int,0);
                                } /* only interest capitalization date */
                            else {Nnew = notional;} /* if it is neither principal nor interest date, but just condition change date */
                            effPayment = is_repay_date==true  ? Math.min(payment, notional + Int) : 0;
                            int_acc = is_interest_date==false ? Int : 0; 
                            /* if date is not interest capitalization date, 
                            interest is cumulated. This occurs when date is only principal payment date, or only condition change date */
                            NPayment = effPayment;
                            IPayment = 0;           
                    break;
           
                    default: throw new Error("invalid amortization type parameter.");
                         
                }  // end line of switch amort_type cases
        
       
        
           
     
            this.temp_notional = Nnew;
            this.temp_int_accrual = int_acc;     
     
     
        
                return {
                         
                    
                         current_principal:  (this.type == "deposit") ? -notional: notional,  /* notional used to compute the interest*/ 
                         interest_current_period: (this.type == "deposit") ? -Int_step: Int_step, /* the interest pruduced from start to end date of the period */
                         accrued_interest: (this.type == "deposit") ? -int_acc: int_acc, /* the cumulated interest */
                         pmt_principal: (this.type == "deposit") ? -NPayment: NPayment,
                         pmt_interest: (this.type == "deposit") ? -IPayment: IPayment
                        };
     
    }; 
    
       
    
    //AG methods end

}(this.JsonRisk || module.exports));
;
(function(library){
        
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
                }else{
                        c=0;
                }
                return x<=0.0 ? c : 1-c;
        };
        
        library.find_root_secant=function(func, start, next, max_iter, threshold){
                var x=start, xnext=next, xtemp=0, iter=max_iter||20, t=threshold||0.000000001;
                var f=0, fnext=1;
                while (Math.abs(fnext)>t && Math.abs(fnext-f)>t && iter>0){
                        f=func(x);
                        fnext=func(xnext);
                        xtemp=xnext;
                        xnext=xnext-fnext*(xnext-x)/(fnext-f);
                        x=xtemp;
                        iter--;
                }
                if (iter===0) throw new Error("find_root_secant: failed, too many iterations");
                return xnext;      
        };

}(this.JsonRisk || module.exports));
;
(function(library){
        /*
        
        Schedule functions used by simple and irregular fixed income instruments.
        
        */
        library.backward_schedule=function(eff_dt, maturity, tenor, is_holiday_func, bdc, first_dt, next_to_last_dt){
                if(!(maturity instanceof Date)) throw new Error ("backward_schedule: maturity must be provided");
                if(!(eff_dt instanceof Date)){
                        //effective date is strictly needed if valuation date is not set
                        if (null===library.valuation_date) throw new Error("backward_schedule: if valuation_date is unset, effective date must be provided");
                        //effective date is strictly needed if first date is given
                        if (first_dt instanceof Date) throw new Error("backward_schedule: if first date is provided, effective date must be provided");                                
                }
                if ((eff_dt instanceof Date && maturity<eff_dt) || (library.valuation_date instanceof Date && maturity < library.valuation_date)) 
                        throw new Error("backward_schedule: maturity is before valution or effective date.");
                if(typeof tenor !== "number")
                        throw new Error("backward_schedule: tenor must be a nonnegative integer, e.g., 6 for semiannual schedule, 0 for zerobond/iam schedule");
                if(tenor<0 || Math.floor(tenor) !== tenor)
                        throw new Error("backward_schedule: tenor must be a nonnegative integer, e.g., 6 for semiannual schedule, 0 for zerobond/iam schedule");
                if (0===tenor) return [(eff_dt instanceof Date) ? eff_dt : library.valuation_date, maturity];
                
                var adj=function(d){
                        return library.adjust(d,bdc,is_holiday_func);
                };

                var res=[maturity];
                
                var ref_dt=maturity;

                if (next_to_last_dt instanceof Date && (adj(next_to_last_dt)<adj(maturity))){
                        res.unshift(next_to_last_dt);
                        ref_dt=next_to_last_dt;
                }
                
                //loop rolls out backward until eff_dt, first_dt or valuation_date is preceded
                var dt,n=0;
                while (true){
                        n++;
                        dt=library.add_months(ref_dt, -tenor*n);
                        if(first_dt instanceof Date && dt<first_dt){
                                //stub period to be considered
                                //insert first_dt if not already included
                                if(adj(res[0]).getTime()!==adj(first_dt).getTime()){
                                        res.unshift(first_dt);
                                }
                                //insert effective date which is needed for calculation of first interest payment
                                if(adj(res[0]).getTime()!==adj(eff_dt).getTime()){
                                        res.unshift(eff_dt);
                                }
                                return res;
                        }
                        if(eff_dt instanceof Date && dt<eff_dt){
                                //schedule begins with eff_dt and there is no stub period
                                if(adj(res[0]).getTime()!==adj(eff_dt).getTime()){
                                        res.unshift(eff_dt);
                                }
                                return res;
                        }
                        if(library.valuation_date instanceof Date && dt<library.valuation_date){
                                //if dt is before val date but neither before eff_dt nor first_dt, 
                                //just insert dt in order to calculate first interes payment.
                                res.unshift(dt);
                                //if dt after adjustment lies after valuation date, 
                                //the schedule date before is needed in order to calculate first interest payment.
                                if(adj(dt)>library.valuation_date){
                                        //the schedule date before is either first_dt,
                                        //eff_dt or just the date obtained by rolling back one period more.
                                        n++;
                                        dt=library.add_months(ref_dt, -tenor*n);
                                        if(first_dt instanceof Date && dt<first_dt){
                                                res.unshift(first_dt);
                                        }
                                        else if(eff_dt instanceof Date && dt<eff_dt){
                                                res.unshift(eff_dt);
                                        }
                                        else{
                                                res.unshift(dt);
                                        }
                                        
                                }
                                return res;
                        }
                        res.unshift(dt);    
                }
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
                if (null===library.valuation_date) throw new Error("dcf: valuation_date must be set");
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
                if (null===library.valuation_date) throw new Error("irr: valuation_date must be set");
                if (undefined===payment_on_settlement_date) payment_on_settlement_date=0;
                
                var tset=library.year_fraction_factory(null)(library.valuation_date, settlement_date);
                var func=function(x){
                        return library.dcf(cf_obj,null,null,x, settlement_date)+
                               payment_on_settlement_date*Math.pow(1+x,-tset);
                };
                
                var ret=library.find_root_secant(func,0,0.0001);
                return ret;
        };

        library.simple_fixed_income=function(instrument, include_notional_pmt){
                var maturity=library.get_safe_date(instrument.maturity);       
                if(!maturity)
                        throw new Error("simple_fixed_income: must provide maturity date.");
                        
                if(typeof instrument.notional !== 'number')
                        throw new Error("simple_fixed_income: must provide valid notional.");
                this.notional=instrument.notional;
                
                //include notional payment in cash flows if not explicitely excluded
                this.include_notional_pmt=(include_notional_pmt===false) ? false : true;
                
                if(typeof instrument.tenor !== 'number')
                        throw new Error("simple_fixed_income: must provide valid tenor.");
                
                if(instrument.tenor < 0 || instrument.tenor!==Math.floor(instrument.tenor))
                        throw new Error("simple_fixed_income: must provide valid tenor.");
                var tenor=instrument.tenor;
                
                this.type=(typeof instrument.type==='string') ? instrument.type : 'unknown';
                
                this.is_holiday_func=library.is_holiday_factory(instrument.calendar || "");
                this.year_fraction_func=library.year_fraction_factory(instrument.dcc || "");
                this.bdc=instrument.bdc || "";
                var effective_date=library.get_safe_date(instrument.effective_date); //null allowed
                var first_date=library.get_safe_date(instrument.first_date); //null allowed
                var next_to_last_date=library.get_safe_date(instrument.next_to_last_date); //null allowed
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
                        if(typeof instrument.float_current_rate !== 'number')
                                throw new Error("simple_fixed_income: must provide valid float_current_rate.");
                        this.current_rate=instrument.float_current_rate;
                }
                
                this.schedule=library.backward_schedule(effective_date, 
                                                 maturity,
                                                 tenor,
                                                 this.is_holiday_func,
                                                 this.bdc,
                                                 first_date,
                                                 next_to_last_date);

                this.cash_flows=this.fix_cash_flows(this.schedule,
                                                       this.bdc,
                                                       this.is_holiday_func,
                                                       this.year_fraction_func,
                                                       this.notional,
                                                       (this.is_float) ? this.current_rate : this.fixed_rate);
        };

        library.simple_fixed_income.prototype.fix_cash_flows=function(schedule, bdc, is_holiday_func, year_fraction_func, notional, rate ){
                if (null===library.valuation_date) throw new Error("fix_cash_flows: valuation_date must be set");

                var date_accrual_start=new Array(schedule.length-1);
                var date_accrual_end=new Array(schedule.length-1);
                var date_pmt=new Array(schedule.length-1);
                var t_accrual_start=new Array(schedule.length-1);
                var t_accrual_end=new Array(schedule.length-1);
                var t_pmt=new Array(schedule.length-1);
                var is_interest_date=new Array(schedule.length-1);
                var is_repay_date=new Array(schedule.length-1);
                var is_fixing_date=new Array(schedule.length-1);
                var is_condition_date=new Array(schedule.length-1);
                var current_principal=new Array(schedule.length-1);
                var interest_current_period=new Array(schedule.length-1);
                var accrued_interest=new Array(schedule.length-1);
                var pmt_principal=new Array(schedule.length-1);
                var pmt_interest=new Array(schedule.length-1);
                var pmt_total=new Array(schedule.length-1);
                
                var i;
                var adj=function(d){
                        return library.adjust(d,bdc,is_holiday_func);
                };
                var default_yf=library.year_fraction_factory(null);

                for(i=0;i<schedule.length-1;i++){
                        date_accrual_start[i]=schedule[i];
                        date_accrual_end[i]=schedule[i+1];
                        date_pmt[i]=adj(schedule[i+1]);
                        t_pmt[i]=default_yf(library.valuation_date,date_pmt[i]);
                        t_accrual_start[i]=default_yf(library.valuation_date,schedule[i]);
                        t_accrual_end[i]=default_yf(library.valuation_date,schedule[i+1]);
                        is_interest_date[i]=true;
                        is_repay_date[i]=false;
                        is_fixing_date[i]=false;
                        is_condition_date[i]=false;
                        current_principal[i]=notional;
                        interest_current_period[i]=notional*rate*year_fraction_func(date_accrual_start[i],date_accrual_end[i]);
                        accrued_interest[i]=interest_current_period[i];
                        pmt_principal[i]=0;
                        pmt_interest[i]=interest_current_period[i];
                        pmt_total[i]=pmt_interest[i];
                }
                if (this.include_notional_pmt){
                        pmt_total[schedule.length-2]+=notional;
                        pmt_principal[schedule.length-2]+=notional;
                }
                is_repay_date[schedule.length-2]=true;
                //returns cash flow table object
                return {date_accrual_start: date_accrual_start,
                        date_accrual_end: date_accrual_end,
                        date_pmt: date_pmt,
                        t_accrual_start: t_accrual_start,
                        t_accrual_end: t_accrual_end,
                        t_pmt: t_pmt,
                        is_interest_date: is_interest_date,
                        is_repay_date: is_repay_date,
                        is_fixing_date: is_fixing_date,
                        is_condition_date: is_condition_date,
                        current_principal: current_principal,
                        interest_current_period: interest_current_period,
                        accrued_interest: accrued_interest,
                        pmt_principal: pmt_principal,
                        pmt_interest: pmt_interest,
                        pmt_total: pmt_total
                };
                
        };
        
        library.simple_fixed_income.prototype.get_cash_flows=function(fwd_curve){
                if (!this.is_float) return this.cash_flows;
                
                //recalculate amounts for floater deals
                var c=this.cash_flows;
                var default_yf=library.year_fraction_factory(null);
                                
                var i, rt, interest, n=c.t_pmt.length;
                //start with i=1 as current rate does not need recalculating
                for(i=0;i<n;i++){
                        c.is_fixing_date[i]=true;
                        if (c.date_accrual_start[i] < library.valuation_date){
                                rt=this.current_rate;
                        }else{
                                rt=library.get_fwd_rate(fwd_curve,
                                               default_yf(library.valuation_date,c.date_accrual_start[i]),
                                               default_yf(library.valuation_date,c.date_accrual_end[i]))+
                                               this.float_spread;
                        }
                        interest=this.notional*rt*
                                 this.year_fraction_func(c.date_accrual_start[i],c.date_accrual_end[i]);
                        c.interest_current_period[i]=interest;
                        c.accrued_interest[i]=interest;
                        c.pmt_interest[i]=interest;
                        c.pmt_total[i]=interest;
                }
                if (this.include_notional_pmt) c.pmt_total[n-1]=c.pmt_interest[n-1]+this.notional;

                return c;
        };
        
        library.simple_fixed_income.prototype.present_value=function(disc_curve, spread_curve, fwd_curve){
                return library.dcf(this.get_cash_flows(library.get_safe_curve(fwd_curve) || null),
                                   library.get_safe_curve(disc_curve),
                                   library.get_safe_curve(spread_curve),
                                   this.residual_spread,
                                   this.settlement_date);
        };
        
        library.pricer_bond=function(bond, disc_curve, spread_curve){
                var bond_internal=new library.simple_fixed_income(bond);
                return bond_internal.present_value(disc_curve, spread_curve, null);
        };
        
        library.pricer_floater=function(floater, disc_curve, spread_curve, fwd_curve){
                var floater_internal=new library.simple_fixed_income(floater);
                return floater_internal.present_value(disc_curve, spread_curve, fwd_curve);
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
                this.fixed_leg=new library.simple_fixed_income({
                        notional: instrument.notional * this.phi,
                        maturity: instrument.maturity,
                        fixed_rate: instrument.fixed_rate,
                        tenor: instrument.tenor,
                        effective_date: instrument.effective_date,
                        calendar: instrument.calendar,
                        bdc: instrument.bdc,
                        dcc: instrument.dcc
                }, false);
                
                //include fixed leg with 1bp rate so annuity and fair rate are retrievable even if true rate is zero
                this.fixed_leg_1bp=new library.simple_fixed_income({
                        notional: instrument.notional * this.phi,
                        maturity: instrument.maturity,
                        fixed_rate: 0.0001,
                        tenor: instrument.tenor,
                        effective_date: instrument.effective_date,
                        calendar: instrument.calendar,
                        bdc: instrument.bdc,
                        dcc: instrument.dcc
                }, false);
                
                //the floating rate leg of the swap
                this.float_leg=new library.simple_fixed_income({
                        notional: - instrument.notional * this.phi,
                        maturity: instrument.maturity,
                        float_spread: instrument.float_spread,
                        tenor: instrument.float_tenor,
                        effective_date: instrument.effective_date,
                        calendar: instrument.calendar,
                        bdc: instrument.float_bdc,
                        dcc: instrument.float_dcc,
                        float_current_rate: instrument.float_current_rate
                }, false);
        };
        
        library.swap.prototype.fair_rate=function(disc_curve, fwd_curve){
                //returns fair rate, that is, rate such that swap has zero present value
                var pv_float=this.float_leg.present_value(disc_curve, null, fwd_curve);
                return - this.phi * pv_float / this.annuity(disc_curve);
        };
        
        library.swap.prototype.annuity=function(disc_curve){
                //returns always positive annuity regardless of payer/receiver flag
                return this.fixed_leg_1bp.present_value(disc_curve) * this.phi * 10000;
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
                this.swap=new library.swap(instrument);
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
        
        library.create_equivalent_regular_swaption=function(cf_obj, expiry, original_instrument){
                //sanity checks
                if (undefined===cf_obj.date_pmt || undefined===cf_obj.pmt_total || undefined===cf_obj.current_principal) throw new Error("create_equivalent_regular_swaption: invalid cashflow object");
                if (cf_obj.t_pmt.length !== cf_obj.pmt_total.length || cf_obj.t_pmt.length !== cf_obj.current_principal.length) throw new Error("create_equivalent_regular_swaption: invalid cashflow object");
                if (null===library.valuation_date) throw new Error("create_equivalent_swaption: valuation_date must be set");
                if (!original_instrument) original_instrument={};
                var tenor=original_instrument.tenor || 6;
                var bdc=original_instrument.bdc || "unadjusted";
                var calendar=original_instrument.calendar || "";

                //retrieve outstanding principal on expiry (corresponds to regular swaption notional)
                var outstanding_principal=0;
                var i;
                for (i=0; i<cf_obj.current_principal.length; i++){
                        if (cf_obj.date_pmt[i]<=expiry){
                                outstanding_principal=cf_obj.current_principal[i];
                        }
                }
                if (outstanding_principal===0) throw new Error("create_equivalent_regular_swaption: invalid cashflow object or expiry, zero outstanding principal");
                //compute internal rate of return for remaining cash flow including settlement payment
                var irr=library.irr(cf_obj, expiry, -outstanding_principal);
                
                //regular swaption rate (that is, moneyness) should be equal to irr converted from annual compounding to simple compounding
                irr=12/tenor*(Math.pow(1+irr,tenor/12)-1);
                
                //compute effective duration of remaining cash flow (corresponds to regular swaption term)
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
                var iter=20;
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
        var dl=1000*60*60*24; // length of one day in milliseconds
        var one_over_dl=1.0/dl;
        
        function is_leap_year(y){
                if(y%4!==0) return false;
                if(y===2000) return true;
                return (y%100!==0);
        }
        
        function days_in_month(y,m){
                if(1===m){ //Feb
                        if (is_leap_year(y)) return 29; //Leap Year
                        return 28;
                }
                if(3===m || 5===m || 8===m || 10===m) return 30; //Apr, Jun, Sep, Nov
                return 31; 
        }

        library.period_str_to_time=function(str){
                var num=parseInt(str, 10);
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
                if(yfrom===yto) return days_between(to,from)/((is_leap_year(yfrom))? 366 : 365);
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

        
        /*!
        
                Date rolling
        
        */
        
        library.add_days=function(from, ndays){
                var d=new Date(from.valueOf());
                d.setDate(d.getDate()+ndays);
                return d;
        };
        
        
        library.add_months=function(from, nmonths, roll_day){ 
                y=from.getFullYear();
                m=from.getMonth()+nmonths;
                while (m>=12){
                        m=m-12;
                        y=y+1;
                }
                while (m<0){
                        m=m+12;
                        y=y-1;
                }
                if(undefined===roll_day){
                        d=from.getDate();
                }else{
                        d=roll_day;
                }
                return new Date(y,m,Math.min(d, days_in_month(y,m)));
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
                wd=dt.getDay();
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
                stored_params={vector_length: 1};
                var keys, i;
                //valuation date
                stored_params.valuation_date=library.get_safe_date(params.valuation_date);
                //scalars
                if (typeof(params.scalars) === 'object'){
                        stored_params.scalars={};
                        keys=Object.keys(params.scalars);
                        for (i=0; i< keys.length;i++){
                                stored_params.scalars[keys[i]]=normalise_scalar(params.scalars[keys[i]]);
                                update_vector_length(stored_params.scalars[keys[i]].value.length);
                        }
                }
                //curves
                if (typeof(params.curves) === 'object'){
                        stored_params.curves={};
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
                        stored_params.surfaces={};
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
                        return new library.simple_fixed_income(instrument);
                        case "swap":
                        return new library.swap(instrument);
                        case "swaption":
                        return new library.swaption(instrument);
                        case "fxterm":
                        return new library.fxterm(instrument);
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
                                res[i]=obj.present_value(dc,sc,fc);
                                break;
                                case "swap":
                                case "swaption":
                                res[i]=obj.present_value(dc,fc,su);
                                break;
                        }
                        if (vec_fx) res[i]/=vec_fx.value[vec_fx.value.length>1 ? i : 0];
                }
                return res;
        };
        
}(this.JsonRisk || module.exports));


