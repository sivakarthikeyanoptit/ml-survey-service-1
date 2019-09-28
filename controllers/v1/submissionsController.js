const FileStream = require(ROOT_PATH + "/generics/fileStream");
const csv = require("csvtojson");
const submissionsHelper = require(ROOT_PATH + "/module/submissions/helper")

module.exports = class Submission extends Abstract {

  constructor() {
    super(submissionsSchema);
  }

  static get name() {
    return "submissions";
  }

  /**
  * @api {post} /assessment/api/v1/submissions/make/{{submissionId}} 
  * @apiVersion 1.0.0
  * @apiName submissions added successfully
  * @apiGroup Submissions
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

        req.body = req.body || {};
        let message = "Submission completed successfully"
        let runUpdateQuery = false

        let queryObject = {
          _id: ObjectId(req.params._id)
        }

        let queryOptions = {
          new: true
        }

        let submissionDocument = await database.models.submissions.findOne(
          queryObject
        );

        let updateObject = {}
        let result = {}

        if (req.body.entityProfile) {
          updateObject.$set = { entityProfile: req.body.entityProfile }
          runUpdateQuery = true
        }

        if (req.body.evidence) {
          req.body.evidence.gpsLocation = req.headers.gpslocation
          req.body.evidence.submittedBy = req.userDetails.userId
          req.body.evidence.submittedByName = req.userDetails.firstName + " " + req.userDetails.lastName
          req.body.evidence.submittedByEmail = req.userDetails.email
          req.body.evidence.submissionDate = new Date()

          let evidencesStatusToBeChanged = submissionDocument.evidencesStatus.find(singleEvidenceStatus => singleEvidenceStatus.externalId == req.body.evidence.externalId);
          if (submissionDocument.evidences[req.body.evidence.externalId].isSubmitted === false) {
            runUpdateQuery = true
            req.body.evidence.isValid = true
            let answerArray = {}
            Object.entries(req.body.evidence.answers).forEach(answer => {
              if (answer[1].responseType === "matrix" && answer[1].notApplicable != true) {
                if (answer[1].isAGeneralQuestion == true && submissionDocument.generalQuestions && submissionDocument.generalQuestions[answer[0]]) {
                  submissionDocument.generalQuestions[answer[0]].submissions.forEach(generalQuestionSubmission => {
                    generalQuestionSubmission.value.forEach(generalQuestionInstanceValue => {
                      generalQuestionInstanceValue.isAGeneralQuestionResponse = true
                      answer[1].value.push(generalQuestionInstanceValue)
                    })
                    generalQuestionSubmission.payload.labels[0].forEach(generalQuestionInstancePayload => {
                      answer[1].payload.labels[0].push(generalQuestionInstancePayload)
                    })
                  })
                }
                for (let countOfInstances = 0; countOfInstances < answer[1].value.length; countOfInstances++) {

                  _.valuesIn(answer[1].value[countOfInstances]).forEach(question => {

                    if (answerArray[question.qid]) {
                      answerArray[question.qid].instanceResponses.push(question.value)
                      answerArray[question.qid].instanceRemarks.push(question.remarks)
                      answerArray[question.qid].instanceFileName.push(question.fileName)
                    } else {
                      let clonedQuestion = { ...question }
                      clonedQuestion.instanceResponses = new Array
                      clonedQuestion.instanceRemarks = new Array
                      clonedQuestion.instanceFileName = new Array
                      clonedQuestion.instanceResponses.push(question.value)
                      clonedQuestion.instanceRemarks.push(question.remarks)
                      clonedQuestion.instanceFileName.push(question.fileName)
                      delete clonedQuestion.value
                      delete clonedQuestion.remarks
                      delete clonedQuestion.fileName
                      delete clonedQuestion.payload
                      answerArray[question.qid] = clonedQuestion
                    }

                  })
                }
                answer[1].countOfInstances = answer[1].value.length
              }
              answerArray[answer[0]] = answer[1]
            });

            if (answerArray.isAGeneralQuestionResponse) { delete answerArray.isAGeneralQuestionResponse }


            evidencesStatusToBeChanged['isSubmitted'] = true;
            evidencesStatusToBeChanged['notApplicable'] = req.body.evidence.notApplicable;
            evidencesStatusToBeChanged['startTime'] = req.body.evidence.startTime;
            evidencesStatusToBeChanged['endTime'] = req.body.evidence.endTime;
            evidencesStatusToBeChanged['hasConflicts'] = false;
            evidencesStatusToBeChanged['submissions'].push(_.omit(req.body.evidence, "answers"));

            updateObject.$push = {
              ["evidences." + req.body.evidence.externalId + ".submissions"]: req.body.evidence
            }
            updateObject.$set = {
              answers: _.assignIn(submissionDocument.answers, answerArray),
              ["evidences." + req.body.evidence.externalId + ".isSubmitted"]: true,
              ["evidences." + req.body.evidence.externalId + ".notApplicable"]: req.body.evidence.notApplicable,
              ["evidences." + req.body.evidence.externalId + ".startTime"]: req.body.evidence.startTime,
              ["evidences." + req.body.evidence.externalId + ".endTime"]: req.body.evidence.endTime,
              ["evidences." + req.body.evidence.externalId + ".hasConflicts"]: false,
              evidencesStatus: submissionDocument.evidencesStatus,
              status: (submissionDocument.status === "started") ? "inprogress" : submissionDocument.status
            }
          } else {
            runUpdateQuery = true
            req.body.evidence.isValid = false

            Object.entries(req.body.evidence.answers).forEach(answer => {
              if (answer[1].responseType === "matrix" && answer[1].notApplicable != true) {
                if (answer[1].isAGeneralQuestion == true && submissionDocument.generalQuestions && submissionDocument.generalQuestions[answer[0]]) {
                  submissionDocument.generalQuestions[answer[0]].submissions.forEach(generalQuestionSubmission => {
                    generalQuestionSubmission.value.forEach(generalQuestionInstanceValue => {
                      generalQuestionInstanceValue.isAGeneralQuestionResponse = true
                      answer[1].value.push(generalQuestionInstanceValue)
                    })
                    generalQuestionSubmission.payload.labels[0].forEach(generalQuestionInstancePayload => {
                      answer[1].payload.labels[0].push(generalQuestionInstancePayload)
                    })
                  })
                }
                answer[1].countOfInstances = answer[1].value.length
              }
            });

            updateObject.$push = {
              ["evidences." + req.body.evidence.externalId + ".submissions"]: req.body.evidence
            }

            evidencesStatusToBeChanged['hasConflicts'] = true;
            evidencesStatusToBeChanged['submissions'].push(_.omit(req.body.evidence, "answers"));

            updateObject.$set = {
              evidencesStatus: submissionDocument.evidencesStatus,
              ["evidences." + req.body.evidence.externalId + ".hasConflicts"]: true,
              status: (submissionDocument.ratingOfManualCriteriaEnabled === true) ? "inprogress" : "blocked"
            }

            message = "Duplicate evidence method submission detected."
          }

        }

        if (runUpdateQuery) {
          let updatedSubmissionDocument = await database.models.submissions.findOneAndUpdate(
            queryObject,
            updateObject,
            queryOptions
          );

          let canRatingsBeEnabled = await submissionsHelper.canEnableRatingQuestionsOfSubmission(updatedSubmissionDocument)
          let { ratingsEnabled } = canRatingsBeEnabled

          if (ratingsEnabled) {
            let updateStatusObject = {}
            updateStatusObject.$set = {}
            updateStatusObject.$set = {
              status: "completed",
              completedDate: new Date()
            }
            updatedSubmissionDocument = await database.models.submissions.findOneAndUpdate(
              queryObject,
              updateStatusObject,
              queryOptions
            );
          }

          let status = await submissionsHelper.extractStatusOfSubmission(updatedSubmissionDocument)

          let response = {
            message: message,
            result: status
          };

          return resolve(response);

        } else {

          let response = {
            message: message
          };

          return resolve(response);
        }

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
  * @api {post} /assessment/api/v1/submissions/completeParentInterview/:submissionId Complete parent interview
  * @apiVersion 1.0.0
  * @apiName Complete Parent Interview
  * @apiSampleRequest /assessment/api/v1/submissions/completeParentInterview/5c5147ae95743c5718445eff
  * @apiGroup Submissions
  * @apiUse successBody
  * @apiUse errorBody
  */

  async completeParentInterview(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};
        let message = "Parent Interview completed successfully."
        const parentInterviewEvidenceMethod = "PAI"
        let runUpdateQuery = false

        let queryObject = {
          _id: ObjectId(req.params._id)
        }

        let queryOptions = {
          new: true
        }

        let submissionDocument = await database.models.submissions.findOne(
          queryObject
        );

        let updateObject = {}
        updateObject.$set = {}


        let entityQueryObject = {
          _id: ObjectId(submissionDocument.entityId)
        }

        let entityUpdatedDocument = {};

        let updateEntityObject = {}

        updateEntityObject.$set = {}

        let evidencesStatusToBeChanged = submissionDocument.evidencesStatus.find(singleEvidenceStatus => singleEvidenceStatus.externalId == parentInterviewEvidenceMethod);

        if (submissionDocument && (submissionDocument.evidences[parentInterviewEvidenceMethod].isSubmitted != true)) {
          let evidenceSubmission = {}
          evidenceSubmission.externalId = parentInterviewEvidenceMethod
          evidenceSubmission.submittedBy = req.userDetails.userId
          evidenceSubmission.submittedByName = req.userDetails.firstName + " " + req.userDetails.lastName
          evidenceSubmission.submittedByEmail = req.userDetails.email
          evidenceSubmission.submissionDate = new Date()
          evidenceSubmission.gpsLocation = "web"
          evidenceSubmission.isValid = true
          evidenceSubmission.endTime = new Date();

          let evidenceSubmissionAnswerArray = {}


          Object.entries(submissionDocument.parentInterviewResponses).forEach(parentInterviewResponse => {
            if (parentInterviewResponse[1].status === "completed") {
              Object.entries(parentInterviewResponse[1].answers).forEach(answer => {
                if (evidenceSubmissionAnswerArray[answer[0]]) {
                  let tempValue = {}
                  answer[1].value.forEach(individualValue => {
                    tempValue[Object.values(individualValue)[0].qid] = Object.values(individualValue)[0]
                  })
                  evidenceSubmissionAnswerArray[answer[0]].value.push(tempValue)
                  if (answer[1].payload && answer[1].payload.labels && answer[1].payload.labels.length > 0) {
                    answer[1].payload.labels[0].forEach(instanceResponsePayload => {
                      evidenceSubmissionAnswerArray[answer[0]].payload.labels[0].push(instanceResponsePayload)
                    })
                  }
                  evidenceSubmissionAnswerArray[answer[0]].countOfInstances = evidenceSubmissionAnswerArray[answer[0]].value.length
                } else {
                  evidenceSubmissionAnswerArray[answer[0]] = _.omit(answer[1], "value")
                  evidenceSubmissionAnswerArray[answer[0]].value = new Array
                  let tempValue = {}
                  answer[1].value.forEach(individualValue => {
                    tempValue[Object.values(individualValue)[0].qid] = Object.values(individualValue)[0]
                  })
                  evidenceSubmissionAnswerArray[answer[0]].value.push(tempValue)
                }
              })
            }
          });

          evidenceSubmission.answers = evidenceSubmissionAnswerArray

          if (Object.keys(evidenceSubmission.answers).length > 0) {
            runUpdateQuery = true
          }

          let answerArray = {}
          Object.entries(evidenceSubmission.answers).forEach(answer => {
            if (answer[1].responseType === "matrix") {

              for (let countOfInstances = 0; countOfInstances < answer[1].value.length; countOfInstances++) {

                _.valuesIn(answer[1].value[countOfInstances]).forEach(question => {

                  if (answerArray[question.qid]) {
                    answerArray[question.qid].instanceResponses.push(question.value)
                    answerArray[question.qid].instanceRemarks.push(question.remarks)
                    answerArray[question.qid].instanceFileName.push(question.fileName)
                  } else {
                    let clonedQuestion = { ...question }
                    clonedQuestion.instanceResponses = new Array
                    clonedQuestion.instanceRemarks = new Array
                    clonedQuestion.instanceFileName = new Array
                    clonedQuestion.instanceResponses.push(question.value)
                    clonedQuestion.instanceRemarks.push(question.remarks)
                    clonedQuestion.instanceFileName.push(question.fileName)
                    delete clonedQuestion.value
                    delete clonedQuestion.remarks
                    delete clonedQuestion.fileName
                    delete clonedQuestion.payload
                    answerArray[question.qid] = clonedQuestion
                  }

                })
              }
              answer[1].countOfInstances = answer[1].value.length
            }
            answerArray[answer[0]] = answer[1]
          });

          evidencesStatusToBeChanged['isSubmitted'] = true;
          evidencesStatusToBeChanged['notApplicable'] = false;
          evidencesStatusToBeChanged['startTime'] = "";
          evidencesStatusToBeChanged['endTime'] = new Date;
          evidencesStatusToBeChanged['hasConflicts'] = false;
          evidencesStatusToBeChanged['submissions'].push(_.omit(evidenceSubmission, "answers"));

          updateObject.$push = {
            ["evidences." + parentInterviewEvidenceMethod + ".submissions"]: evidenceSubmission
          }
          updateObject.$set = {
            answers: _.assignIn(submissionDocument.answers, answerArray),
            ["evidences." + parentInterviewEvidenceMethod + ".isSubmitted"]: true,
            ["evidences." + parentInterviewEvidenceMethod + ".notApplicable"]: false,
            ["evidences." + parentInterviewEvidenceMethod + ".startTime"]: "",
            ["evidences." + parentInterviewEvidenceMethod + ".endTime"]: new Date,
            ["evidences." + parentInterviewEvidenceMethod + ".hasConflicts"]: false,
            evidencesStatus: submissionDocument.evidencesStatus,
            status: (submissionDocument.status === "started") ? "inprogress" : submissionDocument.status
          }


        } else {


          updateEntityObject.$set = {
            "metaInformation.isParentInterviewCompleted": true
          }

          entityUpdatedDocument = await database.models.entities.findOneAndUpdate(
            entityQueryObject,
            updateEntityObject,
            {}
          );



          //isParentInterviewCompleted

          let response = {
            message: "Already completed."
          };

          return resolve(response);
        }

        if (runUpdateQuery) {
          let updatedSubmissionDocument = await database.models.submissions.findOneAndUpdate(
            queryObject,
            updateObject,
            queryOptions
          );

          let canRatingsBeEnabled = await submissionsHelper.canEnableRatingQuestionsOfSubmission(updatedSubmissionDocument)
          let { ratingsEnabled } = canRatingsBeEnabled

          if (ratingsEnabled) {
            let updateStatusObject = {}
            updateStatusObject.$set = {}
            updateStatusObject.$set = {
              status: "completed",
              completedDate: new Date()
            }
            updatedSubmissionDocument = await database.models.submissions.findOneAndUpdate(
              queryObject,
              updateStatusObject,
              queryOptions
            );
          }

          updateEntityObject.$set = {
            "metaInformation.isParentInterviewCompleted": true
          }

          entityUpdatedDocument = await database.models.entities.findOneAndUpdate(
            entityQueryObject,
            updateEntityObject,
            {}
          );


          let response = {
            message: message
          };

          return resolve(response);

        } else {

          let response = {
            message: "Failed to complete parent interview."
          };

          return resolve(response);
        }

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
  * @api {post} /assessment/api/v1/submissions/generalQuestions/:submissionId General Question Submission
  * @apiVersion 1.0.0
  * @apiName General Question Submission
  * @apiSampleRequest /assessment/api/v1/submissions/generalQuestions/5c5147ae95743c5718445eff
  * @apiGroup Submissions
  * @apiParam {String} submissionId Submission ID.
  * @apiUse successBody
  * @apiUse errorBody
  */

  async generalQuestions(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};
        let message = "General question submitted successfully."
        let runUpdateQuery = false

        let queryObject = {
          _id: ObjectId(req.params._id)
        }

        let queryOptions = {
          new: true
        }

        let submissionDocument = await database.models.submissions.findOne(
          queryObject
        );

        let updateObject = {}
        updateObject.$set = {}

        if (req.body.answers) {
          let gpsLocation = req.headers.gpslocation
          let submittedBy = req.userDetails.userId
          let submissionDate = new Date()

          Object.entries(req.body.answers).forEach(answer => {
            if (answer[1].isAGeneralQuestion == true && answer[1].responseType === "matrix" && answer[1].evidenceMethod != "") {
              runUpdateQuery = true
              answer[1].gpslocation = gpsLocation
              answer[1].submittedBy = submittedBy
              answer[1].submissionDate = submissionDate
              if (submissionDocument.generalQuestions && submissionDocument.generalQuestions[answer[0]]) {
                submissionDocument.generalQuestions[answer[0]].submissions.push(answer[1])
              } else {
                submissionDocument.generalQuestions = {
                  [answer[0]]: {
                    submissions: [answer[1]]
                  }
                }
              }
              if (submissionDocument.evidences[answer[1].evidenceMethod].isSubmitted === true) {
                submissionDocument.evidences[answer[1].evidenceMethod].submissions.forEach((evidenceMethodSubmission, indexOfEvidenceMethodSubmission) => {
                  if (evidenceMethodSubmission.answers[answer[0]] && evidenceMethodSubmission.answers[answer[0]].notApplicable != true) {
                    answer[1].value.forEach(incomingGeneralQuestionInstance => {
                      incomingGeneralQuestionInstance.isAGeneralQuestionResponse = true
                      evidenceMethodSubmission.answers[answer[0]].value.push(incomingGeneralQuestionInstance)
                    })
                    answer[1].payload.labels[0].forEach(incomingGeneralQuestionInstancePayload => {
                      evidenceMethodSubmission.answers[answer[0]].payload.labels[0].push(incomingGeneralQuestionInstancePayload)
                    })
                    evidenceMethodSubmission.answers[answer[0]].countOfInstances = evidenceMethodSubmission.answers[answer[0]].value.length
                  }
                  if (evidenceMethodSubmission.isValid === true) {

                    for (let countOfInstances = 0; countOfInstances < answer[1].value.length; countOfInstances++) {

                      _.valuesIn(answer[1].value[countOfInstances]).forEach(question => {

                        if (submissionDocument.answers[question.qid]) {
                          submissionDocument.answers[question.qid].instanceResponses.push(question.value)
                          submissionDocument.answers[question.qid].instanceRemarks.push(question.remarks)
                          submissionDocument.answers[question.qid].instanceFileName.push(question.fileName)
                        } else {
                          let clonedQuestion = { ...question }
                          clonedQuestion.instanceResponses = new Array
                          clonedQuestion.instanceRemarks = new Array
                          clonedQuestion.instanceFileName = new Array
                          clonedQuestion.instanceResponses.push(question.value)
                          clonedQuestion.instanceRemarks.push(question.remarks)
                          clonedQuestion.instanceFileName.push(question.fileName)
                          delete clonedQuestion.value
                          delete clonedQuestion.remarks
                          delete clonedQuestion.fileName
                          delete clonedQuestion.payload
                          submissionDocument.answers[question.qid] = clonedQuestion
                        }

                      })
                    }
                  }

                })
              }

            }
          });

          updateObject.$set.generalQuestions = submissionDocument.generalQuestions
          updateObject.$set.evidences = submissionDocument.evidences
          updateObject.$set.answers = submissionDocument.answers

        }

        if (runUpdateQuery) {
          let updatedSubmissionDocument = await database.models.submissions.findOneAndUpdate(
            queryObject,
            updateObject,
            queryOptions
          );

          let response = {
            message: message
          };

          return resolve(response);

        } else {

          let response = {
            message: "Failed to submit general questions"
          };

          return resolve(response);
        }

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
  * @api {post} /assessment/api/v1/submissions/parentInterview/:submissionId Compete Parent Interview
  * @apiVersion 1.0.0
  * @apiName Compete Parent Interview
  * @apiSampleRequest /assessment/api/v1/submissions/parentInterview/5c5147ae95743c5718445eff
  * @apiGroup Submissions
  * @apiUse successBody
  * @apiUse errorBody
  */

  async parentInterview(req) {

    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};
        let message = "Parent interview submitted successfully."

        let queryObject = {
          _id: ObjectId(req.params._id)
        }

        let queryOptions = {
          new: true
        }

        let submissionDocument = await database.models.submissions.findOne(
          queryObject
        );

        if (req.body.parentId && req.body.status && submissionDocument) {

          let parentInformation = await database.models.entities.findOne(
            { _id: ObjectId(req.body.parentId) },
            { metaInformation: 1 }
          ).lean();

          if (parentInformation) {
            let parentInterview = {}
            parentInterview.parentInformation = parentInformation.metaInformation
            parentInterview.status = req.body.status
            parentInterview.answers = req.body.answers
            if (req.body.status == "completed") {
              parentInterview.completedAt = new Date()
              parentInterview.startedAt = (!submissionDocument.parentInterviewResponses || !submissionDocument.parentInterviewResponses[req.body.parentId] || !submissionDocument.parentInterviewResponses[req.body.parentId].startedAt) ? new Date() : submissionDocument.parentInterviewResponses[req.body.parentId].startedAt
            } else if (req.body.status == "started") {
              parentInterview.startedAt = (submissionDocument.parentInterviewResponses && submissionDocument.parentInterviewResponses[req.body.parentId] && submissionDocument.parentInterviewResponses[req.body.parentId].startedAt) ? submissionDocument.parentInterviewResponses[req.body.parentId].startedAt : new Date()
            }
            if (submissionDocument.parentInterviewResponses) {
              submissionDocument.parentInterviewResponses[req.body.parentId] = _.merge(submissionDocument.parentInterviewResponses[req.body.parentId], parentInterview)
            } else {
              submissionDocument.parentInterviewResponses = {}
              submissionDocument.parentInterviewResponses[req.body.parentId] = parentInterview
            }

            let parentInterviewResponseStatus = _.omit(submissionDocument.parentInterviewResponses[req.body.parentId], ["parentInformation", "answers"])
            parentInterviewResponseStatus.parentId = parentInformation._id
            parentInterviewResponseStatus.parentType = parentInterview.parentInformation.type

            if (submissionDocument.parentInterviewResponsesStatus) {
              let parentInterviewReponseStatusElementIndex = submissionDocument.parentInterviewResponsesStatus.findIndex(parentInterviewStatus => parentInterviewStatus.parentId.toString() === parentInterviewResponseStatus.parentId.toString())
              if (parentInterviewReponseStatusElementIndex >= 0) {
                submissionDocument.parentInterviewResponsesStatus[parentInterviewReponseStatusElementIndex] = parentInterviewResponseStatus
              } else {
                submissionDocument.parentInterviewResponsesStatus.push(parentInterviewResponseStatus)
              }
            } else {
              submissionDocument.parentInterviewResponsesStatus = new Array
              submissionDocument.parentInterviewResponsesStatus.push(parentInterviewResponseStatus)
            }

            let updateObject = {}
            updateObject.$set = {}
            updateObject.$set.parentInterviewResponses = {}
            updateObject.$set.parentInterviewResponses = submissionDocument.parentInterviewResponses
            updateObject.$set.parentInterviewResponsesStatus = submissionDocument.parentInterviewResponsesStatus

            let updatedSubmissionDocument = await database.models.submissions.findOneAndUpdate(
              { _id: ObjectId(submissionDocument._id) },
              updateObject,
              queryOptions
            );

          } else {
            throw "No parent information found."
          }

        } else {
          throw "No submission document found."
        }


        let response = {
          message: message
        };

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
  * @api {get} /assessment/api/v1/submissions/getParentInterviewResponse/:submissionId Get Parent Interview Response
  * @apiVersion 1.0.0
  * @apiName Get Parent Interview Response
  * @apiGroup Submissions
  * @apiUse successBody
  * @apiUse errorBody
  */

  async getParentInterviewResponse(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};
        let message = "Parent interview response fetched successfully."
        let result = {}

        let queryObject = {
          _id: ObjectId(req.params._id)
        }

        let queryOptions = {
          new: true
        }

        let submissionDocument = await database.models.submissions.findOne(
          queryObject
        );

        if (req.query.parentId && submissionDocument) {

          let parentInformation = await database.models.entities.findOne(
            { _id: ObjectId(req.query.parentId) },
            { metaInformation: 1 }
          );

          if (parentInformation) {
            result.parentInformation = parentInformation.metaInformation
            result.parentId = req.query.parentId
          }

          if ((submissionDocument.parentInterviewResponses) && submissionDocument.parentInterviewResponses[req.query.parentId]) {
            result.status = submissionDocument.parentInterviewResponses[req.query.parentId].status
            result.answers = submissionDocument.parentInterviewResponses[req.query.parentId].answers
          }
          else {
            let noSubmissionResponse = {
              result: [],
              message: "No submissions for parent found"
            };

            return resolve(noSubmissionResponse);

          }

        } else {

          let noSubmissionResponse = {
            result: [],
            message: "No submissions found"
          };

          return resolve(noSubmissionResponse);
        }


        let response = {
          result: result,
          message: message
        };

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
  * @api {get} /assessment/api/v1/submissions/rate/:entityExternalId Rate an Entity
  * @apiVersion 1.0.0
  * @apiName Rate an Entity
  * @apiGroup Submissions
  * @apiParam {String} programId Program External ID.
  * @apiParam {String} solutionId Solution External ID.
  * @apiUse successBody
  * @apiUse errorBody
  */

  async rate(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};
        let message = "Crtieria rating completed successfully"

        let programId = req.query.programId
        let solutionId = req.query.solutionId
        let entityId = req.params._id

        if (!programId) {
          throw "Program Id is not found"
        }

        if (!solutionId) {
          throw "Solution Id is not found"
        }

        if (!entityId) {
          throw "Entity Id is not found"
        }

        let queryObject = {
          "entityExternalId": entityId,
          "programExternalId": programId,
          "solutionExternalId": solutionId
        }

        let submissionDocument = await database.models.submissions.findOne(
          queryObject,
          { "answers": 1, "criteria": 1, "evidencesStatus": 1, "entityInformation": 1, "entityProfile": 1, "programExternalId": 1 }
        ).lean();

        if (!submissionDocument._id) {
          throw "Couldn't find the submission document"
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
  * @api {get} /assessment/api/v1/submissions/multiRate Multi Rate
  * @apiVersion 1.0.0
  * @apiName Multi Rate
  * @apiGroup Submissions
  * @apiParam {String} programId Program External ID.
  * @apiParam {String} solutionId Solution External ID.
  * @apiParam {String} entityId Entity ID.
  * @apiUse successBody
  * @apiUse errorBody
  */

  async multiRate(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};
        let message = "Crtieria rating completed successfully"

        let programId = req.query.programId
        let solutionId = req.query.solutionId
        let entityId = req.query.entityId.split(",")

        if (!programId) {
          throw "Program Id is not found"
        }

        if (!solutionId) {
          throw "Solution Id is not found"
        }

        if (!req.query.entityId) {
          throw "Entity Id is not found"
        }

        let queryObject = {
          "entityExternalId": { $in: entityId },
          "programExternalId": programId,
          "solutionExternalId": solutionId
        }

        let submissionDocuments = await database.models.submissions.find(
          queryObject,
          { answers: 1, criteria: 1, evidencesStatus: 1, entityProfile: 1, entityInformation: 1, "programExternalId": 1, entityExternalId: 1 }
        ).lean();

        if (!submissionDocuments) {
          throw "Couldn't find the submission document"
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

  async dummyRate(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};
        let message = "Dummy Crtieria rating completed successfully"

        let queryObject = {
          "entityExternalId": req.params._id
        }

        let submissionDocument = await database.models.submissions.findOne(
          queryObject,
          { criteria: 1 }
        ).lean();

        if (!submissionDocument._id) {
          throw "Couldn't find the submission document"
        }

        let result = {}
        result.runUpdateQuery = true
        let rubricLevels = ["L1", "L2", "L3", "L4"]

        if (true) {
          let criteriaData = await Promise.all(submissionDocument.criteria.map(async (criteria) => {

            if (!criteria.score || criteria.score != "" || criteria.score == "No Level Matched" || criteria.score == "NA") {
              criteria.score = rubricLevels[Math.floor(Math.random() * rubricLevels.length)];
            }

            return criteria

          }));

          if (criteriaData.findIndex(criteria => criteria === undefined) >= 0) {
            result.runUpdateQuery = false
          }

          if (result.runUpdateQuery) {
            let updateObject = {}

            updateObject.$set = {
              criteria: criteriaData,
              ratingCompletedAt: new Date()
            }

            let updatedSubmissionDocument = await database.models.submissions.findOneAndUpdate(
              queryObject,
              updateObject
            );

            let insightsController = new insightsBaseController;
            insightsController.generate(updatedSubmissionDocument._id);

          }

          let response = {
            message: message,
            result: result
          };


          return resolve(response);

        }

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
  * @api {get} /assessment/api/v1/submissions/isAllowed/:submissionId Fetch submissions
  * @apiVersion 1.0.0
  * @apiName Fetch submissions
  * @apiGroup Submissions
  * @apiParam {String} evidenceId Evidence ID.
  * @apiUse successBody
  * @apiUse errorBody
  */

  async isAllowed(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = {
          allowed: true
        }
        req.body = req.body || {};
        let message = "Submission check completed successfully"

        let queryObject = {
          "_id": req.params._id
        }

        let submissionDocument = await database.models.submissions.findOne(
          queryObject,
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

  // Commented out the rating flow
  // async fetchRatingQuestions(req) {
  //   return new Promise(async (resolve, reject) => {
  //     req.body = req.body || {};

  //     let result = {}
  //     let responseMessage

  //     let queryObject = {
  //       _id: ObjectId(req.params._id)
  //     }

  //     let submissionDocument = await database.models.submissions.findOne(
  //       queryObject
  //     );

  //     if(submissionDocument.ratingOfManualCriteriaEnabled === true) {

  //       result._id = submissionDocument._id
  //       result.status = submissionDocument.status

  //       let {isEditable, criterias} = await this.extractCriteriaQuestionsOfSubmission(submissionDocument, req.userDetails.allRoles)
  //       result.isEditable = isEditable
  //       result.criterias = criterias
  //       result.allManualCriteriaRatingSubmitted = (submissionDocument.allManualCriteriaRatingSubmitted) ? submissionDocument.allManualCriteriaRatingSubmitted : false
  //       responseMessage = "Rating questions fetched successfully."

  //     } else {
  //       responseMessage = "Rating questions not yet enabled for this submission."
  //     }

  //     let response = { message: responseMessage, result: result };
  //     return resolve(response);

  //   }).catch(error => {
  //     reject(error);
  //   });
  // }

  // Commented out the rating flow
  // async submitRatingQuestions(req) {
  //   return new Promise(async (resolve, reject) => {
  //     req.body = req.body || {};
  //     let responseMessage = "Rating questions submission completed successfully"
  //     let runUpdateQuery = false

  //     let queryObject = {
  //       _id: ObjectId(req.params._id)
  //     }

  //     let submissionDocument = await database.models.submissions.findOne(
  //       queryObject
  //     );

  //     let updateObject = {}
  //     let result = {}

  //     if(req.body.ratings) {
  //       if(submissionDocument.ratingOfManualCriteriaEnabled === true && submissionDocument.allManualCriteriaRatingSubmitted != true) {
  //         runUpdateQuery = true
  //         Object.entries(req.body.ratings).forEach(rating => {
  //           let criteriaElm = _.find(submissionDocument.criterias, {_id:ObjectId(rating[1].criteriaId)});
  //           criteriaElm.score = rating[1].score
  //           criteriaElm.remarks = rating[1].remarks
  //           criteriaElm.ratingSubmittedBy = req.userDetails.userId
  //           criteriaElm.ratingSubmissionDate = new Date()
  //           criteriaElm.ratingSubmissionGpsLocation = req.headers.gpslocation
  //         });
  //         updateObject.$set = { 
  //           criterias : submissionDocument.criterias,
  //           allManualCriteriaRatingSubmitted: true
  //         }
  //       } else {
  //         responseMessage = "Cannot submit ratings for this submission."
  //       }
  //     } else {
  //       responseMessage = "Invalid request"
  //     }

  //     if(runUpdateQuery) {

  //       result = await database.models.submissions.findOneAndUpdate(
  //         queryObject,
  //         updateObject
  //       );

  //       let response = {
  //         message: responseMessage
  //       };

  //       return resolve(response);

  //     } else {

  //       let response = {
  //         message: responseMessage
  //       };

  //       return resolve(response);
  //     }


  //   }).catch(error => {
  //     reject(error);
  //   });
  // }


  // Commented out the rating flow
  // async fetchCriteriaRatings(req) {
  //   return new Promise(async (resolve, reject) => {
  //     req.body = req.body || {};
  //     let result = {}
  //     let responseMessage = ""

  //     let queryObject = {
  //       _id: ObjectId(req.params._id)
  //     }

  //     let submissionDocument = await database.models.submissions.findOne(
  //       queryObject
  //     );

  //     if(submissionDocument.allManualCriteriaRatingSubmitted === true) {
  //       let criteriaResponses = {}
  //       submissionDocument.criterias.forEach(criteria => {
  //         if (criteria.criteriaType === 'manual') {
  //           criteriaResponses[criteria._id] = _.pick(criteria, ['_id', 'name', 'externalId', 'description', 'score', 'remarks', 'flag'])

  //           if(criteria.flagRaised && criteria.flagRaised[req.userDetails.userId]) {
  //             criteriaResponses[criteria._id].flagRaised = _.pick(criteria.flagRaised[req.userDetails.userId], ['value', 'remarks', 'submissionDate'])
  //           }

  //         }
  //       })

  //       result._id = submissionDocument._id
  //       result.status = submissionDocument.status
  //       result.isEditable = (_.includes(req.userDetails.allRoles,"ASSESSOR")) ? true : false
  //       result.criterias = _.values(criteriaResponses)
  //       responseMessage = "Criteria ratings fetched successfully."
  //     } else {
  //       responseMessage = "No Criteria ratings found for this assessment."
  //     }

  //     let response = {
  //       message: responseMessage,
  //       result: result
  //     };
  //     return resolve(response);
  //   }).catch(error => {
  //     reject(error);
  //   });
  // }


  // Commented out the rating flow
  // async flagCriteriaRatings(req) {
  //   return new Promise(async (resolve, reject) => {
  //     req.body = req.body || {};
  //     let responseMessage
  //     let runUpdateQuery = false

  //     let queryObject = {
  //       _id: ObjectId(req.params._id)
  //     }

  //     let submissionDocument = await database.models.submissions.findOne(
  //       queryObject
  //     );

  //     let updateObject = {}
  //     let result = {}

  //     if(req.body.flag) {
  //       if(submissionDocument.allManualCriteriaRatingSubmitted === true) {
  //         Object.entries(req.body.flag).forEach(flag => {
  //           let criteriaElm = _.find(submissionDocument.criterias, {_id:ObjectId(flag[1].criteriaId)});

  //           flag[1].userId = req.userDetails.userId
  //           flag[1].submissionDate = new Date()
  //           flag[1].submissionGpsLocation = req.headers.gpslocation

  //           if(criteriaElm.flagRaised && criteriaElm.flagRaised[req.userDetails.userId]) {
  //             responseMessage = "You cannot update an already flagged criteria."
  //           } else if(criteriaElm.flagRaised) {
  //             runUpdateQuery = true
  //             criteriaElm.flagRaised[req.userDetails.userId] = flag[1]
  //           } else {
  //             runUpdateQuery = true
  //             criteriaElm.flagRaised = {}
  //             criteriaElm.flagRaised[req.userDetails.userId] = flag[1]
  //           }

  //         });
  //         updateObject.$set = { criterias : submissionDocument.criterias }
  //       } else {
  //         responseMessage = "Cannot flag ratings for this assessment."
  //       }
  //     } else {
  //       responseMessage = "Invalid request"
  //     }

  //     if(runUpdateQuery) {
  //       result = await database.models.submissions.findOneAndUpdate(
  //         queryObject,
  //         updateObject
  //       );

  //       responseMessage = "Criterias flagged successfully."

  //     }

  //     let response = {
  //       message: responseMessage
  //     };

  //     return resolve(response);

  //   }).catch(error => {
  //     reject(error);
  //   });
  // }

  /**
   * @api {post} {{url}}/assessment/api/v1/submissions/feedback/:submissionId Submission feedback added
   * @apiVersion 1.0.0
   * @apiName Submission Feedback 
   * @apiGroup Submissions
   * @apiParamExample {json} Request-Body:
   * {
	 *    "feedback": {
	 *       "q1" : "",
	 *       "q2" : "",
	 *       "q3" : ""     
	 *    }
   *  }
   * @apiUse successBody
   * @apiUse errorBody
   */

  async feedback(req) {
    return new Promise(async (resolve, reject) => {
      req.body = req.body || {};
      let responseMessage
      let runUpdateQuery = false

      let queryObject = {
        _id: ObjectId(req.params._id)
      }

      let submissionDocument = await database.models.submissions.findOne(
        queryObject
      );

      let updateObject = {}

      if (req.body.feedback && submissionDocument.status != "started") {

        req.body.feedback.userId = req.userDetails.userId
        req.body.feedback.submissionDate = new Date()
        req.body.feedback.submissionGpsLocation = req.headers.gpslocation

        runUpdateQuery = true

        updateObject.$push = {
          ["feedback"]: req.body.feedback
        }

      } else {
        responseMessage = "Atleast one evidence method has to be completed before giving feedback."
      }

      if (runUpdateQuery) {
        let result = await database.models.submissions.findOneAndUpdate(
          queryObject,
          updateObject
        );

        responseMessage = "Feedback submitted successfully."

      }

      let response = {
        message: responseMessage
      };

      return resolve(response);

    }).catch(error => {
      reject(error);
    });
  }

  /**
  * @api {get} /assessment/api/v1/submissions/status/ Fetch submission status
  * @apiVersion 1.0.0
  * @apiName Fetch submission status
  * @apiGroup Submissions
  * @apiSampleRequest /assessment/api/v1/submissions/status/5c5147ae95743c5718445eff
  * @apiParam {String} submissionId Submission ID.
  * @apiUse successBody
  * @apiUse errorBody
  */

  async status(req) {
    return new Promise(async (resolve, reject) => {
      req.body = req.body || {};
      let result = {}

      let queryObject = {
        _id: ObjectId(req.params._id)
      }

      let submissionDocument = await database.models.submissions.findOne(
        queryObject
      );

      if (submissionDocument) {
        result._id = submissionDocument._id
        result.status = submissionDocument.status
        result.evidences = submissionDocument.evidences
      }

      let response = { message: "Submission status fetched successfully", result: result };

      return resolve(response);
    }).catch(error => {
      reject(error);
    });
  }

  /**
   * @api {get} {{url}}/assessment/api/v1/submissions/mergeEcmSubmissionToAnswer Merging answer in Submissions 
   * @apiVersion 1.0.0
   * @apiName Merge Answers in submissions 
   * @apiGroup Submissions
   * @apiParam {String} solutionId Solution external Id.
   * @apiParam {String} entityId Entity external Id.
   * @apiParam {String} ecm Evidence collection method.
   * @apiUse successBody
   * @apiUse errorBody
   */


  async mergeEcmSubmissionToAnswer(req) {

    return new Promise(async (resolve, reject) => {

      try {

        if (!req.query.solutionId) {
          throw "Entity id is required"
        }

        if (!req.query.entityId) {
          throw "Entity id is required"
        }

        if (!req.query.ecm) {
          throw "Ecm is required"
        }

        let ecmMethod = "evidences." + req.query.ecm

        let submissionDocuments = await database.models.submissions.findOne({
          solutionExternalId: req.query.solutionId,
          entityExternalId: req.query.entityId
        }, { answers: 1, [ecmMethod]: 1 }).lean()

        if (!submissionDocuments) {
          throw "Submissions is not found for given schools"
        }

        let ecmData = submissionDocuments.evidences[req.query.ecm]

        let messageData

        if (ecmData.isSubmitted == true) {

          for (let pointerToSubmissions = 0; pointerToSubmissions < ecmData.submissions.length; pointerToSubmissions++) {

            let answerArray = {}

            let currentEcmSubmissions = ecmData.submissions[pointerToSubmissions]

            if (currentEcmSubmissions.isValid === true) {

              Object.entries(currentEcmSubmissions.answers).forEach(answer => {

                if (answer[1].responseType === "matrix" && answer[1].notApplicable != true) {

                  for (let countOfInstances = 0; countOfInstances < answer[1].value.length; countOfInstances++) {

                    answer[1].value[countOfInstances] && _.valuesIn(answer[1].value[countOfInstances]).forEach(question => {

                      if (question.qid && answerArray[question.qid]) {

                        answerArray[question.qid].instanceResponses && answerArray[question.qid].instanceResponses.push(question.value)
                        answerArray[question.qid].instanceRemarks && answerArray[question.qid].instanceRemarks.push(question.remarks)
                        answerArray[question.qid].instanceFileName && answerArray[question.qid].instanceFileName.push(question.fileName)

                      } else {
                        let clonedQuestion = { ...question }
                        clonedQuestion.instanceResponses = []
                        clonedQuestion.instanceRemarks = []
                        clonedQuestion.instanceFileName = []
                        clonedQuestion.instanceResponses.push(question.value)
                        clonedQuestion.instanceRemarks.push(question.remarks)
                        clonedQuestion.instanceFileName.push(question.fileName)
                        delete clonedQuestion.value
                        delete clonedQuestion.remarks
                        delete clonedQuestion.fileName
                        delete clonedQuestion.payload
                        answerArray[question.qid] = clonedQuestion
                      }

                    })
                  }
                  answer[1].countOfInstances = answer[1].value.length
                }

                answerArray[answer[0]] = answer[1]
              });

              _.merge(submissionDocuments.answers, answerArray)

            }

          }

          await database.models.submissions.findOneAndUpdate(
            {
              _id: submissionDocuments._id
            },
            {
              $set: {
                answers: submissionDocuments.answers
              }
            }
          );

          messageData = "Answers merged successfully"

        } else {
          messageData = "isSubmitted False"
        }

        return resolve({
          message: messageData
        })

      } catch (error) {
        return reject({
          message: error
        })
      }
    })
  }


  extractStatusOfSubmission(submissionDocument) {

    let result = {}
    result._id = submissionDocument._id
    result.status = submissionDocument.status
    result.evidences = submissionDocument.evidences

    return result;

  }

  // Commented out the rating flow
  // extractCriteriaQuestionsOfSubmission(submissionDocument, requestingUserRoles) {

  //   let result = {}
  //   let criteriaResponses = {}
  //   submissionDocument.criterias.forEach(criteria => {
  //     if (criteria.criteriaType === 'manual') {
  //       criteriaResponses[criteria._id] = _.pick(criteria, ['_id', 'name', 'externalId', 'description', 'score', 'rubric', 'remarks'])
  //       criteriaResponses[criteria._id].questions = []
  //     }
  //   })

  //   if(submissionDocument.answers) {
  //     Object.entries(submissionDocument.answers).forEach(answer => {
  //       if(criteriaResponses[answer[1].criteriaId] != undefined) {
  //         criteriaResponses[answer[1].criteriaId].questions.push(answer[1])
  //       }
  //     });
  //   }

  //   result.isEditable = (_.includes(requestingUserRoles,"ASSESSOR")) ? false : true
  //   result.criterias = _.values(criteriaResponses)

  //   return result;

  // }


  /**
  * @api {get} /assessment/api/v1/submissions/modifyByCsvUpload/ Update submission answers.
  * @apiVersion 1.0.0
  * @apiName Update submission answers.
  * @apiGroup Submissions
  * @apiParam {File} questions     Mandatory questions file of type CSV.
  * @apiUse successBody
  * @apiUse errorBody
  */

  async modifyByCsvUpload(req) {

    return new Promise(async (resolve, reject) => {

      try {
        const submissionUpdateData = await csv().fromString(req.files.questions.data.toString())

        let questionCodeIds = []

        submissionUpdateData.forEach(eachsubmissionUpdateData => {
          questionCodeIds.push(eachsubmissionUpdateData.questionCode)
        })

        let solutionData = await database.models.solutions.findOne({
          externalId: submissionUpdateData[0].solutionId
        }, { themes: 1 }).lean()

        let criteriaIds = gen.utils.getCriteriaIds(solutionData.themes);

        let allCriteriaDocument = await database.models.criteria.find({ _id: { $in: criteriaIds } }, { evidences: 1 }).lean();
        let questionIds = gen.utils.getAllQuestionId(allCriteriaDocument)

        let questionDocument = await database.models.questions.find({
          _id: { $in: questionIds },
          externalId: { $in: questionCodeIds }
        }, { _id: 1, externalId: 1, responseType: 1, options: 1 }).lean();

        let questionExternalId = {}
        questionDocument.forEach(eachQuestionData => {
          questionExternalId[eachQuestionData.externalId] = {
            id: eachQuestionData._id.toString(),
            responseType: eachQuestionData.responseType,
            options: eachQuestionData.options
          }
        })

        const fileName = `Modify-Submission-Result`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        const chunkOfsubmissionUpdateData = _.chunk(submissionUpdateData, 10)

        const skipQuestionTypes = ["matrix"]
        let entityHistoryUpdatedArray = []

        for (let pointerTosubmissionUpdateData = 0; pointerTosubmissionUpdateData < chunkOfsubmissionUpdateData.length; pointerTosubmissionUpdateData++) {

          await Promise.all(chunkOfsubmissionUpdateData[pointerTosubmissionUpdateData].map(async (eachQuestionRow) => {

            eachQuestionRow["questionType"] = (questionExternalId[eachQuestionRow.questionCode] && questionExternalId[eachQuestionRow.questionCode].responseType != "") ? questionExternalId[eachQuestionRow.questionCode].responseType : "Question Not Found"

            eachQuestionRow["optionValues"] = ""
            if (questionExternalId[eachQuestionRow.questionCode] && questionExternalId[eachQuestionRow.questionCode].options && questionExternalId[eachQuestionRow.questionCode].options.length > 0) {
              questionExternalId[eachQuestionRow.questionCode].options.forEach(option => {
                eachQuestionRow["optionValues"] += option.label + ", "
              })
            }

            if (!questionExternalId[eachQuestionRow.questionCode]) {
              eachQuestionRow["status"] = "Invalid question id"

            } else if (skipQuestionTypes.includes(questionExternalId[eachQuestionRow.questionCode].responseType)) {
              eachQuestionRow["status"] = "Invalid question type"

            } else {

              let csvUpdateHistory = []
              let ecmByCsv = "evidences." + eachQuestionRow.ECM + ".submissions.0.answers." + questionExternalId[eachQuestionRow.questionCode].id
              let submissionDate = "evidences." + eachQuestionRow.ECM + ".submissions.0.submissionDate"
              let answers = "answers." + questionExternalId[eachQuestionRow.questionCode].id

              let findQuery = {
                entityExternalId: eachQuestionRow.schoolId,
                programExternalId: eachQuestionRow.programId,
                [ecmByCsv]: { $exists: true },
                [answers]: { $exists: true },
                "evidencesStatus.externalId": eachQuestionRow.ECM
              }

              let questionValueConversion = await submissionsHelper.questionValueConversion(questionExternalId[eachQuestionRow.questionCode], eachQuestionRow.oldResponse, eachQuestionRow.newResponse)

              if (!questionValueConversion.oldValue || !questionValueConversion.newValue || questionValueConversion.oldValue == "" || questionValueConversion.newValue == "") {
                eachQuestionRow["status"] = "Invalid new or old response!"
              }

              else {
                let updateQuery = {
                  $set: {
                    [answers + ".oldValue"]: questionValueConversion.oldValue,
                    [answers + ".value"]: questionValueConversion.newValue,
                    [answers + ".submittedBy"]: eachQuestionRow.assessorID,
                    [ecmByCsv + ".oldValue"]: questionValueConversion.oldValue,
                    [ecmByCsv + ".value"]: questionValueConversion.newValue,
                    [ecmByCsv + ".submittedBy"]: eachQuestionRow.assessorID,
                    [submissionDate]: new Date(),
                    "evidencesStatus.$.submissions.0.submissionDate": new Date()
                  }
                }
                if (!entityHistoryUpdatedArray.includes(eachQuestionRow.entityId)) {
                  entityHistoryUpdatedArray.push(eachQuestionRow.entityId)
                  csvUpdateHistory.push({ userId: req.userDetails.id, date: new Date() })
                  updateQuery["$addToSet"] = { "submissionsUpdatedHistory": csvUpdateHistory }
                }

                let submissionCheck = await database.models.submissions.findOneAndUpdate(findQuery, updateQuery).lean()

                eachQuestionRow["status"] = "Done"
                if (submissionCheck == null) {
                  eachQuestionRow["status"] = "Not Done"
                }

              }
            }

            input.push(eachQuestionRow)
          }))
        }
        input.push(null)
      }
      catch (error) {
        reject({
          status: 500,
          message: error
        })
      }
    })
  }

  /**
  * @api {get} /assessment/api/v1/submissions/resetEcm/:programExternalId Reset Submission ECM
  * @apiVersion 1.0.0
  * @apiName Reset ECM of Submission.
  * @apiGroup Submissions
  * @apiParam {String} evidenceId Evidence ID.
  * @apiParam {String} entityId Entity ID.
  * @apiParam {String} ecmToBeReset ECM Code.
  * @apiUse successBody
  * @apiUse errorBody
  */
  async resetEcm(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let programId = req.params._id

        if (!programId) {
          throw "Program id is missing"
        }

        let entityId = req.query.entityId
        let ecmToBeReset = req.query.ecm
        let evidencesToBeReset = "evidences." + ecmToBeReset
        let submissionUpdated = new Array

        if (!entityId) {
          throw "Entity id is missing"
        }

        let findQuery = {
          programExternalId: programId,
          entityExternalId: entityId,
          [evidencesToBeReset]: { $ne: null },
          "evidencesStatus.externalId": req.query.ecm
        }

        let updateQuery = {
          $set: {
            [evidencesToBeReset + ".submissions"]: [],
            [evidencesToBeReset + ".isSubmitted"]: false,
            [evidencesToBeReset + ".endTime"]: "", [evidencesToBeReset + ".startTime"]: "",
            [evidencesToBeReset + ".hasConflicts"]: false, "evidencesStatus.$.submissions": [],
            "evidencesStatus.$.isSubmitted": false, "evidencesStatus.$.hasConflicts": false,
            "evidencesStatus.$.startTime": "", "evidencesStatus.$.endTime": ""
          }
        }

        submissionUpdated.push({ userId: req.userDetails.id, date: new Date(), message: "Updated ECM " + req.query.ecm })
        updateQuery["$addToSet"] = { "submissionsUpdatedHistory": submissionUpdated }

        let updatedQuery = await database.models.submissions.findOneAndUpdate(findQuery, updateQuery).lean()

        if (updatedQuery == null) {
          throw "Ecm doesnot exists"
        }

        return resolve({
          message: "ECM Reset successfully"
        })

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }
    });
  }

};