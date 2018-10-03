        
(function(library){

        library.validate_bond=function(bond){
                if(typeof bond.notional != 'number') return false;
                if(!(bond.maturity instanceof Date)) return false;
        };
        
        library.pricer_bond=function(bond,params){
                return null;
        };
        
        library.bond_dirty_value=function(bond,disc_curve, spread_curve, fwd_curve){
                //sanity checks
                if (null===library.valuation_date)
                        throw new Error("dcf: valuation_date must be set");
                        
                if(!(bond.maturity instanceof String) && typeof bond.maturity !== 'string')
                        throw new Error("bond_dirty_value: must provide maturity date.");
                        
                if(typeof bond.notional !== 'number')
                        throw new Error("bond_dirty_value: must provide notional.");
                
                var is_holiday_func=library.is_holiday_factory(bond.calendar || "");
                var year_fraction_func=library.year_fraction_factory(bond.dcc || "");
                var maturity=library.date_str_to_date(bond.maturity);
                var eff_dt= ('undefined'===typeof bond.effective_date) ? null : library.date_str_to_date(bond.effective_date);
                var first_dt= ('undefined'===typeof bond.first_date) ? null : library.date_str_to_date(bond.first_date);
                var next_to_last_dt= ('undefined'===typeof bond.next_to_last_date) ? null : library.date_str_to_date(bond.next_to_last_date);
                
                var schedule=library.backward_schedule(eff_dt, 
                                                       maturity,
                                                       bond.freq,
                                                       is_holiday_func,
                                                       bond.bdc || "",
                                                       first_dt,
                                                       next_to_last_dt);
                var cf;
                if (typeof bond.fixed_rate === 'number'){
                        cf=library.fix_cash_flows(schedule,
                                                  bond.bdc,
                                                  is_holiday_func,
                                                  year_fraction_func,
                                                  bond.notional,
                                                  bond.fixed_rate);
                }else{
                        cf=library.float_cash_flows(schedule,
                                                    bond.bdc,
                                                    is_holiday_func,
                                                    year_fraction_func,
                                                    bond.notional,
                                                    bond.current_rate,
                                                    bond.float_spread,
                                                    fwd_curve );
                }
                
                var settlement_date=library.adjust(library.add_days(library.valuation_date, 
                                                                   (typeof bond.settlement_days==='number') ? bond.settlement_days: 0),
                                                   "following",
                                                   is_holiday_func);
                return library.dcf(cf, 
                                   disc_curve,
                                   spread_curve,
                                   bond.residual_spread,
                                   settlement_date);
        };
        

        


}(this.JsonRisk || module.exports));
