module.exports = class Questions extends Abstract {

  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "questions";
  }

  insert(req) {
    return super.insert(req);
  }

  update(req) {
    return super.update(req);
  }

  find(req) {
    return super.find(req);
  }
};
