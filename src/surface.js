(function(library){

		/**
		 	* ...
			* @param {number} value
			* @param {string} type
			* @returns {object} surface
			* @memberof library
			* @public
		*/   
        library.get_const_surface=function(value, type){
                if(typeof value !== 'number') throw new Error("get_const_surface: input must be number."); 
                return {
                                type: type || "", 
                                expiries: [1],
                                terms: [1],
                                values: [[value]]
                       };
        };
		/**
		 	* ...
			* @param {object} surface surface
			* @param {number} i
			* @returns {number} term at time i
			* @memberof library
			* @private
		*/           
        function get_term_at(surface, i){
                //construct terms from labels_term if terms are not defined
                if (surface.terms) return surface.terms[i];
                if (surface.labels_term) return library.period_str_to_time(surface.labels_term[i]);
                throw new Error("get_term_at: invalid surface, cannot derive terms");
        }
		/**
		 	* ...
			* @param {object} surface surface
			* @param {number} i
			* @returns {number} expiry at time i
			* @memberof library
			* @private
		*/           
        function get_expiry_at(surface, i){
                //construct expiries from labels_expiry if expiries are not defined
                if (surface.expiries) return surface.expiries[i];
                if (surface.labels_expiry) return library.period_str_to_time(surface.labels_expiry[i]);
                throw new Error("get_expiry_at: invalid surface, cannot derive expiries");
        }
		/**
		 	* ...
			* @param {object} surface surface
			* @returns {object} terms
			* @memberof library
			* @private
		*/           
        function get_terms(surface){
                var i=(surface.terms || surface.labels_term || []).length;
                if (!i) throw new Error("get_surface_terms: invalid surface, need to provide valid terms or labels_term");
                var terms=new Array(i);
                while (i>0){
                        i--;
                        terms[i]=get_term_at(surface, i);
                }
                return terms;
        }
		/**
		 	* ...
			* @param {object} surface surface
			* @returns {object} experies
			* @memberof library
			* @private
		*/           
        function get_expiries(surface){
                var i=(surface.expiries || surface.labels_expiry || []).length;
                if (!i) throw new Error("get_surface_terms: invalid surface, need to provide valid expiries or labels_expiry");
                var expiries=new Array(i);
                while (i>0){
                        i--;
                        expiries[i]=get_expiry_at(surface, i);
                }
                return expiries;
        }
		/**
		 	* ...
			* @param {object} surface surface
			* @returns {object} surface
			* @memberof library
			* @public
		*/           
        library.get_safe_surface=function(surface){
                //if valid surface is given, returns surface in initialised form {type, expiries, terms, values}
                //if null or other falsy argument is given, returns constant zero surface
                if (!surface) return library.get_const_surface(0.0);
                return {
                                type: surface.type || "", 
                                expiries: get_expiries(surface),
                                terms: get_terms(surface),
                                values: surface.values
                        };
        };
		/**
		 	* ...
			* @param {object} surface
			* @param {date} i_expiry
			* @param {} t_term
			* @param {} imin
			* @param {} imax
			* @returns {number} slice rate
			* @memberof library
			* @privat
		*/            
        function get_slice_rate(surface,i_expiry,t_term,imin,imax){
                imin=imin || 0;
                imax=imax || (surface.terms || surface.labels_term || []).length-1;
                
                var sl=surface.values[i_expiry];
		if (!Array.isArray(sl)) throw new Error("get_slice_rate: invalid surface, values property must be an array of arrays");
                //slice only has one value left
                if (imin===imax) return sl[imin];
                //extrapolation (constant)
                if (t_term<get_term_at(surface, imin)) return sl[imin];
                if (t_term>get_term_at(surface, imax)) return sl[imax];
                //interpolation (linear)
                if (imin+1===imax){
                        return sl[imin]*(get_term_at(surface, imax)-t_term)/(get_term_at(surface, imax)-get_term_at(surface, imin))+
                               sl[imax]*(t_term-get_term_at(surface, imin))/(get_term_at(surface, imax)-get_term_at(surface, imin));
                }
                //binary search and recursion
                imed=Math.ceil((imin+imax)/2.0);
                if (t_term>get_term_at(surface,imed)) return get_slice_rate(surface,i_expiry,t_term,imed,imax);
                return get_slice_rate(surface,i_expiry, t_term,imin,imed);
        }
		/**
		 	* ...
			* @param {object} surface
			* @param {date} t_expiry
			* @param {} t_term
			* @param {} imin
			* @param {} imax
			* @returns {number} surface rate
			* @memberof library
			* @public
		*/   
        library.get_surface_rate=function(surface,t_expiry,t_term,imin,imax){
                imin=imin || 0;
                imax=imax || (surface.expiries || surface.labels_expiry || []).length-1;

                //surface only has one slice left
                if (imin===imax) return get_slice_rate(surface, imin, t_term);
                //extrapolation (constant)
                if (t_expiry<get_expiry_at(surface, imin)) return get_slice_rate(surface, imin, t_term);
                if (t_expiry>get_expiry_at(surface, imax)) return get_slice_rate(surface, imax, t_term);
                //interpolation (linear)
                if (imin+1===imax){
                        return get_slice_rate(surface, imin, t_term)*(get_expiry_at(surface, imax)-t_expiry)/(get_expiry_at(surface, imax)-get_expiry_at(surface, imin))+
                               get_slice_rate(surface, imax, t_term)*(t_expiry-get_expiry_at(surface, imin))/(get_expiry_at(surface, imax)-get_expiry_at(surface, imin));
                }
                //binary search and recursion
                imed=Math.ceil((imin+imax)/2.0);
                if (t_expiry>get_expiry_at(surface,imed)) return library.get_surface_rate(surface,t_expiry,t_term,imed,imax);
                return library.get_surface_rate(surface,t_expiry,t_term,imin,imed);
        };


}(this.JsonRisk || module.exports));
