const entityAssessorsHelper = require(ROOT_PATH + "/module/entityAssessors/helper");


module.exports = class EntityAssessors extends Abstract {
  constructor() {
    super(entityAssessorsSchema);
  }

  static get name() {
    return "entityAssessors";
  }


  async entities(req) {

    return new Promise(async (resolve, reject) => {

      try {

        let programs = new Array
        let responseMessage = "Not authorized to fetch entities for this user"

        if (_.includes(req.userDetails.allRoles, "ASSESSOR") || _.includes(req.userDetails.allRoles, "LEAD_ASSESSOR")) {

          let assessorEntitiesQueryObject = [
            {
              $match: {
                userId: req.userDetails.userId
              }
            },
            {
              $lookup: {
                from: "entities",
                localField: "entities",
                foreignField: "_id",
                as: "entityDocuments"
              }
            },
            {
              $project: {
                "entities": 1,
                "solutionId": 1,
                "programId": 1,
                "entityDocuments._id": 1,
                "entityDocuments.metaInformation.externalId": 1,
                "entityDocuments.metaInformation.name": 1,
                "entityDocuments.metaInformation.addressLine1": 1,
                "entityDocuments.metaInformation.addressLine2": 1,
                "entityDocuments.metaInformation.city": 1,
                "entityDocuments.metaInformation.state": 1
              }
            }
          ];

          const assessorsDocument = await database.models.entityAssessors.aggregate(assessorEntitiesQueryObject)

          let assessor
          let solutionQueryObject = {};
          let programQueryObject = {};
          let program = {};
          let solution = {};
          let submissions
          let entityPAISubmissionStatus = new Array

          for (let pointerToAssessorDocumentArray = 0; pointerToAssessorDocumentArray < assessorsDocument.length; pointerToAssessorDocumentArray++) {

            assessor = assessorsDocument[pointerToAssessorDocumentArray];


            solutionQueryObject["_id"] = assessor.solutionId;
            solutionQueryObject["type"] = req.query.type;
            solutionQueryObject["subType"] = req.query.subType;
            solutionQueryObject["status"] = "active";
            solutionQueryObject["isDeleted"] = false

            solution = await database.models.solutions.findOne(
              solutionQueryObject,
              {
                name: 1,
                description: 1,
                externalId: 1,
                type: 1,
                subType: 1
              }
            ).lean()


            programQueryObject["_id"] = assessor.programId;
            programQueryObject["status"] = "active";
            programQueryObject["isDeleted"] = false

            program = await database.models.programs.findOne(
              programQueryObject,
              {
                name: 1,
                description: 1,
                externalId: 1,
                startDate: 1,
                endDate: 1
              }
            ).lean()


            if (solution && program) {

              submissions = await database.models.submissions.find(
                {
                  entityId: {
                    $in: assessor.entities
                  }
                },
                {
                  "entityId": 1,
                  "evidences.PAI.isSubmitted": 1
                }
              )

              entityPAISubmissionStatus = submissions.reduce(
                (ac, entitySubmission) => ({ ...ac, [entitySubmission.entityId.toString()]: (entitySubmission.entityId && entitySubmission.entityId.evidences && entitySubmission.entityId.evidences.PAI && entitySubmission.entityId.evidences.PAI.isSubmitted === true) ? entity.entityId.evidences.PAI.isSubmitted : false }), {})

              let programDocument = program
              programDocument.solutions = new Array
              solution.entities = new Array
              assessor.entityDocuments.forEach(assessorEntity => {
                solution.entities.push({
                  _id: assessorEntity._id,
                  isParentInterviewCompleted: entityPAISubmissionStatus[assessorEntity._id.toString()],
                  ...assessorEntity.metaInformation
                })
              })
              programDocument.solutions.push(solution)
              programs.push(programDocument)
            }

          }

          responseMessage = "Entity list fetched successfully"
        }

        return resolve({
          message: responseMessage,
          result: programs
        });

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    });

  }

  async upload(req) {

    return new Promise(async (resolve, reject) => {

      try {

        let skippedDocumentCount = await entityAssessorsHelper.upload(req.files, null, null, req.userDetails.userId, req.rspObj.userToken);

        if (skippedDocumentCount > 0) {
          let responseMessage = `Not all records were inserted/updated.`;
          return resolve({ status: 400, message: responseMessage })
        }

        let responseMessage = "Assessor record created successfully."

        let response = { message: responseMessage };

        return resolve(response)

      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! something went wrong.",
          errorObject: error
        });

      }

    })

  }

  async uploadForPortal(req) {

    return new Promise(async (resolve, reject) => {

      try {

        let programId = req.query.programId;
        let solutionId = req.query.solutionId;

        let skippedDocumentCount = await entityAssessorsHelper.upload(req.files, programId, solutionId, req.userDetails.userId, req.rspObj.userToken);

        if (skippedDocumentCount > 0) {
          let responseMessage = `Not all records were inserted/updated.`;
          return resolve({ status: 400, message: responseMessage })
        }

        let responseMessage = "Assessor record created successfully.";

        let response = { message: responseMessage };

        return resolve(response);

      } catch (error) {
        return reject({
          status: error.status || 500,
          message: error.message || error,
          errorObject: error
        });
      }

    })
  }

};
