let slackClient = require(ROOT_PATH + "/generics/helpers/slackCommunications");
let kafkaClient = require(ROOT_PATH + "/generics/helpers/kafkaCommunications");
const emailClient = require(ROOT_PATH + "/generics/helpers/emailCommunications");
const submissionsHelper = require(MODULES_BASE_PATH + "/submissions/helper")
const criteriaHelper = require(MODULES_BASE_PATH + "/criteria/helper")
const questionsHelper = require(MODULES_BASE_PATH + "/questions/helper")

module.exports = class observationSubmissionsHelper {

    static pushCompletedObservationSubmissionForReporting(observationSubmissionId) {
        return new Promise(async (resolve, reject) => {
            try {

                if (observationSubmissionId == "") {
                    throw "No observation submission id found"
                }

                if(typeof observationSubmissionId == "string") {
                    observationSubmissionId = ObjectId(observationSubmissionId)
                }

                let observationSubmissionsDocument = await database.models.observationSubmissions.findOne({
                    _id: observationSubmissionId,
                    status: "completed"
                }).lean()

                if (!observationSubmissionsDocument) {
                    throw "No submission found or submission status is not completed"
                }

                const kafkaMessage = await kafkaClient.pushCompletedObservationSubmissionToKafka(observationSubmissionsDocument)

                if(kafkaMessage.status != "success") {
                    let errorObject = {
                        formData: {
                            observationSubmissionId:observationSubmissionsDocument._id.toString(),
                            message:kafkaMessage.message
                        }
                    }
                    slackClient.kafkaErrorAlert(errorObject)
                }

                return resolve(kafkaMessage)

            } catch (error) {
                return reject(error);
            }
        })
    }

    static pushObservationSubmissionToQueueForRating(observationSubmissionId = "") {
        return new Promise(async (resolve, reject) => {
            try {

                if (observationSubmissionId == "") {
                    throw "No observation submission id found"
                }


                if(typeof observationSubmissionId !== "string") {
                    observationSubmissionId = observationSubmissionId.toString()
                }

                const kafkaMessage = await kafkaClient.pushObservationSubmissionToKafkaQueueForRating({submissionModel : "observationSubmissions",submissionId : observationSubmissionId})

                if(kafkaMessage.status != "success") {
                    let errorObject = {
                        formData: {
                            submissionId:observationSubmissionId,
                            submissionModel:"observationSubmissions",
                            message:kafkaMessage.message
                        }
                    }
                    slackClient.kafkaErrorAlert(errorObject)
                }

                return resolve(kafkaMessage)

            } catch (error) {
                return reject(error);
            }
        })
    }

    static rateSubmissionById(submissionId = "") {
        return new Promise(async (resolve, reject) => {
            try {

                let emailRecipients = (process.env.SUBMISSION_RATING_DEFAULT_EMAIL_RECIPIENTS && process.env.SUBMISSION_RATING_DEFAULT_EMAIL_RECIPIENTS != "") ? process.env.SUBMISSION_RATING_DEFAULT_EMAIL_RECIPIENTS : ""

                if (submissionId == "") {
                    throw new Error("No observation submission id found")
                }

                let submissionDocument = await database.models.observationSubmissions.findOne(
                    {_id : ObjectId(submissionId)},
                    { "answers": 1, "criteria": 1, "evidencesStatus": 1, "entityInformation": 1, "entityProfile": 1, "solutionExternalId": 1, "programExternalId": 1 }
                ).lean();
        
                if (!submissionDocument._id) {
                    throw new Error("Couldn't find the observation submission document")
                }

                let solutionDocument = await database.models.solutions.findOne({
                    externalId: submissionDocument.solutionExternalId,
                    type : "observation",
                    scoringSystem : "pointsBasedScoring"
                }, { themes: 1, levelToScoreMapping: 1, scoringSystem : 1, flattenedThemes : 1, sendSubmissionRatingEmailsTo : 1}).lean()

                if (!solutionDocument) {
                    throw new Error("Couldn't find the solution document")
                }

                if(solutionDocument.sendSubmissionRatingEmailsTo && solutionDocument.sendSubmissionRatingEmailsTo != "") {
                    emailRecipients = solutionDocument.sendSubmissionRatingEmailsTo
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

                if(resultingArray.result.runUpdateQuery) {
                    await database.models.observationSubmissions.updateOne(
                        {
                            _id: ObjectId(submissionId)
                        },
                        {
                            status: "completed",
                            completedDate: new Date()
                        }
                    );
                    await this.pushCompletedObservationSubmissionForReporting(submissionId)
                    emailClient.pushMailToEmailService(emailRecipients,"Observation Auto Rating Successful - "+submissionId,JSON.stringify(resultingArray))
                    return resolve("Observation rating completed successfully.")
                } else {
                    emailClient.pushMailToEmailService(emailRecipients,"Observation Auto Rating Failed - "+submissionId,JSON.stringify(resultingArray))
                    return resolve("Observation rating completed successfully.")
                }

            } catch (error) {
                emailClient.pushMailToEmailService(emailRecipients,"Observation Auto Rating Failed - "+submissionId,error.message)
                return reject(error);
            }
        })
    }

};


