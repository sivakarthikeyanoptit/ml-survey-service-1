
module.exports = class EntityTypes extends Abstract {
  constructor() {
    super(entityTypesSchema);
  }

  static get name() {
    return "entityTypes";
  }

};
