const entityAssessorsHelper = require(ROOT_PATH + "/module/entityAssessors/helper");


module.exports = class EntityAssessors extends Abstract {
  constructor() {
    super(entityAssessorsSchema);
  }

  static get name() {
    return "entityAssessors";
  }

  /**
 * @api {get} /assessment/api/v1/entityAssessors/entities?type=:solutionType&subType=:solutionSubType&programId=:programInternalId&solutionId=:solutionInternalId Entity assessor list
 * @apiVersion 1.0.0
 * @apiName Entity assessor list
 * @apiGroup Entity Assessor
 * @apiHeader {String} X-authenticated-user-token Authenticity token
 * @apiSampleRequest /assessment/api/v1/entityAssessors/entities?type=assessment&subType=institutional&programId=5cfa4ebcfc7cae61da9add8b&solutionId=5cfdf0e5e8dc32060234571c
 * @apiUse successBody
 * @apiUse errorBody
 * @apiParamExample {json} Response:
 * "result": [
     {
      "_id": "5cfa4ebcfc7cae61da9add8b",
      "externalId": "PGM-SMC",
      "name": "SMC Program Index 2018-19",
      "description": "SMC Program Index 2018-19",
      "startDate": "2018-05-20T05:39:26.970Z",
      "endDate": "2020-05-20T05:39:26.970Z",
      "solutions": [
      {
        "_id": "5cfdf0e5e8dc32060234571c",
        "type": "assessment",
        "subType": "institutional",
        "externalId": "SOLUTION-SMC",
        "name": "SMC Assessment Framework 2019",
        "description": "SMC Assessment Framework 2019",
        "entities": [
          {
            "_id": "5cfe1f29f5fcff1170088cf3",
            "isParentInterviewCompleted": false,
            "submissionId": "5d7b3870491ec9303b93d098",
            "submissionStatus": "started",
            "externalId": "SMC01",
            "name": "SMC of School 1",
            "city": "Bengaluru",
            "state": "Delhi"
          }
        ]
      }
    ]
  }
]
 */

  async entities(req) {

    return new Promise(async (resolve, reject) => {

      try {

        let programs = new Array;
        let responseMessage = "Not authorized to fetch entities for this user";

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

        if (req.query.programId) assessorEntitiesQueryObject[0]["$match"]["programId"] = ObjectId(req.query.programId);
        if (req.query.solutionId) assessorEntitiesQueryObject[0]["$match"]["solutionId"] = ObjectId(req.query.solutionId);

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
                },
                solutionId: assessor.solutionId
              },
              {
                "entityId": 1,
                "status": 1,
                "evidences.PAI.isSubmitted": 1
              }
            )

            entityPAISubmissionStatus = submissions.reduce(
              (ac, entitySubmission) => ({
                ...ac,
                [entitySubmission.entityId.toString()]: {
                  PAIStatus: (entitySubmission.entityId && entitySubmission.entityId.evidences && entitySubmission.entityId.evidences.PAI && entitySubmission.entityId.evidences.PAI.isSubmitted === true) ? entity.entityId.evidences.PAI.isSubmitted : false,
                  submissionId: entitySubmission._id,
                  submissionStatus: (entitySubmission.entityId && entitySubmission.status) ? entitySubmission.status : "pending"
                }
              }), {})

            let programDocument = program
            programDocument.solutions = new Array
            solution.entities = new Array
            assessor.entityDocuments.forEach(assessorEntity => {
              solution.entities.push({
                _id: assessorEntity._id,
                isParentInterviewCompleted: (entityPAISubmissionStatus[assessorEntity._id.toString()]) ? entityPAISubmissionStatus[assessorEntity._id.toString()]["PAIStatus"] : false,
                submissionId: (entityPAISubmissionStatus[assessorEntity._id.toString()]) ? entityPAISubmissionStatus[assessorEntity._id.toString()]["submissionId"] : "",
                submissionStatus: (entityPAISubmissionStatus[assessorEntity._id.toString()]) ? entityPAISubmissionStatus[assessorEntity._id.toString()]["submissionStatus"] : "pending",
                ...assessorEntity.metaInformation
              })
            })
            programDocument.solutions.push(solution)
            programs.push(programDocument)
          }

        }

        responseMessage = "Entity list fetched successfully"

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

  /**
* @api {post} /assessment/api/v1/entityAssessors/upload Upload Entity Information CSV
* @apiVersion 1.0.0
* @apiName Upload Entity Assessor Information CSV
* @apiGroup Entity Assessor
* @apiParam {File} assessors Mandatory assessors file of type CSV.
* @apiSampleRequest /assessment/api/v1/entityAssessors/upload
* @apiUse successBody
* @apiUse errorBody
*/
  async upload(req) {

    return new Promise(async (resolve, reject) => {

      try {

        await entityAssessorsHelper.upload(req.files, null, null, req.userDetails.userId, req.rspObj.userToken);

        let response = { message: "Assessor record created successfully." };

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

  /**
* @api {post} /assessment/api/v1/entityAssessors/uploadForPortal?programId=:programExternalId&solutionId=:solutionExternalId Upload Entity Information CSV Using Portal
* @apiVersion 1.0.0
* @apiName Upload Entity Assessor Information CSV Using Portal
* @apiGroup Entity Assessor
* @apiParam {File} assessors Mandatory assessors file of type CSV.
* @apiSampleRequest /assessment/api/v1/entityAssessors/uploadForPortal?programId=PROGID01&solutionId=EF-DCPCR-2018-001
* @apiUse successBody
* @apiUse errorBody
*/

  async uploadForPortal(req) {

    return new Promise(async (resolve, reject) => {

      try {

        let programId = req.query.programId;
        let solutionId = req.query.solutionId;

        await entityAssessorsHelper.upload(req.files, programId, solutionId, req.userDetails.userId, req.rspObj.userToken);

        let response = { message: "Assessor record created successfully." };

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

  /**
* @api {get} /assessment/api/v1/entityAssessors/pendingAssessments Pending Assessments
* @apiVersion 1.0.0
* @apiName Pending Assessments
* @apiGroup Entity Assessor
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/entityAssessors/pendingAssessments
* @apiUse successBody
* @apiUse errorBody
* @apiParamExample {json} Response:
*/

  async pendingAssessments() {
    return new Promise(async (resolve, reject) => {
      try {

        let entityAssessorsDocument = await database.models.entityAssessors.find({
          role: { $in: ["ASSESSOR", "LEAD_ASSESSOR"] },
        }, { _id: 1 }).lean();

        if (!entityAssessorsDocument.length > 0) {
          throw { message: "No LEAD_ASSESSOR or ASSESSOR Found" }
        }

        let assessors = _.chunk(entityAssessorsDocument, 500)

        let allEntityAssessors

        let pendingEntityAssessorsData = [];
        let entityAssessorsIds;
        let userCount = 0;

        for (let pointerToAssessors = 0; pointerToAssessors < assessors.length; pointerToAssessors++) {

          entityAssessorsIds = assessors[pointerToAssessors].map(eachAssessor => {
            return eachAssessor._id
          })

          allEntityAssessors = await database.models.entityAssessors.find({
            _id: { $in: entityAssessorsIds }
          }, { solutionId: 1, entityTypeId: 1, entities: 1, programId: 1, userId: 1 }).lean()

          await Promise.all(allEntityAssessors.map(async eachAssessor => {

            let queryObj = {
              solutionId: eachAssessor.solutionId,
              status: { $ne: "completed" },
              programId: eachAssessor.programId,
              entityId: { $in: eachAssessor.entities },
              entityTypeId: eachAssessor.entityTypeId
            }

            let assessmentSubmissions = await database.models.submissions.find(queryObj, {
              _id: 1, solutionId: 1, createdAt: 1, entityId: 1, programId: 1
            }).lean()

            let userId = eachAssessor.userId

            if (assessmentSubmissions.length > 0) {

              for (let pointerToAssessmentSubmission = 0; pointerToAssessmentSubmission < assessmentSubmissions.length; pointerToAssessmentSubmission++) {

                let result = {
                  _id: assessmentSubmissions[pointerToAssessmentSubmission]._id,
                  userId: userId,
                  solutionId: assessmentSubmissions[pointerToAssessmentSubmission].solutionId,
                  createdAt: assessmentSubmissions[pointerToAssessmentSubmission].createdAt,
                  entityId: assessmentSubmissions[pointerToAssessmentSubmission].entityId,
                  programId: assessmentSubmissions[pointerToAssessmentSubmission].programId
                }

                pendingEntityAssessorsData.push(result)
              }
            }

          })
          )
        }

        console.log(pendingEntityAssessorsData.length)

        return resolve({
          message: "Pending Assessments",
          result: pendingEntityAssessorsData
        });

      } catch (error) {
        return reject({
          status: error.status || 500,
          message: error.message || "Oops! Something went wrong!",
          errorObject: error
        });
      }
    });
  }


  /**
* @api {get} /assessment/api/v1/entityAssessors/pendingObservations Pending Assessments
* @apiVersion 1.0.0
* @apiName Pending Assessments
* @apiGroup Entity Assessor
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/entityAssessors/pendingObservations
* @apiUse successBody
* @apiUse errorBody
* @apiParamExample {json} Response:
*/

  async pendingObservations() {
    return new Promise(async (resolve, reject) => {
      try {

        let entityTypeDocument = await database.models.entityTypes.find({
          isObservable: true
        }, { _id: 1 }).lean()

        let allEntityTypeIds = entityTypeDocument.map(entity => {
          return entity._id
        })

        let entityAssessorsDocument = await database.models.entityAssessors.find({
          role: { $in: ["ASSESSOR", "LEAD_ASSESSOR"] },
          entityTypeId: { $in: allEntityTypeIds }
        }, { _id: 1 }).lean();

        if (!entityAssessorsDocument.length > 0) {
          throw { message: "No LEAD_ASSESSOR or ASSESSOR Found" }
        }

        let assessors = _.chunk(entityAssessorsDocument, 500)

        let allEntityAssessors

        let pendingObservationsData = [];
        let entityAssessorsIds;
        let userCount = 0;

        for (let pointerToAssessors = 0; pointerToAssessors < assessors.length; pointerToAssessors++) {

          entityAssessorsIds = assessors[pointerToAssessors].map(eachAssessor => {
            return eachAssessor._id
          })

          allEntityAssessors = await database.models.entityAssessors.find({
            _id: { $in: entityAssessorsIds }
          }, { solutionId: 1, entityTypeId: 1, entities: 1, programId: 1, userId: 1 }).lean()

          await Promise.all(allEntityAssessors.map(async eachAssessor => {

            let queryObj = {
              solutionId: eachAssessor.solutionId,
              status: { $ne: "completed" },
              entityId: { $in: eachAssessor.entities },
              entityTypeId: eachAssessor.entityTypeId
            }

            let observationSubmissionsData = await database.models.observationSubmissions.find(queryObj, {
              _id: 1, solutionId: 1, createdAt: 1, entityId: 1, observationId: 1
            }).lean()

            let userId = eachAssessor.userId

            if (observationSubmissionsData.length > 0) {

              for (let pointerToAssessmentSubmission = 0; pointerToAssessmentSubmission < observationSubmissionsData.length; pointerToAssessmentSubmission++) {

                let result = {
                  _id: observationSubmissionsData[pointerToAssessmentSubmission]._id,
                  userId: userId,
                  solutionId: observationSubmissionsData[pointerToAssessmentSubmission].solutionId,
                  createdAt: observationSubmissionsData[pointerToAssessmentSubmission].createdAt,
                  entityId: observationSubmissionsData[pointerToAssessmentSubmission].entityId,
                  observationId: observationSubmissionsData[pointerToAssessmentSubmission].observationId
                }

                pendingObservationsData.push(result)
              }
            }

          })
          )
        }

        console.log(pendingObservationsData.length)

        return resolve({
          message: "Pending Observations",
          result: pendingObservationsData
        });

      } catch (error) {
        return reject({
          status: error.status || 500,
          message: error.message || "Oops! Something went wrong!",
          errorObject: error
        });
      }
    });
  }

  /**
* @api {get} /assessment/api/v1/entityAssessors/completedAssessments Completed Assessments
* @apiVersion 1.0.0
* @apiName Completed Assessments
* @apiGroup Entity Assessor
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/entityAssessors/completedAssessments
* @apiUse successBody
* @apiUse errorBody
* @apiParamExample {json} Response:
*/

  async completedAssessments() {
    return new Promise(async (resolve, reject) => {
      try {

        let entityAssessorsDocument = await database.models.entityAssessors.find({
          role: { $in: ["ASSESSOR", "LEAD_ASSESSOR"] },
        }, { _id: 1 }).lean();

        if (!entityAssessorsDocument.length > 0) {
          throw { message: "No LEAD_ASSESSOR or ASSESSOR Found" }
        }

        let assessorsData = _.chunk(entityAssessorsDocument, 500)

        let allEntityAssessors

        let completedAssessments = [];
        let entityAssessorsIds;

        for (let pointerToAssessors = 0; pointerToAssessors < assessorsData.length; pointerToAssessors++) {

          entityAssessorsIds = assessorsData[pointerToAssessors].map(eachAssessor => {
            return eachAssessor._id
          })

          allEntityAssessors = await database.models.entityAssessors.find({
            _id: { $in: entityAssessorsIds }
          }, { solutionId: 1, entityTypeId: 1, entities: 1, programId: 1, userId: 1 }).lean()

          await Promise.all(allEntityAssessors.map(async eachAssessor => {

            let queryObj = {
              solutionId: eachAssessor.solutionId,
              status: "completed",
              programId: eachAssessor.programId,
              entityId: { $in: eachAssessor.entities },
              entityTypeId: eachAssessor.entityTypeId
            }

            let assessmentSubmissions = await database.models.submissions.find(queryObj, {
              _id: 1, solutionId: 1, createdAt: 1, entityId: 1, programId: 1
            }).lean()

            let userId = eachAssessor.userId

            if (assessmentSubmissions.length > 0) {

              for (let pointerToAssessmentSubmission = 0; pointerToAssessmentSubmission < assessmentSubmissions.length; pointerToAssessmentSubmission++) {

                let result = {
                  _id: assessmentSubmissions[pointerToAssessmentSubmission]._id,
                  userId: userId,
                  solutionId: assessmentSubmissions[pointerToAssessmentSubmission].solutionId,
                  createdAt: assessmentSubmissions[pointerToAssessmentSubmission].createdAt,
                  entityId: assessmentSubmissions[pointerToAssessmentSubmission].entityId,
                  programId: assessmentSubmissions[pointerToAssessmentSubmission].programId
                }

                completedAssessments.push(result)
              }
            }

          })
          )
        }

        return resolve({
          message: "Completed Assessments",
          result: completedAssessments
        });

      } catch (error) {
        return reject({
          status: error.status || 500,
          message: error.message || "Oops! Something went wrong!",
          errorObject: error
        });
      }
    });
  }

  /**
* @api {get} /assessment/api/v1/entityAssessors/completedObservations Completed Observations
* @apiVersion 1.0.0
* @apiName Completed Observations
* @apiGroup Entity Assessor
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/entityAssessors/completedObservations
* @apiUse successBody
* @apiUse errorBody
* @apiParamExample {json} Response:
*/

  async completedObservations() {
    return new Promise(async (resolve, reject) => {
      try {

        let entityTypeDocument = await database.models.entityTypes.find({
          isObservable: true
        }, { _id: 1 }).lean()

        let allEntityTypeIds = entityTypeDocument.map(entity => {
          return entity._id
        })

        let entityAssessorsDocument = await database.models.entityAssessors.find({
          role: { $in: ["ASSESSOR", "LEAD_ASSESSOR"] },
          entityTypeId: { $in: allEntityTypeIds }
        }, { _id: 1 }).lean();

        if (!entityAssessorsDocument.length > 0) {
          throw { message: "No LEAD_ASSESSOR or ASSESSOR Found" }
        }

        let assessors = _.chunk(entityAssessorsDocument, 500)

        let allEntityAssessors

        let completedObservationsData = [];
        let entityAssessorsIds;

        for (let pointerToAssessors = 0; pointerToAssessors < assessors.length; pointerToAssessors++) {

          entityAssessorsIds = assessors[pointerToAssessors].map(eachAssessor => {
            return eachAssessor._id
          })

          allEntityAssessors = await database.models.entityAssessors.find({
            _id: { $in: entityAssessorsIds }
          }, { solutionId: 1, entityTypeId: 1, entities: 1, programId: 1, userId: 1 }).lean()

          await Promise.all(allEntityAssessors.map(async eachAssessor => {

            let queryObj = {
              solutionId: eachAssessor.solutionId,
              status: "completed",
              entityId: { $in: eachAssessor.entities },
              entityTypeId: eachAssessor.entityTypeId
            }

            let observationSubmissionsData = await database.models.observationSubmissions.find(queryObj, {
              _id: 1, solutionId: 1, createdAt: 1, entityId: 1, observationId: 1
            }).lean()

            let userId = eachAssessor.userId

            if (observationSubmissionsData.length > 0) {

              for (let pointerToAssessmentSubmission = 0; pointerToAssessmentSubmission < observationSubmissionsData.length; pointerToAssessmentSubmission++) {

                let result = {
                  _id: observationSubmissionsData[pointerToAssessmentSubmission]._id,
                  userId: userId,
                  solutionId: observationSubmissionsData[pointerToAssessmentSubmission].solutionId,
                  createdAt: observationSubmissionsData[pointerToAssessmentSubmission].createdAt,
                  entityId: observationSubmissionsData[pointerToAssessmentSubmission].entityId,
                  observationId: observationSubmissionsData[pointerToAssessmentSubmission].observationId
                }

                completedObservationsData.push(result)
              }
            }

          })
          )
        }

        return resolve({
          message: "Completed Observations",
          result: completedObservationsData
        });

      } catch (error) {
        return reject({
          status: error.status || 500,
          message: error.message || "Oops! Something went wrong!",
          errorObject: error
        });
      }
    });
  }

};
