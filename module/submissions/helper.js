let slackClient = require(ROOT_PATH + "/generics/helpers/slackCommunications");
const mathJs = require(ROOT_PATH + "/generics/helpers/mathFunctions");

module.exports = class submissionsHelper {
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
                        assessorElement.assessmentStatus = "started"
                        assessorElement.userAgent = requestObject.headers['user-agent']
                    }

                    submissionDocument = await database.models.submissions.create(
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
                        submissionDocument = await database.models.submissions.findOneAndUpdate(
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
                                answer = this.getAnswersFromGeneralQuestion(answer, submissionDocument)
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
                                answer = this.getAnswersFromGeneralQuestion(answer, submissionDocument)
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

                    let canRatingsBeEnabled = await this.canEnableRatingQuestionsOfSubmission(updatedSubmissionDocument)
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

                    let status = await this.extractStatusOfSubmission(updatedSubmissionDocument)

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

    static rateEntities(submissionDocuments, sourceApiHelp = "multiRateApi") {

        return new Promise(async (resolve, reject) => {

            try {

                let result = {}
                let resultingArray = new Array

                await Promise.all(submissionDocuments.map(async eachSubmissionDocument => {

                    result.runUpdateQuery = true

                    let answersToUpdate = {}

                    let allSubmittedEvidence = eachSubmissionDocument.evidencesStatus.every(this.allSubmission)

                    if (allSubmittedEvidence) {

                        result.criteria = {}
                        result.themes = {}

                        let criteriaData = await Promise.all(eachSubmissionDocument.criteria.map(async (criteria) => {

                            if (criteria.weightage > 0) {

                                result.criteria[criteria.externalId] = {}
                                result.criteria[criteria.externalId].criteriaName = criteria.name
                                result.criteria[criteria.externalId].criteriaExternalId = criteria.externalId

                                let allCriteriaLevels = Object.values(criteria.rubric.levels).every(eachRubricLevels => {
                                    return eachRubricLevels.expression != ""
                                })

                                if (criteria.rubric.expressionVariables && allCriteriaLevels) {

                                    let submissionAnswers = new Array

                                    const questionAndCriteriaValueExtractor = function (questionOrCriteria) {
                                        let result;
                                        const questionOrCriteriaArray = questionOrCriteria.split('.')

                                        if (_.includes(questionOrCriteriaArray, "entityProfile")) {

                                            if (eachSubmissionDocument.entityProfile && eachSubmissionDocument.entityProfile[questionOrCriteriaArray[1]]) {
                                                result = eachSubmissionDocument.entityProfile[questionOrCriteriaArray[1]]
                                            } else {
                                                result = eachSubmissionDocument.entityInformation[questionOrCriteriaArray[1]]
                                            }

                                            if (!result || result == "" || !(result.length >= 0)) {
                                                result = "NA"
                                            }

                                            submissionAnswers.push(result)
                                            return result
                                        }


                                        if (questionOrCriteriaArray.findIndex(questionOrCriteria => _.includes(questionOrCriteria, "scoreOfAllQuestionInCriteria")) >= 0) {
                                            
                                            result = 0

                                            let criteriaIdIndex = questionOrCriteriaArray.findIndex(questionOrCriteria => !(_.includes(questionOrCriteria, "scoreOfAllQuestionInCriteria")))
                                            let criteriaId = questionOrCriteriaArray[criteriaIdIndex]
                                            if (criteriaIdIndex < 0) {
                                                return "NA"
                                            }

                                            let allCriteriaQuestions = _.filter(_.values(eachSubmissionDocument.answers), _.matchesProperty('criteriaId', criteriaId));


                                            let scoreOfAllQuestionInCriteria = {}
                                            let totalWeightOfQuestionInCriteria = 0
                                            allCriteriaQuestions.forEach((question,questionIndexInArray) => {
                                                if(question.value && (question.value != "" || Array.isArray(question.value)) && !question.notApplicable) {
                                                    let questionOptionsSelected = (Array.isArray(question.value)) ? question.value : [question.value]
                                                    if(questionOptionsSelected.length > 0) {
                                                        let selectedOptionScoreFound = false
                                                        questionOptionsSelected.forEach(optionValue => {
                                                            if(eachSubmissionDocument.questionDocuments && eachSubmissionDocument.questionDocuments[question.qid.toString()] && eachSubmissionDocument.questionDocuments[question.qid.toString()][`${optionValue}-score`]) {
                                                                if(scoreOfAllQuestionInCriteria[question.qid.toString()]) {
                                                                    scoreOfAllQuestionInCriteria[question.qid.toString()].score += eachSubmissionDocument.questionDocuments[question.qid.toString()][`${optionValue}-score`]
                                                                } else {
                                                                    scoreOfAllQuestionInCriteria[question.qid.toString()] = {
                                                                        score : eachSubmissionDocument.questionDocuments[question.qid.toString()][`${optionValue}-score`],
                                                                        weightage : (eachSubmissionDocument.questionDocuments[question.qid.toString()].weightage) ? eachSubmissionDocument.questionDocuments[question.qid.toString()].weightage : 1,
                                                                        questionIndexInArray : questionIndexInArray
                                                                    }
                                                                }
                                                                selectedOptionScoreFound = true
                                                            }
                                                        })
                                                        if(selectedOptionScoreFound) {
                                                            totalWeightOfQuestionInCriteria += (eachSubmissionDocument.questionDocuments[question.qid.toString()].weightage)  ? eachSubmissionDocument.questionDocuments[question.qid.toString()].weightage : 1
                                                        }
                                                        if(selectedOptionScoreFound) {
                                                            question.optionScores = eachSubmissionDocument.questionDocuments[question.qid.toString()]
                                                            question.optionScores.scoreAchieved = (scoreOfAllQuestionInCriteria[question.qid.toString()].score) ? scoreOfAllQuestionInCriteria[question.qid.toString()].score : ""
                                                        }
                                                    }
                                                }
                                            })

                                            if(totalWeightOfQuestionInCriteria > 0 && Object.keys(scoreOfAllQuestionInCriteria).length > 0) {
                                                Object.keys(scoreOfAllQuestionInCriteria).forEach(questionId => {
                                                    const questionPointsBasedScore = (scoreOfAllQuestionInCriteria[questionId].score*scoreOfAllQuestionInCriteria[questionId].weightage)/totalWeightOfQuestionInCriteria

                                                    result += questionPointsBasedScore
                                                    if(answersToUpdate[questionId]) {
                                                        answersToUpdate[questionId].pointsBasedScore = questionPointsBasedScore,
                                                        answersToUpdate[questionId].scoreAchieved = scoreOfAllQuestionInCriteria[questionId].score,
                                                        answersToUpdate[questionId].weightage = scoreOfAllQuestionInCriteria[questionId].weightage
                                                    } else {
                                                        answersToUpdate[questionId] = {
                                                            pointsBasedScore : questionPointsBasedScore,
                                                            scoreAchieved: scoreOfAllQuestionInCriteria[questionId].score,
                                                            weightage : scoreOfAllQuestionInCriteria[questionId].weightage
                                                        }
                                                    }
                                                    allCriteriaQuestions[scoreOfAllQuestionInCriteria[questionId].questionIndexInArray].pointsBasedScore = questionPointsBasedScore
                                                })
                                            }

                                            submissionAnswers.push(...allCriteriaQuestions)

                                            return result
                                        }

                                        if (questionOrCriteriaArray.findIndex(questionOrCriteria => _.includes(questionOrCriteria, "countOfAllQuestionInCriteria")) >= 0) {
                                            result = 0

                                            let criteriaIdIndex = questionOrCriteriaArray.findIndex(questionOrCriteria => !(_.includes(questionOrCriteria, "countOfAllQuestionInCriteria")))
                                            let criteriaId = questionOrCriteriaArray[criteriaIdIndex]
                                            if (criteriaIdIndex < 0) {
                                                return "NA"
                                            }

                                            let criteriaQuestionFunctionIndex = questionOrCriteriaArray.findIndex(questionOrCriteria => _.includes(questionOrCriteria, "countOfAllQuestionInCriteria"))
                                            let criteriaQuestionFunction = questionOrCriteriaArray[criteriaQuestionFunctionIndex]
                                            if (criteriaQuestionFunctionIndex < 0) {
                                                return "NA"
                                            }

                                            criteriaQuestionFunction = criteriaQuestionFunction.substring(
                                                criteriaQuestionFunction.lastIndexOf("(") + 1,
                                                criteriaQuestionFunction.lastIndexOf(")")
                                            );

                                            criteriaQuestionFunction = criteriaQuestionFunction.replace(/\s/g, '')

                                            let allCriteriaQuestions = _.filter(_.values(eachSubmissionDocument.answers), _.matchesProperty('criteriaId', criteriaId));


                                            let criteriaQuestionFilter = criteriaQuestionFunction.split(",")
                                            if (criteriaQuestionFilter[1]) {

                                                // allCriteriaQuestions = _.filter(allCriteriaQuestions, _.matchesProperty(_.head(criteriaQuestionFilter[1].split("=")), _.last(criteriaQuestionFilter[1].split("="))));

                                                let multipleConditionOperator = ""
                                                if (_.includes(criteriaQuestionFilter[1], "AND") > 0) {
                                                    multipleConditionOperator = "AND"
                                                }
                                                if (_.includes(criteriaQuestionFilter[1], "OR") > 0) {
                                                    multipleConditionOperator = "OR"
                                                }

                                                let conditionArray = new Array
                                                if (multipleConditionOperator != "") {
                                                    conditionArray = criteriaQuestionFilter[1].split(multipleConditionOperator)
                                                } else {
                                                    conditionArray.push(criteriaQuestionFilter[1])
                                                }


                                                let tempAllQuestion = new Array

                                                allCriteriaQuestions.forEach(question => {

                                                    let conditionMatch = 0
                                                    let conditionNotMatch = 0

                                                    for (let pointerToConditionArray = 0; pointerToConditionArray < conditionArray.length; pointerToConditionArray++) {
                                                        let eachConditionArray = new Array
                                                        let questionMatchOperator = "=="
                                                        if (_.includes(conditionArray[pointerToConditionArray], "!=") > 0) {
                                                            eachConditionArray = conditionArray[pointerToConditionArray].split("!=")
                                                            questionMatchOperator = "!="
                                                        } else {
                                                            eachConditionArray = conditionArray[pointerToConditionArray].split("=")
                                                        }

                                                        let singleConditionOperator = ""
                                                        if (_.includes(eachConditionArray[1], "&&") > 0) {
                                                            singleConditionOperator = "&&"
                                                        }
                                                        if (_.includes(eachConditionArray[1], "||") > 0) {
                                                            singleConditionOperator = "||"
                                                        }


                                                        let allPossibleValues = new Array
                                                        if (singleConditionOperator != "") {
                                                            allPossibleValues = eachConditionArray[1].split(singleConditionOperator)
                                                        } else {
                                                            allPossibleValues.push(eachConditionArray[1])
                                                        }

                                                        let conditionValueMatch = 0
                                                        let conditionValueNotMatch = 0
                                                        for (let pointerToAllPossibleValuesArray = 0; pointerToAllPossibleValuesArray < allPossibleValues.length; pointerToAllPossibleValuesArray++) {
                                                            const eachValue = allPossibleValues[pointerToAllPossibleValuesArray];
                                                            if (questionMatchOperator == "==" && _.isEqual(question[eachConditionArray[0]], eachValue)) {
                                                                conditionValueMatch += 1
                                                            } else if (questionMatchOperator == "!=" && !_.isEqual(question[eachConditionArray[0]], eachValue)) {
                                                                conditionValueMatch += 1
                                                            } else {
                                                                conditionValueNotMatch += 1
                                                            }
                                                        }

                                                        if (singleConditionOperator == "||" && conditionValueMatch > 0) {
                                                            conditionMatch += 1
                                                        } else if ((singleConditionOperator == "&&" || singleConditionOperator == "") && conditionValueNotMatch <= 0) {
                                                            conditionMatch += 1
                                                        } else {
                                                            conditionNotMatch += 1
                                                        }

                                                    }

                                                    if (multipleConditionOperator == "OR" && conditionMatch > 0) {
                                                        tempAllQuestion.push(question)
                                                    } else if ((multipleConditionOperator == "AND" || multipleConditionOperator == "") && conditionNotMatch <= 0) {
                                                        tempAllQuestion.push(question)
                                                    }

                                                })

                                                allCriteriaQuestions = tempAllQuestion

                                            }

                                            submissionAnswers.push(...allCriteriaQuestions)

                                            allCriteriaQuestions.forEach(question => {
                                                if (question[_.head(criteriaQuestionFilter[0].split("="))] && question[_.head(criteriaQuestionFilter[0].split("="))] == _.last(criteriaQuestionFilter[0].split("="))) {
                                                    result += 1
                                                }
                                            })

                                            return result
                                        }

                                        eachSubmissionDocument.answers[questionOrCriteriaArray[0]] && submissionAnswers.push(eachSubmissionDocument.answers[questionOrCriteriaArray[0]])
                                        let inputTypes = ["value", "instanceResponses", "endTime", "startTime", "countOfInstances"];
                                        inputTypes.forEach(inputType => {
                                            if (questionOrCriteriaArray[1] === inputType) {
                                                if (eachSubmissionDocument.answers[questionOrCriteriaArray[0]] && (!eachSubmissionDocument.answers[questionOrCriteriaArray[0]].notApplicable || eachSubmissionDocument.answers[questionOrCriteriaArray[0]].notApplicable != true) && (eachSubmissionDocument.answers[questionOrCriteriaArray[0]][inputType] || eachSubmissionDocument.answers[questionOrCriteriaArray[0]][inputType] == 0)) {

                                                    result = eachSubmissionDocument.answers[questionOrCriteriaArray[0]][inputType];
                                                } else {
                                                    result = "NA";
                                                }
                                            }
                                        })
                                        return result;
                                    }

                                    let expressionVariables = {};
                                    let expressionResult = {};
                                    let allValuesAvailable = true;

                                    Object.keys(criteria.rubric.expressionVariables).forEach(variable => {
                                        if (variable != "default") {
                                            expressionVariables[variable] = questionAndCriteriaValueExtractor(criteria.rubric.expressionVariables[variable]);
                                            expressionVariables[variable] = (expressionVariables[variable] === "NA" && criteria.rubric.expressionVariables.default && criteria.rubric.expressionVariables.default[variable]) ? criteria.rubric.expressionVariables.default[variable] : expressionVariables[variable]
                                            if (expressionVariables[variable] === "NA") {
                                                allValuesAvailable = false;
                                            }
                                        }
                                    })

                                    let errorWhileParsingCriteriaExpression = false
                                    let errorExpression = {}

                                    if (allValuesAvailable) {

                                        Object.keys(criteria.rubric.levels).forEach(level => {

                                            if (criteria.rubric.levels[level].expression != "") {

                                                try {

                                                    expressionResult[level] = {
                                                        expressionParsed: criteria.rubric.levels[level].expression,
                                                        result: mathJs.eval(criteria.rubric.levels[level].expression, expressionVariables)
                                                    }

                                                } catch (error) {
                                                    console.log("---------------Some exception caught begins---------------")
                                                    console.log(error)
                                                    console.log(criteria.name)
                                                    console.log(criteria.rubric.levels[level].expression)
                                                    console.log(expressionVariables)
                                                    console.log(criteria.rubric.expressionVariables)
                                                    console.log("---------------Some exception caught ends---------------")

                                                    expressionResult[level] = {
                                                        expressionParsed: criteria.rubric.levels[level].expression
                                                    }

                                                    let errorObject = {
                                                        errorName: error.message,
                                                        criteriaName: criteria.name,
                                                        expression: criteria.rubric.levels[level].expression,
                                                        expressionVariables: JSON.stringify(expressionVariables),
                                                        errorLevels: criteria.rubric.levels[level].level,
                                                        expressionVariablesDefined: JSON.stringify(criteria.rubric.expressionVariables)
                                                    }

                                                    slackClient.rubricErrorLogs(errorObject)

                                                    errorWhileParsingCriteriaExpression = true

                                                }

                                            } else {

                                                expressionResult[level] = {
                                                    expressionParsed: criteria.rubric.levels[level].expression,
                                                    result: false
                                                }
                                            }

                                        })

                                    }

                                    let score = "NA"
                                    if (allValuesAvailable && !errorWhileParsingCriteriaExpression) {
                                        score = "No Level Matched"
                                        if(expressionResult && Object.keys(expressionResult).length > 0) {
                                            const levelArrayFromHighToLow = _.reverse(Object.keys(expressionResult).sort())
                                            for (let levelIndex = 0; levelIndex < levelArrayFromHighToLow.length; levelIndex++) {
                                                const levelKey = levelArrayFromHighToLow[levelIndex];
                                                if(expressionResult[levelKey] && expressionResult[levelKey].result) {
                                                    score = levelKey
                                                }
                                            }
                                        }
                                    }

                                    result.criteria[criteria.externalId].expressionVariablesDefined = criteria.rubric.expressionVariables
                                    result.criteria[criteria.externalId].expressionVariables = expressionVariables

                                    if (score == "NA") {
                                        result.criteria[criteria.externalId].valuesNotFound = true
                                        result.criteria[criteria.externalId].score = score
                                        criteria.score = score
                                    } else if (score == "No Level Matched") {
                                        result.criteria[criteria.externalId].noExpressionMatched = true
                                        result.criteria[criteria.externalId].score = score
                                        criteria.score = score
                                    } else {
                                        result.criteria[criteria.externalId].score = score
                                        criteria.score = score
                                    }

                                    if(eachSubmissionDocument.scoringSystem == "pointsBasedScoring") {
                                        criteria.pointsBasedScore = 0
                                        submissionAnswers.forEach(answer => {
                                            if(answer.pointsBasedScore) criteria.pointsBasedScore += answer.pointsBasedScore
                                        })
                                    }
                                    

                                    result.criteria[criteria.externalId].expressionResult = expressionResult
                                    result.criteria[criteria.externalId].submissionAnswers = submissionAnswers
                                }

                                return criteria

                            }

                        }));

                        if (criteriaData.findIndex(criteria => criteria === undefined) >= 0) {
                            result.runUpdateQuery = false
                        }

                        let themes = {}

                        if(result.runUpdateQuery && eachSubmissionDocument.scoringSystem == "pointsBasedScoring" && eachSubmissionDocument.themes && eachSubmissionDocument.themes.length > 0) {
                                
                            themes = await this.calulateThemeScores(eachSubmissionDocument.themes, criteriaData)
                            
                            if(!themes.success) {
                                result.runUpdateQuery = false
                            }
                            
                            result.themes = themes.themeResult

                        }

                        if (result.runUpdateQuery) {

                            let updateObject = {}

                            updateObject.$set = {
                                criteria: criteriaData,
                                ratingCompletedAt: new Date()
                            }

                            if(themes.success) {
                                updateObject.$set.themes = themes.themeData
                            }

                            if(answersToUpdate && Object.keys(answersToUpdate).length > 0) {
                                Object.keys(answersToUpdate).forEach(questionId => {
                                    if(Object.keys(answersToUpdate[questionId]).length > 0) {
                                        Object.keys(answersToUpdate[questionId]).forEach(answerField => {
                                            if(answerField != "value" || answerField != "payload") {
                                                updateObject.$set[`answers.${questionId}.${answerField}`] = answersToUpdate[questionId][answerField]
                                            }
                                        })
                                    }
                                })
                            }

                            let submissionModel = (eachSubmissionDocument.submissionCollection) ? eachSubmissionDocument.submissionCollection : "submissions"

                            let updatedSubmissionDocument = await database.models[submissionModel].findOneAndUpdate(
                                {
                                    _id: eachSubmissionDocument._id
                                },
                                updateObject
                            );

                        }

                        let message = "Crtieria rating completed successfully"

                        if (sourceApiHelp == "singleRateApi") {
                            return resolve({
                                result: result,
                                message: message
                            })
                        }

                        resultingArray.push({
                            entityId: eachSubmissionDocument.entityExternalId,
                            message: message
                        })

                    } else {

                        if (sourceApiHelp == "singleRateApi") {
                            return resolve({
                                status: 404,
                                message: "All ECM are not submitted"
                            })
                        }

                        resultingArray.push({
                            entityId: eachSubmissionDocument.entityExternalId,
                            message: "All ECM are not submitted"
                        })

                    }

                }))


                return resolve(resultingArray);


            } catch (error) {
                return reject(error);
            }

        })

    }


    static calulateThemeScores(themesWithRubric, criteriaDataArray) {

        return new Promise(async (resolve, reject) => {

            try {
                let themeScores = new Array
                let themeByHierarchyLevel = {}
                let maxThemeDepth = 0
                let themeScoreCalculationCompleted = true
                let themeResult = {}
                let criteriaMap = {}

                for (let pointerToThemeArray = 0; pointerToThemeArray < themesWithRubric.length; pointerToThemeArray++) {
                    const theme = themesWithRubric[pointerToThemeArray];
                    if(theme.hierarchyLevel && theme.hierarchyLevel > maxThemeDepth) {
                        maxThemeDepth = theme.hierarchyLevel
                    }
                    (themeByHierarchyLevel[theme.hierarchyLevel]) ? themeByHierarchyLevel[theme.hierarchyLevel].push(theme):  themeByHierarchyLevel[theme.hierarchyLevel] = [theme]
                }

                criteriaDataArray.forEach(criteria => {
                    criteriaMap[criteria._id.toString()] = criteria
                })

                if(Object.keys(themeByHierarchyLevel).length > 0) {
                    while (maxThemeDepth >= 0) {
                        
                        if(themeByHierarchyLevel[maxThemeDepth]) {

                            let themeData = await Promise.all(themeByHierarchyLevel[maxThemeDepth].map(async (theme) => {

                                themeResult[theme.externalId] = {}
                                themeResult[theme.externalId].themeName = theme.name
                                themeResult[theme.externalId].themeExternalId = theme.externalId

                                if (theme.weightage > 0) {
    
                                    let allThemeLevelExpressions = Object.values(theme.rubric.levels).every(eachRubricLevels => {
                                        return eachRubricLevels.expression != ""
                                    })
    
                                    if (theme.rubric.expressionVariables && allThemeLevelExpressions) {
    
                                        let children = new Array
    
                                        const subThemeValueExtractor = function (subTheme) {
                                            
                                            let result = "NA";
                                            
                                            const subThemeArray = subTheme.split('.')
                                            
                                            if (subThemeArray.findIndex(theme => _.includes(theme, "sumOfPointsOfAllChildren")) >= 0) {
                                                
                                                result = 0
    
                                                let themeExternalIdIndex = subThemeArray.findIndex(theme => !(_.includes(theme, "sumOfPointsOfAllChildren")))
                                                if (themeExternalIdIndex < 0) {
                                                    return "NA"
                                                }

                                                let scoreOfAllSubthemeInTheme = {}
                                                let totalWeightOfSubthemeInTheme = 0

                                                if(theme.immediateChildren) {
                                                    theme.immediateChildren.forEach(subTheme => {
                                                        const subThemeScore =  _.find(themeScores, { 'externalId': subTheme.externalId})
                                                        if(subTheme.weightage > 0) {
                                                            scoreOfAllSubthemeInTheme[subTheme.externalId] = {
                                                                subThemeExternalId :subTheme.externalId,
                                                                weightage : subTheme.weightage,
                                                                scoreAchieved : subThemeScore.pointsBasedScore
                                                            }
                                                            totalWeightOfSubthemeInTheme += subTheme.weightage
                                                        }
                                                    })
                                                }

                                                theme.criteriaLevelCount = {}

                                                theme.criteria.forEach(themeCriteria => {
                                                    if(themeCriteria.weightage > 0) {
                                                        if(criteriaMap[themeCriteria.criteriaId.toString()]) {
                                                            (theme.criteriaLevelCount[criteriaMap[themeCriteria.criteriaId.toString()].score]) ? theme.criteriaLevelCount[criteriaMap[themeCriteria.criteriaId.toString()].score] += 1 : theme.criteriaLevelCount[criteriaMap[themeCriteria.criteriaId.toString()].score] = 1
                                                        }

                                                        if(!theme.immediateChildren && criteriaMap[themeCriteria.criteriaId.toString()]) {
                                                            scoreOfAllSubthemeInTheme[themeCriteria.criteriaId.toString()] = {
                                                                criteriaId :themeCriteria.criteriaId,
                                                                weightage : themeCriteria.weightage,
                                                                scoreAchieved : criteriaMap[themeCriteria.criteriaId.toString()].pointsBasedScore
                                                            }
                                                            totalWeightOfSubthemeInTheme += themeCriteria.weightage
                                                        }

                                                    }
                                                })

                                                theme.pointsBasedScore = 0

                                                Object.keys(scoreOfAllSubthemeInTheme).length > 0 && Object.keys(scoreOfAllSubthemeInTheme).forEach(subThemeKey => {
                                                    theme.pointsBasedScore += (scoreOfAllSubthemeInTheme[subThemeKey].scoreAchieved * scoreOfAllSubthemeInTheme[subThemeKey].weightage) / totalWeightOfSubthemeInTheme
                                                    scoreOfAllSubthemeInTheme[subThemeKey].pointsBasedScore = (scoreOfAllSubthemeInTheme[subThemeKey].scoreAchieved * scoreOfAllSubthemeInTheme[subThemeKey].weightage) / totalWeightOfSubthemeInTheme
                                                })
    
                                                children.push(Object.values(scoreOfAllSubthemeInTheme))
                                                
                                                result = theme.pointsBasedScore
                                            }

                                            return result;
                                        }
    
                                        let expressionVariables = {};
                                        let expressionResult = {};
                                        let allValuesAvailable = true;
    
                                        Object.keys(theme.rubric.expressionVariables).forEach(variable => {
                                            if (variable != "default") {
                                                expressionVariables[variable] = subThemeValueExtractor(theme.rubric.expressionVariables[variable]);
                                                expressionVariables[variable] = (expressionVariables[variable] === "NA" && theme.rubric.expressionVariables.default && theme.rubric.expressionVariables.default[variable]) ? theme.rubric.expressionVariables.default[variable] : expressionVariables[variable]
                                                if (expressionVariables[variable] === "NA") {
                                                    allValuesAvailable = false;
                                                }
                                            }
                                        })
    
                                        let errorWhileParsingThemeExpression = false
                                        let errorExpression = {}
    
                                        if (allValuesAvailable) {
                                            
                                            Object.keys(theme.rubric.levels).forEach(level => {
    
                                                if (theme.rubric.levels[level].expression != "") {
    
                                                    try {
    
                                                        expressionResult[level] = {
                                                            expressionParsed: theme.rubric.levels[level].expression,
                                                            result: mathJs.eval(theme.rubric.levels[level].expression, expressionVariables)
                                                        }
    
                                                    } catch (error) {
                                                        console.log("---------------Some exception caught begins---------------")
                                                        console.log(error)
                                                        console.log(theme.name)
                                                        console.log(theme.rubric.levels[level].expression)
                                                        console.log(expressionVariables)
                                                        console.log(theme.rubric.expressionVariables)
                                                        console.log("---------------Some exception caught ends---------------")
    
                                                        expressionResult[level] = {
                                                            expressionParsed: theme.rubric.levels[level].expression
                                                        }
    
                                                        let errorObject = {
                                                            errorName: error.message,
                                                            themeName: theme.name,
                                                            expression: theme.rubric.levels[level].expression,
                                                            expressionVariables: JSON.stringify(expressionVariables),
                                                            errorLevels: theme.rubric.levels[level].level,
                                                            expressionVariablesDefined: JSON.stringify(theme.rubric.expressionVariables)
                                                        }
    
                                                        slackClient.rubricErrorLogs(errorObject)
    
                                                        errorWhileParsingThemeExpression = true
    
                                                    }
    
                                                } else {
    
                                                    expressionResult[level] = {
                                                        expressionParsed: theme.rubric.levels[level].expression,
                                                        result: false
                                                    }
                                                }
    
                                            })
    
                                        }
    
                                        let score = "NA"
                                        if (allValuesAvailable && !errorWhileParsingThemeExpression) {
                                            score = "No Level Matched"
                                            if(expressionResult && Object.keys(expressionResult).length > 0) {
                                                const levelArrayFromHighToLow = _.reverse(Object.keys(expressionResult).sort())
                                                for (let levelIndex = 0; levelIndex < levelArrayFromHighToLow.length; levelIndex++) {
                                                    const levelKey = levelArrayFromHighToLow[levelIndex];
                                                    if(expressionResult[levelKey] && expressionResult[levelKey].result) {
                                                        score = levelKey
                                                    }
                                                }
                                            }
                                        }
    
                                        themeResult[theme.externalId].expressionVariablesDefined = theme.rubric.expressionVariables
                                        themeResult[theme.externalId].expressionVariables = expressionVariables
    
                                        if (score == "NA") {
                                            themeResult[theme.externalId].valuesNotFound = true
                                            themeResult[theme.externalId].pointsBasedLevel = score
                                            theme.pointsBasedLevel = score
                                        } else if (score == "No Level Matched") {
                                            themeResult[theme.externalId].noExpressionMatched = true
                                            themeResult[theme.externalId].pointsBasedLevel = score
                                            theme.pointsBasedLevel = score
                                        } else {
                                            themeResult[theme.externalId].pointsBasedLevel = score
                                            theme.pointsBasedLevel = score
                                        }
    
                                        themeResult[theme.externalId].expressionResult = expressionResult
                                        themeResult[theme.externalId].children = children
                                    }
    
                                    return theme
    
                                }
    
                            }));

                            if (themeData.findIndex(theme => theme === undefined) >= 0) {
                                maxThemeDepth = -1
                                themeScoreCalculationCompleted = false
                                break;
                            }

                            themeScores = themeScores.concat(themeData)
                        }

                        maxThemeDepth -= 1
                    }
                }

                return resolve({
                    success : themeScoreCalculationCompleted,
                    themeData : themeScores,
                    themeResult : themeResult
                });


            } catch (error) {
                return reject(error);
            }

        })
    }

};