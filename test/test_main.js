if (typeof require === 'function' ) var JsonRisk=require('../dist/json_risk.js');

var am=function(expr,msg){
        var m;
        if(!expr) {
                m="Failure: "+msg;
                console.log(m);
                m='<strong style="color:red">Failure: </strong>'+msg+'</br>';
                if (typeof document != 'undefined') document.body.innerHTML+=m;
                if (typeof process != 'undefined' && typeof process.exit ==='function' ) process.exit(1);
        }else{
                m="Success: "+msg;
                console.log(m);
                m='<strong style="color:green">Success: </strong>'+msg+'</br>';
                if (typeof document != 'undefined') document.body.innerHTML+=m;
        }
};


am (typeof JsonRisk.require_vd === 'function', "require_vd function defined");
am (typeof JsonRisk.pricer_bond === 'function', "pricer_bond function defined");
am (typeof JsonRisk.period_str_to_time === 'function', "period_str_to_time function defined");
am (typeof JsonRisk.get_safe_date === 'function', "get_safe_date function defined");
am (typeof JsonRisk.date_str_to_date === 'function', "date_string_to_date function defined");
am (typeof JsonRisk.get_rate === 'function', "get_rate function defined");
am (typeof JsonRisk.get_df === 'function', "get_df function defined");
am (typeof JsonRisk.get_fwd_rate === 'function', "get_fwd_rate function defined");
am (typeof JsonRisk.get_const_curve === 'function', "get_const_curve function defined");
am (typeof JsonRisk.get_safe_curve === 'function', "get_safe_curve function defined");

/*!
	
	Test Year Fraction
	
*/
var from;
var to;
var yf;
var i;
yf=JsonRisk.year_fraction_factory("a/365");
for (i=1; i<11; i++){
        from=new Date(2000+i, 2*i, 3*i);
        to=JsonRisk.add_days(from,i*i);
        am((yf(from, to)*365).toFixed(10)===(i*i).toFixed(10), "Act/365 year fraction (" + i + ")");
}

yf=JsonRisk.year_fraction_factory("a/360");
for (i=1; i<11; i++){
        from=new Date(2000+i, 2*i, 3*i);
        to=JsonRisk.add_days(from,i*i);
        am((yf(from,to)*360).toFixed(10)===(i*i).toFixed(10), "Act/360 year fraction (" + i + ")");
}

yf=JsonRisk.year_fraction_factory("30U/360");
from=new Date(2000,0,1);
to = new Date(2001,0,1);
am(yf(from,to).toFixed(10)===(1).toFixed(10), "30U/360 year fraction (1)");    

from=new Date(2010,7,1);
to = new Date(2020,7,1);
am(yf(from,to).toFixed(10)===(10).toFixed(10), "30U/360 year fraction (2)");

from=new Date(2000,0,31); //day will be set to 30
to = new Date(2001,0,30);
am(yf(from,to).toFixed(10)===(1).toFixed(10), "30U/360 year fraction (3)");

from=new Date(2000,0,30);
to = new Date(2001,0,31); //day will be set to 30
am(yf(from,to).toFixed(10)===(1).toFixed(10), "30U/360 year fraction (4)");

from=new Date(2000,1,28); //day will not be set to 30
to = new Date(2010,1,28); //day will not be set to 30
am(yf(from,to).toFixed(10)===(10).toFixed(10), "30U/360 year fraction (5)");

from=new Date(2000,0,29);
to = new Date(2001,0,31); //day will not set to 30 since start day is less than 30
am(yf(from,to).toFixed(10)===(1+2/360).toFixed(10), "30U/360 year fraction (6)");


yf=JsonRisk.year_fraction_factory("30E/360");
from=new Date(2000,0,1);
to = new Date(2001,0,1);
am(yf(from,to).toFixed(10)===(1).toFixed(10), "30E/360 year fraction (1)");    

from=new Date(2010,7,1);
to = new Date(2020,7,1);
am(yf(from,to).toFixed(10)===(10).toFixed(10), "30E/360 year fraction (2)");

from=new Date(2000,0,31); //day will be set to 30
to = new Date(2001,0,30);
am(yf(from,to).toFixed(10)===(1).toFixed(10), "30E/360 year fraction (3)");

from=new Date(2000,0,30);
to = new Date(2001,0,31); //day will be set to 30
am(yf(from,to).toFixed(10)===(1).toFixed(10), "30E/360 year fraction (4)");

from=new Date(2000,1,28); //day will not be set to 30
to = new Date(2010,1,28); //day will not be set to 30
am(yf(from,to).toFixed(10)===(10).toFixed(10), "30E/360 year fraction (5)");

from=new Date(2000,1,29); //day will not be set to 30
to = new Date(2010,1,28); //day will not be set to 30
am(yf(from,to).toFixed(10)===(10-1/360).toFixed(10), "30E/360 year fraction (6)");



yf=JsonRisk.year_fraction_factory("30G/360");
from=new Date(2000,0,1);
to = new Date(2001,0,1);
am(yf(from,to).toFixed(10)===(1).toFixed(10), "30G/360 year fraction (1)");    

from=new Date(2010,7,1);
to = new Date(2020,7,1);
am(yf(from,to).toFixed(10)===(10).toFixed(10), "30G/360 year fraction (2)");

from=new Date(2000,0,31); //day will be set to 30
to = new Date(2001,0,30);
am(yf(from,to).toFixed(10)===(1).toFixed(10), "30G/360 year fraction (3)");

from=new Date(2000,0,30);
to = new Date(2001,0,31); //day will be set to 30
am(yf(from,to).toFixed(10)===(1).toFixed(10), "30G/360 year fraction (4)");

from=new Date(2000,1,29); //day will be set to 30
to = new Date(2010,1,28); //day will be set to 30
am(yf(from,to).toFixed(10)===(10).toFixed(10), "30G/360 year fraction (5)");

from=new Date(2000,1,28); //day will not be set to 30 since not the last day in feb
to = new Date(2010,1,28); //day will be set to 30
am(yf(from,to).toFixed(10)===(10+2/360).toFixed(10), "30G/360 year fraction (6)");


yf=JsonRisk.year_fraction_factory("act/act");
from=new Date(2010,11,30);
to = new Date(2011,0,2);
am(yf(from,to).toFixed(10)===(3/365).toFixed(10), "act/act year fraction (1)");

from=new Date(2011,11,30);
to = new Date(2012,0,2);
am(yf(from,to).toFixed(10)===(2/365+1/366).toFixed(10), "act/act year fraction (2)");

from=new Date(2010,11,30);
to = new Date(2013,0,2);
am(yf(from,to).toFixed(10)===(367/365 + 1 + 1/365).toFixed(10), "act/act year fraction (3)");

from=new Date(2010,3,30);
to = new Date(2010,9,30);
am(yf(from,to).toFixed(10)===(183/365).toFixed(10), "act/act year fraction (4)");

yf=JsonRisk.year_fraction_factory("");
for (i=1; i<11; i++){
        from=new Date(2000+i,2*i,3*i);
        to=JsonRisk.add_days(from,i*i);
        am((yf(from,to)*365).toFixed(10)===(i*i).toFixed(10), "Undefined year fracion fallback to Act/365 (" + i + ")");
}

/*!
	
	Test month addition
	
*/
from=new Date(2000,1,25);
for (i=1; i<11; i++){
        am(JsonRisk.add_months(from,i*i).getTime()===new Date(2000,1+(i*i),25).getTime(),"Month addition (pos)");
        am(JsonRisk.add_months(from,-i*i).getTime()===new Date(2000,1-(i*i),25).getTime(),"Month addition (neg)");
}

from=new Date(2000,0,31);
for (i=1; i<4; i++){
        am(JsonRisk.add_months(from,2*i).getTime()===new Date(2000,2*i,31).getTime(),"Month addition (31st)");
        am(JsonRisk.add_months(from,2*i+5).getTime()===new Date(2000,2*i+5,31).getTime(),"Month addition (31st)");
        am(JsonRisk.add_months(from,12*i+1).getTime()===new Date(2000,12*i+1,28).getTime(),"Month addition (31st, Feb)");
}
am(JsonRisk.add_months(from,49).getTime()===new Date(2000,49,29).getTime(),"Month addition (31st, Feb, Leap Year)");

/*!
	
	Test holidays / calendar / adjustment
	
*/
var cal=JsonRisk.is_holiday_factory("TARGET");

from=new Date(2000,0,1);
for (i=1; i<10; i++){
        from=JsonRisk.add_days(from,i*i);
        am(from.getTime()===JsonRisk.adjust(from,"unadjusted",cal).getTime(),"BDC unadjusted (" + i + ")");
}

from=new Date(2018,0,1); //Monday
am(JsonRisk.add_days(from,1).getTime()===JsonRisk.adjust(from,"following",cal).getTime(),"BDC following");
am(JsonRisk.add_days(from,1).getTime()===JsonRisk.adjust(from,"modified following",cal).getTime(),"BDC mod following");
am(JsonRisk.add_days(from,-3).getTime()===JsonRisk.adjust(from,"preceding",cal).getTime(),"BDC preceding");


from=new Date(2018,2,30);//Friday
am(JsonRisk.add_days(from,4).getTime()===JsonRisk.adjust(from,"following",cal).getTime(),"BDC following");
am(JsonRisk.add_days(from,-1).getTime()===JsonRisk.adjust(from,"modified following",cal).getTime(),"BDC mod following");
am(JsonRisk.add_days(from,-1).getTime()===JsonRisk.adjust(from,"preceding",cal).getTime(),"BDC preceding");


from=new Date(2018,3,2); //Monday (Ostermontag)
am(JsonRisk.add_days(from,1).getTime()===JsonRisk.adjust(from,"following",cal).getTime(),"BDC following");
am(JsonRisk.add_days(from,1).getTime()===JsonRisk.adjust(from,"modified following",cal).getTime(),"BDC mod following");
am(JsonRisk.add_days(from,-4).getTime()===JsonRisk.adjust(from,"preceding",cal).getTime(),"BDC preceding");

from=new Date(2018,4,1); //Tuesday
am(JsonRisk.add_days(from,1).getTime()===JsonRisk.adjust(from,"following",cal).getTime(),"BDC following");
am(JsonRisk.add_days(from,1).getTime()===JsonRisk.adjust(from,"modified following",cal).getTime(),"BDC mod following");
am(JsonRisk.add_days(from,-1).getTime()===JsonRisk.adjust(from,"preceding",cal).getTime(),"BDC preceding");

from=new Date(2018,11,25); //Tuesday
am(JsonRisk.add_days(from,2).getTime()===JsonRisk.adjust(from,"following",cal).getTime(),"BDC following");
am(JsonRisk.add_days(from,2).getTime()===JsonRisk.adjust(from,"modified following",cal).getTime(),"BDC mod following");
am(JsonRisk.add_days(from,-1).getTime()===JsonRisk.adjust(from,"preceding",cal).getTime(),"BDC preceding");

from=new Date(2018,11,26); //Wednesday
am(JsonRisk.add_days(from,1).getTime()===JsonRisk.adjust(from,"following",cal).getTime(),"BDC following");
am(JsonRisk.add_days(from,1).getTime()===JsonRisk.adjust(from,"modified following",cal).getTime(),"BDC mod following");
am(JsonRisk.add_days(from,-2).getTime()===JsonRisk.adjust(from,"preceding",cal).getTime(),"BDC preceding");

//test custom calendar
from=new Date(2000,0,1);
to=new Date(2100,0,1);
dates=[];
while (from.getTime()<to.getTime()){
        if (cal(from)) dates.push(from); // add all target holidays to custom list
        from=JsonRisk.add_days(from, 1);
}
//create custom calendar
JsonRisk.add_calendar("custom", dates);

//check custom calendar equals TARGET
var customcal=JsonRisk.is_holiday_factory("CUSTOM"); //should be case insensitive
from=new Date(2000,0,1);
var res=true;
while (from.getTime()<to.getTime()){

        if (cal(from) !== customcal(from)){
                am(cal(from) === customcal(from), "Custom Calendars: " + from);
                break;
        }
        from=JsonRisk.add_days(from, 1);
}


/*

        Period string conversion

*/
am(JsonRisk.period_str_to_time("1Y")===1, "Period string (1Y)");
am(JsonRisk.period_str_to_time("12y")===12, "Period string (12y)");
am(JsonRisk.period_str_to_time("999Y")===999, "Period string (999Y)");
am(JsonRisk.period_str_to_time("6M")===1/2, "Period string (6M)");
am(JsonRisk.period_str_to_time("12m")===1, "Period string (12m)");
am(JsonRisk.period_str_to_time("24M")===2, "Period string (24M)");
am(JsonRisk.period_str_to_time("365d")===1, "Period string (365d)");
am(JsonRisk.period_str_to_time("156w")===3, "Period string (156w)");

var foo="do not overwrite";
try{
        foo=JsonRisk.period_str_to_time("156r");
}catch(e){
        console.log("Expected error message: " + e.toString());
}
am(foo==="do not overwrite", "Period string (invalid period string)");


/*

        Date string conversion

*/

console.log(new Date(2018,1,28));
am(JsonRisk.date_str_to_date("28.2.2018").getTime()===new Date(2018,1,28).getTime(), "Date string (28.2.2018)");
am(JsonRisk.date_str_to_date("2018-2-28").getTime()===new Date(2018,1,28).getTime(), "Date string (2018-28-2)");
am(JsonRisk.date_str_to_date("2018-02-28").getTime()===new Date(2018,1,28).getTime(), "Date string (2018-28-02)");
am(JsonRisk.date_str_to_date("2018-03-31").getTime()===new Date(2018,2,31).getTime(), "Date string (2018-31-03)");
am(JsonRisk.date_str_to_date("31.12.1999").getTime()===new Date(1999,11,31).getTime(), "Date string (31.12.1999)");
am(JsonRisk.date_str_to_date("1.1.1999").getTime()===new Date(1999,0,1).getTime(), "Date string (1.1.1999)");

var foo="do not overwrite";
try{
        foo=JsonRisk.date_str_to_date("29.2.2018");
}catch(e){
        console.log("Expected error message: " + e.toString());
}
am(foo==="do not overwrite", "Period string (invalid period string)");

foo="do not overwrite";
try{
        foo=JsonRisk.date_str_to_date("32.1.2018");
}catch(e){
        console.log("Expected error message: " + e.toString());
}
am(foo==="do not overwrite", "Period string (invalid period string)");

foo="do not overwrite";
try{
        foo=JsonRisk.date_str_to_date("1.13.2099");
}catch(e){
        console.log("Expected error message: " + e.toString());
}
am(foo==="do not overwrite", "Period string (invalid period string)");


foo="do not overwrite";
try{
        foo=JsonRisk.date_str_to_date("11-131-2099");
}catch(e){
        console.log("Expected error message: " + e.toString());
}
am(foo==="do not overwrite", "Period string (invalid period string)");



/*!
	
	Test Curves
	
*/

//Constant zero curve - extrapolation only
var c=JsonRisk.get_const_curve(0.03);
am ((0.03).toFixed(10) === JsonRisk.get_rate(c, 0.1).toFixed(10), "Const Yield Curve Extrapolation short (1)");
am ((0.03).toFixed(10) === JsonRisk.get_rate(c, 1/365).toFixed(10), "Const Yield Curve Extrapolation short (2)");
am ((0.03).toFixed(10) === JsonRisk.get_rate(c, 10).toFixed(10), "Const Yield Curve Extrapolation long (1)");
am ((0.03).toFixed(10) === JsonRisk.get_rate(c, 20).toFixed(10), "Const Yield Curve Extrapolation long (2)");

//

//linear interpolation on discounts
c={type: "yield", labels: ["1Y", "20Y"], times: [1,20], dfs: [1, 0.5]};
for (i=1;i<21;i++){
        am ((1*(20-i)/19 + 0.5*(i-1)/19).toFixed(10) === JsonRisk.get_df(c, i).toFixed(10), "Yield Curve interpolation " + i );
}

//linear interpolation stability with more support points
c={type: "yield", 
   times: [1,7,12,15.5,20],
   dfs: [1, JsonRisk.get_df(c, 7), JsonRisk.get_df(c, 12), JsonRisk.get_df(c, 15.5), 0.5]
  };
   
for (i=1;i<21;i++){
        am ((1*(20-i)/19 + 0.5*(i-1)/19).toFixed(10) === JsonRisk.get_df(c, i).toFixed(10), "Yield Curve interpolation stability " + i );
}

//Curve without times - fallback based on days
c={type: "yield", 
   days: [365, 7*365, 12*365, 15.5*365, 20*365] , 
   dfs: c.dfs
  };
   
for (i=1;i<21;i++){
        am ((1*(20-i)/19 + 0.5*(i-1)/19).toFixed(10) === JsonRisk.get_df(c, i).toFixed(10), "Yield Curve interpolation fallback on days " + i );
}

//Curve without times - fallback based on labels
c={type: "yield", 
   labels: ["1Y", "7Y", "12Y", "186M", "20Y"],
   dfs: c.dfs
  };
  
for (i=1;i<21;i++){
        am ((1*(20-i)/19 + 0.5*(i-1)/19).toFixed(10) === JsonRisk.get_df(c, i).toFixed(10), "Yield Curve interpolation fallback on labels " + i );
}

//Curve without times - fallback based on dates
c={type: "yield",
   labels: ["0Y", "1Y", "2Y", "3Y", "13Y"], 
   dates: ["01.01.2000", "31.12.2000", "31.12.2001", "31.12.2002", "28.12.2012"],
   dfs: [1, 0.9, 0.8, 0.7, 0.5]
  };
   
am ((0.95).toFixed(10) === JsonRisk.get_df(c, 0.5).toFixed(10), "Yield Curve interpolation fallback on dates 1");
am ((0.85).toFixed(10) === JsonRisk.get_df(c, 1.5).toFixed(10), "Yield Curve interpolation fallback on dates 2");
am ((0.75).toFixed(10) === JsonRisk.get_df(c, 2.5).toFixed(10), "Yield Curve interpolation fallback on dates 3");
am ((0.6).toFixed(10) === JsonRisk.get_df(c, 8).toFixed(10), "Yield Curve interpolation fallback on dates 4");

//curve addition
var c1={type: "yield",
   labels: ["0Y", "1Y", "2Y", "3Y", "13Y"], 
   zcs: [0.01, 0.009, 0.008, 0.008, 0.008]
  };
var c2={type: "yield",
   labels: ["5Y", "10Y"], 
   zcs: [0.02, 0.02]
};

c=JsonRisk.add_curves(c1, c2);

am (7 === c.times.length, "Yield Curve addition");
am ((0.029).toFixed(10) === JsonRisk.get_rate(c, 1).toFixed(10), "Yield Curve addition");
am ((0.028).toFixed(10) === JsonRisk.get_rate(c, 13).toFixed(10), "Yield Curve addition");
am ((0.02 + JsonRisk.get_rate(c1, 5)).toFixed(10) === JsonRisk.get_rate(c, 5).toFixed(10), "Yield Curve addition");
am ((0.02 + JsonRisk.get_rate(c1, 10)).toFixed(10) === JsonRisk.get_rate(c, 10).toFixed(10), "Yield Curve addition");

/*!
	
	Test Surfaces
	
*/

//Constant surface - extrapolation only
var s=JsonRisk.get_const_surface(0.03);
console.log(s);
am ((0.03).toFixed(10) === JsonRisk.get_surface_rate(s, 0.1, 0.2).toFixed(10), "Const Surface Extrapolation short-short (1)");
am ((0.03).toFixed(10) === JsonRisk.get_surface_rate(s, 0.1, 20).toFixed(10), "Const Surface Extrapolation short-long (2)");
am ((0.03).toFixed(10) === JsonRisk.get_surface_rate(s, 20, 0.1).toFixed(10), "Const Surface Extrapolation long-short (1)");
am ((0.03).toFixed(10) === JsonRisk.get_surface_rate(s, 20, 20).toFixed(10), "Const Surface Extrapolation long-long (2)");

//

//bi-linear interpolation on surface
s={type: "bachelier", expiries: [1,2,3], terms: [1,2,3,4], values: [[1, 1, 2, 2],[2, 2, 3, 3],[3, 3, 4, 4]]};

am ((1.5).toFixed(10) === JsonRisk.get_surface_rate(s, 1, 2.5).toFixed(10), "Surface interpolation (1)");
am ((2.5).toFixed(10) === JsonRisk.get_surface_rate(s, 2, 2.5).toFixed(10), "Surface interpolation (2)");
am ((3).toFixed(10) === JsonRisk.get_surface_rate(s, 2.5, 2.5).toFixed(10), "Surface interpolation (3)");
am ((3.5).toFixed(10) === JsonRisk.get_surface_rate(s, 2.5, 3.5).toFixed(10), "Surface interpolation (4)");

s.labels_expiry=["1Y", "2Y", "3Y"];
s.labels_term=["1Y", "2Y", "3Y", "4Y"];
delete s.expiries;
delete s.terms;

am ((1.5).toFixed(10) === JsonRisk.get_surface_rate(s, 1, 2.5).toFixed(10), "Surface interpolation (fallback on labels, 1)");
am ((2.5).toFixed(10) === JsonRisk.get_surface_rate(s, 2, 2.5).toFixed(10), "Surface interpolation (fallback on labels, 2)");
am ((3).toFixed(10) === JsonRisk.get_surface_rate(s, 2.5, 2.5).toFixed(10), "Surface interpolation (fallback on labels, 3)");
am ((3.5).toFixed(10) === JsonRisk.get_surface_rate(s, 2.5, 3.5).toFixed(10), "Surface interpolation (fallback on labels, 4)");

//bi-linear interpolation on cube without strikes
am ((1.5).toFixed(10) === JsonRisk.get_cube_rate(s, 1, 2.5, 0).toFixed(10), "Cube interpolation on surface only (1)");
am ((2.5).toFixed(10) === JsonRisk.get_cube_rate(s, 2, 2.5, 1).toFixed(10), "Cube interpolation on surface only (2)");
am ((3).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 2.5, -1).toFixed(10), "Cube interpolation on surface only (3)");
am ((3.5).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 3.5, 0).toFixed(10), "Cube interpolation on surface only (4)");

//tri-linear interpolation on cube with strikes
s={type: "bachelier", expiries: [1,2,3], terms: [1,2,3,4], values: [[1, 1, 2, 2],[2, 2, 3, 3],[3, 3, 4, 4]]};
smile_section=JSON.parse(JSON.stringify(s));
s.moneyness=[-0.02,-0.01,0,0.01,0.01];
s.smile=[smile_section,smile_section,JsonRisk.get_const_surface(0),smile_section,smile_section];

//ATM
am ((1.5).toFixed(10) === JsonRisk.get_cube_rate(s, 1, 2.5, 0).toFixed(10), "Cube interpolation ATM (1)");
am ((2.5).toFixed(10) === JsonRisk.get_cube_rate(s, 2, 2.5, 0).toFixed(10), "Cube interpolation ATM (2)");
am ((3).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 2.5, 0).toFixed(10), "Cube interpolation ATM (3)");
am ((3.5).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 3.5, 0).toFixed(10), "Cube interpolation ATM (4)");

//+50 BP
am ((1.5*1.5).toFixed(10) === JsonRisk.get_cube_rate(s, 1, 2.5, 0.005).toFixed(10), "Cube interpolation +50BP (1)");
am ((2.5*1.5).toFixed(10) === JsonRisk.get_cube_rate(s, 2, 2.5, 0.005).toFixed(10), "Cube interpolation +50BP (2)");
am ((3*1.5).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 2.5, 0.005).toFixed(10), "Cube interpolation +50BP (3)");
am ((3.5*1.5).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 3.5, 0.005).toFixed(10), "Cube interpolation +50BP (4)");

//-100 BP
am ((1.5*2).toFixed(10) === JsonRisk.get_cube_rate(s, 1, 2.5, -0.01).toFixed(10), "Cube interpolation -100BP (1)");
am ((2.5*2).toFixed(10) === JsonRisk.get_cube_rate(s, 2, 2.5, -0.01).toFixed(10), "Cube interpolation -100BP (2)");
am ((3*2).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 2.5, -0.01).toFixed(10), "Cube interpolation -100BP (3)");
am ((3.5*2).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 3.5, -0.01).toFixed(10), "Cube interpolation -100BP (4)");

//+150 BP
am ((1.5*2).toFixed(10) === JsonRisk.get_cube_rate(s, 1, 2.5, 0.015).toFixed(10), "Cube interpolation +150BP (1)");
am ((2.5*2).toFixed(10) === JsonRisk.get_cube_rate(s, 2, 2.5, 0.015).toFixed(10), "Cube interpolation +150BP (2)");
am ((3*2).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 2.5, 0.015).toFixed(10), "Cube interpolation +150BP (3)");
am ((3.5*2).toFixed(10) === JsonRisk.get_cube_rate(s, 2.5, 3.5, 0.015).toFixed(10), "Cube interpolation +150BP (4)");

/*!
	
	Test Schedule
	
*/
var same_dates=function(sched, expected){
        var i;
        var fail=false;
        if (sched.length !== expected.length) fail=true;
        for (i=1;i<sched.length && (!fail);i++){
                if(!(sched[i] instanceof Date)) fail=true;
                if(!(expected[i] instanceof Date)) fail=true;
                if(sched[i].getTime()!==expected[i].getTime()) fail=true;
                if(fail) break;
        }
        if(!fail) return true;
        console.log("Generated schedule: " + sched);
        console.log("Expected schedule: " + expected);
        return false;
};

var expected=[
        new Date(1980,0,1),
        new Date(1981,0,1),
        new Date(1982,0,1),
        new Date(1983,0,1),
        new Date(1984,0,1)
];

var adj=function(d){return JsonRisk.adjust(d,"unadjusted",JsonRisk.is_holiday_factory(""));};

var sched=JsonRisk.schedule(new Date(1980,0,1), new Date(1984,0,1), 12, adj, null, null);
am (same_dates(sched, expected), "Backward schedule generation (1)");

sched=JsonRisk.schedule(new Date(1980,0,1), new Date(1984,0,1), 12, adj, new Date(1981,0,1), new Date(1983,0,1));
am (same_dates(sched, expected), "Backward schedule generation (2)");

sched=JsonRisk.schedule(new Date(1980,0,1), new Date(1984,0,1), 12, adj, new Date(1981,0,1), new Date(1984,0,1));
am (same_dates(sched, expected), "Backward schedule generation (3)");

adj=function(d){return JsonRisk.adjust(d,"preceding",JsonRisk.is_holiday_factory(""));};
sched=JsonRisk.schedule(new Date(1980,0,1), new Date(1984,0,1), 12, adj, new Date(1981,0,1), new Date(1983,0,1));
am (same_dates(sched, expected), "Backward schedule generation (4)");


adj=function(d){return JsonRisk.adjust(d,"unadjusted",JsonRisk.is_holiday_factory(""));};

sched=JsonRisk.schedule(new Date(1980,0,1), new Date(1984,0,1), 12, adj, null, null, true /*stub at end*/);
am (same_dates(sched, expected), "Forward schedule generation (1)");

sched=JsonRisk.schedule(new Date(1980,0,1), new Date(1984,0,1), 12, adj, new Date(1981,0,1), null);
am (same_dates(sched, expected), "Forward schedule generation (2)");

expected=[
        new Date(1980,0,1),
        new Date(1981,0,2),
        new Date(1982,0,2),
        new Date(1983,0,2),
        new Date(1984,0,2)
];

adj=function(d){return JsonRisk.adjust(d,"following",JsonRisk.is_holiday_factory("Target"));};
sched=JsonRisk.schedule(new Date(1980,0,1), new Date(1984,0,2), 12, adj);
am (same_dates(sched, expected), "Backward schedule generation where effective date is unadjusted and duplicate needs to be avoided");


expected=[
        new Date(1980,11,31),
        new Date(1981,11,31),
        new Date(1982,11,31),
        new Date(1983,11,31),
        new Date(1985,0,1)
];

adj=function(d){return JsonRisk.adjust(d,"preceding",JsonRisk.is_holiday_factory("Target"));};
sched=JsonRisk.schedule(new Date(1980,11,31), new Date(1985,0,1), 12, adj, null, null, true /*stub at end*/);
am (same_dates(sched, expected), "Forward schedule generation where maturity date is unadjusted and duplicate needs to be avoided");


expected=[
        new Date(1980,0,1),
        new Date(1980,2,1), //first date
        new Date(1981,2,1),
        new Date(1982,2,1),
        new Date(1983,2,1), //next to last date
        new Date(1984,0,1)
];

adj=function(d){return JsonRisk.adjust(d,"unadjusted",JsonRisk.is_holiday_factory(""));};
sched=JsonRisk.schedule(new Date(1980,0,1), new Date(1984,0,1), 12, adj, new Date(1980,2,1), new Date(1983,2,1));
am (same_dates(sched, expected), "Backward schedule generation (6)");

sched=JsonRisk.schedule(new Date(1980,0,1), new Date(1984,0,1), 12, adj, new Date(1980,2,1), null);
am (same_dates(sched, expected), "Forward schedule generation (6)");

expected=[
        new Date(1980,0,1),
        new Date(1980,2,1), //first date
        new Date(1980,8,1),
        new Date(1981,2,1),
        new Date(1981,8,1),
        new Date(1982,2,1),
        new Date(1982,8,1),
        new Date(1983,2,1), //next to last date
        new Date(1984,0,1)
];
sched=JsonRisk.schedule(new Date(1980,0,1), new Date(1984,0,1), 6, adj, new Date(1980,2,1), new Date(1983,2,1));
am (same_dates(sched, expected), "Backward schedule generation (7)");


expected=[
        new Date(1980,0,1),
        new Date(1980,2,1), //first date
        new Date(1980,8,1),
        new Date(1981,2,1),
        new Date(1981,8,1),
        new Date(1982,2,1),
        new Date(1982,8,1),
        new Date(1983,2,1), 
        new Date(1983,8,1), //implicit final stub
        new Date(1984,0,1)
];

sched=JsonRisk.schedule(new Date(1980,0,1), new Date(1984,0,1), 6, adj, new Date(1980,2,1), null);
am (same_dates(sched, expected), "Forward schedule generation (7)");

expected=[
        new Date(1980,0,1),
        new Date(1981,0,1),
        new Date(1982,0,1),
        new Date(1983,0,1),
        new Date(1984,0,1)
];
JsonRisk.valuation_date=new Date(1980,6,1);
sched=JsonRisk.schedule(null, new Date(1984,0,1), 12, adj, null, null);
am (same_dates(sched, expected), "Backward schedule generation without effective date (1)");

sched=JsonRisk.schedule(null, new Date(1984,0,1), 12, adj, null, new Date(1983,0,1));
am (same_dates(sched, expected), "Backward schedule generation without effective date (2)");

expected=[
        new Date(1980,3,1),
        new Date(1980,9,1),
        new Date(1981,3,1),
        new Date(1981,9,1),
        new Date(1982,3,1),
        new Date(1982,9,1),
        new Date(1983,3,1),
        new Date(1984,0,1)
];


sched=JsonRisk.schedule(null, new Date(1984,0,1), 6, adj, null, new Date(1983,3,1));
am (same_dates(sched, expected), "Backward schedule generation without effective date (3)");


/*!

	Schedule generation consistency checks

*/
var start, end, stub;
for (i=2;i<=12;i++){
	start=new Date(2000+i, i-2, 2*i); //starts in Jan, Feb, Mar ...
	end=JsonRisk.add_months(start, 12*i+1);   //always requires one-month short stub or one+i months long stub ...
	expected=JsonRisk.schedule(start, end, i, adj, null, null, false, false); //standard backward schedule has short stub at beginning
	stub=JsonRisk.add_months(start, 1);
	sched=JsonRisk.schedule(start, end, i, adj, stub, null, false, false);
	am (same_dates(sched, expected), "Schedule generation consistency short stub at beginning (" + (i-1) + ")");

	expected=JsonRisk.schedule(start, end, i, adj, null, null, false, true);  //backward schedule with long stub at beginning
	stub=JsonRisk.add_months(start, 1+i);
	sched=JsonRisk.schedule(start, end, i, adj, stub, null, null, null);
	am (same_dates(sched, expected), "Schedule generation consistency long stub at beginning (" + (i-1) + ")");

	expected=JsonRisk.schedule(start, end, i, adj, null, null, true, false); //forward schedule with short stub at end
	stub=JsonRisk.add_months(end, -1);
	console.log("Explicit short stub at end: " + stub);
	sched=JsonRisk.schedule(start, end, i, adj, null, stub, null, null);
	am (same_dates(sched, expected), "Schedule generation consistency short stub at end (" + (i-1) + ")");

	expected=JsonRisk.schedule(start, end, i, adj, null, null, true, true);  //forward schedule with long stub at end
	stub=JsonRisk.add_months(end, -1-i);
	sched=JsonRisk.schedule(start, end, i, adj, null, stub, null, null);
	am (same_dates(sched, expected), "Schedule generation consistency long stub at end (" + (i-1) + ")");
}



/*!

	
	Test bond Valuation
	
*/
var curve=JsonRisk.get_const_curve(0.05);
JsonRisk.valuation_date=new Date(2000,0,17);
var bond={
        maturity: "2010-01-18",
        notional: 100,
        fixed_rate: 0.05,
        tenor: 12,
        bdc: "unadjusted"
};
console.log(JsonRisk.pricer_bond(bond,curve, null, null));

am("105.0"===JsonRisk.pricer_bond(bond,curve, null, null).toFixed(1), "bond valuation (1)");

bond.settlement_days=1;

am("100.0"===JsonRisk.pricer_bond(bond,curve, null, null).toFixed(1), "bond valuation (2)");

bond.tenor=6;
am("100.5"===JsonRisk.pricer_bond(bond,curve, null, null).toFixed(1), "bond valuation (3)");

bond.tenor=3;
am("100.7"===JsonRisk.pricer_bond(bond,curve, null, null).toFixed(1), "bond valuation (4)");

//reale bundesanleihen, kurse und renditen vom 23.02.2018
/*
Kupon	Bez	Mat	        Kurs Clean	Rendite	Kurs Dirty
1.750	Bund 14	15.02.2024	109.338	        0.18	109.396
1.500	Bund 14	15.05.2024	107.930	        0.21	109.114
1.000	Bund 14	15.08.2024	104.830	        0.25	105.367
0.500	Bund 15	15.02.2025	101.263	        0.32	101.279
1.000	Bund 15	15.08.2025	104.602	        0.37	105.139
0.500	Bund 16	15.02.2026	100.474	        0.44	100.490
4.250	Bund 07	04.07.2039	158.385	        1.15	161.156
4.750	Bund 08	04.07.2040	170.090	        1.17	173.187
3.250	Bund 10	04.07.2042	142.125	        1.24	144.244
2.500	Bund 12	04.07.2044	126.970	        1.29	128.600
2.500	Bund 14	15.08.2046	128.220	        1.31	129.562
1.250	Bund 17	15.08.2048	97.695	        1.34	98.366
*/

var Kupon=[1.750,1.500,1.000,0.500,1.000,0.500,4.250,4.750,3.250,2.500,2.500,1.250];
var Maturity=["15.02.2024", "15.05.2024", "15.08.2024", "15.02.2025", "15.08.2025",
              "15.02.2026", "04.07.2039", "04.07.2040", "04.07.2042", "04.07.2044",
              "15.08.2046", "15.08.2048"];
var Kurs_Dirty=[109.396, 109.114, 105.367, 101.279, 105.139, 100.490,
                161.156, 173.187, 144.244, 128.600, 129.562, 98.366];
var Rendite=[0.18, 0.21, 0.25, 0.32, 0.37, 0.44, 1.15, 1.17,
             1.24, 1.29, 1.31, 1.34];

JsonRisk.valuation_date=new Date(2018,1,23);

var bonds=[];
for (i=0; i<Kupon.length; i++){
        bonds.push({
        maturity: Maturity[i],
        notional: 100.0,
        fixed_rate: Kupon[i]/100,
        tenor: 12,
        bdc: "following",
        dcc: "act/act",
        calendar: "TARGET",
        settlement_days: 2
        });
}


var pu,pd,i,r;
var null_curve=JsonRisk.get_const_curve(0.0);
//evaluate with yield curve
for (i=0; i<Kupon.length; i++){
        r=Rendite[i]/100;
        curve_down=JsonRisk.get_const_curve(r-0.0001);
        curve_up=JsonRisk.get_const_curve(r+0.0001);
        pu=JsonRisk.pricer_bond(bonds[i],curve_up, null, null);
        pd=JsonRisk.pricer_bond(bonds[i],curve_down, null, null);
        console.log("JSON Risk Price one basis point cheaper:        " + pu.toFixed(3));    
        console.log("Quote from www.bundesbank.de:                   " + Kurs_Dirty[i].toFixed(3));
        console.log("JSON Risk Price one basis point more expensive: " + pd.toFixed(3));    

        am(pu<Kurs_Dirty[i] && Kurs_Dirty[i]<pd, "Bond Valuation (Real BUND Bonds using yield curve, " + (i+1) +")");
}
//evaluate with spread curve
for (i=0; i<Kupon.length; i++){
        r=Rendite[i]/100;
        curve_down=JsonRisk.get_const_curve(r-0.0001);
        curve_up=JsonRisk.get_const_curve(r+0.0001);
        pu=JsonRisk.pricer_bond(bonds[i],null_curve, curve_up, null);
        pd=JsonRisk.pricer_bond(bonds[i],null_curve, curve_down, null);
        am(pu<Kurs_Dirty[i] && Kurs_Dirty[i]<pd, "Bond Valuation (Real BUND Bonds using spread curve, " + (i+1) +")");
}

//Real prices at interest payment date minus settlement days
JsonRisk.valuation_date=new Date(2018,0,2);

Kupon=[3.750, 4.000];
Maturity=["04.01.2019", "04.01.2037"];
Kurs_Dirty=[104.468, 152.420];
Rendite=[-0.69, 0.97];

bonds=[];
for (i=0; i<Kupon.length; i++){
        bonds.push({
        maturity: Maturity[i],
        notional: 100.0,
        fixed_rate: Kupon[i]/100,
        tenor: 12,
        bdc: "following",
        dcc: "act/act",
        calendar: "TARGET",
        settlement_days: 2
        });
}

//evaluate with yield curve
for (i=0; i<Kupon.length; i++){
        r=Rendite[i]/100;
        curve_down=JsonRisk.get_const_curve(r-0.0001);
        curve_up=JsonRisk.get_const_curve(r+0.0001);
        pu=JsonRisk.pricer_bond(bonds[i],curve_up, null, null);
        pd=JsonRisk.pricer_bond(bonds[i],curve_down, null, null);
        console.log("JSON Risk Price one basis point cheaper:        " + pu.toFixed(3));    
        console.log("Quote from www.bundesbank.de:                   " + Kurs_Dirty[i].toFixed(3));
        console.log("JSON Risk Price one basis point more expensive: " + pd.toFixed(3));    
       
        am(pu<Kurs_Dirty[i] && Kurs_Dirty[i]<pd, "Bond Valuation (Real BUND Bonds at interest payment date minus settlement days, " + (i+1) +")");
}


//Real prices before interest payment date minus settlement
JsonRisk.valuation_date=new Date(2017,11,31);

Kurs_Dirty=[108.230, 157.199];
Rendite=[-0.70, 0.93];

//evaluate with yield curve
for (i=0; i<Kupon.length; i++){
        r=Rendite[i]/100;
        curve_down=JsonRisk.get_const_curve(r-0.0001);
        curve_up=JsonRisk.get_const_curve(r+0.0001);
        pu=JsonRisk.pricer_bond(bonds[i],curve_up, null, null);
        pd=JsonRisk.pricer_bond(bonds[i],curve_down, null, null);
        console.log("JSON Risk Price one basis point cheaper:        " + pu.toFixed(3));    
        console.log("Quote from www.bundesbank.de:                   " + Kurs_Dirty[i].toFixed(3));
        console.log("JSON Risk Price one basis point more expensive: " + pd.toFixed(3));    
       
        am(pu<Kurs_Dirty[i] && Kurs_Dirty[i]<pd, "Bond Valuation (Real BUND Bonds just before interest payment date minus settlement days, " + (i+1) +")");
}

// test against simple reference price

Kupon=[1.750,1.500,1.000,0.500,1.000,0.500,4.250,4.750,3.250,2.500,2.500,1.250];
Maturity=["15.02.2024", "15.05.2024", "15.08.2024", "15.02.2025", "15.08.2025",
              "15.02.2026", "04.07.2039", "04.07.2040", "04.07.2042", "04.07.2044",
              "15.08.2046", "15.08.2048"];

var adj=function(d){
        return JsonRisk.adjust(d,"following",JsonRisk.is_holiday_factory("TARGET"));
};
JsonRisk.valuation_date=adj(new Date(1900,0,1));

var pv=0, pv_ref=0;
//brief function to calculate bond pv at 10% discount
var pv_func=function(mat, kup){
	m=JsonRisk.get_safe_date(mat);
	var i=1;
	var t=JsonRisk.time_from_now(m);
	var t_pay=JsonRisk.time_from_now(adj(m));
	var t_last=JsonRisk.time_from_now(JsonRisk.add_months(m, -i));
	var res=100*Math.pow(1.1, -t_pay);
	while (t_last>0){
		res+=100*kup*(t-t_last)*Math.pow(1.1, -t_pay);		
		i++;
		t=t_last;
		t_last=JsonRisk.time_from_now(JsonRisk.add_months(m, -i));
		t_pay=JsonRisk.time_from_now(adj(JsonRisk.add_months(m, -i+1)));		
	}

	t_last=0;
	res+=100*kup*(t-t_last)*Math.pow(1.1, -t_pay);		
	return res;
};
//brief function to calculate bond pv at 10% discount, adjusted periods
var pv_func_adj=function(mat, kup){
	m=JsonRisk.get_safe_date(mat);
	var i=1;
	var t=JsonRisk.time_from_now(adj(m));
	var t_last=JsonRisk.time_from_now(adj(JsonRisk.add_months(m, -i)));
	var res=100*Math.pow(1.1, -t);
	while (t_last>0){
		res+=100*kup*(t-t_last)*Math.pow(1.1, -t);		
		i++;
		t=t_last;
		t_last=JsonRisk.time_from_now(adj(JsonRisk.add_months(m, -i)));
		
	}

	t_last=0;
	res+=100*kup*(t-t_last)*Math.pow(1.1, -t);		
	return res;
};
curve=JsonRisk.get_const_curve(0.1); // 10 percent discount
for(i=0; i<Kupon.length; i++){
	bond={
		effective_date: JsonRisk.valuation_date,	
		maturity: Maturity[i],
		notional: 100.0,
		fixed_rate: Kupon[i]/100,
		tenor: 1,
		bdc: "following",
		dcc: "act/365",
		calendar: "TARGET",
		adjust_accrual_periods: false
	};

	//unadjusted periods
	pv=JsonRisk.pricer_bond(bond,curve, null, null);
	pv_ref=pv_func(Maturity[i],Kupon[i]/100);
        console.log("Bond without adjusted periods                 " + pv.toFixed(8));         
        console.log("Bond without adjusted periods, reference price" + pv_ref.toFixed(8));    
        am(pv.toFixed(8)===pv_ref.toFixed(8), "Bond Valuation against reference price, with unadjusted accrual periods (" + (i+1) +")");

	//adjusted periods
	bond.adjust_accrual_periods=true;
	pv=JsonRisk.pricer_bond(bond,curve, null, null);
	pv_ref=pv_func_adj(Maturity[i],Kupon[i]/100);
        console.log("Bond with adjusted periods                 " + pv.toFixed(8));         
        console.log("Bond with adjusted periods, reference price" + pv_ref.toFixed(8));    
        am(pv.toFixed(8)===pv_ref.toFixed(8), "Bond Valuation against reference price, with adjusted accrual periods (" + (i+1) +")");
}
 

//evaluate floaters
Kupon=[1.750,1.500,1.000,0.500,1.000,0.500,4.250,4.750,3.250,2.500,2.500,1.250];
Maturity=["15.02.2024", "15.05.2024", "15.08.2024", "15.02.2025", "15.08.2025",
          "15.02.2026", "04.07.2039", "04.07.2040", "04.07.2042", "04.07.2044",
          "15.08.2046", "15.08.2048"];
Kurs_Dirty=[109.396, 109.114, 105.367, 101.279, 105.139, 100.490,
            161.156, 173.187, 144.244, 128.600, 129.562, 98.366];
Rendite=[0.18, 0.21, 0.25, 0.32, 0.37, 0.44, 1.15, 1.17,
         1.24, 1.29, 1.31, 1.34];
     
JsonRisk.valuation_date=new Date(2018,1,23);             
var floaters=[];
for (i=0; i<Kupon.length; i++){
        floaters.push({
        maturity: Maturity[i],
        notional: 100.0,
        float_spread: Kupon[i]/100,
        float_current_rate: 0,
        tenor: 12,
        bdc: "following",
        dcc: "act/act",
        calendar: "TARGET",
        settlement_days: 2
        });
}
var fwd_curve=JsonRisk.get_const_curve(0.0);

for (i=0; i<Kupon.length; i++){
        r=Rendite[i]/100;
        curve_down=JsonRisk.get_const_curve(r-0.0001);
        curve_up=JsonRisk.get_const_curve(r+0.0001);
        pu=JsonRisk.pricer_floater(floaters[i],curve_up, null, fwd_curve);
        pd=JsonRisk.pricer_floater(floaters[i],curve_down, null, fwd_curve);
        console.log("JSON Risk Price one basis point cheaper:        " + pu.toFixed(3));    
        console.log("Quote from www.bundesbank.de:                   " + Kurs_Dirty[i].toFixed(3));
        console.log("JSON Risk Price one basis point more expensive: " + pd.toFixed(3));
       
        am(pu<Kurs_Dirty[i] && Kurs_Dirty[i]<pd, "Floater Valuation (using constant forward curve with rate 0.0 and a positive float_spread, " + (i+1) +")");
}


for (i=0; i<Kupon.length; i++){
        floaters[i].float_spread=0;
        floaters[i].float_current_rate=Kupon[i]/100;
        fwd_curve=JsonRisk.get_const_curve(Kupon[i]/100);
        r=Rendite[i]/100;
        curve_down=JsonRisk.get_const_curve(r-0.0001);
        curve_up=JsonRisk.get_const_curve(r+0.0001);
        pu=JsonRisk.pricer_floater(floaters[i],curve_up, null, fwd_curve);
        pd=JsonRisk.pricer_floater(floaters[i],curve_down, null, fwd_curve);   
       
        am(pu<Kurs_Dirty[i] && Kurs_Dirty[i]<pd, "Floater Valuation (using constant forward curve with rate reflecting Bund coupon and a zero float_spread, " + (i+1) +")");
}

//evaluate swaps
//self consistency tests: create swap with equal tenors and conventions on fix and float leg.
// 1. create fixed curve for discount and forward
// 2. evaluate swap
// 3. evaluate with fix rate, forward curve and current float rate shifted 100 bp up
// 4. prices should be essentially the same

var months=[6,12,24,48,72,120];
var tenors=[1,3,6,12];
var times=[1/12,3/12,6/12,1,2,3,4,5];
var zcs=[0.001,0.002,0.003,0.004,0.005, 0.006, 0.007,0.007];
var zcs_up=[0.011,0.012,0.013,0.014,0.015, 0.016, 0.017, 0.017];
curve={times:times,zcs:zcs};
curve_up={times:times,zcs:zcs_up};
var swap, swap_up;
var p_up, p, p_diff;

JsonRisk.valuation_date=new Date(2018,1,23);             
for (i=0; i<months.length; i++){
        for (j=0; j<tenors.length; j++){
                swap={
                        is_payer: true,
                        maturity: JsonRisk.add_months(JsonRisk.valuation_date, months[i]),
                        notional: 10000,
                        fixed_rate: 0.015,
                        tenor: tenors[j],
                        float_spread: 0.01,
                        float_tenor: tenors[j],
                        float_current_rate: -0.005,
                        dcc: "30e/360",
                        float_dcc: "30e/360"
                };
                swap_up={
                        is_payer: true,
                        maturity: JsonRisk.add_months(JsonRisk.valuation_date, months[i]),
                        notional: 10000,
                        fixed_rate: swap.fixed_rate+1/100,
                        tenor: tenors[j],
                        float_spread: 0.01,
                        float_tenor: tenors[j],
                        float_current_rate: swap.float_current_rate+1/100,
                        dcc: "30e/360",
                        float_dcc: "30e/360"
                };
                p=JsonRisk.pricer_swap(swap,curve,curve);
                p_up=JsonRisk.pricer_swap(swap_up,curve,curve_up);
                p_diff=Math.abs(p-p_up);
                console.log("JSON Risk swap price:               " + p.toFixed(3));  
                console.log("JSON Risk swap price with rates up: " + p_up.toFixed(3));  
                am(p_diff<months[i]/12, "Swap Valuation (" + ((i)*tenors.length+(j+1)) +")");
        }
}

/* 

Test distribution functions

*/

var prob_interval=[
0,
0.68268949,
0.95449974,
0.99730020,
0.99993666,
0.99999943
];
for (i=0;i<prob_interval.length;i++){
        am((JsonRisk.ndf(i)*Math.sqrt(4.0*Math.acos(0.0))).toFixed(8)===Math.exp(-i*i/2).toFixed(8), "Test normal distribution function ("+i+")");
}

for (i=0;i<prob_interval.length;i++){
        am((JsonRisk.cndf(i)-JsonRisk.cndf(-i)).toFixed(8)===prob_interval[i].toFixed(8), "Test cumulative normal distribution function ("+i+")");
}

for (i=0;i<prob_interval.length;i++){
        console.log("IST:  " + (JsonRisk.fast_cndf(i)-JsonRisk.fast_cndf(-i)));
        console.log("SOLL: " + prob_interval[i]);
        am((JsonRisk.fast_cndf(i)-JsonRisk.fast_cndf(-i)).toFixed(5)===prob_interval[i].toFixed(5), "Test fast cumulative normal distribution function ("+i+")");
}

/* 

Test Swaptions

*/

var surface={type: "bachelier", expiries: [1,2,3], terms: [1,2,3,4], values: [[0.01, 0.01, 0.02, 0.02],[0.02, 0.02, 0.03, 0.03],[0.03, 0.03, 0.04, 0.04]]};
var expiries=[0,6,12,18,24,36,48,60,72,96,120];
var p1, p2, p3;
for (i=0; i<months.length; i++){
        for (j=0; j<expiries.length; j++){

                swaption={
                        is_payer: false,
                        maturity: JsonRisk.add_months(JsonRisk.valuation_date, expiries[j]+months[i]),
                        first_exercise_date: JsonRisk.add_months(JsonRisk.valuation_date, expiries[j]),
                        effective_date: JsonRisk.add_months(JsonRisk.valuation_date, expiries[j]),
                        notional: 10000,
                        fixed_rate: 0.02,
                        tenor: 6,
                        float_spread: 0.01,
                        float_tenor: 3,
                        float_current_rate: 0,
                        dcc: "act/365",
                        float_dcc: "30e/360"
                };

                p1=JsonRisk.pricer_swap(swaption,curve,curve);
                console.log("JSON Risk forward receiver swap price:   " + p1.toFixed(3)); 
                swaption.is_short=true;
                p2=JsonRisk.pricer_swaption(swaption,curve,curve, surface);
                console.log("JSON Risk short receiver swaption price: " + p2.toFixed(3));
                swaption.is_payer=true;
                swaption.is_short=false;
                p3=JsonRisk.pricer_swaption(swaption,curve,curve, surface);
                console.log("JSON Risk long payer swaption price:     " + p3.toFixed(3));  
                console.log("Sum of all three instruments:            " + (p1+p2+p3).toFixed(3));  
                am(Math.abs(p1+p2+p3)<0.01, "Test swaption put call parity      (" + expiries[j] + "M into " + months[i] + "M)");
                console.log("-----------------");
        }
}



/* 

Test swaption with zero notional

*/


swaption.notional=0;
p1=JsonRisk.pricer_swaption(swaption,curve,curve, surface);
am(p1===0, "Test swaption with zero notional");
                

/* 

Test cashflow equivalent swaption generation

*/
var first_exercise_date, swaption, swaption_internal, cfs, bond_internal;
for (i=0; i<months.length; i++){
        for (j=0; j<expiries.length; j++){

                first_exercise_date=JsonRisk.add_months(JsonRisk.valuation_date, expiries[j]);
                bond={
                        maturity: JsonRisk.add_months(JsonRisk.valuation_date, expiries[j]+months[i]),
                        notional: 10000,
                        fixed_rate: 0.02,
                        tenor: 6,
                        dcc: "act/365"
                };

                bond_internal=new JsonRisk.fixed_income(bond);
                p1=bond_internal.present_value(curve,null);
                console.log("JSON Risk bond price:                           " + p1.toFixed(3)); 
                cfs=bond_internal.get_cash_flows();
                swaption=JsonRisk.create_equivalent_regular_swaption(cfs, first_exercise_date, bond);
                p2=JsonRisk.pricer_swaption(swaption,curve,curve, surface);
                console.log("JSON Risk bond rate:                            " + bond.fixed_rate.toFixed(8));
                console.log("JSON Risk equivalent regular swaption strike:   " + swaption.fixed_rate.toFixed(8));
                console.log("JSON Risk bond maturity:                        " + bond.maturity);
                console.log("JSON Risk equivalent regular swaption maturity: " + swaption.maturity);
                console.log("JSON Risk equivalent regular swaption price:    " + p2.toFixed(3));
                am(swaption.maturity.getTime()===bond.maturity.getTime(),"Test equivalent swaption consistency for bullet bonds (maturity)");
                am(swaption.fixed_rate.toFixed(5)===bond.fixed_rate.toFixed(5),"Test equivalent swaption consistency for bullet bonds (rate)");
		console.log("-----------------");
        }
}



/* 

Test FX Term

*/

JsonRisk.valuation_date=new Date(2017,10,30);

times = [1,2,3,5];
dfs = [0.95,0.91,0.86,0.78];
curve = {times:times, dfs:dfs};

var fx_swapleg ={
         notional: 100, 
         maturity: new Date(2018,10,30),
         notional_2: -100,
         maturity_2: new Date(2019,10,30)
        };

var pv= JsonRisk.pricer_fxterm(fx_swapleg,curve);
am(pv.toFixed(2) === "4.00", "FX swap valuation (1)");

fx_swapleg.maturity=new Date(2020,10,29);
fx_swapleg.maturity_2=new Date(2022,10,29);

var pv= JsonRisk.pricer_fxterm(fx_swapleg,curve);
am(pv.toFixed(2) === "8.00", "FX swap valuation (2)");

/* 

Test irregular bonds

*/

//test irregular bonds by checking that, regardless of the amortisation used, a bond with coupon r, when discounted at r, always values at par.

var Repay_Total=[30,70,100];
var Repay_Tenor=[1,3,6,6,12];
var Tenor=[1,3,6,6,12,12];
var IntCap=[true, false];
var Repay_Stub_Days=[1,2,3,4,5,10,15,30];
bonds=[];
var discount_rate;
for (i=0;i<400;i++){
        bonds.push({
		effective_date: new Date(JsonRisk.valuation_date),
		maturity: Maturity[i % Maturity.length],
		notional: 100.0,
		fixed_rate: Kupon[i % Kupon.length]/100,
		tenor: Tenor[i % Tenor.length],//(1+c*t/12)^(12/t)=1+c0
		repay_tenor: Repay_Tenor[i % Repay_Tenor.length],
		repay_next_to_last_date: JsonRisk.add_days(JsonRisk.get_safe_date(Maturity[i % Maturity.length]), -Repay_Stub_Days[i % Repay_Stub_Days.length]),
		bdc: "unadjusted",
		dcc: "act/365",
		repay_amount: Repay_Total[i % Repay_Total.length] / 12 * Repay_Tenor[i % Repay_Tenor.length] / JsonRisk.time_from_now(JsonRisk.get_safe_date(Maturity[i % Maturity.length])),
		interest_capitalization: IntCap[i % IntCap.length]
	});
	//discount curves are always annual compounding act/365, so we need to adjust the rate according to the tenor in order to arrive at a par valuation
	discount_rate=Math.pow(1+(Kupon[i % Kupon.length] / 100*Tenor[i % Tenor.length] / 12),12 / Tenor[i % Tenor.length] ) -1;

	bond_internal=new JsonRisk.fixed_income(bonds[i]);
        p1=bond_internal.present_value({times: [1], zcs: [discount_rate-0.0001]});
        console.log("JSON Risk irregular bond price discounted at coupon rate minus one basis point (" + (i+1) + "): " + p1.toFixed(3));

        p2=bond_internal.present_value({times: [1], zcs: [discount_rate+0.0001]});
        console.log("JSON Risk irregular bond price discounted at coupon rate plus one basis point (" + (i+1) + "): " + p2.toFixed(3));
	am((p1>100 && p2<100), "Irregular bond valuation for amortising bonds (" + (i+1) + ").");
}

// test changing repay amounts
for (i=0;i<400;i++){
	//repay amount as string with two space separated entries
	bonds[i].repay_amount=""+bonds[i].repay_amount + " " + (bonds[i].repay_amount*0.9);
	//condition array as string with two space separated entries
	bonds[i].conditions_valid_until="2020/01/01 " + bonds[i].maturity;
	//discount curves are always annual compounding act/365, so we need to adjust the rate according to the tenor in order to arrive at a par valuation
	discount_rate=Math.pow(1+(Kupon[i % Kupon.length] / 100*Tenor[i % Tenor.length] / 12),12 / Tenor[i % Tenor.length] ) -1;

	bond_internal=new JsonRisk.fixed_income(bonds[i]);
        p1=bond_internal.present_value({times: [1], zcs: [discount_rate-0.0001]});
        console.log("JSON Risk irregular bond price discounted at coupon rate minus one basis point (" + (i+1) + "): " + p1.toFixed(3));

        p2=bond_internal.present_value({times: [1], zcs: [discount_rate+0.0001]});
        console.log("JSON Risk irregular bond price discounted at coupon rate plus one basis point (" + (i+1) + "): " + p2.toFixed(3));
	am((p1>100 && p2<100), "Irregular bond valuation with changing repay amounts (" + (i+1) + ").");
}

// additionally, test changing interest rates with different syntaxes
for (i=0;i<400;i++){
	//fixed rate as string with two space separated entries, second entry expressed as percentage
	bonds[i].fixed_rate=""+(bonds[i].fixed_rate-0.0001) + " " + (bonds[i].fixed_rate*100+0.01) + "%" ;
	//discount curves are always annual compounding act/365, so we need to adjust the rate according to the tenor in order to arrive at a par valuation
	discount_rate=Math.pow(1+(Kupon[i % Kupon.length] / 100*Tenor[i % Tenor.length] / 12),12 / Tenor[i % Tenor.length] ) -1;

	bond_internal=new JsonRisk.fixed_income(bonds[i]);
        p1=bond_internal.present_value({times: [1], zcs: [discount_rate-0.0001]});
        console.log("JSON Risk irregular bond price discounted at coupon rate minus one basis point (" + (i+1) + "): " + p1.toFixed(3));

        p2=bond_internal.present_value({times: [1], zcs: [discount_rate+0.0001]});
        console.log("JSON Risk irregular bond price discounted at coupon rate plus one basis point (" + (i+1) + "): " + p2.toFixed(3));
	am((p1>100 && p2<100), "Irregular bond valuation with changing repay amounts (" + (i+1) + ").");
}

// test margins. Bond with margin should have the same principal cashflow as the same bond without margin
var res=0;
for (i=0;i<400;i++){
	bond_internal=new JsonRisk.fixed_income(bonds[i]);
        p1=bond_internal.get_cash_flows().pmt_principal;      
	bonds[i].excl_margin=0.00125;
        bond_internal=new JsonRisk.fixed_income(bonds[i]);
        p2=bond_internal.get_cash_flows().pmt_principal;
	for (var j=0;j<p1.length;j++){
		res+=Math.abs(p2[j]-p1[j]);
	}
	am((res<0.001), "Irregular bond valuation with margin (" + (i+1) + ").");
}


// test fair rate derivation for all kinds of amortizing bonds

bonds=[];
times = [1,2,3,5];
dfs = [0.95,0.91,0.86,0.78];
curve = {times:times, dfs:dfs};
var spread_curve={times: [1], zcs: [0.05]};
var r;
for (i=0;i<400;i++){
        bonds.push({
		effective_date: new Date(JsonRisk.valuation_date),
		maturity: Maturity[i % Maturity.length],
		notional: 100.0,
		fixed_rate: Kupon[i % Kupon.length]/100,
		tenor: Tenor[i % Tenor.length],//(1+c*t/12)^(12/t)=1+c0
		repay_tenor: Repay_Tenor[i % Repay_Tenor.length],
		repay_next_to_last_date: JsonRisk.add_days(JsonRisk.get_safe_date(Maturity[i % Maturity.length]), -Repay_Stub_Days[i % Repay_Stub_Days.length]),
		bdc: "following",
		calendar: "TARGET",
		dcc: "act/365",
		repay_amount: Repay_Total[i % Repay_Total.length] / 12 * Repay_Tenor[i % Repay_Tenor.length] / JsonRisk.time_from_now(JsonRisk.get_safe_date(Maturity[i % Maturity.length])),
		interest_capitalization: false //test can only work for non-capitalising instruments. For capitalising instruments, changing the rate would change the notional structure.
	});
	

	//fix rate
	bond_internal=new JsonRisk.fixed_income(bonds[i]);
	r=bond_internal.fair_rate_or_spread(curve, spread_curve, null);

	bonds[i].fixed_rate=r;
	bond_internal=new JsonRisk.fixed_income(bonds[i]);
        p1=bond_internal.present_value(curve, spread_curve);
	console.log("JSON Risk irregular bond fair rate        (" + (i+1) + "): " + (100*r).toFixed(4) + "%");
	console.log("JSON Risk price at fair rate              (" + (i+1) + "): " + p1.toFixed(4));
	am((p1.toFixed(3)==="100.000"), "Fair rate derivation for amortising fixed rate bonds (" + (i+1) + ").");

	//floater
	bonds[i].fixed_rate=null;
	bonds[i].float_current_rate=0;
	bonds[i].float_spread=0;
	bond_internal=new JsonRisk.fixed_income(bonds[i]);
	r=bond_internal.fair_rate_or_spread(curve, spread_curve, curve);

	bonds[i].float_spread=r;
	bond_internal=new JsonRisk.fixed_income(bonds[i]);
        p1=bond_internal.present_value(curve, spread_curve, curve);
	console.log("JSON Risk irregular floater fair spread        (" + (i+1) + "): " + (100*r).toFixed(4) + "%");
	console.log("JSON Risk price at fair spread                 (" + (i+1) + "): " + p1.toFixed(4));
	am((p1.toFixed(3)==="100.000"), "Fair spread derivation for amortising float rate bonds (" + (i+1) + ").");
}

/*

Test LGM option pricing

*/
JsonRisk.valuation_date=new Date(2019,0,1);
yf=JsonRisk.year_fraction_factory("");
var cf_obj={
	date_pmt:[new Date(2019,0,1),
		  new Date(2020,0,1),
		  new Date(2021,0,1),
		  new Date(2022,0,1),
		  new Date(2023,0,1),
	 	  new Date(2024,0,1),
	 	  new Date(2025,0,1),
	 	  new Date(2026,0,1),
	 	  new Date(2027,0,1)],
	current_principal:[100,100,90,80,70,60,50,40,30],
	pmt_interest:[0,11,0.9,0.8,0.7,0.6, 0.5, 0.4, 0.3],
	pmt_total:[0,11,10.9,10.8,10.7,10.6, 10.5, 10.4, 30.3]
};

cf_obj.t_pmt=new Array(cf_obj.date_pmt.length);
for (i=0;i<cf_obj.date_pmt.length;i++){
	cf_obj.t_pmt[i]=JsonRisk.time_from_now(cf_obj.date_pmt[i]);
}

var cf_regular;

expiries=[new Date(2019,0,1),
	  new Date(2020,0,1),
	  new Date(2021,0,1),
	  new Date(2022,0,1),
	  new Date(2023,0,1),
	  new Date(2024,0,1),
	  new Date(2025,0,1)];
var lgm_xi;
var lgm_state;
var result, result_orig, result_numeric, bpv;
curve=JsonRisk.get_const_curve(0.01);
curve_1bp=JsonRisk.get_const_curve(0.0101);
curve_100bp=JsonRisk.get_const_curve(0.02);

//create bcbs 352 scenarios
var bcbs352times=[0.0028,0.0417,0.1667,0.375,0.625,0.875,1.25,1.75,2.5,3.5,4.5,5.5,6.5,7.5,8.5,9.5,12.5,17.5,25];

var curve_up={ times:bcbs352times,zcs:[]};
var curve_down={ times:bcbs352times,zcs:[]};
var curve_steepener={ times:bcbs352times,zcs:[]};
var curve_flattener={ times:bcbs352times,zcs:[]};
var curve_shortup={ times:bcbs352times,zcs:[]};
var curve_shortdown={ times:bcbs352times,zcs:[]};

var slong,sshort;
for (var i=0;i<bcbs352times.length;i++){
        curve_up.zcs.push(0.02);
        curve_down.zcs.push(-0.02);
        sshort=Math.exp(-bcbs352times[i]/4);
        slong=1-sshort;
        curve_shortup.zcs.push(0.025*sshort);
        curve_shortdown.zcs.push(-0.025*sshort);
        curve_steepener.zcs.push(-0.65*0.025*sshort+0.9*0.01*slong);
        curve_flattener.zcs.push(0.8*0.025*sshort-0.6*0.01*slong);
}


for (i=0;i<expiries.length;i++){
	swaption=JsonRisk.create_equivalent_regular_swaption(cf_obj,expiries[i]);
	cf_regular=new JsonRisk.fixed_income(swaption).get_cash_flows();
	
	lgm_xi=0.0004*yf(JsonRisk.valuation_date,expiries[i]);
	
	//cash flow PVs
	result=JsonRisk.dcf(cf_regular, curve, null, null,expiries[i]);
	bpv=Math.abs(JsonRisk.dcf(cf_regular, curve_1bp, null, null,expiries[i])-result);
	
	//option PVs
	result_orig=JsonRisk.lgm_european_call_on_cf(cf_obj,yf(JsonRisk.valuation_date,expiries[i]), curve, lgm_xi);
	result=JsonRisk.lgm_european_call_on_cf(cf_regular,yf(JsonRisk.valuation_date,expiries[i]), curve, lgm_xi);
	am(Math.abs(result-result_orig)/bpv<1, "LGM option price (equivalent regular vs original), first_exercise_date " +(i+1));
	result=JsonRisk.lgm_bermudan_call_on_cf(cf_obj,[yf(JsonRisk.valuation_date,expiries[i])], curve, [lgm_xi]);
	console.log("NUMERIC ERROR: " + (result-result_orig)/bpv);
	am(Math.abs(result-result_orig)/bpv<1, "LGM option price (numeric vs original), first_exercise_date " +(i+1));
	result_orig=JsonRisk.lgm_european_call_on_cf(cf_obj,yf(JsonRisk.valuation_date,expiries[i]), curve_100bp, lgm_xi);
	result=JsonRisk.lgm_european_call_on_cf(cf_regular,yf(JsonRisk.valuation_date,expiries[i]), curve_100bp, lgm_xi);
	am(Math.abs(result-result_orig)/bpv<1, "LGM option price curve up (equivalent regular vs original), first_exercise_date " +(i+1));
	result=JsonRisk.lgm_bermudan_call_on_cf(cf_obj,[yf(JsonRisk.valuation_date,expiries[i])], curve_100bp, [lgm_xi]);
	am(Math.abs(result-result_orig)/bpv<1, "LGM option price curve up (numeric vs original), first_exercise_date " +(i+1));

	
	console.log("--------------------------");

}


/*
	
	Test callable bond Valuation
	
*/
var curve=JsonRisk.get_const_curve(0.01);
var curve_up=JsonRisk.get_const_curve(0.0101);
surface={type: "bachelier", expiries: [1,2,5], terms: [1,5,10,20], values: [[0.008, 0.0081, 0.0082, 0.0080],[0.0085, 0.0076, 0.0068, 0.0068],[0.01, 0.0103, 0.012, 0.011]]};
//surface=JsonRisk.get_const_surface(0.06);
JsonRisk.valuation_date=new Date(2000,0,17);

Maturity=["15.02.2024", "15.05.2024", "15.08.2024", "15.02.2025", "15.08.2025",
          "15.02.2026", "04.07.2039", "04.07.2040", "04.07.2042", "04.07.2044",
          "15.08.2046", "15.08.2048", "15.08.2048", "15.08.2048", "15.08.2048"];
var Firstcall=["15.02.2020", "22.05.2010", "15.08.2015", "15.02.2000", "15.08.2005",
               "15.05.2010", "04.07.2029", "04.07.2020", "04.12.2003", "04.12.2000",
               "15.12.2045", "15.04.2038", "15.05.2038","15.06.2038","18.07.2038"];
var Tenor=[3,3,6,6,3,3,6,6,12,12,12,12,12,1,3];
var Calltenor=[1,3,6,12,3,3,6,6,12,12,12,12,12,12,12];

swaptions=[];
var european_options=[];
var bermudan_options=[];
var result_european, result_bermudan, result_swaption;
for (i=0; i<Maturity.length; i++){
        european_options.push({
		maturity: Maturity[i],
		first_exercise_date: Firstcall[i],
		tenor: Tenor[i],
		call_tenor: 0,
		notional: 100.0,
		fixed_rate: 0.01,
		bdc: "m",
		dcc: "act/365",
		calendar: "TARGET",
                exclude_base: true
        });
        bermudan_options.push({
		maturity: Maturity[i],
		first_exercise_date: Firstcall[i],
		tenor: Tenor[i],
		call_tenor: Calltenor[i],
		notional: 100.0,
		fixed_rate: 0.01,
		bdc: "m",
		dcc: "act/365",
		calendar: "TARGET",
                exclude_base: true
        });
	swaptions.push({
                is_payer: false,
                is_short: true,
                maturity: Maturity[i],
                first_exercise_date: Firstcall[i],
                notional: 100,
                fixed_rate: 0.01,
                tenor: Tenor[i],
                float_spread: 0.00,
                float_tenor: 6,
                float_current_rate: 0.00,
                calendar: "TARGET",
                bdc: "m",
                float_bdc: "m",
                dcc: "act/365",
                float_dcc: "act/365"
        });

	result_european=JsonRisk.pricer_callable_bond(european_options[i],curve, null, curve, surface);
	result_bermudan=JsonRisk.pricer_callable_bond(bermudan_options[i],curve, null, curve, surface);
        result_swaption=JsonRisk.pricer_swaption(swaptions[i],curve, curve, surface);
	bpv=JsonRisk.pricer_bond(european_options[i],curve_up, null)-JsonRisk.pricer_bond(european_options[i],curve, null);
	console.log("Non-callable bond price : " + JsonRisk.pricer_bond(european_options[i],curve, null));
	console.log("Explicit swaption price : " + result_swaption);
	console.log("Embedded bond option price     : " + result_european);
	console.log("Multi-callable bond option price: " + result_bermudan);
	console.log("Basis point value        : " + bpv);
	console.log("Difference in BP   ("+(i+1)+"): " + ((result_european-result_swaption)/bpv).toFixed(1));

	am(Math.abs((result_european-result_swaption)/bpv)<1, "Callable bond consistency check (" +(i+1)+")");
	am(result_european>=result_bermudan, "Multi-callable bond consistency check (" +(i+1)+")");
}

/* 

Test amortizing callable bonds consistency

*/
multi_callable_bonds=[];
var amortizing_bonds=[];
var accreting_bonds=[];

for (i=0; i<Maturity.length; i++){
        amortizing_bonds.push({
		maturity: Maturity[i],
		first_exercise_date: Firstcall[i],
		tenor: Tenor[i],
		call_tenor: Calltenor[i],
		notional: 10000.0,
                repay_amount: 10.00,
		fixed_rate: 0.01,
		bdc: "m",
		dcc: "act/365",
		calendar: "TARGET"
        });

        accreting_bonds.push({
		maturity: Maturity[i],
		first_exercise_date: Firstcall[i],
		tenor: Tenor[i],
		call_tenor: Calltenor[i],
		notional: 10000.0,
                repay_amount: -10.00,
		fixed_rate: 0.01,
		bdc: "m",
		dcc: "act/365",
		calendar: "TARGET"
        });

        multi_callable_bonds.push({
		maturity: Maturity[i],
		first_exercise_date: Firstcall[i],
		tenor: Tenor[i],
		call_tenor: Calltenor[i],
		notional: 10000.0,
		fixed_rate: 0.01,
		bdc: "m",
		dcc: "act/365",
		calendar: "TARGET"
        });


	result=JsonRisk.pricer_callable_bond(multi_callable_bonds[i],curve, null, curve, surface);
	result_accreting=JsonRisk.pricer_callable_bond(accreting_bonds[i],curve, null, curve, surface);
	result_amortizing=JsonRisk.pricer_callable_bond(amortizing_bonds[i],curve, null, curve, surface);
	
	console.log("Multi-callable amortizing bond price: " + result_amortizing);
        console.log("Multi-callable bullet bond price: " + result);	
        console.log("Multi-callable accreting bond price: " + result_accreting);

	am((result-result_accreting)*(result_amortizing-result)>0, "Multi-callable accreting and amortizing bond consistency check (" +(i+1)+")");
}

/* 

Test vector pricing

*/
if (typeof require === 'function' ) var params=require('./params_example.js');
JsonRisk.store_params(params);
var results;
var check=function(arr){
        for (var j=0; j<arr.length; j++){
                if(typeof(arr[j])!== 'number') return false;
                if (isNaN(arr[j])) return false;
        }
        return true;
};
results=JsonRisk.vector_pricer({
        type: 'bond',
        maturity: new Date(2032,1,1),
        notional: 100.0,
        fixed_rate: 0.0125,
        tenor: 12,
        bdc: "following",
        dcc: "act/act",
        calendar: "TARGET",
        settlement_days: 2,
        disc_curve: "EURO-GOV",
        spread_curve: "EURO-GOV",
        currency: "USD"
});
am(check(results), "Vector pricing with bond returns valid vector of numbers");
        
results=JsonRisk.vector_pricer({
        type: 'floater',
        maturity: new Date(2032,1,1),
        notional: 100.0,
        float_spread: 0.0125,
        float_current_rate: 0.0125,
        tenor: 12,
        bdc: "following",
        dcc: "act/act",
        calendar: "TARGET",
        settlement_days: 2,
        disc_curve: "EURO-GOV",
        fwd_curve: "EURO-GOV",
        currency: "USD"
});
am(check(results), "Vector pricing with floater returns valid vector of numbers");
      
results=JsonRisk.vector_pricer({
        type: 'fxterm',
        maturity: new Date(2032,1,1),
        notional: 100.0,
        maturity_2: new Date(2038,1,1),
        notional_2: 105,
        currency: "EUR",
        disc_curve: "EURO-GOV"
});  
am(check(results), "Vector pricing with fxterm returns valid vector of numbers (0)");


results=JsonRisk.vector_pricer({
        type: 'fxterm',
        maturity: new Date(2032,1,1),
        notional: 107.0,
        maturity_2: new Date(2038,1,1),
        notional_2: 112,
        currency: "USD",
        disc_curve: "EURO-GOV"
}); 
am(check(results), "Vector pricing with fxterm returns valid vector of numbers (1)");
        
results=JsonRisk.vector_pricer({
        type: 'swap',
        is_payer: true,
        maturity: new Date(2032,1,1),
        notional: 100.0,
        fixed_rate: 0.0125,
        tenor: 12,
        float_spread: 0.00758,
        float_current_rate: 0,
        float_tenor: 3,
        bdc: "following",
        float_bdc: "modified",
        dcc: "act/act",
        calendar: "TARGET",
        disc_curve: "EURO-GOV",
        fwd_curve: "EURO-GOV",
        currency: "USD"
}); 
am(check(results), "Vector pricing with swap returns valid vector of numbers");

results=JsonRisk.vector_pricer({
        type: 'bond',
        effective_date: JsonRisk.valuation_date,
        maturity: new Date(2032,1,1),
        notional: 100.0,
        fixed_rate: 0.0125,
        tenor: 12,
	repay_tenor: 6,
	repay_amount: 1.20,
        bdc: "following",
        dcc: "act/act",
        calendar: "TARGET",
        settlement_days: 2,
        disc_curve: "EURO-GOV",
        spread_curve: "EURO-GOV",
        currency: "USD"
});
am(check(results), "Vector pricing with amortizing bond returns valid vector of numbers");
   
results=JsonRisk.vector_pricer({
        type: 'swaption',
        is_payer: true,
        maturity: new Date(2032,1,1),
        first_exercise_date: new Date(2022,1,1),
        notional: 100.0,
        fixed_rate: 0.0125,
        tenor: 12,
        float_spread: 0.00758,
        float_current_rate: 0,
        float_tenor: 3,
        bdc: "following",
        float_bdc: "modified",
        dcc: "act/act",
        calendar: "TARGET",
        disc_curve: "EURO-GOV",
        fwd_curve: "EURO-GOV",
        surface: "EUR-SWPTN",
        currency: "USD"
});        
am(check(results), "Vector pricing with swaption returns valid vector of numbers");

results=JsonRisk.vector_pricer({
        type: 'callable_bond',
        maturity: new Date(2032,1,1),
		first_exercise_date: new Date(2025,1,1),
		call_tenor: 3,
        notional: 100.0,
        fixed_rate: 0.0125,
        tenor: 12,
        bdc: "following",
        dcc: "act/act",
        calendar: "TARGET",
        settlement_days: 2,
        disc_curve: "EURO-GOV",
        surface: "EUR-SWPTN",
        fwd_curve: "EURO-GOV",
        spread_curve: "EURO-GOV",
        currency: "EUR"
});
am(check(results), "Vector pricing with callable bond returns valid vector of numbers");

/* 

Test vector pricing with curve scenarios

*/
if (typeof require === 'function' ) var params_vector=require('./params_vector.js');
if (typeof require === 'function' ) var params_scen_rf=require('./params_scen_rf.js');
if (typeof require === 'function' ) var params_scen_tag=require('./params_scen_tag.js');
if (typeof require === 'function' ) var params_vola_sensis=require('./params_vola_sensis.js');

var compare=function(arr1, arr2){
		var x,y;
		if (arr1.length!== arr2.length) return false;
        console.log("Arrays are the same length");
        for (var j=0; j<arr1.length; j++){
                if(typeof(arr1[j])!== 'number') return false;
                if (isNaN(arr1[j])) return false;
                if(typeof(arr2[j])!== 'number') return false;
                if (isNaN(arr2[j])) return false;
				x=arr1[j]-arr1[0];
				y=arr2[j]-arr2[0];
				x*=10000;
				y*=10000;
				if (Math.abs(x-y)>0.0001){
					console.log(`Prices do not match: Arr1 ${x}, Arr2 ${y}`);
					return false;
				}
				console.log(`Prices match: Arr1 ${x}, Arr2 ${y}`);
        }
        return true;
};

bond={
        type: 'bond',
        maturity: new Date(2045,1,1),
        notional: 100.0,
        fixed_rate: 0.0125,
        tenor: 1,
        bdc: "following",
        dcc: "act/act",
        calendar: "TARGET",
        settlement_days: 2,
        disc_curve: "EUR_OIS_DISCOUNT",
        spread_curve: "EUR_GOV_SPREAD",
        currency: "EUR"
};

// vector pricing is the reference
JsonRisk.store_params(params_vector);
var results_vector=JsonRisk.vector_pricer(bond);

// scenarios by risk factor
JsonRisk.store_params(params_scen_rf);
var results_scen_rf=JsonRisk.vector_pricer(bond);
am(compare(results_vector,results_scen_rf), "Vector pricing with scenarios by risk factor (1)");

// scenarios by tag
JsonRisk.store_params(params_scen_tag);
var results_scen_tag=JsonRisk.vector_pricer(bond);
am(compare(results_vector,results_scen_tag), "Vector pricing with scenarios by tag (1)");



bond.disc_curve="CONST_100BP";
bond.spread_curve="EUR_PFA_SPREAD";
// vector pricing is the reference
JsonRisk.store_params(params_vector);
results_vector=JsonRisk.vector_pricer(bond);
// scenarios by tag
JsonRisk.store_params(params_scen_tag);
results_scen_tag=JsonRisk.vector_pricer(bond);
am(compare(results_vector,results_scen_tag), "Vector pricing with scenarios by tag (2)");


bond={
        type: 'callable_bond',
        maturity: new Date(2042,1,1),
		first_exercise_date: new Date(2023,1,1),
		call_tenor: 3,
        notional: 100.0,
        fixed_rate: 0.0001,
        tenor: 12,
        bdc: "following",
        dcc: "act/act",
        calendar: "TARGET",
        settlement_days: 2,
        disc_curve: "CONST",
        surface: "CONST_0BP",
        fwd_curve: "CONST",
        currency: "EUR"
};

// vector pricing is the reference
JsonRisk.store_params(params_vector);
results_vector=JsonRisk.vector_pricer(bond);
// scenarios by risk factor
JsonRisk.store_params(params_scen_rf);
results_scen_rf=JsonRisk.vector_pricer(bond);
am(compare(results_vector,results_scen_rf), "Vector pricing with scenarios by risk factor, with volatilities (1)");

/*

    Test vector and scenario pricing wih FX and equity

*/

bond={
        type: 'bond',
        maturity: new Date(2042,1,1),
        notional: 100.0,
        fixed_rate: 0.01,
        tenor: 12,
        bdc: "following",
        dcc: "act/act",
        calendar: "TARGET",
        settlement_days: 2,
        disc_curve: "CONST",
        currency: "USD"
};

equity={
    type: 'equity',
    quote: 'EQUITY',
    quantity: 1000,
    currency: "GBP"
};

params_vector={
    valuation_date: new Date(2023,1,1),
    curves: {
        CONST: { times: [1], zcs: [0.05]}
    },
    scalars: {
        USD: { value: [ 1, 1.1, 1.2, 1.3, 1.4 ]},
        GBP: { value: [ 2, 0.9, 0.8, 0.7, 0.6 ]},
        EQUITY: { value: [100,200,300,400,500]}
    }
};

params_scen_rf={
    valuation_date: new Date(2023,1,1),
    curves: {
        CONST: { times: [1], zcs: [0.05]}
    },
    scalars: {
        USD: { name: "USD", value: 1},
        GBP: { name: "GBP", value: 2},
        EQUITY: { name: "EQUITY", value: 100}
    },
    scenario_groups: [[
        {
            name: "SCEN1",
            rules: [
                {
                    risk_factors: ["USD"],
                    model: "multiplicative",
                    labels_x: [ "1" ],
                    labels_y: [ "1" ],
                    values: [[1.1]]
                },
                {
                    risk_factors: ["GBP"],
                    model: "absolute",
                    labels_x: [ "1" ],
                    labels_y: [ "1" ],
                    values: [[0.9]]
                },
                {
                    risk_factors: ["EQUITY"],
                    model: "additive",
                    labels_x: [ "1" ],
                    labels_y: [ "1" ],
                    values: [[100]]
                }
            ]
        },
        {
            name: "SCEN2",
            rules: [
                {
                    risk_factors: ["USD"],
                    model: "multiplicative",
                    labels_x: [ "1" ],
                    labels_y: [ "1" ],
                    values: [[1.2]]
                },
                {
                    risk_factors: ["GBP"],
                    model: "absolute",
                    labels_x: [ "1" ],
                    labels_y: [ "1" ],
                    values: [[0.8]]
                },
                {
                    risk_factors: ["EQUITY"],
                    model: "additive",
                    labels_x: [ "1" ],
                    labels_y: [ "1" ],
                    values: [[200]]
                }
            ]
        },
        {
            name: "SCEN3",
            rules: [
                {
                    risk_factors: ["USD"],
                    model: "multiplicative",
                    labels_x: [ "1" ],
                    labels_y: [ "1" ],
                    values: [[1.3]]
                },
                {
                    risk_factors: ["GBP"],
                    model: "absolute",
                    labels_x: [ "1" ],
                    labels_y: [ "1" ],
                    values: [[0.7]]
                },
                {
                    risk_factors: ["EQUITY"],
                    model: "additive",
                    labels_x: [ "1" ],
                    labels_y: [ "1" ],
                    values: [[300]]
                }
            ]
        },
        {
            name: "SCEN4",
            rules: [
                {
                    risk_factors: ["USD"],
                    model: "multiplicative",
                    labels_x: [ "1" ],
                    labels_y: [ "1" ],
                    values: [[1.4]]
                },
                {
                    risk_factors: ["GBP"],
                    model: "absolute",
                    labels_x: [ "1" ],
                    labels_y: [ "1" ],
                    values: [[0.6]]
                },
                {
                    risk_factors: ["EQUITY"],
                    model: "additive",
                    labels_x: [ "1" ],
                    labels_y: [ "1" ],
                    values: [[400]]
                }
            ]
        }
    ]]
};

JsonRisk.store_params(params_vector);
results_vector=JsonRisk.vector_pricer(bond);
JsonRisk.store_params(params_scen_rf);
results_scen_rf=JsonRisk.vector_pricer(bond);

am(compare(results_vector,results_scen_rf), "Vector pricing with scenarios by risk factor, with FX");

JsonRisk.store_params(params_vector);
results_vector=JsonRisk.vector_pricer(equity);
JsonRisk.store_params(params_scen_rf);
results_scen_rf=JsonRisk.vector_pricer(equity);

am(compare(results_vector,results_scen_rf), "Vector pricing with scenarios by risk factor, with FX and equity");

// vola sensis
bond.disc_curve="EUR_OIS_DISCOUNT";
bond.fwd_curve="EUR_6M_FWD";
bond.surface="CONST_30BP";
JsonRisk.store_params(params_vola_sensis);
results_vector=JsonRisk.vector_pricer(bond);

JsonRisk.valuation_date=new Date(2002,1,15);
var sd=new Date(2002,1,19);
curve=JsonRisk.get_const_curve(0.048);
values= [
  [0.1490, 0.1340, 0.1228, 0.1189, 0.1148],
  [0.1290, 0.1201, 0.1146, 0.1108, 0.1040],
  [0.1149, 0.1112, 0.1070, 0.1010, 0.0957],
  [0.1047, 0.1021, 0.0980, 0.0951, 0.1270],
  [0.1000, 0.0950, 0.0900, 0.1230, 0.1160]];
for(i=0;i<values.length;i++){
	for(j=0;j<values[i].length;j++){
		values[i][j]=0.1*0.04875;
	}
}
surface={expiries: [1,2,3,4,5], terms: [1,2,3,4,5], values: values};

bond={
		effective_date: sd,
		maturity: JsonRisk.add_months(sd,5*12),
		first_exercise_date: JsonRisk.add_months(sd, 12),
		tenor: 12,
		notional: 1000.0,
		fixed_rate: 0.05,
		bdc: "m",
		dcc: "act/365",
		calendar: "TARGET"
};



for (i=0;i<13;i++){
	bond.call_tenor=i;
	result=JsonRisk.pricer_bond(bond, curve, null, null);
	result_multi=JsonRisk.pricer_callable_bond(bond,curve, null, curve, surface);
	console.log((i===0) ? "EUROPEAN:" : "BERMUDAN WITH TENOR " +i);
	console.log("BOND PRICE:                " + result);
	console.log("MULTI CALLABLE BOND PRICE: " + result_multi);
	console.log("EMBEDDED OPTION PRICE:     " + (result-result_multi));
}

JsonRisk.valuation_date=new Date(2014,3,30);
sd=JsonRisk.valuation_date;
fwd_curve=JsonRisk.get_const_curve(0.02);
disc_curve=JsonRisk.get_const_curve(0.02);

surface={expiries: [1], terms: [1], values: [[0.2*0.02]]};

bond={
		effective_date: sd,
		maturity: new Date(2024, 4, 6),
		first_exercise_date: new Date(2015, 4, 6),
		tenor: 12,
		notional: 1.0,
		fixed_rate: 0.04,
		bdc: "m",
		dcc: "30E/360",
		calendar: "TARGET"
};



for (i=0;i<13;i++){
	bond.call_tenor=i;
	result=JsonRisk.pricer_bond(bond, disc_curve, null, null);
	result_multi=JsonRisk.pricer_callable_bond(bond, disc_curve, null, fwd_curve, surface);
	console.log((i===0) ? "EUROPEAN:" : "BERMUDAN WITH TENOR " +i);
	console.log("BOND PRICE:                " + result);
	console.log("MULTI CALLABLE BOND PRICE: " + result_multi);
	console.log("EMBEDDED OPTION PRICE:     " + (result-result_multi));
}
