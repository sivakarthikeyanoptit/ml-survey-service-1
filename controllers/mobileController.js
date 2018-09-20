module.exports = class Schools extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "mobileAssessments";
  }

  find(req) {
    return super.find(req);
  }

  assessments(req) {
    // req.query = {};
    return super.find(req);
  }
};
