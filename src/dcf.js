(function(library){

		/**
		 	* discounts a cash flow
			* @param {object} cf_obj cash flow 
			* @param {object} disc_curve discount curve
			* @param {object} spread_curve spread curve
			* @param {number} residual_spread residual spread
			* @param {date} settlement_date settlement date
			* @returns {object} discounted cash flow
			* @memberof library
			* @public
		*/   
        library.dcf=function(cf_obj, disc_curve, spread_curve, residual_spread, settlement_date){
                /*
                requires cf_obj of type
                {
                        date_pmt: array(date),
                        t_pmt: array(double),
                        pmt_total: array(double)
                }
                requires safe curves
                
                */
                var dc=disc_curve || library.get_safe_curve(null);
                var sc=spread_curve || library.get_safe_curve(null);
		library.require_vd(); //valuation date must be set
                //curve initialisation and fallbacks
                if(typeof residual_spread !== "number") residual_spread=0;
                var sd=library.get_safe_date(settlement_date);
                if (!sd) sd=library.valuation_date;

                //sanity checks
                if (undefined===cf_obj.t_pmt || undefined===cf_obj.pmt_total) throw new Error("dcf: invalid cashflow object");
                if (cf_obj.t_pmt.length !== cf_obj.pmt_total.length) throw new Error("dcf: invalid cashflow object");
                
                var res=0;
                var i=0;
                var df_d;
                var df_s;
                var df_residual;
                while(cf_obj.date_pmt[i]<=sd) i++; // only consider cashflows after settlement date
                while (i<cf_obj.t_pmt.length){
                        df_d=library.get_df(dc,cf_obj.t_pmt[i]);
                        df_s=library.get_df(sc,cf_obj.t_pmt[i]);
                        df_residual=Math.pow(1+residual_spread, -cf_obj.t_pmt[i]);
                        res+=cf_obj.pmt_total[i]*df_d*df_s*df_residual;
                        i++;
                }
                return res;
        };
    
		/**
		 	* TODO
			* @param {object} cf_obj cash flow
			* @param {date} settlement_date
			* @param {date} payment_on_settlement_date
			* @returns {object} ...
			* @memberof library
			* @public
		*/      
        library.irr=function(cf_obj, settlement_date, payment_on_settlement_date){
		library.require_vd(); //valuation date must be set
                if (!payment_on_settlement_date) payment_on_settlement_date=0;
                
                var tset=library.time_from_now(settlement_date);
                var func=function(x){
                        return library.dcf(cf_obj,null,null,x, settlement_date)+
                               payment_on_settlement_date*Math.pow(1+x,-tset);
                };
                
                var ret=library.find_root_secant(func,0,0.0001);
                return ret;
        };
}(this.JsonRisk || module.exports));
