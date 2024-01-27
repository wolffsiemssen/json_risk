(function(library) {


    /**
     * @name library
     * @namespace functions
     */

    /**
     * creates an internal callable bond object (including swaption and baskets) from input data
     * @param {object} instrument a callable bond
     * @memberof library
     * @public
     */

    library.callable_fixed_income = function(instrument) {
        /*
         
         callable fixed income consists of
           -- an internal simple_fixed_income base instrument
           -- a call schedule
           -- a calibration basket of internal swaptions
           

         */

        //only fixed rate instruments 
        if (!library.get_safe_number_vector(instrument.fixed_rate)) throw new Error("callable_fixed_income: must provide valid fixed_rate.");

        var fcd = library.get_safe_date(instrument.first_exercise_date);
        if (null === fcd) throw new Error("callable_fixed_income: must provide first call date");

        this.mean_reversion=library.get_safe_number(instrument.mean_reversion); // null allowed
        this.hull_white_volatility=library.get_safe_number(instrument.hull_white_volatility); // null allowed

        if (null === this.mean_reversion) this.mean_reversion=0.0;
        this.base = new library.fixed_income(instrument);
        if (fcd.getTime() <= this.base.schedule[0].getTime()) throw new Error("callable_fixed_income: first call date before issue date");
        if (!this.base.notional_exchange) throw new Error("callable_fixed_income: callable instruments must exchange notionals");
        var call_tenor = library.get_safe_natural(instrument.call_tenor);
        this.call_schedule = library.schedule(fcd,
            library.get_safe_date(instrument.maturity),
            call_tenor || 0, //european call by default
            this.base.adj,
            null,
            null,
            true,
            false);
        this.call_schedule.pop(); //pop removes maturity from call schedule as maturity is not really a call date

        var i;
        for(i=0;i<this.call_schedule.length;i++){ // adjust exercise dates according to business day rule
            this.call_schedule[i]=this.base.adj(this.call_schedule[i]);
        }
        this.opportunity_spread = library.get_safe_number(instrument.opportunity_spread) || 0.0;
        this.exclude_base = library.get_safe_bool(instrument.exclude_base);
        this.simple_calibration = library.get_safe_bool(instrument.simple_calibration);

        //truncate call dates as soon as principal has been redeemed
        var cf_obj = this.base.get_cash_flows();
        i = cf_obj.current_principal.length - 1;
        while (cf_obj.current_principal[i] === 0) i--;
        while (this.call_schedule[this.call_schedule.length - 1] >= cf_obj.date_pmt[i]) this.call_schedule.pop();

        //basket generation
        this.basket = new Array(this.call_schedule.length);
        var temp;
        for (i = 0; i < this.call_schedule.length; i++) {
            if ((!this.base.is_amortizing && this.base.fixed_rate.length === 1) || this.simple_calibration) {
                //basket instruments are co-terminal swaptions with standard conditions
                this.basket[i] = new library.swaption({
                    is_payer: false,
                    maturity: instrument.maturity,
                    first_exercise_date: this.call_schedule[i],
                    notional: instrument.notional,
                    fixed_rate: this.base.fixed_rate[0] - this.opportunity_spread - this.base.excl_margin,
                    tenor: 12,
                    float_spread: 0.00,
                    float_tenor: instrument.float_tenor || 6,
                    float_current_rate: 0.00,
                    calendar: instrument.calendar,
                    bdc: instrument.bdc,
                    float_bdc: instrument.bdc,
                    dcc: instrument.dcc,
                    float_dcc: instrument.dcc
                });
            } else {
                //basket instruments are equivalent regular swaptions with standard conditions
                temp = library.create_equivalent_regular_swaption(
                    this.base.get_cash_flows(),
                    this.call_schedule[i], {
                        tenor: 12,
                        float_spread: 0.00,
                        float_tenor: instrument.float_tenor || 6,
                        calendar: instrument.calendar,
                        bdc: instrument.bdc
                    }
                );
                temp.fixed_rate -= this.opportunity_spread;
                this.basket[i] = new library.swaption(temp);
            }
        }
    };


    /**
     * calculates the present value for internal callable bond (object)
     * @param {object} disc_curve discount curve
     * @param {object} spread_curve spread curve
     * @param {object} fwd_curve forward curve
     * @param {object} surface surface
     * @returns {number} present value
     * @memberof library
     * @public
     */
    library.callable_fixed_income.prototype.present_value = function(disc_curve, spread_curve, fwd_curve, surface) {
        var res = 0;
        var i;
        //eliminate past call dates and derive time to exercise
        library.require_vd(); //valuation date must be set
        var t_exercise = [],
            tte;
        for (i = 0; i < this.call_schedule.length; i++) {
            tte = library.time_from_now(this.call_schedule[i]);
            if (tte > 1/512) t_exercise.push(tte); //non-expired call date
        }

        if (typeof disc_curve !== 'object' || disc_curve === null) throw new Error("callable_fixed_income.present_value: must provide discount curve");
        if (typeof fwd_curve !== 'object' || fwd_curve === null) throw new Error("callable_fixed_income.present_value: must provide forward curve for calibration");
        library.get_safe_curve(disc_curve);
        library.get_safe_curve(fwd_curve);
        if (spread_curve) library.get_safe_curve(spread_curve);

        // set lgm mean reversion
        library.lgm_set_mean_reversion(this.mean_reversion);

        //calibrate lgm model - returns xi for non-expired swaptions only
        if (typeof surface !== 'object' || surface === null) throw new Error("callable_fixed_income.present_value: must provide valid surface");
        
                
        var xi_vec;
        if(null == this.hull_white_volatility){
            xi_vec = library.lgm_calibrate(this.basket, disc_curve, fwd_curve, surface);
        }else{
            xi_vec = library.get_xi_from_hull_white_volatility(t_exercise, this.hull_white_volatility);
        }

        //derive call option price
        if (1 === xi_vec.length) {
            //european call, use closed formula
            res = -library.lgm_european_call_on_cf(this.base.get_cash_flows(),
                t_exercise[0],
                disc_curve,
                xi_vec[0],
                spread_curve,
                this.base.residual_spread,
                this.opportunity_spread);
        } else if (1 < xi_vec.length) {
            //bermudan call, use numeric integration
            res = -library.lgm_bermudan_call_on_cf(this.base.get_cash_flows(),
                t_exercise,
                disc_curve,
                xi_vec,
                spread_curve,
                this.base.residual_spread,
                this.opportunity_spread);
        } //if xi_vec.length===0 all calls are expired, no value subtracted

        //add bond base price if not explicitly excluded
        if (!this.exclude_base) res += this.base.present_value(disc_curve, spread_curve, null);
        return res;
    };

    /**
     * calculates the present value for callable bonds
     * @param {object} bond instrument of type bond
     * @param {object} disc_curve discount curve
     * @param {object} spread_curve spread curve
     * @param {object} fwd_curve forward curve
     * @param {object} surface surface
     * @returns {number} present value
     * @memberof library
     * @public
     */
    library.pricer_callable_bond = function(bond, disc_curve, spread_curve, fwd_curve, surface) {
        var cb_internal = new library.callable_fixed_income(bond);
        return cb_internal.present_value(disc_curve, spread_curve, fwd_curve, surface);
    };


}(this.JsonRisk || module.exports));
