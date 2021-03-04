
/*I. functions/charts called by main.js/index.html*/

    


    var chart_scenarios = new Chart(document.getElementById("canvas-scenarios"),{
	    type:"line",
	    data:{
		    labels:[""], 
		    datasets:[
			    {
				    label:"1",
				    data:[],
				    fill:false,
				    borderColor:"#008080",
				    borderWidth: 1
                    
			    },
                {
                    label:"2",
				    data:[],
				    fill:false,
				    borderColor: "#800080",
				    borderWidth: 1
                },
                {
				    label:"3",
				    data:[],
				    fill:false,
				    borderColor: "#000000",
				    borderWidth: 1
                    
			    },
                {
                    label:"4",
				    data:[],
				    fill:false,
				    borderColor: "#FF0000",
				    borderWidth: 1
                },
                {
				    label:"5",
				    data:[],
				    fill:false,
				    borderColor: "#888888",
				    borderWidth: 1
                    
			    }
			    ]
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
    var update_chart_scenarios=function(portfolio, value_index){	
        chart_scenarios.data.labels=[];  
        chart_scenarios.data.labels=portfolio.dates;
        if (undefined===value_index) value_index=portfolio.values_names.indexOf('rorac');
       	chart_scenarios.options.title.text="Performance " + portfolio.values_names[value_index] + " der Subportfolien";
        for (i=0;i<portfolio.subportfolio.length;i++){
        	chart_scenarios.data.datasets[i].label=portfolio.subportfolio[i]; 
        	chart_scenarios.data.datasets[i].data=portfolio.values[i][value_index];
        }
        chart_scenarios.update();
    }









