module.exports = class Frameworks extends Abstract {
  constructor() {
    super(frameworksSchema);
  }

  static get name() {
    return "frameworks";
  }

};
