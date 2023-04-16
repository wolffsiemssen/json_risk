
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
				if(isNaN(maturity)) throw new Error ("schedule: invalid date provided for maturity");
	
                if(!(eff_dt instanceof Date)){
                        //effective date is strictly needed if valuation date is not set
                        if (null===library.valuation_date) throw new Error("schedule: if valuation_date is unset, effective date must be provided");
                        //effective date is strictly needed if first date is given (explicit stub at beginning)
                        if (first_dt instanceof Date) throw new Error("schedule: if first date is provided, effective date must be provided");
			//effective date is strictly needed if next_to_last_date is not given and stub_end is true (implicit stub in the end)
                        if (!(next_to_last_dt instanceof Date) && stub_end) throw new Error("schedule: if next to last date is not provided and stub in the end is specified, effective date must be provided");
                }
				if(eff_dt instanceof Date && isNaN(eff_dt)) throw new Error ("schedule: invalid date provided for effective date");
                if (maturity < (eff_dt instanceof Date ? eff_dt : library.valuation_date))
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
