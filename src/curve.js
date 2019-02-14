(function(library){

        library.get_const_curve=function(value){
                if(typeof value !== 'number') throw new Error("get_const_curve: input must be number."); 
                if(value <= -1) throw new Error("get_const_curve: invalid input."); 
                return {
                                type: "yield", 
                                times: [1], 
                                dfs: [1/(1+value)] //zero rates are act/365 annual compounding
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
                                var yf=library.year_fraction_factory("act/365");
                                var ref_date=library.date_str_to_date(curve.dates[0]);
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
        

        get_df_internal=function(curve,t,imin,imax){
                //discount factor is one for infinitesimal time (less than a day makes no sense, anyway)
                if (t<1/512) return 1.0;
                //curve only has one support point
                if (imin===imax) return (t===curve.times[imin]) ? curve.dfs[imin] : Math.pow(curve.dfs[imin], t/curve.times[imin]);
                //extrapolation (constant on zero coupon rates)
                if (t<curve.times[imin]) return Math.pow(curve.dfs[imin], t/curve.times[imin]);
                if (t>curve.times[imax]) return Math.pow(curve.dfs[imax], t/curve.times[imax]);
                //interpolation (linear on discount factors)
                if (imin+1===imax){
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
                var c=library.get_initialised_curve(curve);
                return get_df_internal(c,t,0,c.times.length-1);
        };
        
        library.get_rate=function(curve,t){
                if (t<1/512) return 0.0;
                //zero rates are act/365 annual compounding
                return Math.pow(library.get_df(curve,t),-1/t)-1;
        };

        library.get_fwd_rate=function(curve,tstart,tend){
                if (tend-tstart<1/512) return 0.0;
                var c=library.get_initialised_curve(curve);
                return Math.pow(library.get_df(c,tend) / library.get_df(c,tstart),-1/(tend-tstart))-1;
        };

}(this.JsonRisk || module.exports));
