var shikshalokam = require("../../generics/helpers/shikshalokam");
module.exports = class Programs extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "programs";
  }

  find(req) {
    return super.find(req);
  }

  async getParentsDetails(req, programId, userId) {
    let users = await this.getParents(req, programId, userId);
    await _.forEachRight(Object.keys(users), key => {
      // console.log(key);

      _.forEachRight(users[key], (user, i) => {
        users[key][i].data = "[]";
      });
    });
    return users;
  }

  async getParents(req, programId, userId) {
    let user = {};
    let assessor = await database.models["school-assessors"]
      .findOne({ programId: ObjectId(programId), userId: userId })
      .select({ role: 1, userId: 1, parentId: 1 });

    if (assessor.parentId) {
      user["LEAD_ASSESSOR"] = await database.models["school-assessors"]
        .find({
          programId: ObjectId(programId),
          _id: ObjectId(assessor.parentId)
        })
        .select({ role: 1, userId: 1, parentId: 1 });
      user["LEAD_ASSESSOR"][0].details = {};

      // let details = await shikshalokam.userInfo(
      //   req.rspObj.userToken,
      //   user["LEAD_ASSESSOR"][0].userId
      // );

      // user["LEAD_ASSESSOR"][0].email = await details.result.response.email;
      // log.debug(details.result.response);

      if (user["LEAD_ASSESSOR"][0].parentId) {
        user["PROJECT_MANAGER"] = await database.models["school-assessors"]
          .find({
            programId: ObjectId(programId),
            _id: ObjectId(user["LEAD_ASSESSOR"][0].parentId)
          })
          .select({ role: 1, userId: 1, parentId: 1 });
      }
    }

    return user;
  }

  async getProgram(req) {
    let program = await database.models.programs.findById(req.body._id);
    program = _.pick(program, [
      "_id",
      "externalId",
      "name",
      "description",
      "status",
      "owner",
      "components"
    ]);

    await _.forEachRight(program.components, async obj => {
      if (obj.type == "evaluationFramework") {
        program.evaluationFramework = obj.id;
      }
    });
    // let schoolAssessor;
    // log.debug(req.userDetails.id);
    program = Object.assign(
      program,
      await this.getParentsDetails(req, program._id, req.userDetails.id)
    );

    return program;
  }
};
