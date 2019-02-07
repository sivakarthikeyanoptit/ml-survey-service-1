module.exports = class EvaluationFrameworks extends Abstract {
  constructor() {
    super(evaluationFrameworksSchema);
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


  async evaluationFrameworkDocument(evaluationIds = all, fields = all) {

    if (evaluationIds) {
      let evaluationFrameworkDocument = await database.models[
        "evaluationFrameworks"
      ].find({
        _id: {
          $in: evaluationIds
        }
      });
      return evaluationFrameworkDocument
    }
    if (fields) {
      let evaluationFrameworkDocument = await database.models["evaluationFrameworks"].find({}, fields)
      return evaluationFrameworkDocument
    }
    if (evaluationIds && fields) {
      if (!evaluationIds) {
        throw "evaluationId is compulsory"
      }
      let evaluationFrameworkDocument = await database.models["evaluationFrameworks"].find({ _id: { $in: evaluationIds } }, fields);
      return evaluationFrameworkDocument
    }
    let evaluationFrameworkDocument = await database.models["evaluationFrameworks"].find({});
    return evaluationFrameworkDocument
  }
};
