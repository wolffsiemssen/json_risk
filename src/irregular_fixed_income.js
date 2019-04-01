(function(library){

        library.irregular_fixed_income=function(instrument,curve){

                var maturity=library.get_safe_date(instrument.maturity);       
                if(!maturity)
                        throw new Error("irregular_fixed_income: must provide maturity date.");

                if(typeof instrument.notional !== 'number')
                        throw new Error("irregular_fixed_income: must provide valid notional.");
                this.notional=instrument.notional;

                if(typeof instrument.tenor !== 'number')
                        throw new Error("irregular_fixed_income: must provide valid tenor.");

                if(instrument.tenor < 0 || instrument.tenor!==Math.floor(instrument.tenor))
                        throw new Error("irregular_fixed_income: must provide valid tenor.");
                this.tenor=instrument.tenor;


                if(instrument.repay_tenor < 0 || instrument.repay_tenor!==Math.floor(instrument.repay_tenor))
                        throw new Error("irregular_fixed_income: must provide valid repay_tenor.");
                this.repay_tenor=instrument.repay_tenor;

                this.repay_amount = instrument.repay_amount;
                this.current_accrued_interest = instrument.current_accrued_interest;

                this.amortization = instrument.amortization;
                this.current_accrued_interest = instrument.current_accrued_interest;

                this.type=(typeof instrument.type==='string') ? instrument.type : 'unknown';  // AG what is instrument.type, something like "loan" or "deposit" ?

                this.is_holiday_func=library.is_holiday_factory(instrument.calendar || "");
                this.year_fraction_func=library.year_fraction_factory(instrument.dcc || "");
                this.bdc=instrument.bdc || "";


                /* we don't need to change to this. the following variables, because they are only used to be passed to functions external to the class (backward_schedule function)*/

                var effective_date=library.get_safe_date(instrument.effective_date); //null allowed
                var first_date=library.get_safe_date(instrument.first_date); //null allowed
                var next_to_last_date=library.get_safe_date(instrument.next_to_last_date); //null allowed

                var repay_first_date=library.get_safe_date(instrument.repay_first_date); //null allowed
                var repay_next_to_last_date=library.get_safe_date(instrument.repay_next_to_last_date); //null allowed



                if(instrument.conditions_valid_until != null){ 
                    this.conditions_valid_until = new Array(instrument.conditions_valid_until.length-1);

                    for(var i=0;i<this.conditions_valid_until.length;i++){ 
                                this.conditions_valid_until[i]=
                                    library.get_safe_date(instrument.conditions_valid_until[i]);

                                }
                    }

                var settlement_days=(typeof instrument.settlement_days==='number') ? instrument.settlement_days: 0;
                this.settlement_date=library.adjust(library.add_days(library.valuation_date,
                                                                    settlement_days),
                                                                    "following",
                                                                    this.is_holiday_func);
                var residual_spread=(typeof instrument.residual_spread=='number') ? instrument.residual_spread : 0;
                var currency=instrument.currency || "";


                if(instrument.fixed_rate != null){
                        //fixed rate instrument
                        this.is_float=false;
                        this.fixed_rate=instrument.fixed_rate;
                }else{
                        //floating rate instrument
                        this.is_float=true; 
                        this.float_spread=instrument.float_spread ? instrument.float_spread : 0; 
                        if(typeof instrument.current_rate !== 'number')
                                throw new Error("irregular_fixed_income: must provide valid current_rate.");
                        this.current_rate=instrument.current_rate;               



                        this.cap_rate = instrument.cap_rate; // can be number or array, entries can be null
                        this.floor_rate = instrument.floor_rate; // can be number or array, entries can be null
                        this.fixing_tenor = instrument.fixing_tenor;
                        this.fixing_first_date=library.get_safe_date(instrument.fixing_first_date); //null allowed


                        this.fixing_next_to_last_date = library.get_safe_date(instrument.fixing_next_to_last_date); // null allowed
//                        this.fixing_next_to_last_date = (instrument.fixing_next_to_last_date != null)? library.get_safe_date(instrument.fixing_next_to_last_date) : 
//                      library.get_next_to_last_date(this.fixing_first_date,this.fixing_tenor,maturity);


                }

                this.schedule=library.backward_schedule(effective_date, 
                                                        maturity,
                                                        this.tenor,
                                                        this.is_holiday_func,
                                                        this.bdc,
                                                        first_date,
                                                        next_to_last_date);


                if(this.is_float==true){

                    this.fixing_schedule = 
                              library.backward_schedule(this.fixing_first_date,
                                                        this.fixing_next_to_last_date,
                                                        this.fixing_tenor,
                                                        this.is_holiday_func,this.bdc,
                                                        this.fixing_first_date,
                                                        this.fixing_next_to_last_date);
                                          }


                this.repay_schedule = library.backward_schedule(effective_date, 
                                                                maturity,
                                                                this.repay_tenor,
                                                                this.is_holiday_func,
                                                                this.bdc,
                                                                repay_first_date,
                                                                repay_next_to_last_date);

                this.merged_schedule = this.get_merged_schedule();

                if (this.is_float == true) { 
                                            this.cash_flows =
                                                    this.fixflt_cash_flows(this.current_rate,curve);
                                           } else {
                                            this.cash_flows =
                                                    this.fixflt_cash_flows(this.fixed_rate,null);
                                                    }

               
        };
    
    
        library.irregular_fixed_income.prototype.update_flt_cash_flows=function(curve){
            
                this.cash_flows = this.fixflt_cash_flows(this.current_rate,curve);
                return this.cash_flows;
            
        }; //this serves in order to update floaters cashflows with new curve
    

        library.irregular_fixed_income.prototype.fixflt_cash_flows=function(rate,fwd_curve){
            
            
                if (null===library.valuation_date) throw new Error("fix_cash_flows: valuation_date must be set");
            
                var default_yf=library.year_fraction_factory(null);
                var schlength = this.merged_schedule.date_accrual_start.length;  

                var current_principal=new Array(schlength);
                var interest_current_period=new Array(schlength);
                var accrued_interest=new Array(schlength);
                var pmt_principal=new Array(schlength);
                var pmt_interest=new Array(schlength);
                var pmt_total=new Array(schlength);
            
            
            
                /* introduce temporary workable and
                                    overridable variables as "actual" values */
                
                this.actual_rate = (typeof rate == "number")? rate: rate[0];  
                this.actual_notional = this.notional;  
                this.actual_int_accrual = this.current_accrued_interest;  
                this.actual_payment = (typeof this.repay_amount == "number")? this.repay_ampount: this.repay_amount[0];  
                this.actual_amortization = (typeof this.amortization == "number") ? this.amortization: this.amortization[0];  
            
            
                
                
                if(this.is_float==true){
                    
                    this.float_rate_series = this.get_fwd_rate_series(fwd_curve); 
                    this.rate_pos = 0;
                    
                    if (this.float_spread != null){
                        this.actual_float_spread = (typeof this.float_spread == "number")? this.float_speard: this.float_spread[0];
                    }
                    
                    if (this.cap_rate != null) {
                        this.actual_cap_rate = (typeof this.cap_rate == "number")? this.cap_rate: this.cap_rate[0]; // consider it can be an array, replaces this.actual_cap in cf_step 
                    }
                    if (this.floor_rate != null) {
                        this.actual_floor_rate = (typeof this.floor_rate == "number")? this.floor_rate: this.floor_rate[0]; // consider it can be an array, replaces this.actual_cap in cf_step 
                    }
                    
                    
                }
            
                
                //then do the following loop of computations
            
            
                var pos_condition_series = 0;        
                                    
                for (var j = 0; j < schlength; j++ ) {
                    
                     if (this.merged_schedule.is_condition_date[j]==true)  {
                            pos_condition_series++; 
                            this.actual_amortization = this.amortization[pos_condition_series] ;  
                            this.actual_payment = this.repay_amount[pos_condition_series] ; 
                                                    /*if end date is condition date go one position further
                                                    in the conditions series and override the amortization 
                                                    conditions for interest and notional payment, not for rate calculation*/
                     }

                     cf_step= this.cf_step(j); 


                    // write the [j].th entries of the market-dependent part of the table as computed by cf_step function

                    current_principal[j]=cf_step.current_principal;
                    interest_current_period[j]=cf_step.interest_current_period;
                    accrued_interest[j]=cf_step.accrued_interest;
                    pmt_principal[j]=cf_step.pmt_principal;
                    pmt_interest[j]=cf_step.pmt_interest;
                    pmt_total[j]=cf_step.pmt_principal + cf_step.pmt_interest; 
                    
                    /*At each change of deal conditions this.rate and the amortization must be appropriately updated before the next cashflow computation step. This is done by the following code*/
              
                    if (this.merged_schedule.is_condition_date==true) { 
                
                
                         this.actual_amortization = this.amortization[pos_condition_series] ;  
                                /* pos_condition_series is the index of the new condition properties in the condition array */
                         this.actual_rate = rate[pos_condition_series]? rate[pos_condition_series] : this.actual_rate ;                            
                                       /*in this way the rate is changed only if there is a new condition rate. In particular, this allows
                                       floaters to deal correctly situations in which the next fixing may occur either before or after a new
                                       condition date*/
                         this.actual_payment = this.repay_amount[pos_condition_series] ; 
                          
                       
                     }      /*  update condition deal conditions at condition date, before beginning of new condition  */
     
                    
                    
                    
                    
                    if (this.is_float == true)  { 

                        /*the cf_step method always uses this.rate for the computations. In case of floaters, this quantity already includes the spread, cap and floor contribution. After each computation, its value must be appropriately updated before the next cashflow computation step. This is done by the following code*/


                        if (this.merged_schedule.is_fixing_date[j]==true) {  

                            this.actual_rate = this.float_rate_series[this.rate_pos]; 
                            if(this.rate_pos < this.float_rate_series.length-1) this.rate_pos++; 
                                        }



                        if (this.merged_schedule.is_condition_date[j]==true){ /* update temporary spread cap and floor*/  

                                            this.actual_float_spread = this.float_spread[pos_condition_series];
                                            this.actual_cap_rate = this.cap_rate[pos_condition_series];
                                            this.actual_floor_rate = this.floor_rate[pos_condition_series];

                        }/* pos_condition_series is the index of the new condition properties in the array of conditions */

                        if (isNaN(this.actual_floor_rate)&&isNaN(this.actual_cap_rate)) {this.actual_rate += (this.actual_float_spread||0);}

                        else if (isNaN(this.actual_floor_rate)&&((typeof this.actuial_cap_rate)=="number")) {
                                this.actual_rate = Math.max(this.actual_rate,this.actual_cap_rate - (this.actual_float_spread||0))+(this.actual_float_spread||0);
                                                        }
                        else if (isNaN(this.actual_cap_rate)&&((typeof this.actual_floor_rate)=="number")) {
                                this.actual_rate = Math.min(this.actual_rate,this.actual_floor_rate - (this.actual_float_spread||0))+(this.actual_float_spread||0);
                                                        }

                        else {
                                    this.actual_rate = Math.min(Math.max(this.actual_rate,this.actual_floor_rate- (this.actual_float_spread||0)),this.actual_cap_rate - (this.actual_float_spread||0) )+(this.actual_spread_spread||0);
                                 }


                        } // end line if floater condition    
                           
                
                }// end of the for j loop
                       
            
                // finally output to the cashflow object
            
           
                pmt_total[schlength-1]+=this.actual_notional; 
                pmt_principal[schlength-1]+=this.actual_notional;
                
                
                return {
                        date_accrual_start: this.merged_schedule.date_accrual_start,
                        date_accrual_end: this.merged_schedule.date_accrual_end,
                        date_pmt: this.merged_schedule.date_pmt,
                        t_accrual_start: this.merged_schedule.t_accrual_start,
                        t_accrual_end: this.merged_schedule.t_accrual_end,
                        t_pmt: this.merged_schedule.t_pmt,
                        is_interest_date: this.merged_schedule.is_interest_date,
                        is_repay_date: this.merged_schedule.is_repay_date,
                        is_fixing_date: this.merged_schedule.is_fixing_date,
                        is_condition_date: this.merged_schedule.is_condition_date,
                    
                        current_principal: current_principal,
                        interest_current_period: interest_current_period,
                        accrued_interest: accrued_interest,
                        pmt_principal: pmt_principal,
                        pmt_interest: pmt_interest,
                        pmt_total: pmt_total
                };          
                
        };
        

    
        library.irregular_fixed_income.prototype.get_merged_schedule = function(){


                var ft_ratio = this.fixing_tenor / this.tenor;

                var schedul =[];
                    for(var p=0; p< this.schedule.length; p++) schedul.push([this.schedule[p],0]);  
                    for(var q=0; q< this.repay_schedule.length; q++) schedul.push([this.repay_schedule[q],1]); 
                    /* collects interest and notional schedules together*/

                if (this.conditions_valid_until != null){
                    if (this.conditions_valid_until.length >= 1){
                                for (var j=0;j<this.conditions_valid_until.length;j++) schedul.push([this.conditions_valid_until[j],0.5,j]);


                                }
                    } /* adds condition dates with array condition number, 0.5 is just chosen to be different from the other indices. maturity does not belong to the array */


                schedul.sort(function(a,b) {if (a[0] > b[0]) return 1; if (a[0] < b[0]) return -1; return 0;});/* sort by increasing date*/

               /* the following code merges interest and notional schedules into a unique series with index, and indexes condition dates with
                        a second index, whose value is the condition number, starting from 0 (first condition) */ 

                        for (var l = 0; l < schedul.length - 1; l++) {


                               while ((schedul[l+1]) && Math.abs(schedul[l][0]-schedul[l+1][0]) < 1000) {  
                                   /* equality of dates up to one second*/

                                       if (schedul[l].length == 2 && schedul[l+1].length == 2) 
                                            { 
                                              schedul[l] = [schedul[l][0],2];
                                              schedul.splice(l+1,1); 
                                             }
                                       else if( schedul[l+1].length == 3 ) 
                                            { 
                                              schedul[l] = [schedul[l][0],schedul[l][1],schedul[l+1][2]];
                                              schedul.splice(l+1,1);                  
                                            }
                                       else if( schedul[l].length == 3 ) 
                                            { 
                                              schedul[l] = [schedul[l+1][0],schedul[l+1][1],schedul[l][2]];
                                              schedul.splice(l+1,1); 
                                            }  // end line if */ 

                                   }  // end line while

                                }    // end line for        


                    /* the code of above eliminates double dates, joining into a single date with interest and notional index
                        interest date = 0, notional date = 1, interest AND notional date = 2
                         takes condition dates into account with a second index */


                if (null===library.valuation_date) throw new Error("fix_cash_flows: valuation_date must be set");

                var length = schedul.length-1;
                var default_yf = library.year_fraction_factory(null);


                var date_accrual_start=new Array(length);
                var date_accrual_end=new Array(length);
                var date_pmt=new Array(length);        
                var t_accrual_start=new Array(length);
                var t_accrual_end=new Array(length);
                var t_pmt=new Array(length);       
                var is_interest_date=new Array(length);
                var is_repay_date=new Array(length);
                var is_fixing_date=new Array(length);
                var is_condition_date=new Array(length);
            
                /*if (this.is_float == true)*/ 
                var index_next_fixing=0; /* I would like to introduce this variable only if the deal is a floater.
                However, if I switch on the "if floater" condition here commented out, although the code works fine,
                jshint complains that, in the rest of the code here below, this variable is used out of scope. 
                Just because, once again, it is called only 
                within a if-floater condition. Therefore, I leave it here commented out, but I am not sure whether jshint is a so smart
                implemented tool...*/
            
            
                for (i=0;i<length;i++){
                    date_accrual_start[i]=schedul[i][0];
                    date_accrual_end[i]=schedul[i+1][0];

                    date_pmt[i] = ((schedul[i+1][1] <= 0) || (schedul[i+1][1] == 1) || (schedul[i+1][1] >= 2)) ?            
                    this.adj(schedul[i+1][0]): null;

                    t_accrual_start[i]=default_yf(library.valuation_date,schedul[i][0]);        
                    t_accrual_end[i]=default_yf(library.valuation_date,schedul[i+1][0]);
                    t_pmt[i]=(date_pmt[i] != null) ? default_yf(library.valuation_date,date_pmt[i]) :null;
                    is_interest_date[i]= ((schedul[i+1][1] <= 0) || (schedul[i+1][1] >= 2)) ? true: false;
                    is_repay_date[i]= ((schedul[i+1][1] == 1) || (schedul[i+1][1] >= 2)) ? true: false;
                    is_fixing_date[i]= false; 
                    is_condition_date[i]= (schedul[i+1].length == 3) ? true: false;       


                    /* here below floater fixing dates are implemented */

                    if (this.is_float == true) {

                        /*determine first interest date after next fixing*/


                        if (is_interest_date[i]==true) { 
                            if ((date_accrual_end[i] - this.fixing_schedule[index_next_fixing])> -1000) {                 
                                                          is_fixing_date[i]=true;
                                                          index_next_fixing ++; console.log("index next fixing= " + index_next_fixing);} 
                                                        }


                    }// end line of floater conditions 

                }//end line of for loop over i, determining entries of the merged schedule
            
                        
                /*maturity is always both interest and repay date by convention, this condition is already taken into account 
                when generating interest and repay backward schedule*/
                
            
                return {
                    date_accrual_start: date_accrual_start,
                    date_accrual_end: date_accrual_end,
                    date_pmt: date_pmt,
                    t_accrual_start: t_accrual_start,
                    t_accrual_end: t_accrual_end,
                    t_pmt: t_pmt,
                    is_interest_date: is_interest_date,
                    is_repay_date: is_repay_date,
                    is_fixing_date: is_fixing_date,
                    is_condition_date: is_condition_date
                };



        }; 
    
        library.irregular_fixed_income.prototype.adj = function(d){
            
                return library.adjust(d,this.bdc,this.is_holiday_func);
            
        };
    
    
        library.irregular_fixed_income.prototype.get_fwd_rate_series = function(fwd_curve){

                var default_yf=library.year_fraction_factory(null);
                var rate_series=[];
                for(var i =0; i < this.fixing_schedule.length-1; i++  ) {
                                     // the following works if valuation_date < fixing_first_date

                    if ((this.fixing_schedule[i]-library.valuation_date) > 1000) {
                        rate_series.push(library.get_fwd_rate(fwd_curve, default_yf(library.valuation_date,this.fixing_schedule[i]),
                                                        default_yf(library.valuation_date,this.fixing_schedule[i+1]))) ;
                                                        }
                                              } 
                return rate_series;
        }; 
      
    
        library.irregular_fixed_income.prototype.cf_step = function(x){
                 
                var Nnew;
                var Int;
                var Int_step;
                var NPayment;
                var IPayment;
                var effPayment=0; // effective annuity payment (can differ from the established payment, e.g. if notional <= 0)   

                Int_step = this.actual_notional * this.year_fraction_func(this.merged_schedule.date_accrual_start[x],this.merged_schedule.date_accrual_end[x])*this.actual_rate;
                Int = this.actual_int_accrual + Int_step;  //this part of the computation is common to all cases


                switch(this.actual_amortization){

                    case "bullet":  // no interest capitalization

                        Nnew = this.actual_notional;
                        IPayment = this.merged_schedule.is_interest_date[x]==true ? (Int + this.actual_int_accrual) : 0;                             
                        this.actual_int_accrual = (this.merged_schedule.is_condition_date==true && this.merged_schedule.is_interest_date==false) ? Int : 0; 
                        /* at the first interest payment date, accrued interest is set to zero for all the next computations;
                        at condition change date which is not interest date interest is cumulated. is_repay_date boolean is here irrelevant */
                        NPayment = 0 ;

                    break;

                    case "capitalization": // bullet with interest capitalization

                        Nnew = (this.merged_schedule.is_condition_date[x]== true && this.merged_schedule.is_interest_date[x]==false) ? this.actual_notional: Math.max(this.actual_notional + Int, 0);
                        /* if date is condition change date but not interest date the notional remains unvaried, otherwise
                        interest is capitalized */              
                        this.actual_int_accrual =  (this.merged_schedule.is_interest_date[x] == false) ? Int : 0;
                        /* if date is not interest (capitalization) date, interest is accrued, for instance at a condition change date,
                        otherwise it is capitalized and not accrued.is_repay_date boolean is here irrelevant */

                        IPayment = 0;
                        NPayment = 0;

                    break;

                    case "stepdown": // interest is not capitalized

                        Nnew = this.merged_schedule.is_repay_date[x]==true ? Math.max(this.actual_notional - this.actual_payment, 0) : this.actual_notional; 
                        NPayment = this.merged_schedule.is_repay_date[x] == true ? Math.min(this.actual_payment,this.actual_notional) : 0; 
                        IPayment = this.merged_schedule.is_interest_date[x] == true ? Int : 0;
                        this.actual_int_accrual = this.merged_schedule.is_interest_date[x] == false ? Int : 0; 
                        /*if interest is not paid, it is cumulated */

                    break;

                    case "annuity": // interest is capitalized

                        if (this.merged_schedule.is_repay_date[x]==true && this.merged_schedule.is_interest_date[x]==false) {
                            Nnew = Math.max(this.actual_notional - this.actual_payment, 0);
                            } /* only notional payment date */
                        else if (this.merged_schedule.is_repay_date[x]==true && this.merged_schedule.is_interest_date[x]==true) {
                            Nnew = Math.max(this.actual_notional + Int - this.actual_payment, 0);
                            } /* notional payment and interest capitalization date */
                        else if (this.merged_schedule.is_repay_date[x]==false && this.merged_schedule.is_interest_date[x]==true) {
                            Nnew = Math.max(this.actual_notional + Int,0);
                            } /* only interest capitalization date */
                        else {Nnew = this.actual_notional;} /* if it is neither principal nor interest date, but just condition change date */
                        effPayment = this.merged_schedule.is_repay_date[x]==true  ? Math.min(this.actual_payment, this.actual_notional + Int) : 0;
                        this.actual_int_accrual = this.merged_schedule.is_interest_date[x]==false ? Int : 0; 
                        /* if date is not interest capitalization date, 
                        interest is cumulated. This occurs when date is only principal payment date, or only condition change date */
                        NPayment = effPayment;
                        IPayment = 0;  

                    break;

                    default: throw new Error("invalid amortization type parameter."); /* javascript "switch case" requires setting a default case. It could be chosen to be "bullet", but since I prefer to put bullet on the same footing as the other cases, I just set default to be an error message */

                    }  // end line of switch amort_type cases         

                this.actual_notional = Nnew; 

                return {                
                         current_principal:  (this.type == "deposit") ? -this.actual_notional: this.actual_notional,  /* notional used to compute the interest*/ 
                         interest_current_period: (this.type == "deposit") ? -Int_step: Int_step, /* the interest pruduced from start to end date of the period */
                         accrued_interest: (this.type == "deposit") ? -this.actual_int_accrual: this.actual_int_accrual, /* the cumulated interest */
                         pmt_principal: (this.type == "deposit") ? -NPayment: NPayment,
                         pmt_interest: (this.type == "deposit") ? -IPayment: IPayment
                        };

        };
    
        library.irregular_fixed_income.prototype.present_value=function(disc_curve, spread_curve, fwd_curve){
                return library.dcf(this.get_cash_flows(fwd_curve || null),
                                   disc_curve,
                                   spread_curve,
                                   this.residual_spread,
                                   this.settlement_date);
        };

        library.pricer_loan=function(loan, disc_curve, spread_curve, fwd_curve){
                var loan_internal=new library.irregular_fixed_income(loan);
                return loan_internal.present_value(disc_curve, spread_curve, fwd_curve);
        };
       

}(this.JsonRisk || module.exports));
