(function(library){        
        var default_yf=null;

        library.get_const_curve=function(value, type){
                if(typeof value !== 'number') throw new Error("get_const_curve: input must be number."); 
                if(value <= -1) throw new Error("get_const_curve: invalid input."); 
                return {
                                type: type || "yield", 
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
                if (Array.isArray(curve.dfs)) return curve.dfs[i];
                if (Array.isArray(curve.zcs)) return Math.pow(1+curve.zcs[i],-get_time_at(curve,i));
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


	library.add_curves=function(c1, c2){
		var t1=library.get_curve_times(c1);
		var t2=library.get_curve_times(c2);
		var times=[], i1=0, i2=0, tmin;
		var zcs=[];
		while(true){
			tmin=Number.POSITIVE_INFINITY;
			if(i1<t1.length) tmin=Math.min(t1[i1], tmin);
			if(i2<t2.length) tmin=Math.min(t2[i2], tmin);
			times.push(tmin);
			zcs.push(library.get_rate(c1,tmin)+library.get_rate(c2, tmin));
			if(tmin===t1[i1] && i1<t1.length) i1++;
			if(tmin===t2[i2] && i2<t2.length) i2++;
			if(i1===t1.length && i2===t2.length) break;
		}
		return {times:times, zcs: zcs};
	};


}(this.JsonRisk || module.exports));
