if (typeof require == 'function' ) var JsonRisk=require('../dist/json_risk.js');

//reale bundesanleihen, kurse und renditen vom 23.02.2018
/*
Kupon	Bez	Mat	Kurs Clean	Rendite	Kurs Dirty
1.750	Bund 14	15.02.2024	109.338	0.18	109.396
1.500	Bund 14	15.05.2024	107.930	0.21	109.114
1.000	Bund 14	15.08.2024	104.830	0.25	105.367
0.500	Bund 15	15.02.2025	101.263	0.32	101.279
1.000	Bund 15	15.08.2025	104.602	0.37	105.139
0.500	Bund 16	15.02.2026	100.474	0.44	100.490
4.250	Bund 07	04.07.2039	158.385	1.15	161.156
4.750	Bund 08	04.07.2040	170.090	1.17	173.187
3.250	Bund 10	04.07.2042	142.125	1.24	144.244
2.500	Bund 12	04.07.2044	126.970	1.29	128.600
2.500	Bund 14	15.08.2046	128.220	1.31	129.562
1.250	Bund 17	15.08.2048	97.695	1.34	98.366
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

var i;
var bonds=[];
var curve_t=[];
var curve_z=[];
var yf=JsonRisk.year_fraction_factory("act/365");
var gdt=JsonRisk.get_safe_date;
for (i=0; i<Kupon.length; i++){
        bonds.push({
        maturity: Maturity[i],
        notional: 100.0,
        fixed_rate: Kupon[i]/100,
        tenor: 1,
        bdc: "modified following",
        dcc: "act/act",
        calendar: "TARGET",
        settlement_days: 2
        });
        curve_t.push(yf(JsonRisk.valuation_date,gdt(Maturity[i])));
        curve_z.push(Rendite[i]/100);
}

var test_curve=JsonRisk.get_safe_curve({times: curve_t, zcs: curve_z});
//var test_curve={times: curve_t, zcs: curve_z};
//var test_curve={labels: ["1Y", "2Y", "3Y", "4Y", "5Y", "6Y", "7Y", "8Y", "9Y", "10Y", "11Y", "12Y"], zcs: curve_z};
//var test_curve={days: [10,20,30,40,50,60,70,80,90,100,120,200], zcs: curve_z};
//var test_curve={times: curve_t, dfs: [1,1,1,1,1,1,1,1,1,1,1,1]};
//var test_curve={days: [10,20,30,40,50,60,70,80,90,100,120,200], zcs: curve_z};
var price,i,j,n;

var n=100;
var t0 = new Date().getTime();
for (j=1;j<=n;j++){
        //evaluate with yield curve
        for (i=0; i<Kupon.length; i++){
                price=JsonRisk.pricer_bond(bonds[i],test_curve, null);

        }
        //evaluate with spread curve
        for (i=0; i<Kupon.length; i++){
                price=JsonRisk.pricer_bond(bonds[i],null, test_curve);
        }
        if(j % 100 === 0){
                console.log(20*j);    
        }
}
console.log(""+n*Kupon.length*2+" valuations naive.");

var t1 = new Date().getTime();
var m;

m="Valuations took " + (t1 - t0)/1000 + " seconds.";
console.log(m);
if (typeof document != 'undefined') document.body.innerHTML+=(m+'</br>');
m="That is " + n*Kupon.length*2/ (t1 - t0)*1000*3600 + " valuations in an hour.";
console.log(m);
if (typeof document != 'undefined') document.body.innerHTML+=(m+'</br>');


t0 = new Date().getTime();
var objs=[];
for (i=0; i<Kupon.length; i++){
        objs.push(new JsonRisk.simple_fixed_income(bonds[i]));
}
for (j=1;j<=n;j++){
        //evaluate with yield curve
        for (i=0; i<Kupon.length; i++){
                price=objs[i].present_value(test_curve, null,null);
        }
        //evaluate with spread curve
        for (i=0; i<Kupon.length; i++){
                price=objs[i].present_value(null,test_curve,null);
        }
        if(j % 100 === 0){
                console.log(40*j);    
        }
}
console.log(""+n*Kupon.length*2+" valuations based on cfs.");

t1 = new Date().getTime();
m="Valuations took " + (t1 - t0)/1000 + " seconds.";
console.log(m);
if (typeof document != 'undefined') document.body.innerHTML+=(m+'</br>');
m="That is " + n*Kupon.length*2/ (t1 - t0)*1000*3600 + " valuations in an hour.";
console.log(m);
if (typeof document != 'undefined') document.body.innerHTML+=(m+'</br>');

//test custom calendar
from=new Date(2000,0,1);
to=new Date(2200,0,1);
var dates=[];
var cal=JsonRisk.is_holiday_factory("TARGET");
while (from.getTime()<to.getTime()){
        if (cal(from)) dates.push(from); // add all target holidays to custom list
        from=JsonRisk.add_days(from, 1);
}
//create custom calendar
var calsize=JsonRisk.add_calendar("custom", dates);

for (i=0; i<Kupon.length; i++){
        bonds.calendar= "CUSTOM";
}

t0 = new Date().getTime();
for (j=1;j<=n;j++){
        //evaluate with yield curve
        for (i=0; i<Kupon.length; i++){
                price=JsonRisk.pricer_bond(bonds[i],test_curve, null);

        }
        //evaluate with spread curve
        for (i=0; i<Kupon.length; i++){
                price=JsonRisk.pricer_bond(bonds[i],null, test_curve);
        }
        if(j % 100 === 0){
                console.log(20*j);    
        }
}
console.log(""+n*Kupon.length*2+" valuations with custom calendar of size " +calsize + "." );

t1 = new Date().getTime();

m="Valuations took " + (t1 - t0)/1000 + " seconds.";
console.log(m);
if (typeof document != 'undefined') document.body.innerHTML+=(m+'</br>');
m="That is " + n*Kupon.length*2/ (t1 - t0)*1000*3600 + " valuations in an hour.";
console.log(m);
if (typeof document != 'undefined') document.body.innerHTML+=(m+'</br>');


