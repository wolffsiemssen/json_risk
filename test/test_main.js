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

am (typeof JsonRisk.pricer === 'function', "pricer function defined");
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

yf=JsonRisk.year_fraction_factory("30E/360");
from=new Date(2000,0,1);
to = new Date(2001,0,1);
am(yf(from,to).toFixed(10)===(1).toFixed(10), "30E/360 year fraction (1)");    

from=new Date(2010,7,1);
to = new Date(2020,7,1);
am(yf(from,to).toFixed(10)===(10).toFixed(10), "30E/360 year fraction (2)");

from=new Date(2000,0,31);
to = new Date(2001,0,30);
am(yf(from,to).toFixed(10)===(1).toFixed(10), "30E/360 year fraction (3)");

from=new Date(2000,0,30);
to = new Date(2001,0,31);
am(yf(from,to).toFixed(10)===(1).toFixed(10), "30E/360 year fraction (4)");

from=new Date(2000,1,28);
to = new Date(2010,1,28);
am(yf(from,to).toFixed(10)===(10).toFixed(10), "30E/360 year fraction (5)");

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

yf=JsonRisk.year_fraction_factory("invalid string");
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

var sched=JsonRisk.backward_schedule(new Date(1980,0,1), new Date(1984,0,1), 12, JsonRisk.is_holiday_factory(""), "unadjusted", null, null);
am (same_dates(sched, expected), "Backward schedule generation (1)");

sched=JsonRisk.backward_schedule(new Date(1980,0,1), new Date(1984,0,1), 12, JsonRisk.is_holiday_factory(""), "unadjusted", new Date(1981,0,1), new Date(1983,0,1));
am (same_dates(sched, expected), "Backward schedule generation (2)");

sched=JsonRisk.backward_schedule(new Date(1980,0,1), new Date(1984,0,1), 12, JsonRisk.is_holiday_factory(""), "unadjusted", new Date(1981,0,1), new Date(1984,0,1));
am (same_dates(sched, expected), "Backward schedule generation (3)");

sched=JsonRisk.backward_schedule(new Date(1980,0,1), new Date(1984,0,1), 12, JsonRisk.is_holiday_factory(""), "preceding", new Date(1981,0,1), new Date(1983,0,1));
am (same_dates(sched, expected), "Backward schedule generation (4)");


sched=JsonRisk.backward_schedule(new Date(1980,0,1), new Date(1984,0,1), 12, JsonRisk.is_holiday_factory("Target"), "following", new Date(1980,0,2), new Date(1983,0,1));
am (same_dates(sched, expected), "Backward schedule generation with first date that is already adjusted (1)");

expected=[
        new Date(1980,0,1),
        new Date(1980,2,1), //first date
        new Date(1981,2,1),
        new Date(1982,2,1),
        new Date(1983,2,1), //next to last date
        new Date(1984,0,1)
];
sched=JsonRisk.backward_schedule(new Date(1980,0,1), new Date(1984,0,1), 12, JsonRisk.is_holiday_factory(""), "unadjusted", new Date(1980,2,1), new Date(1983,2,1));
am (same_dates(sched, expected), "Backward schedule generation (6)");

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
sched=JsonRisk.backward_schedule(new Date(1980,0,1), new Date(1984,0,1), 6, JsonRisk.is_holiday_factory(""), "unadjusted", new Date(1980,2,1), new Date(1983,2,1));
am (same_dates(sched, expected), "Backward schedule generation (7)");

expected=[
        new Date(1980,0,1),
        new Date(1981,0,1),
        new Date(1982,0,1),
        new Date(1983,0,1),
        new Date(1984,0,1)
];
JsonRisk.valuation_date=new Date(1980,6,1);
sched=JsonRisk.backward_schedule(null, new Date(1984,0,1), 12, JsonRisk.is_holiday_factory(""), "unadjusted", null, null);
am (same_dates(sched, expected), "Backward schedule generation without effective date (1)");

sched=JsonRisk.backward_schedule(null, new Date(1984,0,1), 12, JsonRisk.is_holiday_factory(""), "unadjusted", null, new Date(1983,0,1));
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


sched=JsonRisk.backward_schedule(null, new Date(1984,0,1), 6, JsonRisk.is_holiday_factory(""), "unadjusted", null, new Date(1983,3,1));
am (same_dates(sched, expected), "Backward schedule generation without effective date (3)");

sched=JsonRisk.backward_schedule(new Date(1980,0,1), new Date(1984,0,1), 6, JsonRisk.is_holiday_factory(""), "unadjusted", new Date(1980,3,1), new Date(1983,3,1));
am (same_dates(sched, expected), "Backward schedule generation with first date just before valuation date (1)");

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
        pu=JsonRisk.pricer_bond(bonds[i],null, curve_up, null);
        pd=JsonRisk.pricer_bond(bonds[i],null, curve_down, null);
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
        float_current_rate: Kupon[i]/100,
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
                        expiry: JsonRisk.add_months(JsonRisk.valuation_date, expiries[j]),
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

Test cashflow equivalent swaption generation

*/
var expiry, swaption, swaption_internal, cfs, bond_internal;
for (i=0; i<months.length; i++){
        for (j=0; j<expiries.length; j++){

                expiry=JsonRisk.add_months(JsonRisk.valuation_date, expiries[j]);
                bond={
                        maturity: JsonRisk.add_months(JsonRisk.valuation_date, expiries[j]+months[i]),
                        notional: 10000,
                        fixed_rate: 0.02,
                        tenor: 6,
                        dcc: "act/365"
                };

                bond_internal=new JsonRisk.simple_fixed_income(bond);
                p1=bond_internal.present_value(curve,null);
                console.log("JSON Risk bond price:                           " + p1.toFixed(3)); 
                cfs=bond_internal.get_cash_flows();
                swaption=JsonRisk.create_equivalent_regular_swaption(cfs, expiry, bond);
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

Test Loan

*/

//test special case of regular loan, value should always be equal to bond
/*
Kupon=[1.750,1.500,1.000,0.500,1.000,0.500,4.250,4.750,3.250,2.500,2.500,1.250];
Maturity=["15.02.2024", "15.05.2024", "15.08.2024", "15.02.2025", "15.08.2025",
              "15.02.2026", "04.07.2039", "04.07.2040", "04.07.2042", "04.07.2044",
              "15.08.2046", "15.08.2048"];
Kurs_Dirty=[109.396, 109.114, 105.367, 101.279, 105.139, 100.490,
                161.156, 173.187, 144.244, 128.600, 129.562, 98.366];

JsonRisk.valuation_date=new Date(2018,1,23);

bonds=[];
for (i=0; i<Kupon.length; i++){
        bonds.push({
        maturity: Maturity[i],
        notional: 100.0,
        fixed_rate: Kupon[i]/100,
        tenor: 12,
        repay_tenor: 0,
        fixing_tenor: 0,
        bdc: "following",
        dcc: "act/act",
        calendar: "TARGET"
        });
}

times=[1/12,3/12,6/12,1,2,3,4,5];
zcs=[0.001,0.002,0.003,0.004,0.005, 0.006, 0.007,0.007];
curve={times:times,zcs:zcs};

for (i=0; i<Kupon.length; i++){
        pv_bond=JsonRisk.pricer_bond(bonds[i],curve_up, null, null);
        pv_loan=JsonRisk.pricer_loan(bonds[i],curve_up, null, null);
        
        
        console.log("JSON Risk regular bond price                                               : " + pv_bond.toFixed(3));
        console.log("JSON Risk regular bond price priced with irregular_fixed_income instrument : " + pv_loan.toFixed(3));
       
        am(pv_bond===pv_loan, "Loan valuation with regular loan against bond pricer, (" + (i+1) +")");
}
*/
/* 

Test vector pricing

*/

var params=(typeof(test_params)==='object') ? test_params : require('./params_example.json');
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
        type: 'swaption',
        is_payer: true,
        maturity: new Date(2032,1,1),
        expiry: new Date(2022,1,1),
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
