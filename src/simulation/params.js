(function (library) {
  const name_to_moneyness = function (str) {
    var s = str.toLowerCase();
    if (s.endsWith("atm")) return 0; //ATM surface
    var n = s.match(/([+-][0-9]+)bp$/); //find number in name, convention is NAME+100BP, NAME-50BP
    if (n.length < 2) return null;
    return n[1] / 10000;
  };

  const find_smile = function (name, list) {
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
  };

  class Params {
    #valuation_date = null;
    #main_currency = "EUR";
    #scalars = {};
    #curves = {};
    #surfaces = {};
    #scenario_groups = [];
    #num_scenarios = 1; // without any scenarios, num_scenarios is one since a base scenario is implicitly included

    constructor(obj) {
      // valuation date
      if (!("valuation_date" in obj))
        throw new Error("Params: must contain a valuation_date property");
      this.#valuation_date = library.date_or_null(obj.valuation_date);

      // main currency
      if (typeof obj.main_currrency === "string") {
        if (obj.main_currency.length != 3)
          throw new Error(
            "Params: main_currency must be a three-letter currency code.",
          );
        this.#main_currency = obj.main_currency;
      }

      // scalars
      if ("scalars" in obj) {
        for (const [key, value] of Object.entries(obj.scalars)) {
          // make shallow copy for adding name
          const temp = Object.assign({}, value);
          temp.name = key;
          this.#scalars[key] = new library.Scalar(temp);
        }
      }

      // curves
      if ("curves" in obj) {
        for (const [key, value] of Object.entries(obj.curves)) {
          // make shallow copy for adding name
          const temp = Object.assign({}, value);
          temp.name = key;
          this.#curves[key] = new library.Curve(temp);
        }
      }

      // surfaces
      if ("surfaces" in obj) {
        //link smile surfaces to their atm surface
        const keys = Object.keys(obj.surfaces);
        for (const key of keys) {
          // make shallow copy of surface for adding name and smile
          const temp = Object.assign({}, obj.surfaces[key]);
          temp.name = key;
          const smile = find_smile(key, keys);
          if (smile.length > 0) {
            temp.smile = [];
            temp.moneyness = [];
            for (const s of smile) {
              const { name, moneyness } = s;
              temp.smile.push(obj.surfaces[name]);
              temp.moneyness.push(moneyness);
            }
          }
          this.#surfaces[key] = library.make_surface(temp);
        }
      }

      // scenario groups
      if ("scenario_groups" in obj) {
        if (!Array.isArray(obj.scenario_groups))
          throw new Error("Params: scenario_groups must be an array");
        this.#scenario_groups = obj.scenario_groups;
        for (const group of this.#scenario_groups) {
          if (!Array.isArray(group))
            throw new Error(
              "Params: each group in scenario_groups must be an array.",
            );
          this.#num_scenarios += group.length;
        }
      }

      // calendars are actually stored within the library and not in this object
      if ("calendars" in obj) {
        if (typeof obj.calendars !== "object")
          throw new Error("Params: Calendars object is invalid");
        for (const [calname, cal] of Object.entries(obj.calendars)) {
          library.add_calendar(calname, cal.dates);
        }
      }
    }

    get valuation_date() {
      return this.#valuation_date;
    }

    get main_currency() {
      return this.#main_currency;
    }

    get num_scenarios() {
      return this.#num_scenarios;
    }

    get_scalar(name) {
      const n = library.nonempty_string_or_throw(
        name,
        "get_scalar: name must be nonempty string",
      );
      if (!(n in this.#scalars)) throw new Error(`Params: no such scalar ${n}`);
      return this.#scalars[n];
    }

    get_curve(name) {
      const n = library.nonempty_string_or_throw(
        name,
        "get_curve: name must be nonempty string",
      );
      if (!(n in this.#curves)) throw new Error(`Params: no such curve ${n}`);
      return this.#curves[n];
    }

    get_surface(name) {
      const n = library.nonempty_string_or_throw(
        name,
        "get_curve: name must be nonempty string",
      );
      if (!(n in this.#surfaces))
        throw new Error(`Params: no such surface ${n}`);
      return this.#surfaces[n];
    }

    #value_in_main_currency(cur) {
      let mcur = this.#main_currency;
      if (cur == mcur) return 1.0;
      if (cur in this.#scalars) return 1.0 / this.#scalars[cur].get_value();
      const delimiters = ["", "/", "_", "-"];
      for (const d of delimiters) {
        const name = cur + d + mcur;
        if (name in this.#scalars) return this.#scalars[name].get_value();
        const inverse = mcur + d + cur;
        if (inverse in this.#scalars)
          return 1.0 / this.#scalars[inverse].get_value();
      }
      throw new Error(
        `Params: no scalar found that converts ${cur} to ${mcur}`,
      );
    }

    get_fx_rate(from, to) {
      if (from === to) return 1.0;
      return (
        this.#value_in_main_currency(from) / this.#value_in_main_currency(to)
      );
    }

    detach_scenarios() {
      for (const container of [this.#scalars, this.#curves, this.#surfaces]) {
        for (const item of Object.values(container)) {
          item.detach_rule();
        }
      }
    }

    get_scenario(n) {
      if (n === 0) return null;
      let i = 0;
      for (const group of this.#scenario_groups) {
        for (const scenario of group) {
          i++;
          if (n === i) return scenario;
        }
      }
      return null;
    }

    attach_scenario(n) {
      const scenario = this.get_scenario(n);
      if (!scenario) return this.detach_scenarios();
      const rules = scenario.rules;

      // attach scenario if one of the rules match
      const match = function (item, rule) {
        if (Array.isArray(rule.risk_factors)) {
          // match by risk factors
          if (rule.risk_factors.indexOf(item.name) > -1) {
            return true;
          }
        }
        if (Array.isArray(rule.tags)) {
          // if no exact match by risk factors, all tags of that rule must match
          var found = true;
          for (const tag of rule.tags) {
            if (!item.has_tag(tag)) found = false;
          }
          // if tag list is empty, no matching by tags at all
          if (rule.tags.length === 0) found = false;
          if (found) {
            return true;
          }
        }
        return false;
      };

      for (const container of [this.#scalars, this.#curves, this.#surfaces]) {
        for (const item of Object.values(container)) {
          for (const rule of rules) {
            if (match(item, rule)) {
              item.attach_rule(rule);
              break;
            }
          }
        }
      }
    }
  }

  library.Params = Params;
})(this.JsonRisk || module.exports);
