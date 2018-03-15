(function(library){

        library.get_const_curve=function(value){
                return {type: "yield", labels: ["1Y"], times: [1], values: [value]};
        };

        function init_curve(curve){
                curve._cache={};
                if (undefined!==curve.times){
                        curve._cache.times=curve.times;
                }
                else if (undefined!==curve.days){
                        i=curve.days.length;
                        curve._cache.times=new Array(i);
                        while (i>0){
                               i--;
                               curve._cache.times[i]=curve.days[i]/365;
                        }                      
                }else if (undefined!==curve.dates){
                        i=curve.dates.length;
                        curve._cache.times=new Array(i);
                        yf=library.year_fraction_factory("act/365");
                        ref_date=library.date_str_to_date(curve.dates[0]);
                        while (i>0){
                               i--;
                               curve._cache.times[i]=yf(ref_date,library.date_str_to_date(curve.dates[i]));
                        }                      
                }else if (undefined!==curve.labels){
                        i=curve.labels.length;
                        curve._cache.times=new Array(i);    
                        while (i>0){
                               i--;
                               curve._cache.times[i]=library.period_str_to_time(curve.labels[i]);
                        }                      
                }else{
                        throw new Error("init_curve: invalid curve, cannot derive times");
                }
                if(curve._cache.times.length!==curve.values.length) throw new Error("init_curve: invalid curve, length of values does not match length of times");
        }

        get_rate_internal_=function(curve,t,imin,imax){
                //found exact time
                if (imin==imax) return curve.values[imin];
                //linear interpolation
                if (imin+1==imax) return curve.values[imin]*(curve._cache.times[imax]-t)/(curve._cache.times[imax]-curve._cache.times[imin])+curve.values[imax]*(t-curve._cache.times[imin])/(curve._cache.times[imax]-curve._cache.times[imin]);
                //constant extrapolation
                if (t<curve._cache.times[imin]) return curve.values[imin];
                if (t>curve._cache.times[imax]) return curve.values[imax];
                //binary search and recursion
                imed=Math.ceil((imin+imax)/2);
                if (t>curve._cache.times[imed]) return get_rate_internal_(curve,t,imed,imax);
                return get_rate_internal_(curve,t,imin,imed);
        };
        
        library.get_rate=function(curve,t){
                if (undefined===curve._cache || undefined===curve._cache.times) init_curve(curve);
                return get_rate_internal_(curve,t,0,curve._cache.times.length-1);
        };

        library.get_fwd_amount=function(curve,tstart,tend){
                return Math.pow((1+get_rate(curve,tstart)),-tstart) / Math.pow((1+get_rate(curve,tend)),-tend) -1;
        };

}(this.JsonRisk || module.exports));
