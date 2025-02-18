(function (library) {
  /*
        
                JsonRisk vector pricing
                
                
        */

  var stored_params = null; //hidden variable for parameter storage

  /**
   * ...
   * @param {object} obj
   * @returns {number} scalar
   * @memberof library
   * @private
   */
  var normalise_scalar = function (obj, name) {
    //makes value an array of length one if it is not an array
    var val = Array.isArray(obj.value) ? obj.value : [obj.value];
    return { value: val, tags: obj.tags || null, name: name || null };
  };

  /**
   * ...
   * @param {object} obj
   * @returns {object} curve
   * @memberof library
   * @private
   */
  var normalise_curve = function (obj, name) {
    // constructs times from days, dates or labels and makes dfs and zcs an array of length one if it is not an array
    var times = library.get_curve_times(obj),
      dfs = obj.dfs ? (Array.isArray(obj.dfs[0]) ? obj.dfs : [obj.dfs]) : null,
      zcs = obj.zcs ? (Array.isArray(obj.zcs[0]) ? obj.zcs : [obj.zcs]) : null;

    if (!dfs) {
      dfs = new Array(zcs.length);
      for (var i = 0; i < zcs.length; i++) {
        dfs[i] = new Array(zcs[i].length);
        for (var j = 0; j < zcs[i].length; j++) {
          dfs[i][j] = Math.pow(1 + zcs[i][j], -times[j]);
        }
      }
    }

    return {
      name: name || null,
      tags: obj.tags || null,
      intp: obj.intp || null,
      times: times,
      dfs: dfs,
    };
  };

  /**
   * ...
   * @param {object} obj
   * @returns {object} surface
   * @memberof library
   * @private
   */
  var normalise_surface = function (obj, name) {
    // constructs terms from labels_term, expiries from labels_expiry and makes value an array of length one if it is not an array
    return Object.assign({}, obj, {
      name: name || null,
      values: Array.isArray(obj.values[0][0]) ? obj.values : [obj.values],
    });
  };

  /**
   * ...
   * @param {object} len length
   * @returns {number} ...
   * @memberof library
   * @private
   */
  var update_vector_length = function (len) {
    if (1 === len) return;
    if (1 === stored_params.vector_length) {
      stored_params.vector_length = len;
      return;
    }
    if (len !== stored_params.vector_length)
      throw new Error(
        "vector_pricing: provided parameters need to have the same length or length one",
      );
  };

  /**
   * attaches the first matching rule in the n-th scenario from the stored scenario groups to the object
   * @param {number} n number indicating which scenario to attach, zero means no scenario
   * @param {object} obj scalar, curve, or surface object
   * @returns {number} ...
   * @memberof library
   * @private
   */
  var attach_scenario = function (n, obj) {
    var risk_factor = obj.name || null;
    var tags = obj.tags || [];

    // unset scenario rule
    delete obj._rule;

    // return if n is zero
    if (n === 0) return false;

    // return if there are no scenario groups
    var sg = stored_params.scenario_groups;
    if (0 === sg.length) return false;

    // find n-th scenario
    var i = 1,
      i_group = 0,
      i_scen = 0;
    while (i < n) {
      i++;
      if (i_scen < sg[i_group].length - 1) {
        // next scenario
        i_scen++;
      } else if (i_group < sg.length - 1) {
        // next scenario group
        i_scen = 0;
        i_group++;
      } else {
        // there are less than n scenarios, just return
        return false;
      }
    }

    // attach scenario if one of the rules match
    var rules = sg[i_group][i_scen].rules;
    var rule;
    for (var i_rule = 0; i_rule < rules.length; i_rule++) {
      rule = rules[i_rule];
      if (Array.isArray(rule.risk_factors)) {
        // match by risk factors
        if (rule.risk_factors.indexOf(risk_factor) > -1) {
          obj._rule = rule;
          return true;
        }
      }
      if (Array.isArray(rule.tags)) {
        // if no exact match by risk factors, all tags of that rule must match
        var found = true;
        for (i = 0; i < rule.tags.length; i++) {
          if (tags.indexOf(rule.tags[i]) === -1) found = false;
        }
        // if tag list is empty, no matching by tags at all
        if (rule.tags.length === 0) found = false;
        if (found) {
          obj._rule = rule;
          return true;
        }
      }
    }
    return false;
  };

  /**
   * ...
   * @param {object} params parameter
   * @memberof library
   * @public
   */
  function name_to_moneyness(str) {
    var s = str.toLowerCase();
    if (s.endsWith("atm")) return 0; //ATM surface
    var n = s.match(/([+-][0-9]+)bp$/); //find number in name, convention is NAME+100BP, NAME-50BP
    if (n.length < 2) return null;
    return n[1] / 10000;
  }

  /**
   * ...
   * @param {object} params parameter
   * @memberof library
   * @public
   */
  function find_smile(name, list) {
    var res = [],
      moneyness;
    for (var i = 0; i < list.length; i++) {
      if (!list[i].startsWith(name)) continue; //not a smile section of surface name
      if (list[i].length === name.length) continue; //this is the surface itself
      moneyness = name_to_moneyness(list[i]);
      if (null === moneyness) continue;
      res.push({ name: list[i], moneyness: moneyness });
    }
    res.sort(function (a, b) {
      return a.moneyness - b.moneyness;
    });
    return res;
  }

  library.store_params = function (params) {
    stored_params = {
      vector_length: 1,
      scalars: {},
      curves: {},
      surfaces: {},
      scenario_groups: [],
    };

    var keys, i;
    //valuation date
    stored_params.valuation_date = library.get_safe_date(params.valuation_date);
    //scalars
    if (typeof params.scalars === "object") {
      keys = Object.keys(params.scalars);
      for (i = 0; i < keys.length; i++) {
        stored_params.scalars[keys[i]] = normalise_scalar(
          params.scalars[keys[i]],
          keys[i],
        );
        update_vector_length(stored_params.scalars[keys[i]].value.length);
      }
    }
    //curves
    if (typeof params.curves === "object") {
      keys = Object.keys(params.curves);
      var obj, len;
      for (i = 0; i < keys.length; i++) {
        obj = normalise_curve(params.curves[keys[i]], keys[i]);
        stored_params.curves[keys[i]] = obj;
        len = obj.dfs ? obj.dfs.length : obj.zcs.length;
        update_vector_length(len);
      }
    }

    //surfaces
    var smile, j;
    if (typeof params.surfaces === "object") {
      keys = Object.keys(params.surfaces);
      for (i = 0; i < keys.length; i++) {
        stored_params.surfaces[keys[i]] = normalise_surface(
          params.surfaces[keys[i]],
          keys[i],
        );
        update_vector_length(stored_params.surfaces[keys[i]].values.length);
      }
      //link smile surfaces to their atm surface
      for (i = 0; i < keys.length; i++) {
        smile = find_smile(keys[i], keys);
        if (smile.length > 0) {
          stored_params.surfaces[keys[i]].smile = [];
          stored_params.surfaces[keys[i]].moneyness = [];
          for (j = 0; j < smile.length; j++) {
            stored_params.surfaces[keys[i]].smile.push(
              stored_params.surfaces[smile[j].name],
            );
            stored_params.surfaces[keys[i]].moneyness.push(smile[j].moneyness);
          }
        }
      }
    }

    //calendars
    var cal;
    if (typeof params.calendars === "object") {
      keys = Object.keys(params.calendars);
      for (i = 0; i < keys.length; i++) {
        cal = params.calendars[keys[i]];
        library.add_calendar(keys[i], cal.dates);
      }
    }

    //scenario groups
    if (Array.isArray(params.scenario_groups)) {
      stored_params.scenario_groups = params.scenario_groups;
      var l = 0;
      for (i = 0; i < params.scenario_groups.length; i++) {
        if (!Array.isArray(params.scenario_groups[i]))
          throw new Error(
            "vector_pricing: invalid parameters, scenario groups must be arrays.",
          );
        l += params.scenario_groups[i].length;
      }
      // scenarios do not include base scenario, so length is sum of array lenghts plus one
      update_vector_length(l + 1);
    }
  };

  /**
   * ...
   * @returns {object} parameter
   * @memberof library
   * @public
   */
  library.get_params = function () {
    return stored_params;
  };

  /**
   * ...
   * @param {object} params parameter
   * @returns {object} ...
   * @memberof library
   * @public
   */
  library.set_params = function (params) {
    if (typeof params !== "object")
      throw new Error(
        "vector_pricing: try to hard set invalid parameters. Use store_params to normalize and store params.",
      );
    if (typeof params.vector_length !== "number")
      throw new Error(
        "vector_pricing: try to hard set invalid parameters. Use store_params to normalize and store params.",
      );
    stored_params = params;
  };

  /**
   * ...
   * @param {object} vec_scalar
   * @param {object} i
   * @returns {object} scalar
   * @memberof library
   * @private
   */
  var get_scalar_scalar = function (vec_scalar, i) {
    if (!vec_scalar) return null;
    return {
      name: vec_scalar.name || null,
      tags: vec_scalar.tags || null,
      value: vec_scalar.value[vec_scalar.value.length > 1 ? i : 0],
    };
  };

  /**
   * ...
   * @param {object} vec_curve
   * @param {object} i
   * @returns {object} curve
   * @memberof library
   * @private
   */
  var get_scalar_curve = function (vec_curve, i) {
    if (!vec_curve) return null;
    var times = vec_curve.times;
    var dfs = vec_curve.dfs
      ? vec_curve.dfs[vec_curve.dfs.length > 1 ? i : 0]
      : null;

    return {
      name: vec_curve.name || null,
      tags: vec_curve.tags || null,
      intp: vec_curve.intp || null,
      times: times,
      dfs: dfs,
    };
  };

  /**
   * ...
   * @param {object} vec_surface
   * @param {object} i
   * @returns {object} surface
   * @memberof library
   * @private
   */
  var get_scalar_surface = function (vec_surface, i, nosmile) {
    if (!vec_surface) return null;
    var values = vec_surface.values[vec_surface.values.length > 1 ? i : 0];
    var smile = null,
      moneyness = null,
      j;
    if (
      nosmile !== true &&
      Array.isArray(vec_surface.smile) &&
      Array.isArray(vec_surface.moneyness)
    ) {
      moneyness = vec_surface.moneyness;
      smile = [];
      for (j = 0; j < vec_surface.smile.length; j++) {
        smile.push(get_scalar_surface(vec_surface.smile[j], i, true));
      }
    }
    return Object.assign({}, vec_surface, {
      values: values,
      moneyness: moneyness,
      smile: smile,
    });
  };

  /**
   * read instrument type for given instrument and create internal instrument
   * @param {object} instrument any instrument
   * @returns {object} internal instrument
   * @memberof library
   * @public
   */
  library.get_internal_object = function (instrument) {
    switch (instrument.type.toLowerCase()) {
      case "bond":
      case "floater":
        return new library.fixed_income(instrument);
      case "swap":
        return new library.swap(instrument);
      case "swaption":
        return new library.swaption(instrument);
      case "fxterm":
        return new library.fxterm(instrument);
      case "callable_bond":
        return new library.callable_fixed_income(instrument);
      case "equity":
        return new library.equity(instrument);
      default:
        throw new Error("get_internal_object: invalid instrument type");
    }
  };

  /**
   * calculates the present value for any given supported instrument (bond, floater, fxterm, swap, swaption, callable_bond)
   * @param {object} instrument any instrument
   * @returns {number} present value
   * @memberof library
   * @public
   */
  library.vector_pricer = function (instrument) {
    var simulation_once = function () {
      this.results.present_value = new Array(this.num_scenarios);
    };

    var simulation_scenario = function () {
      var i = this.idx_scen;
      var dc = this.dc;
      var sc = this.sc;
      var fc = this.fc;
      var su = this.su;
      var qu = this.qu;
      switch (this.instrument.type.toLowerCase()) {
        case "bond":
        case "floater":
        case "fxterm":
        case "irregular_bond":
          this.results.present_value[i] = this.object.present_value(dc, sc, fc);
          break;
        case "swap":
        case "swaption":
          this.results.present_value[i] = this.object.present_value(dc, fc, su);
          break;
        case "callable_bond":
          this.results.present_value[i] = this.object.present_value(
            dc,
            sc,
            fc,
            su,
          );
          break;
        case "equity":
          this.results.present_value[i] = this.object.present_value(qu);
          break;
      }
      // if currency is provided and not EUR, convert or throw error
      if (!this.instrument.currency) return;
      if (this.instrument.currency === "EUR") return;
      this.results.present_value[i] /= library
        .get_safe_scalar(this.fx)
        .get_value();
    };

    var module = {
      simulation_once: simulation_once,
      simulation_scenario: simulation_scenario,
    };

    return library.simulation(instrument, [module]).present_value;
  };

  /**
   * runs a generic simulation on an instrument
   * @param {object} instrument any instrument
   * @param {array} modules an array of modules, i.e. objects that define either the simulation_once or simulation_scenario function, or both
   * @returns {object} results object
   * @memberof library
   * @public
   */
  library.simulation = function (instrument, modules) {
    if (typeof instrument.type !== "string")
      throw new Error(
        "vector_pricer: instrument object must contain valid type",
      );
    library.valuation_date = stored_params.valuation_date;

    // create context for module execution
    var context = {
      instrument: instrument,
      object: library.get_internal_object(instrument),
      params: stored_params,
      num_scen: stored_params.vector_length,
      idx_scen: 0,
      dc: null,
      sc: null,
      fc: null,
      su: null,
      qu: null,
      fx: null,
      results: {},
    };

    var vec_dc = stored_params.curves[instrument.disc_curve || ""] || null;
    var vec_sc = stored_params.curves[instrument.spread_curve || ""] || null;
    var vec_fc = stored_params.curves[instrument.fwd_curve || ""] || null;
    var vec_surface = stored_params.surfaces[instrument.surface || ""] || null;
    var vec_qu = stored_params.scalars[instrument.quote || ""] || {
      value: [1],
    };
    var vec_fx = stored_params.scalars[instrument.currency || ""] || {
      value: [1],
    };
    var j;
    for (var i = 0; i < stored_params.vector_length; i++) {
      // update context with curves
      context.dc = get_scalar_curve(vec_dc, i);
      context.sc = get_scalar_curve(vec_sc, i);
      context.fc = get_scalar_curve(vec_fc, i);
      context.su = get_scalar_surface(vec_surface, i);
      context.qu = get_scalar_scalar(vec_qu, i);
      context.fx = get_scalar_scalar(vec_fx, i);
      context.idx_scen = i;

      // attach scenarios to curves
      if (context.dc) attach_scenario(i, context.dc);
      if (context.sc) attach_scenario(i, context.sc);
      if (context.fc) attach_scenario(i, context.fc);
      if (context.su) attach_scenario(i, context.su);
      if (context.qu) attach_scenario(i, context.qu);
      if (context.fx) attach_scenario(i, context.fx);

      // call simulation_once for all modules for i=0
      for (j = 0; j < modules.length; j++) {
        if (0 === i && "function" === typeof modules[j].simulation_once)
          modules[j].simulation_once.call(context);
      }

      // call simulation_scenario for all modules for i=0
      for (j = 0; j < modules.length; j++) {
        if ("function" === typeof modules[j].simulation_scenario)
          modules[j].simulation_scenario.call(context);
      }
    }
    return context.results;
  };
})(this.JsonRisk || module.exports);
