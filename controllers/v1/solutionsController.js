module.exports = class Solutions extends Abstract {
  constructor() {
    super(solutionsSchema);
  }

  static get name() {
    return "solutions";
  }

};
