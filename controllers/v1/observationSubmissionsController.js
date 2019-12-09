const submissionsHelper = require(ROOT_PATH + "/module/submissions/helper")
const criteriaHelper = require(ROOT_PATH + "/module/criteria/helper")
const questionsHelper = require(ROOT_PATH + "/module/questions/helper")
const observationsHelper = require(ROOT_PATH + "/module/observations/helper")
const solutionsHelper = require(ROOT_PATH + "/module/solutions/helper")
const entitiesHelper = require(ROOT_PATH + "/module/entities/helper")
const observationSubmissionsHelper = require(ROOT_PATH + "/module/observationSubmissions/helper")

module.exports = class ObservationSubmissions extends Abstract {

  constructor() {
    super(observationSubmissionsSchema);
  }

  static get name() {
    return "observationSubmissions";
  }

  /**
  * @api {post} /assessment/api/v1/observationSubmissions/create:observationId?entityId=:entityId Create A New Observation Submission
  * @apiVersion 1.0.0
  * @apiName Create A New Observation Submission
  * @apiGroup Observation Submissions
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiParam {String} entityId Entity ID.
  * @apiSampleRequest /assessment/api/v1/observationSubmissions/create/5d2c1c57037306041ef0c7ea?entityId=5d2c1c57037306041ef0c8fa
  * @apiParamExample {json} Response:
  * "result": [
        {
            "_id": "5d09c34d1f7fd5a2391f7251",
            "entities": [],
            "name": "Observation 1",
            "description": "Observation Description",
            "status": "published",
            "solutionId": "5b98fa069f664f7e1ae7498c"
        },
        {
            "_id": "5d1070326f6ed50bc34aec2c",
            "entities": [
                {
                    "_id": "5cebbefe5943912f56cf8e16",
                    "submissionStatus": "pending",
                    "submissions": [],
                    "name": "asd"
                },
                {
                    "_id": "5cebbf275943912f56cf8e18",
                    "submissionStatus": "pending",
                    "submissions": [],
                    "name": "asd"
                }
            ],
            "status": "published",
            "endDate": "2019-06-24T00:00:00.000Z",
            "name": "asdasd",
            "description": "asdasdasd",
            "solutionId": "5c6bd309af0065f0e0d4223b"
        }
      ]
  * @apiUse successBody
  * @apiUse errorBody
  */

  async create(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let observationDocument = await observationsHelper.observationDocuments({
          _id: req.params._id,
          createdBy: req.userDetails.userId,
          status: {$ne:"inactive"},
          entities: ObjectId(req.query.entityId)
        })

        if (!observationDocument[0]) return resolve({ status: 400, message: 'No observation found.' })

        observationDocument = observationDocument[0]

        let entityDocument = await entitiesHelper.entityDocuments({
          _id: req.query.entityId,
          entityType: observationDocument.entityType
        }, [
          "metaInformation",
          "entityTypeId",
          "entityType"
        ])

        if (!entityDocument[0]) return resolve({ status: 400, message: 'No entity found.' })
        
        entityDocument = entityDocument[0]

        let solutionDocument = await solutionsHelper.solutionDocuments({
          _id: observationDocument.solutionId,
          status: "active",
        }, [
          "externalId",
          "themes",
          "frameworkId",
          "frameworkExternalId",
          "evidenceMethods",
          "entityTypeId",
          "entityType"
        ])

        if (!solutionDocument[0]) return resolve({ status: 400, message: 'No solution found.' })

        solutionDocument = solutionDocument[0]

        let entityProfileForm = await database.models.entityTypes.findOne(
            solutionDocument.entityTypeId,
            {
                profileForm: 1
            }
        ).lean();

        if (!entityProfileForm) return resolve({ status: 400, message: 'No entity profile form found.' })

        let lastSubmissionNumber = 0

        const lastSubmissionForObservationEntity = await observationsHelper.findLastSubmissionForObservationEntity(req.params._id, req.query.entityId)
        
        if(!lastSubmissionForObservationEntity.success) throw new Error(lastSubmissionForObservationEntity.message)

        lastSubmissionNumber = lastSubmissionForObservationEntity.result + 1

        let submissionDocument = {
          entityId: entityDocument._id,
          entityExternalId: (entityDocument.metaInformation.externalId) ? entityDocument.metaInformation.externalId : "",
          entityInformation: entityDocument.metaInformation,
          solutionId: solutionDocument._id,
          solutionExternalId: solutionDocument.externalId,
          frameworkId: solutionDocument.frameworkId,
          frameworkExternalId: solutionDocument.frameworkExternalId,
          entityTypeId: solutionDocument.entityTypeId,
          entityType: solutionDocument.entityType,
          observationId: observationDocument._id,
          observationInformation: {
              ..._.omit(observationDocument, ["_id", "entities", "deleted", "__v"])
          },
          createdBy: observationDocument.createdBy,
          evidenceSubmissions: [],
          entityProfile: {},
          status: "started"
      };

      let criteriaId = new Array
      let criteriaObject = {}
      let criteriaIdArray = gen.utils.getCriteriaIdsAndWeightage(solutionDocument.themes);

      criteriaIdArray.forEach(eachCriteriaId => {
          criteriaId.push(eachCriteriaId.criteriaId)
          criteriaObject[eachCriteriaId.criteriaId.toString()] = {
              weightage: eachCriteriaId.weightage
          }
      })

      let criteriaDocuments = await database.models.criteria.find(
          { _id: { $in: criteriaId } },
          {
              evidences : 0,
              resourceType: 0,
              language: 0,
              keywords: 0,
              concepts: 0,
              createdFor: 0,
              updatedAt : 0,
              createdAt : 0,
              frameworkCriteriaId : 0,
              __v : 0
          }
      ).lean();

      let submissionDocumentEvidences = {};
      let submissionDocumentCriterias = [];
      Object.keys(solutionDocument.evidenceMethods).forEach(solutionEcm => {
          solutionDocument.evidenceMethods[solutionEcm].startTime = ""
          solutionDocument.evidenceMethods[solutionEcm].endTime = ""
          solutionDocument.evidenceMethods[solutionEcm].isSubmitted = false
          solutionDocument.evidenceMethods[solutionEcm].submissions = new Array
      })
      submissionDocumentEvidences = solutionDocument.evidenceMethods

      criteriaDocuments.forEach(criteria => {

          criteria.weightage = criteriaObject[criteria._id.toString()].weightage

          submissionDocumentCriterias.push(
              _.omit(criteria, [
                  "evidences"
              ])
          );

      });

      submissionDocument.evidences = submissionDocumentEvidences;
      submissionDocument.evidencesStatus = Object.values(submissionDocumentEvidences);
      submissionDocument.criteria = submissionDocumentCriterias;
      submissionDocument.submissionNumber = lastSubmissionNumber;

      await database.models.observationSubmissions.create(submissionDocument);
      
      let observations = new Array;

      observations = await observationsHelper.list(req.userDetails.userId)
      
      let responseMessage = "Observation submission created successfully"

      return resolve({
          message: responseMessage,
          result: observations
      });

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }

  /**
  * @api {post} /assessment/api/v1/observationSubmissions/make/{{submissionId}} Create Observation Submission
  * @apiVersion 1.0.0
  * @apiName Create Observation Submission
  * @apiGroup Observation Submissions
  * @apiParamExample {json} Request-Body:
  * {
  * 	"evidence": {
  *                   "externalId" : "",
  *                   "answers" : {
  *                       "5be442149a14ba4b5038dce4" : {
  *                           "qid" : "",
  *                           "responseType":"",
  *                           "value" : [ 
  *                               {
  *                                   "5be442dd9a14ba4b5038dce5" : {
  *                                       "qid" : "",
  *                                       "value" : "",
  *                                       "remarks" : "",
  *                                       "fileName" : [],
  *                                       "payload" : {
  *                                           "question" : [ 
  *                                               "", 
  *                                               ""
  *                                           ],
  *                                           "labels" : [ 
  *                                               ""
  *                                           ],
  *                                           "responseType" : ""
  *                                       },
  *                                       "criteriaId" : ""
  *                                   },
  *                                   "5be52f5d9a14ba4b5038dd0c" : {
  *                                       "qid" : "",
  *                                       "value" : [ 
  *                                           "String", 
  *                                           "String"
  *                                       ],
  *                                       "remarks" : "",
  *                                       "fileName" : [],
  *                                       "payload" : {
  *                                           "question" : [ 
  *                                               "", 
  *                                               ""
  *                                           ],
  *                                           "labels" : [ 
  *                                              "String", 
  *                                           "String"
  *                                           ],
  *                                           "responseType" : """
  *                                       },
  *                                       "criteriaId" : ""
  *                                   }
  *                               }
  *                           ],
  *                           "remarks" : "",
  *                           "fileName" : [],
  *                           "payload" : {
  *                               "question" : [ 
  *                                   "String"", 
  *                                   "Stgring"
  *                               ],
  *                              "labels" : [ 
  *                                   [ 
  *                                       [ 
  *                                           {
  *                                               "_id" : "",
  *                                               "question" : [ 
  *                                                   "String", 
  *                                                   "String"
  *                                               ],
  *                                               "options" : [ 
  *                                                   {
  *                                                       "value" : "",
  *                                                       "label" : ""
  *                                                   }
  *                                               ],
  *                                               "children" : [],
  *                                               "questionGroup" : [ 
  *                                                   ""
  *                                               ],
  *                                               "fileName" : [],
  *                                               "instanceQuestions" : [],
  *                                               "deleted" : Boolean,
  *                                               "tip" : "",
  *                                               "externalId" : "",
  *                                               "visibleIf" : "",
  *                                               "file" : "",
  *                                               "responseType" : "",
  *                                               "validation" : {
  *                                                   "required" : Boolean
  *                                               },
  *                                               "showRemarks" : Boolean,
  *                                               "isCompleted" : Boolean,
  *                                               "remarks" : "",
  *                                               "value" : "",
  *                                               "canBeNotApplicable" : "Boolean",
  *                                               "usedForScoring" : "",
  *                                               "modeOfCollection" : "",
  *                                               "questionType" : "",
  *                                               "accessibility" : "",
  *                                               "updatedAt" : "Date",
  *                                               "createdAt" : "Date",
  *                                               "__v" : 0,
  *                                               "payload" : {
  *                                                   "criteriaId" : ""
  *                                               }
  *                                           }, 
  *                                           {
  *                                               "_id" : "",
  *                                               "question" : [ 
  *                                                   "String", 
  *                                                   "String"
  *                                               ],
  *                                               "options" : [ 
  *                                                   {
  *                                                       "value" : "",
  *                                                       "label" : ""
  *                                                   }
  *                                               ],
  *                                               "children" : [],
  *                                               "questionGroup" : [ 
  *                                                   "String"
  *                                               ],
  *                                               "fileName" : [],
  *                                               "instanceQuestions" : [],
  *                                               "deleted" : Boolean,
  *                                               "tip" : "",
  *                                               "externalId" : "",
  *                                               "visibleIf" : "",
  *                                               "file" : "",
  *                                               "responseType" : "",
  *                                               "validation" : {
  *                                                   "required" : Boolean
  *                                               },
  *                                               "showRemarks" : Boolean,
  *                                               "isCompleted" : Boolean,
  *                                               "remarks" : "",
  *                                               "value" : "",
  *                                               "canBeNotApplicable" : "Boolean",
  *                                               "usedForScoring" : "",
  *                                               "modeOfCollection" : "",
  *                                               "questionType" : "",
  *                                               "accessibility" : "",
  *                                               "updatedAt" : "Date",
  *                                               "createdAt" : "Date",
  *                                               "__v" : 0,
  *                                               "payload" : {
  *                                                   "criteriaId" : ""
  *                                               }
  *                                           }
  *                                       ], 
  *                                   ]
  *                               ],
  *                               "responseType" : ""
  *                           },
  *                           "criteriaId" : ""
  *                       }
  *                   },
  *                   "startTime" : Date,
  *                   "endTime" : Date,
  *                   "gpsLocation" : "String,String",
  *                   "submittedBy" : """,
  *                   "isValid" : Boolean
  *               }
  * }
  * @apiUse successBody
  * @apiUse errorBody
  */

  async make(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let response = await submissionsHelper.createEvidencesInSubmission(req, "observationSubmissions", false);

        if (response.result.status && response.result.status === "completed") {
          await observationSubmissionsHelper.pushToKafka(req.params._id)
          await observationSubmissionsHelper.generateHtml(req.params._id)
        }

        return resolve(response);

      } catch (error) {

        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });

      }

    })
  }

  /**
  * @api {get} /assessment/api/v1/observationSubmissions/isAllowed:observationSubmissionId?evidenceId="LW" Check Submissions Status 
  * @apiVersion 1.0.0
  * @apiName Check Submissions Status 
  * @apiGroup Observation Submissions
  * @apiParam {String} evidenceId Evidence ID.
  * @apiSampleRequest /assessment/api/v1/observationSubmissions/isAllowed/5d2c1c57037306041ef0c7ea?evidenceId=SO
  * @apiParamExample {json} Response:
  * "result": {
      "allowed": true
    }
  * @apiUse successBody
  * @apiUse errorBody
  */

  async isAllowed(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = {
          allowed: true
        }

        let message = "Observation submission check completed successfully";

        let submissionDocument = await database.models.observationSubmissions.findOne(
          { "_id": req.params._id },
          {
            ["evidences." + req.query.evidenceId + ".isSubmitted"]: 1,
            ["evidences." + req.query.evidenceId + ".submissions"]: 1
          }
        );

        if (!submissionDocument || !submissionDocument._id) {
          throw "Couldn't find the submission document"
        } else {
          if (submissionDocument.evidences[req.query.evidenceId].isSubmitted && submissionDocument.evidences[req.query.evidenceId].isSubmitted == true) {
            submissionDocument.evidences[req.query.evidenceId].submissions.forEach(submission => {
              if (submission.submittedBy == req.userDetails.userId) {
                result.allowed = false
              }
            })
          }
        }

        let response = {
          message: message,
          result: result
        };

        return resolve(response);

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }


  /**
  * @api {get} /assessment/api/v1/observationSubmissions/delete/:observationSubmissionId Delete Observation Submission
  * @apiVersion 1.0.0
  * @apiName Delete Observation Submission
  * @apiGroup Observation Submissions
  * @apiUse successBody
  * @apiUse errorBody
  */

  async delete(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let message = "Observation submission deleted successfully";

        let submissionDocument = await database.models.observationSubmissions.deleteOne(
          {
            "_id": req.params._id,
            status: "started",
            createdBy: req.userDetails.userId
          }
        );

        if (!submissionDocument.n) {
          throw "Couldn't find the submission document"
        }

        let response = {
          message: message
        };

        return resolve(response);

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }

  /**
* @api {get} /assessment/api/v1/observationSubmissions/generateHtml/:observationSubmissionId  Generate Observation Submissions PDF
* @apiVersion 1.0.0
* @apiName Generate Observation Submissions PDF
* @apiGroup Observation Submissions
* @apiUse successBody
* @apiUse errorBody
*/
  async generateHtml(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let generatePdf = await observationSubmissionsHelper.generateHtml(req.params._id)
        return resolve(generatePdf);

      } catch (error) {
        return reject({
          status: 500,
          message: error
        });
      }
    })
  }


  /**
  * @api {get} /assessment/api/v1/observationSubmissions/pdfFileUrl/:observationSubmissionId Get Observation Submission PDF URL
  * @apiVersion 1.0.0
  * @apiName Get Observation Submission PDF URL
  * @apiGroup Observation Submissions
  * @apiUse successBody
  * @apiUse errorBody
  */

  async pdfFileUrl(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = {
          url: ""
        }

        let message = "Observation submission PDF File URL fetched successfully";

        let submissionDocument = await database.models.observationSubmissions.findOne(
          {
            $and: [
              { "_id": req.params._id },
              { pdfFileUrl: { $ne: "" } },
              { pdfFileUrl: { $exists: true } }
            ]
          },
          {
            pdfFileUrl: 1
          }
        );

        if (!submissionDocument || !submissionDocument._id) {
          message = "PDF not available."
        } else {
          result.url = "https://storage.googleapis.com/sl-" + (process.env.NODE_ENV == "production" ? "prod" : "dev") + "-storage/" + submissionDocument.pdfFileUrl
        }

        let response = {
          message: message,
          result: result
        };

        return resolve(response);


      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }

  /**
  * @api {get} /assessment/api/v1/observationSubmissions/pushToKafka/:observationSubmissionId Push Observation Submission to Kafka
  * @apiVersion 1.0.0
  * @apiName Push Observation Submission to Kafka
  * @apiGroup Observation Submissions
  * @apiUse successBody
  * @apiUse errorBody
  */

  async pushToKafka(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let pushObservationSubmissionToKafka = await observationSubmissionsHelper.pushToKafka(req.params._id)

        if(pushObservationSubmissionToKafka.status != "success") {
          throw pushObservationSubmissionToKafka.message
        }

        return resolve({
          message: pushObservationSubmissionToKafka.message
        });

      } catch (error) {
        return reject({
          status: 500,
          message: error
        });
      }
    })
  }


  /**
  * @api {get} /assessment/api/v1/observationSubmissions/rate/:entityExternalId?solutionId=:solutionExternalId&createdBy=:keycloakUserId&submissionNumber=:submissionInstanceNumber Rate a Single Entity of Observation
  * @apiVersion 1.0.0
  * @apiName Rate a Single Entity of Observation
  * @apiGroup Observation Submissions
  * @apiParam {String} solutionId Solution External ID.
  * @apiParam {String} createdBy Keycloak user ID.
  * @apiParam {String} submissionNumber Submission Number.
  * @apiSampleRequest /assessment/api/v1/observationSubmissions/rate/1002036?solutionId=EF-DCPCR-2018-001&createdBy=e97b5582-471c-4649-8401-3cc4249359bb&submissionNumber=2
  * @apiUse successBody
  * @apiUse errorBody
  */

  async rate(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};
        let message = "Crtieria rating completed successfully"

        let createdBy = req.query.createdBy
        let solutionId = req.query.solutionId
        let entityId = req.params._id
        let submissionNumber = (req.query.submissionNumber) ? parseInt(req.query.submissionNumber) : 1

        if (!createdBy) {
          throw "Created by is not found"
        }

        if (!solutionId) {
          throw "Solution Id is not found"
        }

        if (!entityId) {
          throw "Entity Id is not found"
        }


        let solutionDocument = await database.models.solutions.findOne({
          externalId: solutionId,
          type : "observation",
          scoringSystem : "pointsBasedScoring"
        }, { themes: 1, levelToScoreMapping: 1, scoringSystem : 1, flattenedThemes : 1}).lean()

        if (!solutionDocument) {
          return resolve({
            status: 400,
            message: "Solution does not exist"
          });
        }

        let queryObject = {
          "createdBy": createdBy,
          "entityExternalId": entityId,
          "solutionExternalId": solutionId,
          "submissionNumber" : (submissionNumber) ? submissionNumber : 1
        }

        let submissionDocument = await database.models.observationSubmissions.findOne(
          queryObject,
          { "answers": 1, "criteria": 1, "evidencesStatus": 1, "entityInformation": 1, "entityProfile": 1, "solutionExternalId": 1 }
        ).lean();

        if (!submissionDocument._id) {
          throw "Couldn't find the submission document"
        }

        submissionDocument.submissionCollection = "observationSubmissions"
        submissionDocument.scoringSystem = "pointsBasedScoring"

        let allCriteriaInSolution = new Array
        let allQuestionIdInSolution = new Array
        let solutionQuestions = new Array

        allCriteriaInSolution = gen.utils.getCriteriaIds(solutionDocument.themes);

        if(allCriteriaInSolution.length > 0) {
          
          submissionDocument.themes = solutionDocument.flattenedThemes

          let allCriteriaDocument = await criteriaHelper.criteriaDocument({
            _id : {
              $in : allCriteriaInSolution
            }
          }, [
            "evidences"
          ])

          allQuestionIdInSolution = gen.utils.getAllQuestionId(allCriteriaDocument);
        }

        if(allQuestionIdInSolution.length > 0) {

          solutionQuestions = await questionsHelper.questionDocument({
            _id : {
              $in : allQuestionIdInSolution
            },
            responseType : {
              $in : [
                "radio",
                "multiselect",
                "slider"
              ]
            }
          }, [
            "weightage",
            "options",
            "sliderOptions",
            "responseType"
          ])

        }

        if(solutionQuestions.length > 0) {
          submissionDocument.questionDocuments = {}
          solutionQuestions.forEach(question => {
            submissionDocument.questionDocuments[question._id.toString()] = {
              _id : question._id,
              weightage : question.weightage
            }
            let questionMaxScore = 0
            if(question.options && question.options.length > 0) {
              if(question.responseType != "multiselect") {
                questionMaxScore = _.maxBy(question.options, 'score').score;
              }
              question.options.forEach(option => {
                if(question.responseType == "multiselect") {
                  questionMaxScore += option.score
                }
                (option.score && option.score > 0) ? submissionDocument.questionDocuments[question._id.toString()][`${option.value}-score`] = option.score : ""
              })
            }
            if(question.sliderOptions && question.sliderOptions.length > 0) {
              questionMaxScore = _.maxBy(question.sliderOptions, 'score').score;
              submissionDocument.questionDocuments[question._id.toString()].sliderOptions = question.sliderOptions
            }
            submissionDocument.questionDocuments[question._id.toString()].maxScore = questionMaxScore
          })
        }


        let resultingArray = await submissionsHelper.rateEntities([submissionDocument], "singleRateApi")

        return resolve({ result: resultingArray })

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }

  /**
  * @api {get} /assessment/api/v1/observationSubmissions/multiRate?entityId=:entityExternalId1,:entityExternalId2&solutionId=:solutionExternalId&createdBy=:keycloakUserId&submissionNumber=:submissionInstanceNumber Rate Multiple Entities of Observation
  * @apiVersion 1.0.0
  * @apiName Rate Multiple Entities of Observation
  * @apiGroup Observation Submissions
  * @apiParam {String} entityId Entity ID.
  * @apiParam {String} solutionId Solution External ID.
  * @apiParam {String} createdBy Keycloak user ID.
  * @apiParam {String} submissionNumber Submission Number.
  * @apiSampleRequest /assessment/api/v1/observationSubmissions/multiRate?entityId=1556397,1310274&solutionId=EF-DCPCR-2018-001&createdBy=e97b5582-471c-4649-8401-3cc4249359bb&submissionNumber=all
  * @apiUse successBody
  * @apiUse errorBody
  */

  async multiRate(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};
        let message = "Crtieria rating completed successfully"

        let createdBy = req.query.createdBy
        let solutionId = req.query.solutionId
        let submissionNumber = (req.query.submissionNumber) ? req.query.submissionNumber : "all"
        let entityId = req.query.entityId.split(",")

        if (!createdBy) {
          throw "Created by is not found"
        }

        if (!solutionId) {
          throw "Solution Id is not found"
        }

        if (!req.query.entityId || !(req.query.entityId.length >= 1)) {
          throw "Entity Id is not found"
        }

        let solutionDocument = await database.models.solutions.findOne({
          externalId: solutionId,
          type : "observation",
          scoringSystem : "pointsBasedScoring"
        }, { themes: 1, levelToScoreMapping: 1, scoringSystem : 1, flattenedThemes : 1, type : 1 }).lean()

        if (!solutionDocument) {
          return resolve({
            status: 400,
            message: "Solution does not exist"
          });
        }

        let queryObject = {
          "createdBy": createdBy,
          "solutionExternalId": solutionId,
          "entityExternalId": { $in: entityId }
        }

        if(submissionNumber != "all" && parseInt(submissionNumber)) {
          queryObject["submissionNumber"] = parseInt(submissionNumber)
        }

        let submissionDocuments = await database.models.observationSubmissions.find(
          queryObject,
          { answers: 1, criteria: 1, evidencesStatus: 1, entityProfile: 1, entityInformation: 1, solutionExternalId: 1, entityExternalId: 1 }
        ).lean();

        if (!submissionDocuments) {
          throw "Couldn't find the submission document"
        }

        let commonSolutionDocumentParameters = {
          submissionCollection : "observationSubmissions",
          scoringSystem : "pointsBasedScoring"
        }

        let allCriteriaInSolution = new Array
        let allQuestionIdInSolution = new Array
        let solutionQuestions = new Array

        allCriteriaInSolution = gen.utils.getCriteriaIds(solutionDocument.themes);

        if(allCriteriaInSolution.length > 0) {
          
          commonSolutionDocumentParameters.themes = solutionDocument.flattenedThemes

          let allCriteriaDocument = await criteriaHelper.criteriaDocument({
            _id : {
              $in : allCriteriaInSolution
            }
          }, [
            "evidences"
          ])

          allQuestionIdInSolution = gen.utils.getAllQuestionId(allCriteriaDocument);
        }

        if(allQuestionIdInSolution.length > 0) {

          solutionQuestions = await questionsHelper.questionDocument({
            _id : {
              $in : allQuestionIdInSolution
            },
            responseType : {
              $in : [
                "radio",
                "multiselect",
                "slider"
              ]
            }
          }, [
            "weightage",
            "options",
            "sliderOptions",
            "responseType"
          ])

        }

        if(solutionQuestions.length > 0) {
          commonSolutionDocumentParameters.questionDocuments = {}
          solutionQuestions.forEach(question => {
            commonSolutionDocumentParameters.questionDocuments[question._id.toString()] = {
              _id : question._id,
              weightage : question.weightage
            }
            let questionMaxScore = 0
            if(question.options && question.options.length > 0) {
              if(question.responseType != "multiselect") {
                questionMaxScore = _.maxBy(question.options, 'score').score;
              }
              question.options.forEach(option => {
                if(question.responseType == "multiselect") {
                  questionMaxScore += option.score
                }
                (option.score && option.score > 0) ? commonSolutionDocumentParameters.questionDocuments[question._id.toString()][`${option.value}-score`] = option.score : ""
              })
            }
            if(question.sliderOptions && question.sliderOptions.length > 0) {
              questionMaxScore = _.maxBy(question.sliderOptions, 'score').score;
              commonSolutionDocumentParameters.questionDocuments[question._id.toString()].sliderOptions = question.sliderOptions
            }
            commonSolutionDocumentParameters.questionDocuments[question._id.toString()].maxScore = questionMaxScore
          })
        }

        if(commonSolutionDocumentParameters && Object.keys(commonSolutionDocumentParameters).length > 0) {
          submissionDocuments.forEach(eachsubmissionDocument => {
            _.merge(eachsubmissionDocument,commonSolutionDocumentParameters)
          })
        }

        let resultingArray = await submissionsHelper.rateEntities(submissionDocuments, "multiRateApi")

        return resolve({ result: resultingArray })

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }

};

