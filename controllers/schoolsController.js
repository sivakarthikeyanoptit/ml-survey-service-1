module.exports = class Schools extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "schools";
  }

  async userFiledFilter(req, obj) {
    // log.debug(req.userDetails.allRoles);
    await _.forEach(Object.keys(obj.form), key => {
      // log.debug(obj.form[key].visibileTo);
      obj.form[key].visibile =
        obj.form[key].visibileTo.filter(
          value => -1 !== req.userDetails.allRoles.indexOf(value)
        ).length > 0;
      obj.form[key].editable =
        obj.form[key].editableBy.filter(
          value => -1 !== req.userDetails.allRoles.indexOf(value)
        ).length > 0;

      obj.form[key].visibileTo = undefined;
      obj.form[key].editableBy = undefined;
      obj.form[key].input = "text";
    });

    obj.formFields = await obj.form;
    obj.form = undefined;

    return obj;
  }

  async schoolArrayToObject(array) {
    let objs = {};
    await _.forEachRight(array, obj => {
      objs[obj.field] = obj;
    });
    return objs;
  }

  insert(req) {
    // console.log("reached here!");
    // req.db = "cassandra";
    return super.insert(req);
  }

  async assessments(req) {
    req.body = req.body || {};
    let response = {
      message: "Assessment fetched successfully",
      result: {}
    };

    // return response;

    return new Promise(async (resolve, reject) => {
      let school = await database.models.schools.findOne({
        _id: ObjectId(req.params._id)
      });
      response.result.SchoolProfile = await _.pick(school, ["_id", "form"]);

      response.result.SchoolProfile = await this.userFiledFilter(
        req,
        response.result.SchoolProfile
      );
      req.body._id = "5b98d7b6d4f87f317ff615ee";
      response.result.program = await controllers.programsController.getProgram(
        req
      );
      req.body.evaluationFramework =
        response.result.program.evaluationFramework;
      response.result.assessments = await controllers.criteriasController.getEvidence(
        req
      );
      response.result.program.evaluationFramework = undefined;
      response.result.program.components = undefined;
      return resolve(response);
    });
  }

  find(req) {
    return super.find(req);
  }
};
