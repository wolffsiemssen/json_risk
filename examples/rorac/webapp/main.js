
var app = angular.module('roracapp', []); 

app.controller('main_ctrl', ['$scope', function($scope) { 
			$scope.rorac=JSON.parse(JSON.stringify(rorac)); 
			$scope.value_names={list: null, selection: null};
			
			$scope.initial_data=function(){ 
		   		$scope.value_names.list=$scope.rorac.values_names;
		   		$scope.value_names.selection="rorac";
		   		update_data($scope.value_names.selection);
	    	}
	    	
	   		$scope.initial_data();	 
	   	  		
			$scope.update=function(){
				update_data($scope.value_names.selection)				
			}
				
			function update_data(value_name){
				var index_value=$scope.rorac.values_names.indexOf($scope.value_names.selection);
				update_chart_scenarios($scope.rorac,index_value);
				update_table(index_value);
			}
					
			function update_table(index_value){
				var data_table=[];
 				for (i=0;i<$scope.rorac.dates.length;i++){
 				data_table[i]={};
 				data_table[i]['Datum']=$scope.rorac.dates[i];
 					for (k=0;k<$scope.rorac.subportfolio.length;k++){
 					data_table[i][$scope.rorac.subportfolio[k]]=$scope.rorac.values[k][index_value][i]; 					
 					}				
 				}
				$("#table").bootstrapTable();
				$("#table").bootstrapTable('destroy');
    			$("#table thead tr").html('');    	
    			var tr = $('<th data-field="Datum">'+ $scope.value_names.selection + '<br>Datum</th>');
      				$("#table thead tr").append(tr);
    			for (i=0;i<$scope.rorac.subportfolio.length;i++){
      				var tr = $('<th data-field="' + $scope.rorac.subportfolio[i] +'">'+ $scope.rorac.subportfolio[i] +'</th>');
      				$("#table thead tr").append(tr);
    			};     
     			$(function () {
					$('#table').bootstrapTable({
    					data: data_table,
    					formatLoadingMessage: function() {
      							return '';
    						}
					});
				});
			};
	
}]);

