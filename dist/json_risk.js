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
;        
(function(library){

        library.pricer_bond=function(bond, disc_curve, spread_curve){
                var bond_internal=new library.fixed_income(bond);
                return bond_internal.present_value(disc_curve, spread_curve, null);
        };
        

}(this.JsonRisk || module.exports));
;(function(library){

        library.get_const_curve=function(value){
                if(typeof value !== 'number') throw new Error("get_const_curve: input must be number."); 
                if(value <= -1) throw new Error("get_const_curve: invalid input."); 
                return {
                                type: "yield", 
                                times: [1], 
                                dfs: [1/(1+value)]
                       };
        };
        
        library.get_initialised_curve=function(curve){
                //if valid curve is given, returns curve in initialised form {type, times, dfs}, if null, returns constant zero curve
                if (!curve) return library.get_const_curve(0.0);
                var times=get_curve_times(curve);
                var dfs;
                if(undefined!==curve.dfs){
                        dfs=curve.dfs;
                }else{
                        if(undefined===curve.zcs) throw new Error("get_initialised_curve: invalid curve, both dfs and zcs undefined");
                        dfs=get_dfs(curve.zcs, times);
                }
                return {
                                type: "yield", 
                                times: times,
                                dfs: dfs
                        };
        };

        function get_curve_times(curve){
                var i,times;
                if (undefined===curve.times){
                        //construct times from other parameters in order of preference
                        if (undefined!==curve.days){
                                i=curve.days.length;
                                times=new Array(i);
                                while (i>0){
                                       i--;
                                       //curve times are always assumed to be act/365
                                       times[i]=curve.days[i]/365;
                                }                      
                        }else if (undefined!==curve.dates){
                                i=curve.dates.length;
                                times=new Array(i);
                                //curve times are always assumed to be act/365
                                yf=library.year_fraction_factory("act/365");
                                ref_date=library.date_str_to_date(curve.dates[0]);
                                while (i>0){
                                       i--;
                                       times[i]=yf(ref_date,library.date_str_to_date(curve.dates[i]));
                                }                      
                        }else if (undefined!==curve.labels){
                                i=curve.labels.length;
                                times=new Array(i);    
                                while (i>0){
                                       i--;
                                       times[i]=library.period_str_to_time(curve.labels[i]);
                                }                      
                        }else{
                                throw new Error("init_curve: invalid curve, cannot derive times");
                        }
                        return times;
                }else{
                        i=curve.times.length;
                        while (i>0){
                                i--;
                                if (typeof curve.times[i] != 'number') 
                                        throw new Error("get_curve_times: invalid vector of times, must be numeric");
                        }
                        return curve.times;
                }
        }
        
        function get_dfs(zcs, times){
                var i, dfs;
                i=zcs.length;
                if(times.length!==i) throw new Error("get_dfs: invalid input, length of zcs does not match length of times");

                //construct discount factors from zero coupons
                dfs=new Array(i);
                while (i>0){
                       //zero coupon curves are always assumed to be annual compounding act/365
                        i--;
                        if (typeof zcs[i] != 'number')
                                throw new Error("get_curve_times: invalid vector of times, must be numeric");
                        dfs[i]=Math.pow(1+zcs[i],-times[i]);
                }
                return dfs;         
        }

        get_df_internal=function(curve,t,imin,imax){
                //discount factor is one for infinitesimal time (less than a day makes no sense, anyway)
                if (t<1/512) return 1.0;
                //curve only has one support point
                if (imin==imax) return (t===curve.times[imin]) ? curve.dfs[imin] : Math.pow(curve.dfs[imin], t/curve.times[imin]);
                //extrapolation (constant on zero coupon rates)
                if (t<curve.times[imin]) return Math.pow(curve.dfs[imin], t/curve.times[imin]);
                if (t>curve.times[imax]) return Math.pow(curve.dfs[imax], t/curve.times[imax]);
                //interpolation (linear on discount factors)
                if (imin+1==imax){
                        if(curve.times[imax]-curve.times[imin]<1/512) throw new Error("get_df_internal: invalid curve, support points must be increasing and differ at least one day");
                        return curve.dfs[imin]*(curve.times[imax]-t)/(curve.times[imax]-curve.times[imin])+
                               curve.dfs[imax]*(t-curve.times[imin])/(curve.times[imax]-curve.times[imin]);
                }
                //binary search and recursion
                imed=Math.ceil((imin+imax)/2.0);
                if (t>curve.times[imed]) return get_df_internal(curve,t,imed,imax);
                return get_df_internal(curve,t,imin,imed);
        };

        library.get_df=function(curve,t){
                c=library.get_initialised_curve(curve);
                return get_df_internal(c,t,0,c.times.length-1);
        };
        
        library.get_rate=function(curve,t){
                if (t<1/512) return 0.0;
                //zero rates are act/365 annual compounding
                return Math.pow(library.get_df(curve,t),-1/t)-1;
        };

        library.get_fwd_amount=function(curve,tstart,tend){
                c=library.get_initialised_curve(curve);
                return library.get_df(c,tstart) / library.get_df(c,tend) -1.0;
        };

}(this.JsonRisk || module.exports));
;
(function(library){
        
        library.fix_cash_flows=function(schedule, bdc, is_holiday_func, year_fraction_func, notional, rate ){
                if (null===library.valuation_date) throw new Error("fix_cash_flows: valuation_date must be set");
                var dates=new Array(schedule.length-1);
                var times=new Array(schedule.length-1);
                var times_schedule=new Array(schedule.length);
                var amounts=new Array(schedule.length-1);
                var i;
                var adj=function(d){
                        return library.adjust(d,bdc,is_holiday_func);
                };
                var default_yf=library.year_fraction_factory(null);
                times_schedule[0]=default_yf(library.valuation_date,schedule[0]);
                for(i=1;i<schedule.length;i++){
                        dates[i-1]=adj(schedule[i]);
                        times[i-1]=default_yf(library.valuation_date,dates[i-1]);
                        times_schedule[i]=default_yf(library.valuation_date,schedule[i]);
                        amounts[i-1]=notional*rate*year_fraction_func(schedule[i-1],schedule[i]);
                }
                amounts[amounts.length-1]+=notional;
                return {schedule: schedule, times_schedule: times_schedule, dates: dates, amounts: amounts, times: times};
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
                var df_residual;
                while(cf_obj.dates[i]<=sd) i++;
                while (i<cf_obj.times.length){
                        df_d=library.get_df(dc,cf_obj.times[i]);
                        df_s=library.get_df(sc,cf_obj.times[i]);
                        df_residual=Math.exp(-cf_obj.times[i]*residual_spread);
                        res+=cf_obj.amounts[i]*df_d*df_s*df_residual;
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
                        if(typeof instrument.current_rate !== 'number')
                                throw new Error("fixed_income: must provide valid current_rate.");
                        this.current_rate=instrument.current_rate;
                }
                
                this.schedule=library.backward_schedule(effective_date, 
                                                 maturity,
                                                 tenor,
                                                 this.is_holiday_func,
                                                 this.bdc,
                                                 first_date,
                                                 next_to_last_date);

                this.cash_flows=library.fix_cash_flows(this.schedule,
                                                       this.bdc,
                                                       this.is_holiday_func,
                                                       this.year_fraction_func,
                                                       this.notional,
                                                       this.fixed_rate);
        };

        
        library.fixed_income.prototype.get_cash_flows=function(fwd_curve){
                if (!this.is_float) return this.cash_flows;
                
                //recalculate amounts for floater deals
                var amounts=new Array(this.cash_flows.schedule.length-1);
                amounts[0]=this.notional*
                           this.current_rate*
                           this.year_fraction_func(this.cash_flows.schedule[0],this.cash_flows.schedule[1]);
                
                var i;
                for(i=2;i<this.cash_flows.schedule.length;i++){
                       amounts[i-1]=this.notional*
                                    library.get_fwd_amount(fwd_curve,
                                                           this.cash_flows.times_schedule[i-1],
                                                           this.cash_flows.times_schedule[i]);
                       amounts[i-1]+=this.notional*
                                     this.float_spread*
                                     this.year_fraction_func(this.cash_flows.schedule[i-1],this.cash_flows.schedule[i]);
                }
                amounts[amounts.length-1]+=this.notional;
                return {schedule: this.cash_flows.schedule,
                        times_schedule: this.cash_flows.times_schedule, 
                        dates: this.cash_flows.dates,
                        amounts: amounts,
                        times: this.cash_flows.times};
        };
        
        library.fixed_income.prototype.present_value=function(disc_curve, spread_curve, fwd_curve){
                return library.dcf(this.get_cash_flows(fwd_curve || null),
                                   disc_curve,
                                   spread_curve,
                                   this.residual_spread,
                                   this.settlement_date);
        };

}(this.JsonRisk || module.exports));
;        
(function(library){

        library.pricer_floater=function(floater, disc_curve, spread_curve, fwd_curve){
                var floater_internal=new library.fixed_income(floater);
                return floater_internal.present_value(disc_curve, spread_curve, fwd_curve);
        };
        

}(this.JsonRisk || module.exports));
;
(function(library){
        /*
        
        Schedule functions used by regular and irregular fixed income instruments.
        
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
                if (0===tenor) return [eff_dt, maturity];
                
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
                                if(adj(res[0]).getTime()!=adj(eff_dt).getTime()){
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
;(function(library){

        /*
        
                JsonRisk date and time functions
                
                
        */
        dl=1000*60*60*24;
        one_over_dl=1.0/dl;
        
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
                var num=parseInt(str);
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
                        y=parseInt(rr[1]);
                        m=parseInt(rr[2])-1;
                        d=parseInt(rr[3]);
                }else if ((rr = /^([0-9]{1,2})\.([0-9]{1,2})\.([1-2][0-9]{3})/.exec(str)) !== null) { // DD.MM.YYYY
                        y=parseInt(rr[3]);
                        m=parseInt(rr[2])-1;
                        d=parseInt(rr[1]);
                }
                if (null===rr) throw new Error('date_str_to_time(str) - Invalid date string: ' + str);
                if (m<0 || m>11) throw new Error('date_str_to_time(str) - Invalid month in date string: ' + str);
                if (d<0 || d>days_in_month(y,m)) throw new Error('date_str_to_time(str) - Invalid day in date string: ' + str);
                return new Date(y,m,d);
        };
        
        library.get_initialised_date=function(d){
                //takes a valid date string, a javascript date object, or an undefined value and returns a javascript date object or null
                if(!d) return null;
                if(d instanceof Date) return d;
                if((d instanceof String) || typeof d === 'string') return library.date_str_to_date(d);
                throw new Error("get_initialised_date: invalid input.");
        };
        
        /*!
        
                Year Fractions
        
        */
        function days_between(from, to){
                return (to-from)  * one_over_dl;
        }

        function yf_act365(from,to){
                return days_between(from,to)  / 365;
        }
        
        
        function yf_act360(from,to){
                return days_between(from,to)  / 360;
        }
        
        function yf_30E360(from,to){
                return ((to.getFullYear()-from.getFullYear())*360 + (to.getMonth()-from.getMonth()) * 30 + (Math.min(to.getDate(),30)-Math.min(from.getDate(),30)))  / 360;
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
                return new Date(from.valueOf()+(dl*ndays));
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
                d=dt.getDay();
                if(0===d) return true;
                if(6===d) return true;
                return false;
        }
        
        function is_holiday_target(dt){
                var wd=dt.getDay();
                if(0===wd) return true;
                if(6===wd) return true;               
                                
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
        
        library.is_holiday_factory=function(str){
                var sl=str.toLowerCase();
                if(sl==="target") return is_holiday_target;
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


