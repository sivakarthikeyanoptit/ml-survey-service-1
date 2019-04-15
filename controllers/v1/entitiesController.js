module.exports = class Entities extends Abstract {
    constructor() {
      super(entitiesSchema);
    }
  
    static get name() {
      return "entities";
    }

  };
  