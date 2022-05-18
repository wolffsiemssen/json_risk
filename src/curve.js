(function(library){   

/**
 	* @memberof library
*/     
        var default_yf=null;
		/**
		 	* converts rate of a curve to zero rates
			* @param {number} value rate of curve 
			* @param {string} type type of curve e.g. yield
			* @returns {object} constant curve with discount factors {type, times, dfs}
			* @memberof library
			* @public
		*/  
        library.get_const_curve=function(value, type){
                if(typeof value !== 'number') throw new Error("get_const_curve: input must be number."); 
                if(value <= -1) throw new Error("get_const_curve: invalid input."); 
                return library.get_safe_curve({
                                type: type || "yield", 
                                times: [1], 
                                dfs: [1/(1+value)] //zero rates are act/365 annual compounding
                       });
        };


		/**
		 	* get i-th time entry of a curve 
			* @param {object} curve curve
			* @param {number} i time
			* @returns {number} time
			* @memberof library
			* @private
		*/      
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
		/**
		 	* get time-array of a curve
			* @param {object} curve curve
			* @returns {array} times in days of given curve
			* @memberof library
			* @public
		*/        
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
        
		/**
		 	* get i-th dfs/zcs entry of a curve 
			* @param {object} curve curve
			* @param {number} dfs/zcs
			* @memberof library
			* @private
		*/
        function get_df_at(curve, i){
                if (Array.isArray(curve.dfs)) return curve.dfs[i];
                if (Array.isArray(curve.zcs)) return Math.pow(1+curve.zcs[i],-get_time_at(curve,i));
                throw new Error("get_df: invalid curve, must provide dfs or zcs");
        }
        
		/**
		 	* get dfs/zcs-array of a curve
			* @param {object} curve curve
			* @returns {array} dfs/zcs
			* @memberof library
			* @private
		*/   
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
        

		/**
		 	* obtain discount factor interpolated from times and dfs arrays 
			* @param {array} times curve times
			* @param {array} dfs curve discount factors
			* @param {number} t 
			* @returns {number} discount factor
		*/          
        function get_df(times,dfs,t){
            var imin=0;
            var imax=times.length-1;
            
            //discount factor is one for infinitesimal time (less than a day makes no sense, anyway)
            if (t<1/512) return 1.0;
            //curve only has one support point
			var tmin=times[imin];
		    if (imin===imax) return (t===tmin) ? dfs[imin] : Math.pow(dfs[imin], t/tmin);
		    //extrapolation (constant on zero coupon rates)
			var tmax=times[imax];
		    if (t<tmin) return Math.pow(dfs[imin], t/tmin);
			if (t>tmax) return Math.pow(dfs[imax], t/tmax);
			// binary search
			var imed,tmed;
		    while (imin+1!==imax){
				imed=(imin+imax)/2.0|0; // truncate the mean time down to the closest integer
				tmed=times[imed];
				if (t>tmed){
					tmin=tmed;
					imin=imed;
				}else{
					tmax=tmed;
					imax=imed;
				}	                       
		    }
			//interpolation (linear on discount factors)
			if(tmax-tmin<1/512) throw new Error("get_df_internal: invalid curve, support points must be increasing and differ at least one day");
			var temp=1/(tmax-tmin);
            return (dfs[imin]*(tmax-t)+dfs[imax]*(t-tmin))*temp;
        }

		/**
		 	* obtain zero rate interpolated from times and dfs arrays 
			* @param {array} times curve times
			* @param {array} dfs curve discount factors
			* @param {number} t 
			* @returns {number} zero rate
		*/  

		function get_rate(times,dfs,t){
			if (t<1/512) return 0.0;
			return Math.pow(get_df(times,dfs,t),-1/t)-1;
		}


		/**
		 	* attaches get_df and other function to curve. If curve is null or falsy, create valid constant curve
			* @param {object} curve curve
			* @returns {object} curve
			* @memberof library
			* @public
		*/   
        library.get_safe_curve=function(curve){
                //if null or other falsy argument is given, returns constant curve
                if (!curve) curve={
					times: [1],
					dfs: [1]
				};

				// extract times and discount factors from curve and store in hidden function scope
				var _times=library.get_curve_times(curve);
				var _dfs=get_curve_dfs(curve);

				// define get_df closure based on hidden variables		
				curve.get_df=function(t){
					return get_df(_times,_dfs,t);
				};

				// attach get_rate based on get_df
				curve.get_rate=function(t){
					return get_rate(_times,_dfs,t);
				};

				// attach get_fwd_rate based on get_df
				curve.get_fwd_rate=function(tstart,tend){
					if (tend-tstart<1/512) return 0.0;
					return Math.pow(this.get_df(tend) / this.get_df(tstart),-1/(tend-tstart))-1;
				};

				// attach get_times closure in order to reobtain hidden times when needed
				curve.get_times=function(){
					return _times;
				};

				// attach get_dfs closure in order to reobtain hidden dfs when needed
				curve.get_dfs=function(){
					return _dfs;
				};

				// apply scenario rule if present
				var c=curve;
				if(typeof curve._rule === 'object'){
					var tmp={
						labels: curve._rule.labels_x,
						zcs: curve._rule.values[0]
					};
					if (curve._rule.model==="multiplicative") c=library.multiply_curves(curve,tmp);
					if (curve._rule.model==="additive") c=library.add_curves(curve,tmp);
					// extract times and discount factors from scenario affected curve and store in hidden function scope
					_times=library.get_curve_times(c);
					_dfs=get_curve_dfs(c);
				}

				return curve;
        };


		/**
		 	* Get discount factor from curve, calling get_safe_curve in case curve.get_df is not defined
			* @param {object} curve curve
			* @param {number} t 
			* @param {number} imin
			* @param {number} imax
			* @returns {number} discount factor
			* @memberof library
			* @public
		*/          
        library.get_df=function(curve,t){
			if (curve.get_df instanceof Function) return curve.get_df(t);
			return library.get_safe_curve(curve).get_df(t);
        };


		/**
		 	* TODO
			* @param {object} curve curve
			* @param {number} t 
			* @returns {number} ...
			* @memberof library
			* @public
		*/  
        library.get_rate=function(curve,t){
			if (curve.get_rate instanceof Function) return curve.get_rate(t);
			return library.get_safe_curve(curve).get_rate(t);
        };

		/**
		 	* TODO
			* @param {object} curve curve
			* @param {number} tstart
			* @param {number} tend
			* @returns {number} ...
			* @memberof library
			* @public
		*/  
        library.get_fwd_rate=function(curve,tstart,tend){
			if (curve.get_fwd_rate instanceof Function) return curve.get_fwd_rate(tstart,tend);
			return library.get_safe_curve(curve).get_fwd_rate(tstart,tend);
        };



		/**
		 	* adds two curves (times of curves can be different)
			* @param {object} c1 curve
			* @param {object} c2 curve
			* @returns {object} curve {times:times, zcs: zcs}
			* @memberof library
			* @public
		*/ 
		library.add_curves=function(c1, c2){
			var t1=library.get_curve_times(c1);
			var t2=library.get_curve_times(c2);
			var d1=get_curve_dfs(c1);
			var d2=get_curve_dfs(c2);
			var times=[], i1=0, i2=0, tmin;
			var zcs=[];
			while(true){
				tmin=Number.POSITIVE_INFINITY;
				if(i1<t1.length) tmin=Math.min(t1[i1], tmin);
				if(i2<t2.length) tmin=Math.min(t2[i2], tmin);
				times.push(tmin);
				zcs.push(get_rate(t1,d1,tmin)+get_rate(t2,d2,tmin));
				if(tmin===t1[i1] && i1<t1.length) i1++;
				if(tmin===t2[i2] && i2<t2.length) i2++;
				if(i1===t1.length && i2===t2.length) break;
			}
			return {times:times, zcs: zcs};
		};

		/**
		 	* multiplies two curves (times of curves can be different)
			* @param {object} c1 curve
			* @param {object} c2 curve
			* @returns {object} curve {times:times, zcs: zcs}
			* @memberof library
			* @public
		*/ 
		library.multiply_curves=function(c1, c2){
			var t1=library.get_curve_times(c1);
			var t2=library.get_curve_times(c2);
			var d1=get_curve_dfs(c1);
			var d2=get_curve_dfs(c2);
			var times=[], i1=0, i2=0, tmin;
			var zcs=[];
			while(true){
				tmin=Number.POSITIVE_INFINITY;
				if(i1<t1.length) tmin=Math.min(t1[i1], tmin);
				if(i2<t2.length) tmin=Math.min(t2[i2], tmin);
				times.push(tmin);
				zcs.push(get_rate(t1,d1,tmin)*get_rate(t2,d2,tmin));
				if(tmin===t1[i1] && i1<t1.length) i1++;
				if(tmin===t2[i2] && i2<t2.length) i2++;
				if(i1===t1.length && i2===t2.length) break;
			}
			return {times:times, zcs: zcs};
		};


}(this.JsonRisk || module.exports));
