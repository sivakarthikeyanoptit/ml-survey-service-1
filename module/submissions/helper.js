
module.exports = class submissionsHelper {
    static findSubmission(document, requestObject, modelName) {

        return new Promise(async (resolve, reject) => {

            try {

                let queryObject = {
                    entityId: document.entityId
                };
                (modelName == "submissions") ?  queryObject["programId"] = document.programId : queryObject["observationId"] =  document.observationId;

                let submissionDocument = await database.models[modelName].findOne(
                    queryObject
                ).lean();

                if (!submissionDocument) {
                    let entityAssessorsQueryObject = [
                        {
                            $match: { entities: document.entityId }
                        }
                    ];

                    (modelName == "submissions") ?  entityAssessorsQueryObject[0]["$match"]["programId"] = document.programId : entityAssessorsQueryObject[0]["$match"]["observationId"] =  document.observationId;

                    document.assessors = await database.models[
                        "entityAssessors"
                    ].aggregate(entityAssessorsQueryObject);

                    let assessorElement = document.assessors.find(assessor => assessor.userId === requestObject.userDetails.userId)
                    if (assessorElement && assessorElement.externalId != "") {
                        assessorElement.assessmentStatus = "started"
                        assessorElement.userAgent = requestObject.headers['user-agent']
                    }

                    submissionDocument = await database.models[modelName].create(
                        document
                    );

                } else {

                    let assessorElement = submissionDocument.assessors.find(assessor => assessor.userId === requestObject.userDetails.userId)
                    if (assessorElement && assessorElement.externalId != "") {
                        assessorElement.assessmentStatus = "started"
                        assessorElement.userAgent = requestObject.headers['user-agent']
                        let updateObject = {}
                        updateObject.$set = {
                            assessors: submissionDocument.assessors
                        }
                        submissionDocument = await database.models[modelName].findOneAndUpdate(
                            queryObject,
                            updateObject
                        );
                    }
                }

                return resolve({
                    message: "Submission found",
                    result: submissionDocument
                });


            } catch (error) {
                return reject(error);
            }

        })

    }

    static extractStatusOfSubmission(submissionDocument) {

        return new Promise(async (resolve, reject) => {

            try {

                let result = {}
                result._id = submissionDocument._id
                result.status = submissionDocument.status
                result.evidences = submissionDocument.evidences

                return resolve(result);


            } catch (error) {
                return reject(error);
            }

        })
    }


    static canEnableRatingQuestionsOfSubmission(submissionDocument) {

        return new Promise(async (resolve, reject) => {

            try {

                let result = {}
                result.ratingsEnabled = true
                result.responseMessage = ""

                if (submissionDocument.evidences && submissionDocument.status !== "blocked") {
                    const evidencesArray = Object.entries(submissionDocument.evidences)
                    for (let iterator = 0; iterator < evidencesArray.length; iterator++) {
                        if (!evidencesArray[iterator][1].isSubmitted || evidencesArray[iterator][1].hasConflicts === true) {
                            result.ratingsEnabled = false
                            result.responseMessage = "Sorry! All evidence methods have to be completed to enable ratings."
                            break
                        }
                    }
                } else {
                    result.ratingsEnabled = false
                    result.responseMessage = "Sorry! This could be because the assessment has been blocked. Resolve conflicts to proceed further."
                }

                return resolve(result);


            } catch (error) {
                return reject(error);
            }

        })
    }

    static allSubmission(allSubmission) {

        return new Promise(async (resolve, reject) => {

            try {

                return resolve(allSubmission.isSubmitted);


            } catch (error) {
                return reject(error);
            }

        })
    }

    static questionValueConversion(question, oldResponse, newResponse) {

        return new Promise(async (resolve, reject) => {

            try {

                let result = {}

                if (question.responseType == "date") {

                    let oldResponseArray = oldResponse.split("/")

                    if (oldResponseArray.length > 2) {
                        [oldResponseArray[0], oldResponseArray[1]] = [oldResponseArray[1], oldResponseArray[0]];
                    }

                    let newResponseArray = newResponse.split("/")

                    if (newResponseArray.length > 2) {
                        [newResponseArray[0], newResponseArray[1]] = [newResponseArray[1], newResponseArray[0]];
                    }

                    result["oldValue"] = oldResponseArray.map(value => (value < 10) ? "0" + value : value).reverse().join("-")
                    result["newValue"] = newResponseArray.map(value => (value < 10) ? "0" + value : value).reverse().join("-")

                } else if (question.responseType == "radio") {

                    question.options.forEach(eachOption => {

                        if (eachOption.label.replace(/\s/g, '').toLowerCase() == oldResponse.replace(/\s/g, '').toLowerCase()) {
                            result["oldValue"] = eachOption.value
                        }

                        if (eachOption.label.replace(/\s/g, '').toLowerCase() == newResponse.replace(/\s/g, '').toLowerCase()) {
                            result["newValue"] = eachOption.value
                        }
                    })

                } else if (question.responseType == "multiselect") {

                    result["oldValue"] = result["newValue"] = new Array
                    let oldResponseArray = oldResponse.split(",").map((value) => { return value.replace(/\s/g, '').toLowerCase() })
                    let newResponseArray = newResponse.split(",").map((value) => { return value.replace(/\s/g, '').toLowerCase() })

                    question.options.forEach(eachOption => {

                        if (oldResponseArray.includes(eachOption.label.replace(/\s/g, '').toLowerCase())) {
                            result["oldValue"].push(eachOption.value)
                        }

                        if (newResponseArray.includes(eachOption.label.replace(/\s/g, '').toLowerCase())) {
                            result["newValue"].push(eachOption.value)
                        }
                    })

                } else {

                    result["oldValue"] = oldResponse
                    result["newValue"] = newResponse
                }

                return resolve(result);


            } catch (error) {
                return reject(error);
            }

        })
    }

    static mapSubmissionStatus(status) {
        let submissionStatus = {
            inprogress: 'In Progress',
            completed: 'Complete',
            blocked: 'Blocked',
            started: 'Started'
        }
        return submissionStatus[status] || ""
    }

    static createEvidencesInSubmission(req, modelName, isSubmission) {

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

                let submissionDocument = await database.models[modelName].findOne(
                    queryObject
                ).lean();

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
                                answer = this.getAnswersFromGeneralQuestion(answer,submissionDocument)
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
                                answer = this.getAnswersFromGeneralQuestion(answer,submissionDocument)
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
                    let updatedSubmissionDocument = await database.models[modelName].findOneAndUpdate(
                        queryObject,
                        updateObject,
                        queryOptions
                    );

                    if (isSubmission) {
                        let canRatingsBeEnabled = await submissionsHelper.canEnableRatingQuestionsOfSubmission(updatedSubmissionDocument)
                        let { ratingsEnabled } = canRatingsBeEnabled

                        if (ratingsEnabled) {
                            let updateStatusObject = {}
                            updateStatusObject.$set = {}
                            updateStatusObject.$set = {
                                status: "completed",
                                completedDate: new Date()
                            }
                            updatedSubmissionDocument = await database.models[modelName].findOneAndUpdate(
                                queryObject,
                                updateStatusObject,
                                queryOptions
                            );
                        }
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

    static getAnswersFromGeneralQuestion(answer, submissionDocument) {
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
        return answer;
    }

};