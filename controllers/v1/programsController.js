module.exports = class Programs extends Abstract {
  constructor() {
    super(programsSchema);
  }

  static get name() {
    return "programs";
  }

  find(req) {
    return super.find(req);
  }

  async list(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let programDocument = await database.models.programs.aggregate([
          // { "$addFields": { "assessmentObjectId": "$components.id" } },
          {
            $lookup: {
              from: "evaluationFrameworks",
              localField: "components.id",
              foreignField: "_id",
              as: "assessments"
            }
          },
          {
            $project: {
              externalId: 1,
              name: 1,
              description: 1,
              "assessments._id": 1,
              "assessments.externalId": 1,
              "assessments.name": 1,
              "assessments.description": 1
            }
          }
        ])

        if (!programDocument) {
          return reject({
            status: 404,
            message: "No programs data"
          })
        }

        let responseMessage = "Program information list fetched successfully."

        let response = { message: responseMessage, result: programDocument };

        return resolve(response);

      }
      catch (error) {
        return reject({ message: error });
      }
    })

  }

  async programDocument(programIds = all, fields = all) {

    if (programIds) {
      let programDocument = await database.models.programs.find({
        _id: {
          $in: programIds
        }
      });
      return programDocument
    }
    if (fields) {
      let programDocument = await database.models.programs.find({}, fields)
      return programDocument
    }
    if (programIds && fields) {
      let programDocument = await database.models.programs.find({ _id: { $in: programIds } }, fields);
      return programDocument
    }
    let programDocument = await database.models.programs.find({});
    return programDocument
  }

};
