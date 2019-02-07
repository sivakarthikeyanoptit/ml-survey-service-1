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


  async evaluationFrameworkDocument(evaluationIds = "all", fields = "all") {

    let queryObject = {}

    if (evaluationIds != "all") {
      queryObject = {
        _id: {
          $in: evaluationIds
        }
      }
    }


    let projectionObject = {}

    if (fields != "all") {
      fields.forEach(element => {
        projectionObject[element] = 1
      });
    }

    let evaluationFrameworkDocuments = await database.models["evaluationFrameworks"].find(queryObject, projectionObject);
    return evaluationFrameworkDocuments
  }
};
