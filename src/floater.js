        
(function(library){

        library.pricer_floater=function(floater, disc_curve, spread_curve, fwd_curve){
                var floater_internal=new library.fixed_income(floater);
                return floater_internal.present_value(disc_curve, spread_curve, fwd_curve);
        };
        

}(this.JsonRisk || module.exports));
