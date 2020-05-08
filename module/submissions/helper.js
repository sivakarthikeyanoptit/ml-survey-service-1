/**
 * name : submissions/helper.js
 * author : Akash
 * created-date : 01-feb-2019
 * Description : Submissions related helper functionality.
 */

// Dependencies
let slackClient = require(ROOT_PATH + "/generics/helpers/slackCommunications");
let kafkaClient = require(ROOT_PATH + "/generics/helpers/kafkaCommunications");
const solutionsHelper = require(MODULES_BASE_PATH + "/solutions/helper");
const criteriaHelper = require(MODULES_BASE_PATH + "/criteria/helper");
const questionsHelper = require(MODULES_BASE_PATH + "/questions/helper");
const emailClient = require(ROOT_PATH + "/generics/helpers/emailCommunications");
const observationSubmissionsHelper = require(MODULES_BASE_PATH + "/observationSubmissions/helper");
const scoringHelper = require(MODULES_BASE_PATH + "/scoring/helper")

/**
    * SubmissionsHelper
    * @class
*/

module.exports = class SubmissionsHelper {
    
    /**
   * find submission by entity data.
   * @method
   * @name findSubmissionByEntityProgram
   * @param {Object} document
   * @param {String} document.entityId - entity id.
   * @param {String} document.solutionId - solution id.   
   * @param {Object} requestObject -requested object.
   * @param {Object} requestObject.headers -requested header.
   * @returns {Object} submission document. 
   */

    static findSubmissionByEntityProgram(document, requestObject) {

        return new Promise(async (resolve, reject) => {

            try {

                let queryObject = {
                    entityId: document.entityId,
                    solutionId: document.solutionId
                };

                let submissionDocument = await database.models.submissions.findOne(
                    queryObject
                );

                if (!submissionDocument) {
                    let entityAssessorsQueryObject = [
                        {
                            $match: { entities: document.entityId, programId: document.programId }
                        }
                    ];

                    document.assessors = await database.models[
                        "entityAssessors"
                    ].aggregate(entityAssessorsQueryObject);

                    let assessorElement = document.assessors.find(assessor => assessor.userId === requestObject.userDetails.userId)
                    if (assessorElement && assessorElement.externalId != "") {
                        assessorElement.assessmentStatus = "started";
                        assessorElement.userAgent = requestObject.headers['user-agent'];
                    }

                    submissionDocument = await database.models.submissions.create(
                        document
                    );

                    // Push new submission to kafka for reporting/tracking.
                    this.pushInCompleteSubmissionForReporting(submissionDocument._id);
                } else {

                    let assessorElement = submissionDocument.assessors.find(assessor => assessor.userId === requestObject.userDetails.userId)
                    if (assessorElement && assessorElement.externalId != "") {
                        assessorElement.assessmentStatus = "started";
                        assessorElement.userAgent = requestObject.headers['user-agent'];
                        let updateObject = {};
                        updateObject.$set = {
                            assessors: submissionDocument.assessors
                        };
                        submissionDocument = await database.models.submissions.findOneAndUpdate(
                            queryObject,
                            updateObject
                        );
                    }
                }

                return resolve({
                    message: messageConstants.apiResponses.SUBMISSION_FOUND,
                    result: submissionDocument
                });


            } catch (error) {
                return reject(error);
            }

        })

    }

    /**
   * Extract submission status.
   * @method
   * @name extractStatusOfSubmission
   * @param {Object} submissionDocument - subimission data.
   * @param {String} submissionDocument._id - submission id.
   * @param {String} submissionDocument.status - submission status.
   * @param {Object} submissionDocument.evidencesStatus - evidence method status.
   * @returns {Object} submission status. 
   */

    static extractStatusOfSubmission(submissionDocument) {

        return new Promise(async (resolve, reject) => {

            try {

                let result = {};
                result._id = submissionDocument._id;
                result.status = submissionDocument.status;
                result.evidencesStatus = submissionDocument.evidencesStatus;

                return resolve(result);


            } catch (error) {
                return reject(error);
            }

        })
    }

     /**
   * Can Enable rating questions of submission.
   * @method
   * @name canEnableRatingQuestionsOfSubmission
   * @param {Object} submissionDocument - subimission data.
   * @param {Object} submissionDocument.evidencesStatus - all evidence method status.
   * @param {Object} submissionDocument.status - submission status. 
   * Should not be blocked. 
   * @returns {Object} consists of ratings enabled and response message. 
   */

    static canEnableRatingQuestionsOfSubmission(submissionDocument) {

        return new Promise(async (resolve, reject) => {

            try {

                let result = {};
                result.ratingsEnabled = true;
                result.responseMessage = "";

                if (submissionDocument.evidencesStatus && submissionDocument.status !== "blocked") {
                    const evidencesArray = submissionDocument.evidencesStatus;
                    for (let iterator = 0; iterator < evidencesArray.length; iterator++) {
                        if (!evidencesArray[iterator].isSubmitted || evidencesArray[iterator].hasConflicts === true) {
                            // If inactive methods are allowed in submission put this condition.
                            // if(!(evidencesArray[iterator].isActive === false)) {
                                result.ratingsEnabled = false;
                                result.responseMessage = messageConstants.apiResponses.ALL_ECM_NOT_COMPLETED;
                                break;
                            //}
                        }
                    }
                } else {
                    result.ratingsEnabled = false;
                    result.responseMessage = messageConstants.apiResponses.ASSESSMENT_BLOCK_FOR_RATING;
                }

                return resolve(result);


            } catch (error) {
                return reject(error);
            }

        })
    }

    /**
   * submissions auto rated.
   * @method
   * @name isSubmissionToBeAutoRated
   * @param {Object} submissionSolutionId - submission solution id.
   * @returns {Object} auto rated submission data. 
   */

    static isSubmissionToBeAutoRated(submissionSolutionId) {

        return new Promise(async (resolve, reject) => {

            try {

                let solutionDocument = await solutionsHelper.checkIfSolutionIsRubricDriven(submissionSolutionId);

                let submissionToBeAutoRated = (solutionDocument[0] && solutionDocument[0].scoringSystem && solutionDocument[0].scoringSystem != "") ? true : false;
                
                return resolve(submissionToBeAutoRated);


            } catch (error) {
                return reject(error);
            }

        })
    }


      /**
   * Question value conversion.
   * @method
   * @name questionValueConversion
   * @param {Object} question - question data.
   * @param {String} question.responseType - question upload response.
   * @param {Object} question.options - question options.
   * @param {String} oldResponse - existing response.   
   * @returns {Object} result- consists of oldValue and newValue. 
   */

    static questionValueConversion(question, oldResponse, newResponse) {

        return new Promise(async (resolve, reject) => {

            try {

                let result = {};

                if (question.responseType == "date") {

                    let oldResponseArray = oldResponse.split("/");

                    if (oldResponseArray.length > 2) {
                        [oldResponseArray[0], oldResponseArray[1]] = [oldResponseArray[1], oldResponseArray[0]];
                    }

                    let newResponseArray = newResponse.split("/");

                    if (newResponseArray.length > 2) {
                        [newResponseArray[0], newResponseArray[1]] = [newResponseArray[1], newResponseArray[0]];
                    }

                    result["oldValue"] = oldResponseArray.map(value => (value < 10) ? "0" + value : value).reverse().join("-");
                    result["newValue"] = newResponseArray.map(value => (value < 10) ? "0" + value : value).reverse().join("-");

                } else if (question.responseType == "radio") {

                    question.options.forEach(eachOption => {

                        if (eachOption.label.replace(/\s/g, '').toLowerCase() == oldResponse.replace(/\s/g, '').toLowerCase()) {
                            result["oldValue"] = eachOption.value;
                        }

                        if (eachOption.label.replace(/\s/g, '').toLowerCase() == newResponse.replace(/\s/g, '').toLowerCase()) {
                            result["newValue"] = eachOption.value;
                        }
                    })

                } else if (question.responseType == "multiselect") {

                    result["oldValue"] = result["newValue"] = new Array;
                    let oldResponseArray = oldResponse.split(",").map((value) => { return value.replace(/\s/g, '').toLowerCase() });
                    let newResponseArray = newResponse.split(",").map((value) => { return value.replace(/\s/g, '').toLowerCase() });

                    question.options.forEach(eachOption => {

                        if (oldResponseArray.includes(eachOption.label.replace(/\s/g, '').toLowerCase())) {
                            result["oldValue"].push(eachOption.value);
                        }

                        if (newResponseArray.includes(eachOption.label.replace(/\s/g, '').toLowerCase())) {
                            result["newValue"].push(eachOption.value);
                        }
                    })

                } else {

                    result["oldValue"] = oldResponse;
                    result["newValue"] = newResponse;
                }

                return resolve(result);


            } catch (error) {
                return reject(error);
            }

        })
    }

     /**
   * Submission status.
   * @method
   * @name mapSubmissionStatus
   * @param {String} status - submission status. 
   * @returns {String} mapped submission status value. 
   */

    static mapSubmissionStatus(status) {
        let submissionStatus = {
            inprogress: 'In Progress',
            completed: 'Complete',
            blocked: 'Blocked',
            started: 'Started',
            ratingPending: 'Rating Pending'
        };
        return submissionStatus[status] || "";
    }

    /**
   * Create evidence in submission.
   * @method
   * @name createEvidencesInSubmission
   * @param {Object} req - requested data.
   * @param {String} modelName - mongodb model name.   
   * @returns {Object} 
   */

    static createEvidencesInSubmission(req, modelName, isSubmission) {

        return new Promise(async (resolve, reject) => {

            try {

                req.body = req.body || {};
                let message = messageConstants.apiResponses.SUBMISSION_COMPLETED;
                let runUpdateQuery = false;

                let queryObject = {
                    _id: ObjectId(req.params._id)
                };

                let queryOptions = {
                    new : true,
                    projection: {
                        _id: 1,
                        solutionId: 1,
                        evidencesStatus: 1,
                        status: 1
                    }
                };

                let submissionDocument = await database.models[modelName].findOne(
                    queryObject
                ).lean();

                let updateObject = {};
                let result = {};

                if (req.body.entityProfile) {
                    updateObject.$set = { entityProfile: req.body.entityProfile };
                    runUpdateQuery = true;
                }

                if (req.body.evidence) {
                    req.body.evidence.gpsLocation = req.headers.gpslocation;
                    req.body.evidence.submittedBy = req.userDetails.userId;
                    req.body.evidence.submittedByName = req.userDetails.firstName + " " + req.userDetails.lastName;
                    req.body.evidence.submittedByEmail = req.userDetails.email;
                    req.body.evidence.submissionDate = new Date();

                    let evidencesStatusToBeChanged = submissionDocument.evidencesStatus.find(singleEvidenceStatus => singleEvidenceStatus.externalId == req.body.evidence.externalId);
                    if (submissionDocument.evidences[req.body.evidence.externalId].isSubmitted === false) {
                        runUpdateQuery = true;
                        req.body.evidence.isValid = true;
                        let answerArray = {};
                        Object.entries(req.body.evidence.answers).forEach(answer => {
                            if (answer[1].responseType === "matrix" && answer[1].notApplicable != true) {
                                answer = this.getAnswersFromGeneralQuestion(answer, submissionDocument);
                                for (let countOfInstances = 0; countOfInstances < answer[1].value.length; countOfInstances++) {

                                    _.valuesIn(answer[1].value[countOfInstances]).forEach(question => {

                                        if (answerArray[question.qid]) {
                                            answerArray[question.qid].instanceResponses.push(question.value);
                                            answerArray[question.qid].instanceRemarks.push(question.remarks);
                                            answerArray[question.qid].instanceFileName.push(question.fileName);
                                        } else {
                                            let clonedQuestion = { ...question };
                                            clonedQuestion.instanceResponses = new Array;
                                            clonedQuestion.instanceRemarks = new Array;
                                            clonedQuestion.instanceFileName = new Array;
                                            clonedQuestion.instanceResponses.push(question.value);
                                            clonedQuestion.instanceRemarks.push(question.remarks);
                                            clonedQuestion.instanceFileName.push(question.fileName);
                                            delete clonedQuestion.value;
                                            delete clonedQuestion.remarks;
                                            delete clonedQuestion.fileName;
                                            delete clonedQuestion.payload;
                                            answerArray[question.qid] = clonedQuestion;
                                        }

                                    })
                                }
                                answer[1].countOfInstances = answer[1].value.length;
                            }
                            answerArray[answer[0]] = answer[1];
                        });

                        if (answerArray.isAGeneralQuestionResponse) { delete answerArray.isAGeneralQuestionResponse; }


                        evidencesStatusToBeChanged['isSubmitted'] = true;
                        evidencesStatusToBeChanged['notApplicable'] = req.body.evidence.notApplicable;
                        evidencesStatusToBeChanged['startTime'] = req.body.evidence.startTime;
                        evidencesStatusToBeChanged['endTime'] = req.body.evidence.endTime;
                        evidencesStatusToBeChanged['hasConflicts'] = false;
                        evidencesStatusToBeChanged['submissions'].push(_.omit(req.body.evidence, "answers"));

                        updateObject.$push = {
                            ["evidences." + req.body.evidence.externalId + ".submissions"]: req.body.evidence
                        };
                        updateObject.$set = {
                            answers: _.assignIn(submissionDocument.answers, answerArray),
                            ["evidences." + req.body.evidence.externalId + ".isSubmitted"]: true,
                            ["evidences." + req.body.evidence.externalId + ".notApplicable"]: req.body.evidence.notApplicable,
                            ["evidences." + req.body.evidence.externalId + ".startTime"]: req.body.evidence.startTime,
                            ["evidences." + req.body.evidence.externalId + ".endTime"]: req.body.evidence.endTime,
                            ["evidences." + req.body.evidence.externalId + ".hasConflicts"]: false,
                            evidencesStatus: submissionDocument.evidencesStatus,
                            status: (submissionDocument.status === "started") ? "inprogress" : submissionDocument.status
                        };
                    } else {
                        runUpdateQuery = true;
                        req.body.evidence.isValid = false;

                        Object.entries(req.body.evidence.answers).forEach(answer => {
                            if (answer[1].responseType === "matrix" && answer[1].notApplicable != true) {
                                answer = this.getAnswersFromGeneralQuestion(answer, submissionDocument);
                                answer[1].countOfInstances = answer[1].value.length;
                            }
                        });

                        updateObject.$push = {
                            ["evidences." + req.body.evidence.externalId + ".submissions"]: req.body.evidence
                        };

                        evidencesStatusToBeChanged['hasConflicts'] = true;
                        evidencesStatusToBeChanged['submissions'].push(_.omit(req.body.evidence, "answers"));

                        updateObject.$set = {
                            evidencesStatus: submissionDocument.evidencesStatus,
                            ["evidences." + req.body.evidence.externalId + ".hasConflicts"]: true,
                            status: (submissionDocument.ratingOfManualCriteriaEnabled === true) ? "inprogress" : "blocked"
                        };

                        message = messageConstants.apiResponses.DUPLICATE_ECM_SUBMISSION;
                    }

                }

                if (runUpdateQuery) {
                    let updatedSubmissionDocument = await database.models[modelName].findOneAndUpdate(
                        queryObject,
                        updateObject,
                        queryOptions
                    );
                    
                    if(modelName == "submissions") {
                        // Push update submission to kafka for reporting/tracking.
                        this.pushInCompleteSubmissionForReporting(updatedSubmissionDocument._id);
                    } else {
                        // Push updated submission to kafka for reporting/tracking.
                        observationSubmissionsHelper.pushInCompleteObservationSubmissionForReporting(updatedSubmissionDocument._id);
                    }

                    let canRatingsBeEnabled = await this.canEnableRatingQuestionsOfSubmission(updatedSubmissionDocument);
                    let { ratingsEnabled } = canRatingsBeEnabled;

                    if (ratingsEnabled) {

                        let updateStatusObject = {};
                        updateStatusObject.$set = {};

                        let isSubmissionToBeAutoRated = await this.isSubmissionToBeAutoRated(updatedSubmissionDocument.solutionId);
                        
                        if(!isSubmissionToBeAutoRated) {
                            updateStatusObject.$set = {
                                status: "completed",
                                completedDate: new Date()
                            };
                        } else {
                            updateStatusObject.$set = {
                                status: "ratingPending"
                            };
                        }
                        updatedSubmissionDocument = await database.models[modelName].findOneAndUpdate(
                            queryObject,
                            updateStatusObject,
                            queryOptions
                        );

                    }

                    let status = await this.extractStatusOfSubmission(updatedSubmissionDocument);

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
                    status: error.status || httpStatusCode.internal_server_error.status,
                    message: error.message || httpStatusCode.internal_server_error.message,
                    errorObject: error
                });
            }
        })
    }

     /**
   * Get answers from general question.
   * @method
   * @name getAnswersFromGeneralQuestion
   * @param {Object} answer - answer data.
   * @param {Object} submissionDocument - submission data.   
   * @returns {Object} - answer.
   */

    static getAnswersFromGeneralQuestion(answer, submissionDocument) {
        if (answer[1].isAGeneralQuestion == true && submissionDocument.generalQuestions && submissionDocument.generalQuestions[answer[0]]) {
            submissionDocument.generalQuestions[answer[0]].submissions.forEach(generalQuestionSubmission => {
                generalQuestionSubmission.value.forEach(generalQuestionInstanceValue => {
                    generalQuestionInstanceValue.isAGeneralQuestionResponse = true;
                    answer[1].value.push(generalQuestionInstanceValue);
                })
                generalQuestionSubmission.payload.labels[0].forEach(generalQuestionInstancePayload => {
                    answer[1].payload.labels[0].push(generalQuestionInstancePayload);
                })
            })
        }
        return answer;
    }

    /**
   * Push completed submission for reporting.
   * @method
   * @name pushCompletedSubmissionForReporting
   * @param {String} submissionId - submission id.
   * @returns {JSON} consists of kafka message whether it is pushed for reporting
   * or not.
   */

    static pushCompletedSubmissionForReporting(submissionId) {
        return new Promise(async (resolve, reject) => {
            try {

                if (submissionId == "") {
                    throw messageConstants.apiResponses.SUBMISSION_ID_NOT_FOUND;
                }

                if(typeof submissionId == "string") {
                    submissionId = ObjectId(submissionId);
                }

                let submissionsDocument = await database.models.submissions.findOne({
                    _id: submissionId,
                    status: "completed"
                }).lean();

                if (!submissionsDocument) {
                    throw messageConstants.apiResponses.SUBMISSION_NOT_FOUND + "or" +SUBMISSION_STATUS_NOT_COMPLETE;
                }


                const kafkaMessage = await kafkaClient.pushCompletedSubmissionToKafka(submissionsDocument);

                if(kafkaMessage.status != "success") {
                    let errorObject = {
                        formData: {
                            submissionId:submissionsDocument._id.toString(),
                            message:kafkaMessage.message
                        }
                    };
                    slackClient.kafkaErrorAlert(errorObject);
                }

                return resolve(kafkaMessage);

            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
   * Push submission to queue for rating.
   * @method
   * @name pushSubmissionToQueueForRating
   * @param {String} [submissionId = ""] - submission id.
   * @returns {Object} consists of kafka message whether it is pushed in queue 
   * for rating or not.
   */

    static pushSubmissionToQueueForRating(submissionId = "") {
        return new Promise(async (resolve, reject) => {
            try {

                if (submissionId == "") {
                    throw messageConstants.apiResponses.SUBMISSION_ID_NOT_FOUND;
                }
                if(typeof submissionId !== "string") {
                    submissionId = submissionId.toString();
                }
                const kafkaMessage = await kafkaClient.pushSubmissionToKafkaQueueForRating({submissionModel : "submissions",submissionId : submissionId});

                if(kafkaMessage.status != "success") {
                    let errorObject = {
                        formData: {
                            submissionId:submissionId,
                            submissionModel:"submissions",
                            message:kafkaMessage.message
                        }
                    };
                    slackClient.kafkaErrorAlert(errorObject);
                }

                return resolve(kafkaMessage);

            } catch (error) {
                return reject(error);
            }
        })
    }

     /**
     * Rate submission by id.
     * @method
     * @name rateSubmissionById
     * @param {String} [submissionId = ""] - submission id.
     * @returns {Object} message regarding rating of submission. 
     */

    static rateSubmissionById(submissionId = "") {
        return new Promise(async (resolve, reject) => {

            let emailRecipients = (process.env.SUBMISSION_RATING_DEFAULT_EMAIL_RECIPIENTS && process.env.SUBMISSION_RATING_DEFAULT_EMAIL_RECIPIENTS != "") ? process.env.SUBMISSION_RATING_DEFAULT_EMAIL_RECIPIENTS : "";

            try {

                if (submissionId == "") {
                    throw new Error(messageConstants.apiResponses.SUBMISSION_ID_NOT_FOUND);
                }

                let submissionDocument = await database.models.submissions.findOne(
                    {_id : ObjectId(submissionId)},
                    { "answers": 1, "criteria": 1, "evidencesStatus": 1, "entityInformation": 1, "entityProfile": 1, "programExternalId": 1, "solutionExternalId" : 1 }
                ).lean();
        
                if (!submissionDocument._id) {
                    throw new Error(messageConstants.apiResponses.SOLUTION_NOT_FOUND);
                }
               
                let solutionDocument = await database.models.solutions.findOne({
                    externalId: submissionDocument.solutionExternalId,
                }, { themes: 1, levelToScoreMapping: 1, scoringSystem : 1, flattenedThemes : 1, sendSubmissionRatingEmailsTo : 1 }).lean();

                if (!solutionDocument) {
                    throw new Error(messageConstants.apiResponses.SOLUTION_NOT_FOUND);
                }

                if(solutionDocument.sendSubmissionRatingEmailsTo && solutionDocument.sendSubmissionRatingEmailsTo != "") {
                    emailRecipients = solutionDocument.sendSubmissionRatingEmailsTo;
                }

                if(solutionDocument.scoringSystem == "pointsBasedScoring") {

                    submissionDocument.scoringSystem = "pointsBasedScoring";

                    let allCriteriaInSolution = new Array;
                    let allQuestionIdInSolution = new Array;
                    let solutionQuestions = new Array;

                    allCriteriaInSolution = gen.utils.getCriteriaIds(solutionDocument.themes);

                    if(allCriteriaInSolution.length > 0) {
                        
                        submissionDocument.themes = solutionDocument.flattenedThemes;

                        let allCriteriaDocument = await criteriaHelper.criteriaDocument({
                            _id : {
                                $in : allCriteriaInSolution
                            }
                        }, [
                            "evidences"
                        ]);

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
                        ]);

                    }

                    if(solutionQuestions.length > 0) {
                        submissionDocument.questionDocuments = {};
                        solutionQuestions.forEach(question => {
                        submissionDocument.questionDocuments[question._id.toString()] = {
                            _id : question._id,
                            weightage : question.weightage
                        };
                        let questionMaxScore = 0;
                        if(question.options && question.options.length > 0) {
                            if(question.responseType != "multiselect") {
                            questionMaxScore = _.maxBy(question.options, 'score').score;
                            }
                            question.options.forEach(option => {
                            if(question.responseType == "multiselect") {
                                questionMaxScore += option.score;
                            }
                            (option.score && option.score > 0) ? submissionDocument.questionDocuments[question._id.toString()][`${option.value}-score`] = option.score : "";
                            })
                        }
                        if(question.sliderOptions && question.sliderOptions.length > 0) {
                            questionMaxScore = _.maxBy(question.sliderOptions, 'score').score;
                            submissionDocument.questionDocuments[question._id.toString()].sliderOptions = question.sliderOptions;
                        }
                        submissionDocument.questionDocuments[question._id.toString()].maxScore =  (typeof questionMaxScore === "number") ? questionMaxScore : 0;
                        })
                    }

                }

                let resultingArray = await scoringHelper.rateEntities([submissionDocument], "singleRateApi");

                if(resultingArray.result.runUpdateQuery) {
                    await database.models.submissions.updateOne(
                        {
                            _id: ObjectId(submissionId)
                        },
                        {
                            status: "completed",
                            completedDate: new Date()
                        }
                    );
                    await this.pushCompletedSubmissionForReporting(submissionId);
                    emailClient.pushMailToEmailService(emailRecipients,messageConstants.apiResponses.SUBMISSION_AUTO_RATING_SUCCESS+" - "+submissionId,JSON.stringify(resultingArray));
                    return resolve(messageConstants.apiResponses.SUBMISSION_RATING_COMPLETED);
                } else {
                    emailClient.pushMailToEmailService(emailRecipients,messageConstants.apiResponses.SUBMISSION_AUTO_RATING_FAILED+" - "+submissionId,JSON.stringify(resultingArray));
                    return resolve(messageConstants.apiResponses.SUBMISSION_RATING_COMPLETED);
                }

            } catch (error) {
                emailClient.pushMailToEmailService(emailRecipients,messageConstants.apiResponses.SUBMISSION_AUTO_RATING_FAILED+" - "+submissionId,error.message);
                return reject(error);
            }
        })
    }


    /**
     * Mark submission complete and push to Kafka.
     * @method
     * @name markCompleteAndPushForReporting
     * @param {String} [submissionId = ""] -submission id.
     * @returns {JSON} - message
     */

    static markCompleteAndPushForReporting(submissionId = "") {
        return new Promise(async (resolve, reject) => {

            let emailRecipients = (process.env.SUBMISSION_RATING_DEFAULT_EMAIL_RECIPIENTS && process.env.SUBMISSION_RATING_DEFAULT_EMAIL_RECIPIENTS != "") ? process.env.SUBMISSION_RATING_DEFAULT_EMAIL_RECIPIENTS : "";

            try {

                if (submissionId == "") {
                    throw new Error(messageConstants.apiResponses.SUBMISSION_ID_NOT_FOUND);
                } else if (typeof submissionId !== "string") {
                    submissionId = submissionId.toString()
                }

                let submissionDocument = await database.models.submissions.findOne(
                    {_id : ObjectId(submissionId)},
                    { "_id": 1}
                ).lean();
        
                if (!submissionDocument._id) {
                    throw new Error(messageConstants.apiResponses.SOLUTION_NOT_FOUND);
                }

                await database.models.submissions.updateOne(
                    {
                        _id: ObjectId(submissionId)
                    },
                    {
                        status: "completed",
                        completedDate: new Date()
                    }
                );
                
                await this.pushCompletedSubmissionForReporting(submissionId);

                emailClient.pushMailToEmailService(emailRecipients,"Successfully marked submission " + submissionId + "complete and pushed for reporting","NO TEXT AVAILABLE");
                return resolve(messageConstants.apiResponses.SUBMISSION_RATING_COMPLETED);


            } catch (error) {
                emailClient.pushMailToEmailService(emailRecipients,messageConstants.apiResponses.SUBMISSION_AUTO_RATING_FAILED+" - "+submissionId,error.message);
                return reject(error);
            }
        })
    }


    /**
   * Push incomplete submission for reporting.
   * @method
   * @name pushInCompleteSubmissionForReporting
   * @param {String} submissionId - submission id.
   * @returns {JSON} consists of kafka message whether it is pushed for reporting
   * or not.
   */

    static pushInCompleteSubmissionForReporting(submissionId) {
        return new Promise(async (resolve, reject) => {
            try {

                if (submissionId == "") {
                    throw messageConstants.apiResponses.SUBMISSION_ID_NOT_FOUND;
                }

                if(typeof submissionId == "string") {
                    submissionId = ObjectId(submissionId);
                }

                let submissionsDocument = await database.models.submissions.findOne({
                    _id: submissionId,
                    status: {$ne: "completed"}
                }).lean();

                if (!submissionsDocument) {
                    throw messageConstants.apiResponses.SUBMISSION_NOT_FOUND + "or" +SUBMISSION_STATUS_NOT_COMPLETE;
                }


                const kafkaMessage = await kafkaClient.pushInCompleteSubmissionToKafka(submissionsDocument);

                if(kafkaMessage.status != "success") {
                    let errorObject = {
                        formData: {
                            submissionId:submissionsDocument._id.toString(),
                            message:kafkaMessage.message
                        }
                    };
                    slackClient.kafkaErrorAlert(errorObject);
                }

                return resolve(kafkaMessage);

            } catch (error) {
                return reject(error);
            }
        })
    }


};