module.exports = class EvaluationFrameworks extends AbstractController {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "evaluationFrameworks";
  }

  find(req) {
    return super.find(req);
  }
};
