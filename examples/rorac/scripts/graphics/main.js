
var app = angular.module('riskapp', []); 

app.controller('main_ctrl', ['$scope', function($scope) { // Controller für index.html

    /* definition of scope und worker (worker.js) */
	$scope.portfolio=JSON.parse(JSON.stringify(test));  // Portfolio, was der Berechnung auf Reiter results zu grunde liegt
	$scope.value_names={list: null, selection: null};;
	
	$scope.load_all_data=function(){ 	
		   update_chart_scenarios($scope.portfolio);
		   $scope.value_names.list=$scope.portfolio.values_names;
	    }
	    
	$scope.load_all_data();

	$scope.update_chart=function(){
		update_chart_scenarios($scope.portfolio,$scope.value_names.selection);
	};   
}]);

