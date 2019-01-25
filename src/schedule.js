
(function(library){
        /*
        
        Schedule functions used by simple and irregular fixed income instruments.
        
        */
        library.backward_schedule=function(eff_dt, maturity, tenor, is_holiday_func, bdc, first_dt, next_to_last_dt){
                if(!(maturity instanceof Date)) throw new Error ("backward_schedule: maturity must be provided");
                if(!(eff_dt instanceof Date)){
                        //effective date is strictly needed if valuation date is not set
                        if (null===library.valuation_date) throw new Error("backward_schedule: if valuation_date is unset, effective date must be provided");
                        //effective date is strictly needed if first date is given
                        if (first_dt instanceof Date) throw new Error("backward_schedule: if first date is provided, effective date must be provided");                                
                }
                if ((eff_dt instanceof Date && maturity<eff_dt) || (library.valuation_date instanceof Date && maturity < library.valuation_date)) 
                        throw new Error("backward_schedule: maturity is before valution or effective date.");
                if(typeof tenor !== "number")
                        throw new Error("backward_schedule: tenor must be a nonnegative integer, e.g., 6 for semiannual schedule, 0 for zerobond/iam schedule");
                if(tenor<0 || Math.floor(tenor) !== tenor)
                        throw new Error("backward_schedule: tenor must be a nonnegative integer, e.g., 6 for semiannual schedule, 0 for zerobond/iam schedule");
                if (0===tenor) return [eff_dt, maturity];
                
                var adj=function(d){
                        return library.adjust(d,bdc,is_holiday_func);
                };

                var res=[maturity];
                
                var ref_dt=maturity;

                if (next_to_last_dt instanceof Date && (adj(next_to_last_dt)<adj(maturity))){
                        res.unshift(next_to_last_dt);
                        ref_dt=next_to_last_dt;
                }
                
                //loop rolls out backward until eff_dt, first_dt or valuation_date is preceded
                var dt,n=0;
                while (true){
                        n++;
                        dt=library.add_months(ref_dt, -tenor*n);
                        if(first_dt instanceof Date && dt<first_dt){
                                //stub period to be considered
                                //insert first_dt if not already included
                                if(adj(res[0]).getTime()!==adj(first_dt).getTime()){
                                        res.unshift(first_dt);
                                }
                                //insert effective date which is needed for calculation of first interest payment
                                if(adj(res[0]).getTime()!==adj(eff_dt).getTime()){
                                        res.unshift(eff_dt);
                                }
                                return res;
                        }
                        if(eff_dt instanceof Date && dt<eff_dt){
                                //schedule begins with eff_dt and there is no stub period
                                if(adj(res[0]).getTime()!=adj(eff_dt).getTime()){
                                        res.unshift(eff_dt);
                                }
                                return res;
                        }
                        if(library.valuation_date instanceof Date && dt<library.valuation_date){
                                //if dt is before val date but neither before eff_dt nor first_dt, 
                                //just insert dt in order to calculate first interes payment.
                                res.unshift(dt);
                                //if dt after adjustment lies after valuation date, 
                                //the schedule date before is needed in order to calculate first interest payment.
                                if(adj(dt)>library.valuation_date){
                                        //the schedule date before is either first_dt,
                                        //eff_dt or just the date obtained by rolling back one period more.
                                        n++;
                                        dt=library.add_months(ref_dt, -tenor*n);
                                        if(first_dt instanceof Date && dt<first_dt){
                                                res.unshift(first_dt);
                                        }
                                        else if(eff_dt instanceof Date && dt<eff_dt){
                                                res.unshift(eff_dt);
                                        }
                                        else{
                                                res.unshift(dt);
                                        }
                                        
                                }
                                return res;
                        }
                        res.unshift(dt);    
                }
        }; 
        
        
}(this.JsonRisk || module.exports));
