
/*I. functions/charts called by main.js/index.html*/

    


    var chart_scenarios = new Chart(document.getElementById("canvas-scenarios"),{
	    type:"line",
	    data:{
		    labels:[], 
		    datasets:[]
		    },
	    options:{
	    	elements: {
                    point:{
                        radius: 0
                    }},
		    title: {
				    display: true,
				    text: ""
			    },
		    scales:
			    {
				    yAxes:[
					    {
						    scaleLabel: {
							    labelString: "Wert",
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
							    labelString: "Datum",
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
    
    var chart_colors=["#008080","#800080","#000000", "#FF0000", "#888888","#0000FF","#FFFF00","#E1A100","#880000","#BC8F8F"];
    
    var update_chart_scenarios=function(portfolio, value_index){	
        chart_scenarios.data.labels=[];  
        chart_scenarios.data.labels=portfolio.dates;
       	chart_scenarios.options.title.text="Performance " + portfolio.values_names[value_index] + " der Subportfolien";
        for (i=0;i<Math.min(portfolio.subportfolio.length,10);i++){
        chart_scenarios.data.datasets[i]={
				    fill:false,
				    borderColor:chart_colors[i],
				    borderWidth: 1,
				    label:portfolio.subportfolio[i],
				    data:portfolio.values[i][value_index]                  
			    };
        }
        chart_scenarios.update();
    }









