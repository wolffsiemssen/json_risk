(function (library) {
  /**
   * calculates the present value for any given supported instrument (bond, floater, fxterm, swap, swaption, callable_bond)
   * @param {object} instrument any instrument
   * @returns {number} present value
   * @memberof JsonRisk
   * @public
   */
  library.vector_pricer = function (instrument_json, params_json) {
    const simulation_once = function () {
      this.results.present_value = new Array(this.num_scenarios);
    };

    const simulation_scenario = function () {
      const i = this.idx_scen;
      this.results.present_value[i] = this.instrument.value(this.params);
    };

    const module = {
      simulation_once: simulation_once,
      simulation_scenario: simulation_scenario,
    };

    return library.simulation(instrument_json, params_json, [module])
      .present_value;
  };

  /**
   * runs a generic simulation on an instrument
   * @param {object} instrument any instrument
   * @param {array} modules an array of modules, i.e. objects that define either the simulation_once or simulation_scenario function, or both
   * @returns {object} results object
   * @memberof JsonRisk
   * @public
   */
  library.simulation = function (instrument_json, params_json, modules) {
    if (typeof instrument_json.type !== "string")
      throw new Error("simulation: instrument object must contain valid type");
    library.set_valuation_date(params_json.valuation_date);

    // create context for module execution
    const context = {
      instrument_json: instrument_json,
      instrument: library.make_instrument(instrument_json),
      params_json: params_json,
      params: null,
      idx_scen: 0,
      results: {},
    };

    // obtain dependencies on parameters
    const deps = new library.Deps();
    context.instrument.add_deps(deps);

    // obtain required set of params
    context.params = deps.minimal_params(params_json);
    context.num_scenarios = context.params.num_scenarios;

    for (let i = 0; i < context.num_scenarios; i++) {
      // update context for scenario
      context.idx_scen = i;

      // attach scenarios to params
      context.params.attach_scenario(i);

      // call simulation_once for all modules for i=0
      for (let j = 0; j < modules.length; j++) {
        if (0 === i && "function" === typeof modules[j].simulation_once)
          modules[j].simulation_once.call(context);
      }

      // call simulation_scenario for all modules for i=0
      for (let j = 0; j < modules.length; j++) {
        if ("function" === typeof modules[j].simulation_scenario)
          modules[j].simulation_scenario.call(context);
      }
    }
    return context.results;
  };
})(this.JsonRisk || module.exports);
