/*!
	JSON Risk
	v0.0.0
	https://github.com/tilwolff/json_risk
	License: MIT
*/
(function(root, factory)
{
        if (typeof module === 'object' && typeof exports !== 'undefined')
	{
		// Node
		module.exports = factory();
	}
	else
	{
		// Browser
		root.JsonRisk = factory();
	}
}(this, function()
{


        var JsonRisk = {
                valuation_date: null
        };

        JsonRisk.pricer=function(instrument, parameters){

                return null;
                
        };

        
        
        return JsonRisk;

}));
