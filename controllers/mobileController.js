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

  async assessments(req) {
    req.body = { _id: req.params._id };
    let res = await super.findByIdAndUpdate(req);
    return res;
  }
};
