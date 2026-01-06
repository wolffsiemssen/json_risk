(function (library) {
  class Simulatable {
    #name = "";
    #tags = new Set();
    constructor(obj) {
      // if non-object is given, throw error
      if ("object" !== typeof obj)
        throw new Error("Simulatable: must provide object");

      // name
      if ("name" in obj) {
        if (typeof obj.name === "string") this.#name = obj.name;
      }

      // tags
      if ("tags" in obj) {
        if (!Array.isArray(obj.tags))
          throw new Error("Simulatable: tags must be an array of strings");

        for (const tag of obj.tags) {
          if (typeof tag !== "string") continue;
          if (tag === "") continue;
          this.#tags.add(tag);
        }
      }
    }

    get name() {
      return this.#name;
    }

    get tags() {
      return Array.from(this.#tags);
    }

    has_tag(tag) {
      return this.#tags.has(tag);
    }

    toJSON() {
      return { name: this.#name, tags: Array.from(this.#tags) };
    }
  }

  library.Simulatable = Simulatable;
})(this.JsonRisk || module.exports);
