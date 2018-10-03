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

        library.validate_bond=function(bond){
                if(typeof bond.notional != 'number') return false;
                if(!(bond.maturity instanceof Date)) return false;
        };
        
        library.pricer_bond=function(bond,params){
                return null;
        };
        
        library.bond_dirty_value=function(bond,disc_curve, spread_curve, fwd_curve){
                //sanity checks
                if (null===library.valuation_date)
                        throw new Error("dcf: valuation_date must be set");
                        
                if(!(bond.maturity instanceof String) && typeof bond.maturity !== 'string')
                        throw new Error("bond_dirty_value: must provide maturity date.");
                        
                if(typeof bond.notional !== 'number')
                        throw new Error("bond_dirty_value: must provide notional.");
                
                var is_holiday_func=library.is_holiday_factory(bond.calendar || "");
                var year_fraction_func=library.year_fraction_factory(bond.dcc || "");
                var maturity=library.date_str_to_date(bond.maturity);
                var eff_dt= ('undefined'===typeof bond.effective_date) ? null : library.date_str_to_date(bond.effective_date);
                var first_dt= ('undefined'===typeof bond.first_date) ? null : library.date_str_to_date(bond.first_date);
                var next_to_last_dt= ('undefined'===typeof bond.next_to_last_date) ? null : library.date_str_to_date(bond.next_to_last_date);
                
                var schedule=library.backward_schedule(eff_dt, 
                                                       maturity,
                                                       bond.freq,
                                                       is_holiday_func,
                                                       bond.bdc || "",
                                                       first_dt,
                                                       next_to_last_dt);
                var cf;
                if (typeof bond.fixed_rate === 'number'){
                        cf=library.fix_cash_flows(schedule,
                                                  bond.bdc,
                                                  is_holiday_func,
                                                  year_fraction_func,
                                                  bond.notional,
                                                  bond.fixed_rate);
                }else{
                        cf=library.float_cash_flows(schedule,
                                                    bond.bdc,
                                                    is_holiday_func,
                                                    year_fraction_func,
                                                    bond.notional,
                                                    bond.current_rate,
                                                    bond.float_spread,
                                                    fwd_curve );
                }
                
                var settlement_date=library.adjust(library.add_days(library.valuation_date, 
                                                                   (typeof bond.settlement_days==='number') ? bond.settlement_days: 0),
                                                   "following",
                                                   is_holiday_func);
                return library.dcf(cf, 
                                   disc_curve,
                                   spread_curve,
                                   bond.residual_spread,
                                   settlement_date);
        };
        

        


}(this.JsonRisk || module.exports));
;(function(library){

        library.get_const_curve=function(value){
                return {type: "yield", labels: ["1Y"], times: [1], zcs: [value]};
        };

        function init_curve(curve){
                var i;
                if (undefined==curve.times){
                        //construct times from other parameters in order of preference
                        if (undefined!==curve.days){
                                i=curve.days.length;
                                curve.times=new Array(i);
                                while (i>0){
                                       i--;
                                       curve.times[i]=curve.days[i]/365;
                                }                      
                        }else if (undefined!==curve.dates){
                                i=curve.dates.length;
                                curve.times=new Array(i);
                                yf=library.year_fraction_factory("act/365");
                                ref_date=library.date_str_to_date(curve.dates[0]);
                                while (i>0){
                                       i--;
                                       curve.times[i]=yf(ref_date,library.date_str_to_date(curve.dates[i]));
                                }                      
                        }else if (undefined!==curve.labels){
                                i=curve.labels.length;
                                curve.times=new Array(i);    
                                while (i>0){
                                       i--;
                                       curve.times[i]=library.period_str_to_time(curve.labels[i]);
                                }                      
                        }else{
                                throw new Error("init_curve: invalid curve, cannot derive times");
                        }
                }
                if(undefined==curve.dfs){
                        //construct discount factors from zero coupons
                        if (undefined!==curve.zcs){
                                i=curve.zcs.length;
                                if(i!==curve.times.length){
                                        throw new Error("init_curve: invalid curve, length of zcs does not match length of times");
                                }
                                curve.dfs=new Array(i);
                                while (i>0){
                                       i--;
                                       curve.dfs[i]=Math.exp(-curve.zcs[i]*curve.times[i]);
                                }                      
                        }else{
                                throw new Error("init_curve: invalid curve, dfs and zcs both undefined");
                        }
                }
                if(curve.times.length!==curve.dfs.length){
                        throw new Error("init_curve: invalid curve, length of dfs does not match length of times");
                }
        }

        get_df_internal=function(curve,t,imin,imax){
                //discount factor is one for infinitesimal time (less than a day makes no sense, anyway
                if (t<1/365/2) return 1.0;
                //found exact time, or curve only has one support point
                if (imin==imax) return (t===curve.times[imin]) ? curve.dfs[imin] : Math.pow(curve.dfs[imin], t/curve.times[imin]);
                //interpolation (linear on discount factors)
                if (imin+1==imax){
                        if(curve.times[imax]-curve.times[imin]<1/365/2) throw new Error("get_df_internal: invalid curve, support points must be increasing and differ at least one day");
                        return curve.dfs[imin]*(curve.times[imax]-t)/(curve.times[imax]-curve.times[imin])+
                               curve.dfs[imax]*(t-curve.times[imin])/(curve.times[imax]-curve.times[imin]);
                }
                //extrapolation (constant on zero coupon rates)
                if (t<curve.times[imin]) return Math.pow(curve.dfs[imin], t/curve.times[imin]);
                if (t>curve.times[imax]) return Math.pow(curve.dfs[imax], t/curve.times[imax]);
                //binary search and recursion
                imed=Math.ceil((imin+imax)/2.0);
                if (t>curve.times[imed]) return get_df_internal(curve,t,imed,imax);
                return get_df_internal(curve,t,imin,imed);
        };

        library.get_df=function(curve,t){
                init_curve(curve);
                return get_df_internal(curve,t,0,curve.times.length-1);
        };
        
        library.get_rate=function(curve,t){
                if (t<1/365/2) return 0.0;
                return -Math.log(library.get_df(curve,t))/t;
        };

        library.get_fwd_amount=function(curve,tstart,tend){
                return library.get_df(curve,tstart) / library.get_df(curve,tend) -1.0;
        };

}(this.JsonRisk || module.exports));
;
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
;
(function(library){

        library.backward_schedule=function(eff_dt, maturity, freq, is_holiday_func, bdc, first_dt, next_to_last_dt){
                if(!(maturity instanceof Date)) throw new Error ("backward_schedule: maturity must be provided");
                if(!(eff_dt instanceof Date)){
                        //effective date is strictly needed if valuation date is not set
                        if (null===library.valuation_date) throw new Error("backward_schedule: if valuation_date is unset, effective date must be provided");
                        //effective date is strictly needed if first date is given
                        if (first_dt instanceof Date) throw new Error("backward_schedule: if first date is provided, effective date must be provided");                                
                }
                if ((eff_dt instanceof Date && maturity<eff_dt) || (library.valuation_date instanceof Date && maturity < library.valuation_date)) 
                        throw new Error("backward_schedule: maturity is before valution or effective date.");
                if(typeof freq !== "number")
                        throw new Error("backward_schedule: freq must be a nonnegative integer, e.g., 6 for semiannual schedule, 0 for zerobond/iam schedule");
                if(freq<0 || Math.floor(freq) !== freq)
                        throw new Error("backward_schedule: freq must be a nonnegative integer, e.g., 6 for semiannual schedule, 0 for zerobond/iam schedule");
                if (0===freq) return [eff_dt, maturity];
                
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
                        dt=library.add_months(ref_dt, -freq*n);
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
                                        dt=library.add_months(ref_dt, -freq*n);
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
        
                JsonRisk format period and date strings
                
                
        */
        
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
        
        /*!
        
                Year Fractions
        
        */
        function days_between(from, to){
                return (to-from)  / (1000*60*60*24);
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
                return new Date(from.valueOf()+(1000*60*60*24*ndays));
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
                if(null==roll_day){
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
                es_d_m = [
                        [15, 3], [ 7, 3], [30, 2], [12, 3], [ 3, 3], [23, 3], [15, 3], [31, 2], [19, 3], [11, 3], [27, 2], [16, 3], [ 7, 3], [23, 2], [12, 3], [ 4, 3], [23, 3], [ 8, 3], [31, 2], [20, 3], //1900-1919
                        [ 4, 3], [27, 2], [16, 3], [ 1, 3], [20, 3], [12, 3], [ 4, 3], [17, 3], [ 8, 3], [31, 2], [20, 3], [ 5, 3], [27, 2], [16, 3], [ 1, 3], [21, 3], [12, 3], [28, 2], [17, 3], [ 9, 3], //1920-1939
                        [24, 2], [13, 3], [ 5, 3], [25, 3], [ 9, 3], [ 1, 3], [21, 3], [ 6, 3], [28, 2], [17, 3], [ 9, 3], [25, 2], [13, 3], [ 5, 3], [18, 3], [10, 3], [ 1, 3], [21, 3], [ 6, 3], [29, 2], //1940-1959
                        [17, 3], [ 2, 3], [22, 3], [14, 3], [29, 2], [18, 3], [10, 3], [26, 2], [14, 3], [ 6, 3], [29, 2], [11, 3], [ 2, 3], [22, 3], [14, 3], [30, 2], [18, 3], [10, 3], [26, 2], [15, 3], //1960-1979 
                        [ 6, 3], [19, 3], [11, 3], [ 3, 3], [22, 3], [ 7, 3], [30, 2], [19, 3], [ 3, 3], [26, 2], [15, 3], [31, 2], [19, 3], [11, 3], [ 3, 3], [16, 3], [ 7, 3], [30, 2], [12, 3], [ 4, 3], //1980-1999
                        [23, 3], [15, 3], [31, 2], [20, 3], [11, 3], [27, 2], [16, 3], [ 8, 3], [23, 2], [12, 3], [ 4, 3], [24, 3], [ 8, 3], [31, 2], [20, 3], [ 5, 3], [27, 2], [16, 3], [ 1, 3], [21, 3], //2000-2 19
                        [12, 3], [ 4, 3], [17, 3], [ 9, 3], [31, 2], [20, 3], [ 5, 3], [28, 2], [16, 3], [ 1, 3], [21, 3], [13, 3], [28, 2], [17, 3], [ 9, 3], [25, 2], [13, 3], [ 5, 3], [25, 3], [10, 3], //2 20-2 39
                        [ 1, 3], [21, 3], [ 6, 3], [29, 2], [17, 3], [ 9, 3], [25, 2], [14, 3], [ 5, 3], [18, 3], [10, 3], [ 2, 3], [21, 3], [ 6, 3], [29, 2], [18, 3], [ 2, 3], [22, 3], [14, 3], [30, 2], //2 40-2 59
                        [18, 3], [10, 3], [26, 2], [15, 3], [ 6, 3], [29, 2], [11, 3], [ 3, 3], [22, 3], [14, 3], [30, 2], [19, 3], [10, 3], [26, 2], [15, 3], [ 7, 3], [19, 3], [11, 3], [ 3, 3], [23, 3], //2 60-2 79
                        [ 7, 3], [30, 2], [19, 3], [ 4, 3], [26, 2], [15, 3], [31, 2], [20, 3], [11, 3], [ 3, 3], [16, 3], [ 8, 3], [30, 2], [12, 3], [ 4, 3], [24, 3], [15, 3], [31, 2], [20, 3], [12, 3], //2 80-2 99
                        [28, 2], [17, 3], [ 9, 3], [25, 2], [13, 3], [ 5, 3], [18, 3], [10, 3], [ 1, 3], [21, 3], [ 6, 3], [29, 2], [17, 3], [ 2, 3], [22, 3], [14, 3], [29, 2], [18, 3], [10, 3], [26, 2], //2100-2119
                        [14, 3], [ 6, 3], [29, 2], [11, 3], [ 2, 3], [22, 3], [14, 3], [30, 2], [18, 3], [10, 3], [26, 2], [15, 3], [ 6, 3], [19, 3], [11, 3], [ 3, 3], [22, 3], [ 7, 3], [30, 2], [19, 3], //2120-2139
                        [ 3, 3], [26, 2], [15, 3], [31, 2], [19, 3], [11, 3], [ 3, 3], [16, 3], [ 7, 3], [30, 2], [12, 3], [ 4, 3], [23, 3], [15, 3], [31, 2], [20, 3], [11, 3], [27, 2], [16, 3], [ 8, 3], //2140-2159
                        [23, 2], [12, 3], [ 4, 3], [24, 3], [ 8, 3], [31, 2], [20, 3], [ 5, 3], [27, 2], [16, 3], [ 1, 3], [21, 3], [12, 3], [ 4, 3], [17, 3], [ 9, 3], [31, 2], [20, 3], [ 5, 3], [28, 2], //2160-2179
                        [16, 3], [ 1, 3], [21, 3], [13, 3], [28, 2], [17, 3], [ 9, 3], [25, 2], [13, 3], [ 5, 3], [25, 3], [10, 3], [ 1, 3], [21, 3], [ 6, 3], [29, 2], [17, 3], [ 9, 3], [25, 2], [14, 3], //2180-2199
                        [ 6, 3]]; //2200
                index=y-1900;
                if(index<0) index=0;
                if(index>es_d_m.length) index=es_d_m.length;
                return new Date(y,es_d_m[index][1],es_d_m[index][0]);
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


