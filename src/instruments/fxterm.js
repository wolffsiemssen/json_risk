(function (library) {
  class FxTerm extends library.Instrument {
    constructor(obj) {
      super(obj);
      //the near payment of the swap
      this.near_leg = new library.FixedIncome({
        notional: obj.notional, // negative if first leg is pay leg
        maturity: obj.maturity,
        disc_curve: obj.disc_curve || "",
        fixed_rate: 0,
        tenor: 0,
      });

      //the far payment of the swap
      if (
        typeof obj.notional_2 === "number" &&
        library.get_safe_date(obj.maturity_2)
      ) {
        this.far_leg = new library.FixedIncome({
          notional: obj.notional_2, // negative if second leg is pay leg
          maturity: obj.maturity_2,
          disc_curve: obj.disc_curve || "",
          fixed_rate: 0,
          tenor: 0,
        });
      } else {
        this.far_leg = null;
      }
    }

    present_value(disc_curve) {
      var res = 0;
      res += this.near_leg.present_value(disc_curve, null, null);
      if (this.far_leg)
        res += this.far_leg.present_value(disc_curve, null, null);
      return res;
    }

    add_deps_impl(deps) {
      this.near_leg.add_deps(deps);
    }

    value_impl(params) {
      if ((!params) instanceof library.Params)
        throw new Error("evaluate: params must be of type Params");
      const disc_curve = params.get_curve(this.near_leg.disc_curve);
      return this.present_value(disc_curve);
    }
  }

  library.FxTerm = FxTerm;
})(this.JsonRisk || module.exports);
