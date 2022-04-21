(function(library){



        /*
        
                JsonRisk vector pricing
                
                
        */
        
        var stored_params=null; //hidden variable for parameter storage

		/**
		 	* ...
			* @param {object} obj
			* @returns {number} scalar
			* @memberof library
			* @private
		*/           
        var normalise_scalar=function(obj){ //makes value an array of length one if it is not an array
                return (Array.isArray(obj.value)) ? {value: obj.value} : {value: [obj.value]};
        };

		/**
		 	* ...
			* @param {object} obj
			* @returns {object} curve
			* @memberof library
			* @private
		*/           
        var normalise_curve=function(obj){ // constructs times from days, dates or labels and makes dfs and zcs an array of length one if it is not an array
                var times=library.get_curve_times(obj),
                    dfs=obj.dfs ? ((Array.isArray(obj.dfs[0])) ? obj.dfs : [obj.dfs]) : null,
                    zcs=obj.zcs ? ((Array.isArray(obj.zcs[0])) ? obj.zcs : [obj.zcs]) : null;
		
		if (!dfs){
			dfs=new Array(zcs.length);
			for (var i=0;i<zcs.length;i++){
				dfs[i]=new Array(zcs[i].length);
				for (var j=0;j<zcs[i].length;j++){
					dfs[i][j]=Math.pow(1+zcs[i][j],-times[j]);
				}
			}
		}

                return {
                        times: times,
                        dfs: dfs
                };
        };


		/**
		 	* ...
			* @param {object} obj 
			* @returns {object} surface
			* @memberof library
			* @private
		*/           
        var normalise_surface=function(obj){ // constructs terms from labels_term, expiries from labels_expiry and makes value an array of length one if it is not an array
                var safe_surface=library.get_safe_surface(obj); //has terms and expiries
                return {
                        expiries: safe_surface.expiries,
                        terms: safe_surface.terms,
                        values: (Array.isArray(obj.values[0][0])) ? obj.values : [obj.values]
                };
        };


		/**
		 	* ...
			* @param {object} len length
			* @returns {number} ...
			* @memberof library
			* @private
		*/           
        var update_vector_length=function(len){
                if (1===len) return;
                if (1===stored_params.vector_length){
                        stored_params.vector_length = len;
                        return;
                }
                if (len !== stored_params.vector_length) throw new Error("vector_pricing: provided parameters need to have the same length or length one");
        };

		/**
		 	* ...
			* @param {object} params parameter
			* @memberof library
			* @public
		*/
		function name_to_moneyness(str){
			var s=str.toLowerCase();
			if (s.endsWith('atm')) return 0; //ATM surface
			var n=s.match(/([+-][0-9]+)bp$/); //find number in name, convention is NAME+100BP, NAME-50BP
			if (n.length<2) return null;
			return n[1]/10000;

		}

		/**
		 	* ...
			* @param {object} params parameter
			* @memberof library
			* @public
		*/
		function find_smile(name, list){
			var res=[],moneyness;
			for (var i=0;i<list.length;i++){
				if (!list[i].startsWith(name)) continue; //not a smile section of surface name
				if (list[i].length===name.length) continue; //this is the surface itself
				moneyness=name_to_moneyness(list[i]);
				if (null===moneyness) continue;
				res.push({ name: list[i],
					   moneyness: moneyness
				});
			}
			res.sort(function(a,b){
				return a.moneyness-b.moneyness;
			});
			return res;
		} 
       
        library.store_params=function(params){
            stored_params={vector_length: 1,
			       scalars: {},
			       curves: {},
			       surfaces: {}
	        };

            var keys, i;
            //valuation date
            stored_params.valuation_date=library.get_safe_date(params.valuation_date);
            //scalars
            if (typeof(params.scalars) === 'object'){
                    keys=Object.keys(params.scalars);
                    for (i=0; i< keys.length;i++){
                            stored_params.scalars[keys[i]]=normalise_scalar(params.scalars[keys[i]]);
                            update_vector_length(stored_params.scalars[keys[i]].value.length);
                    }
            }
            //curves
            if (typeof(params.curves) === 'object'){
                    keys=Object.keys(params.curves);
                    var obj,len;
                    for (i=0; i< keys.length;i++){
                            obj=normalise_curve(params.curves[keys[i]]);
                            stored_params.curves[keys[i]]=obj;
                            len=obj.dfs ? obj.dfs.length : obj.zcs.length;
                            update_vector_length(len);
                    }
            }
            
            //surfaces
			var smile,moneyness,j;
            if (typeof(params.surfaces) === 'object'){
                keys=Object.keys(params.surfaces);
                for (i=0; i< keys.length;i++){
                        stored_params.surfaces[keys[i]]=normalise_surface(params.surfaces[keys[i]]);
                        update_vector_length(stored_params.surfaces[keys[i]].values.length);
                }
				//link smile surfaces to their atm surface
                for (i=0; i< keys.length;i++){
                    smile=find_smile(keys[i],keys);
					if (smile.length>0){
						stored_params.surfaces[keys[i]].smile=[];
						stored_params.surfaces[keys[i]].moneyness=[];
						for (j=0;j<smile.length;j++){
							stored_params.surfaces[keys[i]].smile.push(stored_params.surfaces[smile[j].name]);
							stored_params.surfaces[keys[i]].moneyness.push(smile[j].moneyness);
						}
					}
                }
            }

			//calendars
			var cal;
			if (typeof(params.calendars) === 'object'){
		    	keys=Object.keys(params.calendars);
		    	for (i=0; i< keys.length;i++){
					cal=params.calendars[keys[i]];
					library.add_calendar(keys[i],cal.dates);
				}
			}
        };

		/**
		 	* ...
			* @returns {object} parameter
			* @memberof library
			* @public
		*/           
        library.get_params=function(){
                return stored_params;
        };

		/**
		 	* ...
			* @param {object} params parameter
			* @returns {object} ...
			* @memberof library
			* @public
		*/   
        library.set_params=function(params){
			if (typeof(params) !== 'object') throw new Error("vector_pricing: try to hard set invalid parameters. Use store_params to normalize and store params.");
			if (typeof(params.vector_length) !== 'number') throw new Error("vector_pricing: try to hard set invalid parameters. Use store_params to normalize and store params.");
                stored_params=params;
        };
		/**
		 	* ...
			* @param {object} vec_curve
			* @param {object} i
			* @returns {object} curve
			* @memberof library
			* @private
		*/           
        var get_scalar_curve=function(vec_curve, i){
                if (!vec_curve) return null;
		var times=vec_curve.times,
                    dfs=vec_curve.dfs ? (vec_curve.dfs[vec_curve.dfs.length>1 ? i : 0]) : null;

		return{ 
			times: times,
			dfs:dfs
		};

        };
		/**
		 	* ...
			* @param {object} vec_surface
			* @param {object} i
			* @returns {object} surface
			* @memberof library
			* @private
		*/         
        var get_scalar_surface=function(vec_surface, i, nosmile){
                if (!vec_surface) return null;
		var expiries=vec_surface.expiries;
		var terms=vec_surface.terms;
		var values=vec_surface.values[vec_surface.values.length>1 ? i : 0];
		var smile=null,moneyness=null,j;
		if (nosmile!==true && Array.isArray(vec_surface.smile) && Array.isArray(vec_surface.moneyness)){
			moneyness=vec_surface.moneyness;
			smile=[];
			for (j=0;j<vec_surface.smile.length;j++){
				smile.push(get_scalar_surface(vec_surface.smile[j],i,true));
			}
		}
                return { expiries: expiries,
                         terms: terms,
                         values: values,
			 moneyness: moneyness,
			 smile: smile
                };
        };

		/**
		 	* read instrument type for given instrument and create internal instrument
			* @param {object} instrument any instrument
			* @returns {object} internal instrument
			* @memberof library
			* @public
		*/           
        library.get_internal_object=function(instrument){
                switch (instrument.type.toLowerCase()){
                        case "bond":
                        case "floater":
			return new library.fixed_income(instrument);
                        case "swap":
                        return new library.swap(instrument);
                        case "swaption":
                        return new library.swaption(instrument);
                        case "fxterm":
                        return new library.fxterm(instrument);
                        case "callable_bond":
                        return new library.callable_fixed_income(instrument);
                        default:
                        throw new Error ("get_internal_object: invalid instrument type");
                }
        };
 
		/**
		 	* calculates the present value for any given supported instrument (bond, floater, fxterm, swap, swaption, callable_bond)
			* @param {object} instrument any instrument
			* @returns {number} present value
			* @memberof library
			* @public
		*/          
        library.vector_pricer=function(instrument){
                if (typeof(instrument.type)!== 'string') throw new Error ("vector_pricer: instrument object must contain valid type");
                library.valuation_date=stored_params.valuation_date;
                var obj=library.get_internal_object(instrument);
                var vec_dc=stored_params.curves[instrument.disc_curve || ""] || null;
                var vec_sc=stored_params.curves[instrument.spread_curve || ""] || null;
                var vec_fc=stored_params.curves[instrument.fwd_curve || ""] || null;
                var vec_surface=stored_params.surfaces[instrument.surface || ""] || null;
                var vec_fx=stored_params.scalars[instrument.currency || ""] || null;
                var dc, sc, fc, su, fx;
                var res=new Array(stored_params.vector_length);
                for (var i=0; i< stored_params.vector_length; i++){
                        dc=get_scalar_curve(vec_dc, i);
                        sc=get_scalar_curve(vec_sc, i);
                        fc=get_scalar_curve(vec_fc, i);
                        su=get_scalar_surface(vec_surface, i);
                        switch (instrument.type.toLowerCase()){
                                case "bond":
                                case "floater":
                                case "fxterm":
				                case "irregular_bond":
                                res[i]=obj.present_value(dc,sc,fc);
                                break;
                                case "swap":
                                case "swaption":
                                res[i]=obj.present_value(dc,fc,su);
				                break;
                                case "callable_bond":
                                res[i]=obj.present_value(dc,sc,fc,su);
                                break;
                        }
                        // if currency is provided and not EUR, convert or throw error
                        if (!instrument.currency) continue;
                        if (instrument.currency === 'EUR') continue;
                        if (!vec_fx) throw new Error ('vector_pricer: cannot convert currency, scalar parameter not provided');
                        res[i]/=vec_fx.value[vec_fx.value.length>1 ? i : 0];  
                }
                return res;
        };
        
}(this.JsonRisk || module.exports));
