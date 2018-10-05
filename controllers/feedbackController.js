module.exports = class Feedback extends Abstract {

  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "feedback";
  }

  insert(req) {
    return super.insert(req);
  }

};
