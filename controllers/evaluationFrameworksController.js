module.exports = class EvaluationFrameworks extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "evaluationFrameworks";
  }

  find(req) {
    return super.find(req);
  }
  
  findOne(req) {
    return super.findOne(req);
  }

  findById(req) {
    return super.findById(req);
  }
};
