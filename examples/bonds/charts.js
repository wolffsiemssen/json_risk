
//charts definition - cash flow chart

var chart_cashflows = new Chart(document.getElementById("canvas-cashflows"),{
	type:"bar",
	data:{
		labels:[],
		datasets:[
			{
				label:"Principal",
				data:[],
				fill:false,
				backgroundColor: "#008080"
			},
			{
				label:"Interest",
				data:[],
				fill:false,
				backgroundColor: "#800080"
			}
			]
		},
	options:{
		title: {
				display: true,
				text: "Cash Flows"
			},
		scales:
			{
				yAxes:[
					{
						scaleLabel: {
							labelString: "Amount",
							display: true
						},
						ticks:{
							beginAtZero:true
						},
						gridLines: {
							display: true
						},
						stacked: true
					}
				],
				xAxes:[
					{	
						scaleLabel: {
							labelString: "Time",
							display: true
						},
						ticks:{
							autoSkip: true,
							autoSkipPadding: 10
						},
						gridLines: {
							display: false
						},
						stacked: true
					}
				]
			}
		},
		responsive: true
	}
);

var update_chart_cashflows=function(cfs){
		chart_cashflows.data.labels=new Array(cfs.date_pmt.length);
		for (var i=0;i<cfs.date_pmt.length; i++){
			chart_cashflows.data.labels[i]=cfs.date_pmt[i].toDateString();
		}
		chart_cashflows.data.datasets[0].data=cfs.pmt_principal;
		chart_cashflows.data.datasets[1].data=cfs.pmt_interest;
		chart_cashflows.update();
}


//charts definition - curves chart

var chart_curves = new Chart(document.getElementById("canvas-curves"),{
	type:"line",
	data:{
		labels:[],
		datasets:[
			{
				label:"Discount Curve",
				data:[],
				fill:false,
				backgroundColor: "#008080",
			},
			{
				label:"Forward Curve",
				data:[],
				fill:false,
				backgroundColor: "#800080",
			}
			]
		},
	options:{
		title: {
				display: true,
				text: "Curves"
			},
		scales:
			{
				yAxes:[
					{
						type: 'linear',
						scaleLabel: {
							labelString: "Zero Coupon Rate",
							display: true
						},
						ticks:{
							beginAtZero:true,
							precision: 2,
							suggestedMin: -0.01,
							suggestedMax: 0.02
						},
						gridLines: {
							display: true
						},
						stacked: false
					}
				],
				xAxes:[
					{
						type: 'linear',	
						scaleLabel: {
							labelString: "Time",
							display: true
						},
						ticks:{
							beginAtZero: true,
							precision: 1,
							suggestedMax: 10,
							suggestedMin: 0
						},
						gridLines: {
							display: false
						},
						stacked: false
					}
				]
			}
		},
		responsive: true
	}
);

var update_chart_curves=function(dc, fc){
		chart_curves.data.labels=JsonRisk.get_curve_times(JsonRisk.add_curves(dc, fc)); // get common set of times
		var times=JsonRisk.get_curve_times(JsonRisk.add_curves(dc, fc)); // get common set of times
		chart_curves.data.datasets[0].data=new Array(chart_curves.data.labels.length);
		chart_curves.data.datasets[1].data=new Array(chart_curves.data.labels.length);
		for (var i=0;i<chart_curves.data.labels.length; i++){
			chart_curves.data.datasets[0].data[i]={x: times[i], y: JsonRisk.get_rate(dc,chart_curves.data.labels[i])};
			chart_curves.data.datasets[1].data[i]={x: times[i], y: JsonRisk.get_rate(fc,chart_curves.data.labels[i])};
			//chart_curves.data.labels[i]=chart_curves.data.labels[i].toFixed(4);
		
		}
		chart_curves.update();
}


//charts definition - scenarios chart

var chart_scenarios = new Chart(document.getElementById("canvas-scenarios"),{
	type:"bar",
	data:{
		labels:["Up", "Down", "Short Rate Up", "Short Rate Down", "Steepener", "Flattener"],
		datasets:[
			{
				label:"Scenario PnL",
				data:[],
				fill:false,
				backgroundColor: "#008080"
			}
			]
		},
	options:{
		title: {
				display: true,
				text: "Scenarios"
			},
		scales:
			{
				yAxes:[
					{
						scaleLabel: {
							labelString: "Value",
							display: true
						},
						ticks:{
							beginAtZero:true
						},
						gridLines: {
							display: true
						},
						stacked: true
					}
				],
				xAxes:[
					{	
						scaleLabel: {
							labelString: "Scenario",
							display: true
						},
						ticks:{
							autoSkip: true,
							autoSkipPadding: 10
						},
						gridLines: {
							display: false
						},
						stacked: true
					}
				]
			}
		},
		responsive: true
	}
);

var update_chart_scenarios=function(res){		
		chart_scenarios.data.datasets[0].data[0]=res.pv_up-res.pv;
		chart_scenarios.data.datasets[0].data[1]=res.pv_down-res.pv;
		chart_scenarios.data.datasets[0].data[2]=res.pv_shortup-res.pv;
		chart_scenarios.data.datasets[0].data[3]=res.pv_shortdown-res.pv;
		chart_scenarios.data.datasets[0].data[4]=res.pv_steepener-res.pv;
		chart_scenarios.data.datasets[0].data[5]=res.pv_flattener-res.pv;

		chart_scenarios.update();
}


//charts definition - valuation chart
/*
var chart_ftp = new Chart(document.getElementById("canvas-ftp"),{
	type:"bar",
	data:{
		datasets:[
			{
				label:"Rate",
				data:[100],
				fill:false,
				backgroundColor: "#008080",
				stack: "stack 1"
			},			
			{
				label:"Present Value",
				data:[95],
				fill:false,
				backgroundColor: "#008080",
				stack: "stack 2"
			},			
			{
				label:"Margin",
				data:[5],
				fill:false,
				backgroundColor: "#008080",
				stack: "stack 2"
			}
			]
		},
	options:{
		title: {
				display: true,
				text: "FTP"
			},
		scales:
			{
				yAxes:[
					{
						scaleLabel: {
							labelString: "Rate",
							display: true
						},
						ticks:{
							beginAtZero:true
						},
						gridLines: {
							display: true
						},
						stacked: true
					}
				],
				xAxes:[
					{	
						scaleLabel: {
							display: false
						},
						ticks:{
							autoSkip: true,
							autoSkipPadding: 10
						},
						gridLines: {
							display: false
						},
						stacked: true
					}
				]
			}
		},
		responsive: true
	}
);

var update_chart_ftp=function(res){		
		chart_ftp.update();
}
*/

