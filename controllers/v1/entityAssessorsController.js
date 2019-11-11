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
* @api {get} /assessment/api/v1/entityAssessors/pendingAssessments/{{userId}}?assessorExternalId=:assessorExternalId Pending Assessments
* @apiVersion 1.0.0
* @apiName Pending Assessments
* @apiGroup Entity Assessor
* @apiParam {String} assessorExternalId Required Assessor External Id.
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/entityAssessors/pendingAssessments/e97b5582-471c-4649-8401-3cc4249359bb?assessorExternalId=a1
* @apiUse successBody
* @apiUse errorBody
* @apiParamExample {json} Response:
*/

  async pendingAssessments(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let entityAssessorsDocument = await database.models.entityAssessors.find({
          role: { $in: ["ASSESSOR", "LEAD_ASSESSOR"] },
        }, { solutionId: 1, entityTypeId: 1, entities: 1, programId: 1, userId: 1 }).lean();

        if (!entityAssessorsDocument.length > 0) {
          throw { message: "No LEAD_ASSESSOR or ASSESSOR Found" }
        }

        let entityAssessors = {};
        let programIds = [];
        let solutionIds = [];
        let entityIds = [];
        let entityAssessorsIds = [];

        entityAssessorsDocument.forEach(eachEntityAssessor => {

          if (eachEntityAssessor.userId) {


            if (!entityAssessorsIds.includes(eachEntityAssessor.userId)) {
              entityAssessorsIds.push(eachEntityAssessor.userId)
            }
          }

          if (!programIds.includes(eachEntityAssessor.programId.toString())) {
            programIds.push(eachEntityAssessor.programId.toString());
          }

          if (eachEntityAssessor.solutionId !== null && !solutionIds.includes(eachEntityAssessor.solutionId.toString())) {
            solutionIds.push(eachEntityAssessor.solutionId.toString());
          }

          entityIds = _.merge(entityIds, eachEntityAssessor.entities);
        })

        let queryObj = {
          solutionId: { $in: solutionIds },
          status: { $ne: "completed" },
          programId: { $in: programIds },
          entityId: { $in: entityIds }
        }

        let projection = { createdAt: 1, entityExternalId: 1, programExternalId: 1, "assessors.userId": 1, solutionId: 1 }

        let assessmentSubmissions = await database.models.submissions.find(queryObj, projection).lean()

        if (!assessmentSubmissions.length > 0) {
          throw { "message": "No Pending Assessments" }
        }

        for (let pointerToAssessmentSubmission = 0; pointerToAssessmentSubmission < assessmentSubmissions.length; pointerToAssessmentSubmission++) {

          assessmentSubmissions[pointerToAssessmentSubmission].assessors.forEach(eachAssessor => {

            if (entityAssessorsIds.includes(eachAssessor.userId)) {
              if (!entityAssessors[eachAssessor.userId]) {
                entityAssessors[eachAssessor.userId] = {};
                entityAssessors[eachAssessor.userId]["pendingNotification"] = [];
              }

              assessmentSubmissions[pointerToAssessmentSubmission].payload = {}
              assessmentSubmissions[pointerToAssessmentSubmission].payload["solution_id"] = assessmentSubmissions[pointerToAssessmentSubmission].solutionId
              assessmentSubmissions[pointerToAssessmentSubmission].payload.type = "assessment"

              entityAssessors[eachAssessor.userId]["userId"] = eachAssessor.userId
              entityAssessors[eachAssessor.userId]["pendingNotification"].push(_.omit(assessmentSubmissions[pointerToAssessmentSubmission], "assessors"))
            }
          })

        }


        return resolve({
          message: "Pending Assessments",
          result: Object.values(entityAssessors)
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
