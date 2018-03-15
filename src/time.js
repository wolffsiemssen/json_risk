(function(library){

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


