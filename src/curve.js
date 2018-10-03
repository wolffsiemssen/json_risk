(function(library){

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
                //curve only has one support point
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
