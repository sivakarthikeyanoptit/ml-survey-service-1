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

  async programDocument(programIds = "all", fields = "all") {
    let queryObject = {}

    if (programIds != "all") {
      queryObject = {
        _id: {
          $in: programIds
        }
      }
    }

    let projectionObject = {}

    if (fields != "all") {
      fields.forEach(element => {
        projectionObject[element] = 1
      });
    }

    let programDocument = await database.models.programs.find(queryObject, projectionObject)
    return programDocument
  }

  async listSchools(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let programId = req.query.programId

        if (!programId) {
          throw "Program id is missing"
        }

        let componentId = req.query.componentId

        if (!componentId) {
          throw "Component Id is missing"
        }

        let programDocument = await database.models.programs.aggregate([
          {
            $match: {
              _id: ObjectId(programId)
            }
          }, {
            $unwind: "$components"
          }, {
            $match: {
              "components.id": ObjectId(componentId)
            }
          }, {
            "$addFields": { "schoolIdInObjectIdForm": "$components.schools" }
          },
          {
            $lookup: {
              from: "schools",
              localField: "schoolIdInObjectIdForm",
              foreignField: "_id",
              as: "schoolInformation"
            }
          },
          // {
          //   $lookup: {
          //     from: "evaluationFrameworks",
          //     localField: "components.id",
          //     foreignField: "_id",
          //     as: "assessments"
          //   }
          // },
          // { $unwind: "$assessments" },
          {
            $project: {
              "programId": "$_id",
              "schoolDocument._id": 1,
              "schoolDocument.externalId": 1,
              "schoolDocument.name": 1,
              "_id": 0
            }
          }
        ])

        if (!programDocument) {
          throw "Bad request"
        }

        return resolve({ message: "List of schools fetched successfully", result: programDocument })
      }
      catch (error) {
        reject({
          status: 400,
          message: error
        })
      }
    })
  }

  async listAssessors(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let programId = req.query.programId

        if (!programId) {
          throw "Program id is missing"
        }

        let componentId = req.query.componentId

        if (!componentId) {
          throw "Component id is missing"
        }

        let programDocument = await database.models.programs.aggregate([
          {
            $match: {
              _id: ObjectId(programId)
            }
          }, {
            $unwind: "$components"
          }, {
            $match: {
              "components.id": ObjectId(componentId)
            }
          }, {
            "$addFields": { "schoolIdInObjectIdForm": "$components.schools" }
          },
          {
            $lookup: {
              from: "schoolAssessors",
              localField: "schoolIdInObjectIdForm",
              foreignField: "schools",
              as: "schoolInformation"
            }
          },
          {
            $project: {
              "schoolInformation.role": 1,
              "schoolInformation.programId": 1,
              "schoolInformation.userId": 1,
              "schoolInformation.programId": 1,
              "schoolInformation.externalId": 1
            }
          }
        ])

        return resolve({
          message: "Assessors fetched successfully",
          result: programDocument
        })

      }
      catch (error) {
        return reject({
          status: 400,
          message: error
        })
      }
    })
  }

  async assessorWiseSchools(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let assessorId = req.params._id

        if (!assessorId) {
          throw "Assessor id is missing"
        }
        let assessorWiseSchoolDocument = await database.models.schoolAssessors.aggregate([{
          $match: {
            _id: ObjectId(assessorId)
          }
        }, {
          $lookup: {
            from: "schools",
            localField: "schools",
            foreignField: "_id",
            as: "assessorWiseSchools"
          }
        }, {
          $project: {
            externalId: 1,
            role: 1,
            programId: 1,
            "assessorWiseSchools.externalId": 1,
            "assessorWiseSchools.name": 1,
            "assessorWiseSchools._id": 1
          }
        }
        ])

        if (!assessorWiseSchoolDocument) {
          throw "Bad request"
        }

        resolve({ status: 200, message: "Assessor wise school information is fetched", result: assessorWiseSchoolDocument })
      }
      catch (error) {
        return reject({
          status: 400,
          message: error
        })
      }
    })
  }
};
