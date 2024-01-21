/*!
	JSON Risk
	v1.0.0
	https://github.com/wolffsiemssen/json_risk
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

        JsonRisk.require_vd=function(){
		if(!(JsonRisk.valuation_date instanceof Date)) throw new Error("JsonRisk: valuation_date must be set");
        };
        
        return JsonRisk;

}));
