module.exports = class EntityAssessors extends Abstract {
    constructor() {
      super(entityAssessorsSchema);
    }
  
    static get name() {
      return "entityAssessors";
    }

  };
  