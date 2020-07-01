(function(library){

/**
 	* @memberof library
*/ 

        /*
        
                JsonRisk date and time functions
                
                
        */


	'use strict';

        var dl=1000*60*60*24; // length of one day in milliseconds
        var one_over_dl=1.0/dl;
		/**
		 	* ...
			* @param {number} y year
			* @returns {boolean} true, if leap year
			* @memberof library
			* @private
		*/   
        function is_leap_year(y){
                if(y%4!==0) return false;
                if(y===2000) return true;
                return (y%100!==0);
        }
		/**
		 	* ...
			* @param {number} y year
			* @param {number} m month
			* @returns {number} days in month
			* @memberof library
			* @private
		*/   
        function days_in_month(y,m){
                return new Date(y,m+1,0).getDate();
        }
		/**
		 	* ...
			* @param {string} str time string (xY, xM, xW, xD)
			* @returns {number} string in days
			* @memberof library
			* @public
		*/           
        library.period_str_to_time=function(str){
                var num=parseInt(str, 10);
		if(isNaN(num)) throw new Error('period_str_to_time(str) - Invalid time period string: ' + str);
                var unit=str.charAt(str.length-1);
                if( unit === 'Y' || unit === 'y') return num;
                if( unit === 'M' || unit === 'm') return num/12;
                if( unit === 'W' || unit === 'w') return num/52;
                if( unit === 'D' || unit === 'd') return num/365;
                throw new Error('period_str_to_time(str) - Invalid time period string: ' + str);
        };
		/**
		 	* ...
			* @param {string} str date string
			* @returns {date} javascript date object
			* @memberof library
			* @public
		*/           
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
		/**
		 	* takes a valid date string, a javascript date object, or an undefined value and returns a javascript date object or null
			* @param {date} d
			* @returns {date} javascript date object
			* @memberof library
			* @public
		*/           
        library.get_safe_date=function(d){
                if(!d) return null;
                if(d instanceof Date) return d;
                if((d instanceof String) || typeof d === 'string') return library.date_str_to_date(d);
                throw new Error("get_safe_date: invalid input.");
        };
		/**
		 	* ...
			* @param {date} d
			* @returns {number} ...
			* @memberof library
			* @public
		*/   
	library.get_safe_date_vector=function(d){ //vector of dates when vector of dates, vector of date strings or space sepatated list of date strings is entered. Returns null otherwise
		if(d instanceof Date) return [d];
		var res;
		if(typeof d === 'string'){
			res=d.split(/\s+/);
		}else if(Array.isArray(d)){
			res=d.slice();
		}else{
			return null;
		}
		for (var i=0;i<res.length;i++){
			res[i]=library.get_safe_date(res[i]);
			if (null === res[i]) throw new Error("get_safe_date_vector: invalid input");
		}
		return res;
	};
        
        /*!
        
                Year Fractions
        
        */
		/**
		 	* counts days between to dates
			* @param {date} from from date
			* @param {date} to to date
			* @returns {number} days between from and to date 
			* @memberof library
			* @private
		*/   
        function days_between(from, to){
                return Math.round((to-from)  * one_over_dl);
        }
		/**
		 	* year fraction act365
			* @param {date} from from date
			* @param {date} to to date
			* @returns {number} days between from and to date (act365)
			* @memberof library
			* @private
		*/   
        function yf_act365(from,to){
                return days_between(from,to)  / 365;
        }
        
		/**
		 	* year fraction act360
			* @param {date} from from date
			* @param {date} to to date
			* @returns {number} days between from and to date (act360)
			* @memberof library
			* @private
		*/           
        function yf_act360(from,to){
                return days_between(from,to)  / 360;
        }
		/**
		 	* year fraction 30E360
			* @param {date} from from date
			* @param {date} to to date
			* @returns {number} days between from and to date (30E360)
			* @memberof library
			* @private
		*/           
        function yf_30E360(from,to){
                return ((to.getFullYear()-from.getFullYear())*360 + 
                        (to.getMonth()-from.getMonth()) * 30 + 
                        (Math.min(to.getDate(),30)-Math.min(from.getDate(),30)))  / 360;
        }
		/**
		 	* year fraction act/act
			* @param {date} from from date
			* @param {date} to to date
			* @returns {number} days between from and to date (act/act)
			* @memberof library
			* @private
		*/           
        function yf_actact(from,to){
                if (from-to===0) return 0;
                if (from>to) return -yf_actact(to, from);
                var yfrom=from.getFullYear();
                var yto=to.getFullYear();
                if(yfrom===yto) return days_between(from,to)/((is_leap_year(yfrom))? 366 : 365);
                var res=yto-yfrom-1;
                res+=days_between(from, new Date(yfrom+1,0,1))/((is_leap_year(yfrom))? 366 : 365);
                res+=days_between(new Date(yto,0,1), to)/((is_leap_year(yto))? 366 : 365);
                return res;
        }
		/**
		 	* returns day count convention of param (multiple possibilities to deliver day count conventions)
			* @param {string} str
			* @returns {number} day count convention in library format 
			* @memberof library
			* @public
		*/           
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
		/**
		 	* TODO
			* @param {date} d
			* @returns {date} ...
			* @memberof library
			* @public
		*/   
	library.time_from_now=function(d){
		library.require_vd();
		return yf_act365(library.valuation_date, d); 
	};

        
        /*!
        
                Date rolling
        
        */
		/**
		 	* adds days
			* @param {date} from from date
			* @param {number} ndays days to be added
			* @returns {date} from date plus ndays
			* @memberof library
			* @public
		*/           
        library.add_days=function(from, ndays){
                return new Date(from.getFullYear(),
				from.getMonth(),
				from.getDate()+ndays);
        };
        
		/**
		 	* TODO adds months
			* @param {date} from from date
			* @param {number} nmonths number of months to be added
			* @param {object} roll_day
			* @returns {date} ...
			* @memberof library
			* @public
		*/           
        library.add_months=function(from, nmonths, roll_day){ 
                var y=from.getFullYear(), m=from.getMonth()+nmonths, d;
                while (m>=12){
                        m=m-12;
                        y=y+1;
                }
                while (m<0){
                        m=m+12;
                        y=y-1;
                }
                if(!roll_day){
                        d=from.getDate();
                }else{
                        d=roll_day;
                }
                return new Date(y,m,Math.min(d, days_in_month(y,m)));
        };
		/**
		 	* add period (like Years, Months, Days, Weeks) 
			* @param {date} from
			* @param {string} str
			* @returns {date} from date plus str
			* @memberof library
			* @public
		*/   
        library.add_period=function(from, str){
                var num=parseInt(str, 10);
		if(isNaN(num)) throw new Error('period_str_to_time(str) - Invalid time period string: ' + str);
                var unit=str.charAt(str.length-1);
                if( unit === 'Y' || unit === 'y') return library.add_months(from, 12*num);
                if( unit === 'M' || unit === 'm') return library.add_months(from, num);
                if( unit === 'W' || unit === 'w') return library.add_days(from, 7*num);
                if( unit === 'D' || unit === 'd') return library.add_days(from, num);
                throw new Error('period_str_to_time(str) - Invalid time period string: ' + str);
        };
        
                
        /*!
        
                Calendars
        
        */
		/**
		 	* determine easter sunday for a year
			* @param {number} y year
			* @returns {date} easter sunday for given year
			* @memberof library
			* @private
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
		/**
		 	* determine, if a date is a saturday or sunday
			* @param {date} dt
			* @returns {boolean} true, if saturday or sunday
			* @memberof library
			* @private
		*/           
        function is_holiday_default(dt){
                var wd=dt.getDay();
                if(0===wd) return true;
                if(6===wd) return true;
                return false;
        }
        
		/**
		 	* determine, if date is a holiday day (saturday, sunday, new year, christmas, 12/31, labour, goodwill, good friday, easter monday
			* @param {date} dt
			* @returns {boolean} true, if holiday
			* @memberof library
			* @private
		*/   
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
        
		/**
		 	* TODO add additional holidays that are no default holidays, i.e., weekend days
			* @param {string} name
			* @param {object} dates
			* @returns {object} ...
			* @memberof library
			* @public
		*/   
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
        


		/**
		 	* TODO 
			* @param {string} str
			* @returns {number} default holiday days
			* @memberof library
			* @public
		*/          
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


		/**
		 	* TODO
			* @param {date} dt
			* @param {string} bdc business day count convention
			* @param {object} is_holiday_function
			* @returns {date} adjusted date
			* @memberof library
			* @public
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


		/**
		 	* add business days
			* @param {date} from from date
			* @param {number} n days to be added
			* @param {boolean} is_holiday_function
			* @returns {date} date + n business days
			* @memberof library
			* @public
		*/   
	library.add_business_days=function(from, n, is_holiday_function){
		var res=from, i=n;
		while (i>0){
			res=library.adjust(library.add_days(res, 1), "f", is_holiday_function);
			i--;
		}
		return res;
	};

        

}(this.JsonRisk || module.exports));
