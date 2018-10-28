        
(function(library){

        library.pricer_bond=function(bond, disc_curve, spread_curve){
                var bond_internal=new library.fixed_income(bond);
                return bond_internal.present_value(disc_curve, spread_curve, null);
        };
        

}(this.JsonRisk || module.exports));
