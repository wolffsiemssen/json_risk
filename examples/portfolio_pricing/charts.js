/*
associated scripts: index.html, main.js, export.js, worker.js, testdata.js, import.js (aws lambda function jr_portfoliopricer, aws api jr_portfoliopricer)

structure of export.js

I. functions/charts called by main.js/index.html
    chart_scenario_subportfolio                             chart with subportfolios and corresponding present values from scenario 0
    update_chart_scenario_subportfolio(result)              updates values for chart_scenario_subportfolio 
    chart_scenarios                                         chart with all given scenarios and one selected subportfolio
    update_chart_scenarios(result, subportfolio, type)      updates chart_scenarios
*/


/*I. functions/charts called by main.js/index.html*/

    var chart_scenario_subportfolio = new Chart(document.getElementById("canvas-scenario-subportfolio"),{
	    type:"bar",
	    data:{
		    labels:[""],
		    datasets:[
			    {
				    label:"Present Values",
				    data:[],
				    fill:false,
				    backgroundColor: "#008080"
			    }
			    ]
		    },
	    options:{
		    title: {
				    display: false,
				    text: "Scenario 0"
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
							    labelString: "Subportfolio",
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
    var update_chart_scenario_subportfolio=function(result){	
    chart_scenario_subportfolio.data.labels=[];
                var keys=Object.keys(result);
                var j=keys.indexOf('TOTAL');
                keys.splice(j,1);
                for(var i=0;i<keys.length;i++) { 
                        key=keys[i];
                        chart_scenario_subportfolio.data.datasets[0].data[i]=result[key];
                        chart_scenario_subportfolio.data.labels[i]=key;                                  
                     };
        		chart_scenario_subportfolio.update();
    }


    var chart_scenarios = new Chart(document.getElementById("canvas-scenarios"),{
	    type:"bar",
	    data:{
		    labels:[""], 
		    datasets:[
			    {
				    label:"Total",
				    data:[],
				    fill:false,
				    backgroundColor: "#008080",
                    
			    },
                {
                    label:"Subportfolio",
				    data:[],
				    fill:false,
				    backgroundColor: "#800080"
                }
			    ]
		    },
	    options:{
		    title: {
				    display: false,
				    text: "P&L"
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
						    }
					    }
				    ],
				    xAxes:[
					    {	
						    scaleLabel: {
							    labelString: "Scenario",
							    display: true
						    },
						    gridLines: {
							    display: false
						    }
					    }
				    ]
			    }
		    },
		    responsive: true
	    }
    );
    var update_chart_scenarios=function(result, subportfolio, type, scenario_names){	
        chart_scenarios.data.labels=[]; 
        if(subportfolio != null) chart_scenarios.data.datasets[1].label=subportfolio;    
        if(subportfolio === null) chart_scenarios.data.datasets[1].label="Subportfolio";    
        var keys=Object.keys(result);
        for(var i=0;i<keys.length;i++) { 
            key=keys[i];
if(undefined===scenario_names) scenario_names=[];
            if (keys.length === scenario_names.length){
                chart_scenarios.data.labels[i]=scenario_names[i];
            }else{
               chart_scenarios.data.labels[i]=key; 
            };	
            if(type === 'pnl')  {
                chart_scenarios.data.datasets[0].data[i]=result[key]['TOTAL'] - result[0]['TOTAL'];                    
                chart_scenarios.data.datasets[1].data[i]=result[key][subportfolio] - result[0][subportfolio];   
                chart_scenarios.options.title.text= "P&L";
            }
            else {
                chart_scenarios.data.datasets[0].data[i]=result[key]['TOTAL'];                    
                chart_scenarios.data.datasets[1].data[i]=result[key][subportfolio];
                chart_scenarios.options.title.text= "Present Values";
            }                   
        };
        chart_scenarios.update();
    }









