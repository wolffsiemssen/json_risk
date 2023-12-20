(function(library){   

		/**
		 	* attaches get_value and other function to scalar object, handle scenario rule if present
			* @param {object} scalar scalar object
			* @returns {object} curve
			* @memberof library
			* @public
		*/   
        library.get_safe_scalar=function(scalar){
                //if non-object is given, throw error
                if('object'!==typeof scalar) throw new Error("get_safe_scalar: must provide object");

				// extract value and store in hidden function scope
				var _value=library.get_safe_number(scalar.value);
                if (null===_value) throw new Error("get_safe_scalar: must provide object with scalar value property");
				

				// apply scenario rule if present
				if(typeof scalar._rule === 'object'){
                    var scenval=scalar._rule.values[0][0];
					if (scalar._rule.model==='multiplicative') _value*=scenval;
					if (scalar._rule.model==='additive') _value+=scenval;
					if (scalar._rule.model==='absolute') _value=scenval;
				}

                // atttach get_value function
                scalar.get_value=function(){
                    return _value;
                };

				return scalar;
        };


}(this.JsonRisk || module.exports));
