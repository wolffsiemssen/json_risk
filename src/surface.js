(function(library){

        library.get_const_surface=function(value, type){
                if(typeof value !== 'number') throw new Error("get_const_surface: input must be number."); 
                return {
                                type: type || "", 
                                expiries: [1],
                                terms: [1],
                                values: [[value]]
                       };
        };
        
        function get_surface_times(labels){
                var i,times;
                i=surface.labels_expiry.length;
                times=new Array(i);    
                while (i>0){
                       i--;
                       times[i]=library.period_str_to_time(labels[i]);
                }                      
                return times;
        }
        
        library.get_safe_surface=function(surface){
                //if valid surface is given, returns surface in initialised form {type, times, dfs}, if null, returns constant zero surface
                var expiries, terms;
                if (!surface) return library.get_const_surface(0.0);
                if (!surface.expiries){
                        if (!surface.labels_expiry) throw new Error("get_initialised_surface: cannot derive expiries");
                        expiries=get_surface_times(labels_expiry);
                }else{
                        expiries=surface.expiries;
                }
                if (!surface.terms){
                        if (!surface.labels_term) throw new Error("get_initialised_surface: cannot derive terms");
                        terms=get_surface_times(labels_term);
                }else{
                        terms=surface.terms;
                }
                if (surface.values.length!==expiries.length) throw new Error("get_initialised_surface: expiries dimensions do not match values array");
                for (var i=0; i< expiries.length; i++){
                        if (surface.values[i].length!==terms.length) throw new Error("get_initialised_surface: terms dimensions do not match values array");
                }
                return {
                                type: surface.type || "", 
                                expiries: expiries,
                                terms: terms,
                                values: surface.values
                        };
        };
        
        get_slice_rate_unsafe=function(surface,i_expiry,t_term,imin,imax){
                imin=imin || 0;
                imax=imax || surface.terms.length-1;
                
                var sl=surface.values[i_expiry];
                //slice only has one value left
                if (imin===imax) return sl[imin];
                //extrapolation (constant)
                if (t_term<surface.terms[imin]) return sl[imin];
                if (t_term>surface.terms[imax]) return sl[imax];
                //interpolation (linear)
                if (imin+1===imax){
                        return sl[imin]*(surface.terms[imax]-t_term)/(surface.terms[imax]-surface.terms[imin])+
                               sl[imax]*(t_term-surface.terms[imin])/(surface.terms[imax]-surface.terms[imin]);
                }
                //binary search and recursion
                imed=Math.ceil((imin+imax)/2.0);
                if (t_term>surface.terms[imed]) return get_slice_rate_unsafe(surface,i_expiry,t_term,imed,imax);
                return get_slice_rate_unsafe(surface,i_expiry, t_term,imin,imed);
        };


        get_surface_rate_unsafe=function(surface,t_expiry,t_term,imin,imax){
                imin=imin || 0;
                imax=imax || surface.expiries.length-1;

                //surface only has one slice left
                if (imin===imax) return get_slice_rate_unsafe(surface, imin, t_term);
                //extrapolation (constant)
                if (t_expiry<surface.expiries[imin]) return get_slice_rate_unsafe(surface, imin, t_term);
                if (t_expiry>surface.expiries[imax]) return get_slice_rate_unsafe(surface, imax, t_term);
                //interpolation (linear)
                if (imin+1===imax){
                        return get_slice_rate_unsafe(surface, imin, t_term)*(surface.expiries[imax]-t_expiry)/(surface.expiries[imax]-surface.expiries[imin])+
                               get_slice_rate_unsafe(surface, imax, t_term)*(t_expiry-surface.expiries[imin])/(surface.expiries[imax]-surface.expiries[imin]);
                }
                //binary search and recursion
                imed=Math.ceil((imin+imax)/2.0);
                if (t_expiry>surface.expiries[imed]) return get_surface_rate_unsafe(surface,t_expiry,t_term,imed,imax);
                return get_surface_rate_unsafe(surface,t_expiry,t_term,imin,imed);
        };

        
        library.get_surface_rate=function(surface,t_expiry, t_term){
                var s=library.get_safe_surface(surface);
                return get_surface_rate_unsafe(s, t_expiry, t_term);
        };


}(this.JsonRisk || module.exports));
