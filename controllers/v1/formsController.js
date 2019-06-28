module.exports = class Forms extends Abstract {

  constructor() {
    super(formsSchema);
  }

  static get name() {
    return "forms";
  }

};
