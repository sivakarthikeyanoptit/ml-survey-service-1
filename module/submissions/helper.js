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

    static rateEntities(submissionDocuments,sourceApiHelp = "multiRateApi") {

        return new Promise(async (resolve, reject) => {

            try {

                let result = {}
                let resultingArray = new Array

                await Promise.all(submissionDocuments.map(async eachSubmissionDocument=>{
                    
                    result.runUpdateQuery = true

                    let allSubmittedEvidence = eachSubmissionDocument.evidencesStatus.every(this.allSubmission)
        
                    if (allSubmittedEvidence) {

                        let criteriaData = await Promise.all(submissionDocument.criteria.map(async (criteria) => {

                            if(criteria.weightage > 0) {

                                result[criteria.externalId] = {}
                                result[criteria.externalId].criteriaName = criteria.name
                                result[criteria.externalId].criteriaExternalId = criteria.externalId
                                
                                let allCriteriaLevels = Object.values(criteria.rubric.levels).every(eachRubricLevels=>{
                                    return eachRubricLevels.expression != ""
                                })
                                
                                if (criteria.rubric.expressionVariables && allCriteriaLevels) {
                                    
                                    let submissionAnswers = new Array

                                    const questionAndCriteriaValueExtractor = function (questionOrCriteria) {
                                        let result;
                                        const questionOrCriteriaArray = questionOrCriteria.split('.')
                                        
                                        if(_.includes(questionOrCriteriaArray,"entityProfile")) {

                                            if(submissionDocument.entityProfile && submissionDocument.entityProfile[questionOrCriteriaArray[1]]){
                                                result = submissionDocument.entityProfile[questionOrCriteriaArray[1]]
                                            } else {
                                                result = submissionDocument.entityInformation[questionOrCriteriaArray[1]]
                                            }

                                            if(!result || result == "" || !(result.length>=0)) {
                                                result = "NA"
                                            }

                                            submissionAnswers.push(result)
                                            return result
                                        }

                                        if(questionOrCriteriaArray.findIndex(questionOrCriteria => _.includes(questionOrCriteria,"countOfAllQuestionInCriteria")) >= 0) {
                                            result = 0

                                            let criteriaIdIndex = questionOrCriteriaArray.findIndex(questionOrCriteria => !(_.includes(questionOrCriteria,"countOfAllQuestionInCriteria")))
                                            let criteriaId = questionOrCriteriaArray[criteriaIdIndex]
                                            if(criteriaIdIndex < 0) {
                                                return "NA"
                                            }

                                            let criteriaQuestionFunctionIndex = questionOrCriteriaArray.findIndex(questionOrCriteria => _.includes(questionOrCriteria,"countOfAllQuestionInCriteria"))
                                            let criteriaQuestionFunction = questionOrCriteriaArray[criteriaQuestionFunctionIndex]
                                            if(criteriaQuestionFunctionIndex < 0) {
                                                return "NA"
                                            }

                                            criteriaQuestionFunction = criteriaQuestionFunction.substring(
                                                criteriaQuestionFunction.lastIndexOf("(") + 1, 
                                                criteriaQuestionFunction.lastIndexOf(")")
                                            );
                                            
                                            criteriaQuestionFunction = criteriaQuestionFunction.replace(/\s/g,'')

                                            let allCriteriaQuestions = _.filter(_.values(submissionDocument.answers), _.matchesProperty('criteriaId', criteriaId));
                                            

                                            let criteriaQuestionFilter = criteriaQuestionFunction.split(",")
                                            if(criteriaQuestionFilter[1]) {
                                            
                                            // allCriteriaQuestions = _.filter(allCriteriaQuestions, _.matchesProperty(_.head(criteriaQuestionFilter[1].split("=")), _.last(criteriaQuestionFilter[1].split("="))));

                                            let multipleConditionOperator = ""
                                            if(_.includes(criteriaQuestionFilter[1],"AND") > 0) {
                                                multipleConditionOperator = "AND"
                                            }
                                            if(_.includes(criteriaQuestionFilter[1],"OR") > 0) {
                                                multipleConditionOperator = "OR"
                                            }
                                            
                                            let conditionArray = new Array
                                            if(multipleConditionOperator != "") {
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
                                                if(_.includes(conditionArray[pointerToConditionArray],"!=") > 0) {
                                                    eachConditionArray = conditionArray[pointerToConditionArray].split("!=")
                                                    questionMatchOperator = "!="
                                                } else {
                                                    eachConditionArray = conditionArray[pointerToConditionArray].split("=")
                                                }

                                                let singleConditionOperator = ""
                                                if(_.includes(eachConditionArray[1],"&&") > 0) {
                                                    singleConditionOperator = "&&"
                                                }
                                                if(_.includes(eachConditionArray[1],"||") > 0) {
                                                    singleConditionOperator = "||"
                                                }


                                                let allPossibleValues = new Array
                                                if(singleConditionOperator != "") {
                                                    allPossibleValues = eachConditionArray[1].split(singleConditionOperator)
                                                } else {
                                                    allPossibleValues.push(eachConditionArray[1])
                                                }

                                                let conditionValueMatch = 0
                                                let conditionValueNotMatch = 0
                                                for (let pointerToAllPossibleValuesArray = 0; pointerToAllPossibleValuesArray < allPossibleValues.length; pointerToAllPossibleValuesArray++) {
                                                    const eachValue = allPossibleValues[pointerToAllPossibleValuesArray];
                                                    if(questionMatchOperator == "==" && _.isEqual(question[eachConditionArray[0]],eachValue)) {
                                                    conditionValueMatch += 1
                                                    } else if (questionMatchOperator == "!=" && !_.isEqual(question[eachConditionArray[0]],eachValue)) {
                                                    conditionValueMatch += 1
                                                    } else {
                                                    conditionValueNotMatch += 1
                                                    }
                                                }

                                                if(singleConditionOperator == "||" && conditionValueMatch > 0) {
                                                    conditionMatch += 1
                                                } else if ((singleConditionOperator == "&&" || singleConditionOperator == "") && conditionValueNotMatch <= 0) {
                                                    conditionMatch += 1
                                                } else {
                                                    conditionNotMatch += 1
                                                }

                                                }

                                                if(multipleConditionOperator == "OR" && conditionMatch > 0) {
                                                tempAllQuestion.push(question)
                                                } else if ((multipleConditionOperator == "AND" || multipleConditionOperator == "") && conditionNotMatch <= 0) {
                                                tempAllQuestion.push(question)
                                                }

                                            })
                                            
                                            allCriteriaQuestions = tempAllQuestion

                                            }
                                            
                                            submissionAnswers.push(...allCriteriaQuestions)

                                            allCriteriaQuestions.forEach(question => {
                                            if(question[_.head(criteriaQuestionFilter[0].split("="))] && question[_.head(criteriaQuestionFilter[0].split("="))] == _.last(criteriaQuestionFilter[0].split("="))) {
                                                result += 1
                                            }
                                            })

                                            return result
                                        }

                                        submissionAnswers.push(submissionDocument.answers[questionOrCriteriaArray[0]])
                                        let inputTypes = ["value", "instanceResponses", "endTime", "startTime", "countOfInstances"];
                                        inputTypes.forEach(inputType => {
                                            if (questionOrCriteriaArray[1] === inputType) {
                                                if (submissionDocument.answers[questionOrCriteriaArray[0]] && (!submissionDocument.answers[questionOrCriteriaArray[0]].notApplicable || submissionDocument.answers[questionOrCriteriaArray[0]].notApplicable != true) && (submissionDocument.answers[questionOrCriteriaArray[0]][inputType] || submissionDocument.answers[questionOrCriteriaArray[0]][inputType] == 0)) {
                                                // if (submissionDocument.answers[questionOrCriteriaArray[0]] && (submissionDocument.answers[questionOrCriteriaArray[0]][inputType] || submissionDocument.answers[questionOrCriteriaArray[0]][inputType] == 0)) {
                                                    result = submissionDocument.answers[questionOrCriteriaArray[0]][inputType];
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
                                                        errorName:error.message,
                                                        criteriaName:criteria.name,
                                                        expression:criteria.rubric.levels[level].expression,
                                                        expressionVariables:JSON.stringify(expressionVariables),
                                                        errorLevels:criteria.rubric.levels[level].level,
                                                        expressionVariablesDefined:JSON.stringify(criteria.rubric.expressionVariables)
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
                                        if (expressionResult.L4 && expressionResult.L4.result) {
                                            score = "L4"
                                        } else if (expressionResult.L3 && expressionResult.L3.result) {
                                            score = "L3"
                                        } else if (expressionResult.L2 && expressionResult.L2.result) {
                                            score = "L2"
                                        } else if (expressionResult.L1 && expressionResult.L1.result) {
                                            score = "L1"
                                        } else {
                                            score = "No Level Matched"
                                        }
                                    }

                                    result[criteria.externalId].expressionVariablesDefined = criteria.rubric.expressionVariables
                                    result[criteria.externalId].expressionVariables = expressionVariables

                                    if (score == "NA") {
                                        result[criteria.externalId].valuesNotFound = true
                                        result[criteria.externalId].score = score
                                        criteria.score = score
                                    } else if (score == "No Level Matched") {
                                        result[criteria.externalId].noExpressionMatched = true
                                        result[criteria.externalId].score = score
                                        criteria.score = score
                                    } else {
                                        result[criteria.externalId].score = score
                                        criteria.score = score
                                    }

                                    result[criteria.externalId].expressionResult = expressionResult
                                    result[criteria.externalId].submissionAnswers = submissionAnswers
                                }

                                return criteria

                            }

                        }));
                
                        if (criteriaData.findIndex(criteria => criteria === undefined) >= 0) {
                            result.runUpdateQuery = false
                        }
                
                        if (result.runUpdateQuery) {

                            let updateObject = {}
                
                            updateObject.$set = {
                                criteria: criteriaData,
                                ratingCompletedAt : new Date()
                            }
                
                            let updatedSubmissionDocument = await database.models.submissions.findOneAndUpdate(
                                {
                                    _id:eachSubmissionDocument._id
                                },
                                updateObject
                            );

                        }

                        if(sourceApiHelp == "singleRateApi") {
                            return resolve({
                                message: "Crtieria rating completed successfully",
                                result: result
                            })
                        }

                        resultingArray.push({
                            entityId:eachSubmissionDocument.entityExternalId,
                            message: message
                        })

                    } else {

                        if(sourceApiHelp == "singleRateApi") {
                            return resolve({
                                status: 404,
                                message: "All ECM are not submitted"
                            })
                        }

                        resultingArray.push({
                            entityId:eachSubmissionDocument.entityExternalId,
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


};