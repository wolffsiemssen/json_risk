
(function(library){


	'use strict';
	/*
        
        Schedule functions used by simple and irregular fixed income instruments.
        
        */
		/**
		 	* creates a forward schedule from start up to but excluding end, using tenor as frequency
			* @param {date} start start date
			* @param {date} end end date
			* @param {number} tenor tenor
			* @param {} adjust_func
			* @returns {object} schedule
			* @memberof library
			* @private
		*/   
	var forward_rollout=function(start, end, tenor, adjust_func){
		var res=[start];
		var i=1, dt=library.add_months(start, tenor);
		while(dt.getTime()<end.getTime()){
			res.push(dt);
			i++;
			dt=library.add_months(start, i*tenor);
		}
		if(adjust_func(end).getTime() <= adjust_func(res[res.length-1]).getTime()) res.pop(); //make sure end is excluded after adjustments
		return res;
	};
		/**
		 	* creates a backward schedule from end down to but excluding start, using tenor as frequency
			* @param {date} start start date
			* @param {date} end end date
			* @param {number} tenor tenor
			* @param {} adjust_func
			* @returns {object} schedule
			* @memberof library
			* @private
		*/   
	var backward_rollout=function(start, end, tenor, adjust_func){
		var res=[end];
		var i=1, dt=library.add_months(end, -tenor);
		while(dt.getTime()>start.getTime()){
			res.unshift(dt);
			i++;
			dt=library.add_months(end, -i*tenor);
		}
		if(adjust_func(start).getTime() >= adjust_func(res[0]).getTime()) res.shift(); //make sure start is excluded after adjustments
		return res;

	};

		/**
		 	* TODO
			* @param {date} eff_dt effective date
			* @param {date} maturity maturity
			* @param {number} tenor tenor
			* @param {} adjust_func
			* @param {date} first_dt first date
			* @param {date} next_to_last_dt next to last date
			* @param {} stub_end
			* @param {} stub_long
			* @returns {} ...
			* @memberof library
			* @public
		*/   
        library.schedule=function(eff_dt, maturity, tenor, adjust_func, first_dt, next_to_last_dt, stub_end, stub_long){
                if(!(maturity instanceof Date)) throw new Error ("schedule: maturity must be provided");
	
                if(!(eff_dt instanceof Date)){
                        //effective date is strictly needed if valuation date is not set
                        if (null===library.valuation_date) throw new Error("schedule: if valuation_date is unset, effective date must be provided");
                        //effective date is strictly needed if first date is given (explicit stub at beginning)
                        if (first_dt instanceof Date) throw new Error("schedule: if first date is provided, effective date must be provided");
			//effective date is strictly needed if next_to_last_date is not given and stub_end is true (implicit stub in the end)
                        if (!(next_to_last_dt instanceof Date) && stub_end) throw new Error("schedule: if next to last date is not provided and stub in the end is specified, effective date must be provided");
                }
                if ((eff_dt instanceof Date && maturity<eff_dt) || (library.valuation_date instanceof Date && maturity < library.valuation_date)) 
                        throw new Error("schedule: maturity is before valuation date or effective date.");
                if(typeof tenor !== "number")
                        throw new Error("schedule: tenor must be a nonnegative integer, e.g., 6 for semiannual schedule, 0 for zerobond/iam schedule");
                if(tenor<0 || Math.floor(tenor) !== tenor)
                        throw new Error("schedule: tenor must be a nonnegative integer, e.g., 6 for semiannual schedule, 0 for zerobond/iam schedule");
                if (0===tenor) return [(eff_dt instanceof Date) ? eff_dt : library.valuation_date, maturity];

		var res;
		if (first_dt instanceof Date && !(next_to_last_dt instanceof Date)){
			// forward generation with explicit stub at beginning
			res=forward_rollout(first_dt, maturity, tenor, adjust_func);
			//add maturity date
			res.push(maturity);
			//add effective date
			if(eff_dt.getTime() !== first_dt.getTime()) res.unshift(eff_dt);
		}else if (next_to_last_dt instanceof Date && !(first_dt instanceof Date)){
			// backward generation with explicit stub at end
			res=backward_rollout((eff_dt instanceof Date) ? eff_dt : library.valuation_date, next_to_last_dt, tenor, adjust_func);
			//add maturity date
			if(maturity.getTime() !== next_to_last_dt.getTime()) res.push(maturity);
			//add effective date if given
			if(eff_dt instanceof Date) res.unshift(eff_dt);
			//if effective date is not given, add another period
			if(!(eff_dt instanceof Date))res.unshift(library.add_months(res[0], -tenor));
		}else if (first_dt instanceof Date && next_to_last_dt instanceof Date){
			// backward generation with both explicit stubs
			res=backward_rollout(first_dt, next_to_last_dt, tenor, adjust_func);
			//add maturity date
			if(maturity.getTime() !== next_to_last_dt.getTime()) res.push(maturity);
			//add first date
			res.unshift(first_dt);
			//add effective date
			res.unshift(eff_dt);
		}else if (stub_end){
			// forward generation with implicit stub, effective date always given
			res=forward_rollout(eff_dt, maturity, tenor, adjust_func);
			//remove last item if long stub and more than one date present
			if (stub_long && res.length>1) res.pop();
			//add maturity date if not already included (taking into account adjustments)
			res.push(maturity);
		}else{
			// backward generation with implicit stub
			res=backward_rollout((eff_dt instanceof Date) ? eff_dt : library.valuation_date, maturity, tenor, adjust_func);
			//remove first item if long stub and more than one date present
			if (stub_long && res.length>1) res.shift();
			//add effective date if given
			if(eff_dt instanceof Date) res.unshift(eff_dt);
			//if effective date is not given and beginning of schedule is still after valuation date, add another period
			if(!(eff_dt instanceof Date)) res.unshift(library.add_months(res[0], -tenor));
		}
		return res;
	};
        
}(this.JsonRisk || module.exports));
;(function(library){

		/**
		 	* ...
			* @param {number} value
			* @param {string} type
			* @returns {object} surface
			* @memberof library
			* @public
		*/   
        library.get_const_surface=function(value, type){
                if(typeof value !== 'number') throw new Error("get_const_surface: input must be number."); 
                return {
                                type: type || "", 
                                expiries: [1],
                                terms: [1],
                                values: [[value]]
                       };
        };
		/**
		 	* ...
			* @param {object} surface surface
			* @param {number} i
			* @returns {number} term at time i
			* @memberof library
			* @private
		*/           
        function get_term_at(surface, i){
                //construct terms from labels_term if terms are not defined
                if (surface.terms) return surface.terms[i];
                if (surface.labels_term) return library.period_str_to_time(surface.labels_term[i]);
                throw new Error("get_term_at: invalid surface, cannot derive terms");
        }
		/**
		 	* ...
			* @param {object} surface surface
			* @param {number} i
			* @returns {number} expiry at time i
			* @memberof library
			* @private
		*/           
        function get_expiry_at(surface, i){
                //construct expiries from labels_expiry if expiries are not defined
                if (surface.expiries) return surface.expiries[i];
                if (surface.labels_expiry) return library.period_str_to_time(surface.labels_expiry[i]);
                throw new Error("get_expiry_at: invalid surface, cannot derive expiries");
        }
		/**
		 	* ...
			* @param {object} surface surface
			* @returns {object} terms
			* @memberof library
			* @private
		*/           
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
		/**
		 	* ...
			* @param {object} surface surface
			* @returns {object} experies
			* @memberof library
			* @private
		*/           
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
		/**
		 	* ...
			* @param {object} surface surface
			* @returns {object} surface
			* @memberof library
			* @public
		*/           
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
		/**
		 	* ...
			* @param {object} surface
			* @param {date} i_expiry
			* @param {} t_term
			* @param {} imin
			* @param {} imax
			* @returns {number} slice rate
			* @memberof library
			* @privat
		*/            
        function get_slice_rate(surface,i_expiry,t_term,imin,imax){
                imin=imin || 0;
                imax=imax || (surface.terms || surface.labels_term || []).length-1;
                
                var sl=surface.values[i_expiry];
		if (!Array.isArray(sl)) throw new Error("get_slice_rate: invalid surface, values property must be an array of arrays");
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
		/**
		 	* ...
			* @param {object} surface
			* @param {date} t_expiry
			* @param {} t_term
			* @param {} imin
			* @param {} imax
			* @returns {number} surface rate
			* @memberof library
			* @public
		*/   
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
