(function(library){

        /*
        
                JsonRisk vector pricing
                
                
        */
        
        var stored_params=null; //hidden variable for parameter storage
        
        var normalise_scalar=function(obj){ //makes value an array of length one if it is not an array
                return (Array.isArray(obj.value)) ? {value: obj.value} : {value: [obj.value]};
        };
        
        var normalise_curve=function(obj){ // constructs times from days, dates or labels and makes dfs and zcs an array of length one if it is not an array
                return {
                        times: library.get_curve_times(obj),
                        dfs: obj.dfs ? ((Array.isArray(obj.dfs[0])) ? obj.dfs : [obj.dfs]) : null,
                        zcs: obj.zcs ? ((Array.isArray(obj.zcs[0])) ? obj.zcs : [obj.zcs]) : null
                };
        };
        
        var normalise_surface=function(obj){ // constructs terms from labels_term, expiries from labels_expiry and makes value an array of length one if it is not an array
                var safe_surface=library.get_safe_surface(obj); //has terms and expiries
                return {
                        expiries: safe_surface.expiries,
                        terms: safe_surface.terms,
                        values: (Array.isArray(obj.values[0][0])) ? obj.values : [obj.values]
                };
        };
        
        var update_vector_length=function(len){
                if (1===len) return;
                if (1===stored_params.vector_length){
                        stored_params.vector_length = len;
                        return;
                }
                if (len !== stored_params.vector_length) throw new Error("vector_pricing: parameters need to have the same length or length one");
        };
        
        library.store_params=function(params){
                stored_params={vector_length: 1};
                var keys, i;
                //valuation date
                stored_params.valuation_date=params.valuation_date || null;
                //scalars
                if (typeof(params.scalars) === 'object'){
                        stored_params.scalars={};
                        keys=Object.keys(params.scalars);
                        for (i=0; i< keys.length;i++){
                                stored_params.scalars[keys[i]]=normalise_scalar(params.scalars[keys[i]]);
                                update_vector_length(stored_params.scalars[keys[i]].value.length);
                        }
                }
                //curves
                if (typeof(params.curves) === 'object'){
                        stored_params.curves={};
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
                if (typeof(params.surfaces) === 'object'){
                        stored_params.surfaces={};
                        keys=Object.keys(params.surfaces);
                        for (i=0; i< keys.length;i++){
                                stored_params.surfaces[keys[i]]=normalise_surface(params.surfaces[keys[i]]);
                                update_vector_length(stored_params.surfaces[keys[i]].values.length);
                        }
                }
        
        };
        
        library.get_params=function(){
                return stored_params;
        };
        
        var get_scalar_curve=function(vec_curve, i){
                return { times: vec_curve.times,
                        dfs: vec_curve.dfs ? (vec_curve.dfs[vec_curve.dfs.length>1 ? i : 0]) : null,
                        zcs: vec_curve.zcs ? (vec_curve.zcs[vec_curve.zcs.length>1 ? i : 0]) : null
                };
        };
        
        var get_scalar_surface=function(vec_surface, i){
                return { expiries: vec_surface.expiries,
                         terms: vec_surface.terms,
                         values: vec_surface.values[vec_surface.values.length>1 ? i : 0]
                };
        };
        
        library.vector_pricer=function(instrument){
                var vec_curve=stored_params.curves[instrument.disc_curve];
                var curve;
                var instr=new library.simple_fixed_income(instrument);
                var res=new Array(stored_params.vector_length);
                for (var i=0; i< stored_params.vector_length; i++){
                        curve=get_scalar_curve(vec_curve, i);
                        res[i]=instr.present_value(curve,null,null);
                }
                return res;
        };
        
}(this.JsonRisk || module.exports));


