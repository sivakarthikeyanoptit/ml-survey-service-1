var shikshalokam = require("../generics/helpers/shikshalokam");
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

  // async getParentId(id, role) {}

  async getParents(programId, userId) {
    log.debug(programId, userId);
    let user = {};
    let assessor = await database.models["school-assessors"]
      .find({ programId: ObjectId(programId), userId: userId })
      .select({ role: 1, userId: 1, parentId: 1 });
    log.debug(assessor);
    // user[assessor.role] = {
    //   userId: assessor.userId,
    //   parentId: assessor.parentId,
    //   role: assessor.role
    // };

    if (assessor.role == "ASSESSOR" || assessor.role == "assessor") {
      // let parent = await this.getParents(programId, assessor.parentId);
      // user[parent.role] = parent.userId;
      // log.debug(parent);
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
      await this.getParents(program._id, req.userDetails.id)
    );

    return program;
  }
};
