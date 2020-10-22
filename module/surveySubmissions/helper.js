/**
 * name : surveySubmissions/helper.js
 * author : Deepa
 * created-date : 07-Spe-2020
 * Description : Survey submissions helper functionality.
 */

// Dependencies
const kafkaClient = require(ROOT_PATH + "/generics/helpers/kafkaCommunications");
const slackClient = require(ROOT_PATH + "/generics/helpers/slackCommunications");
const solutionsHelper = require(MODULES_BASE_PATH + "/solutions/helper");

/**
    * SurveySubmissionsHelper
    * @class
*/
module.exports = class SurveySubmissionsHelper {


   /**
   * find survey submissions
   * @method
   * @name surveySubmissionDocuments
   * @param {Array} [surveySubmissionFilter = "all"] - survey submission ids.
   * @param {Array} [fieldsArray = "all"] - projected fields.
   * @param {Array} [sortedData = "all"] - sorted field.
   * @param {Array} [skipFields = "none"] - field not to include
   * @returns {Array} List of survey submissions. 
   */
  
  static surveySubmissionDocuments(
    surveySubmissionFilter = "all", 
    fieldsArray = "all",
    sortedData = "all",
    skipFields = "none"
  ) {
    return new Promise(async (resolve, reject) => {
        try {
    
            let queryObject = (surveySubmissionFilter != "all") ? surveySubmissionFilter : {};
    
            let projection = {}
    
            if (fieldsArray != "all") {
                fieldsArray.forEach(field => {
                    projection[field] = 1;
                });
            }

            if( skipFields !== "none" ) {
              skipFields.forEach(field=>{
                projection[field] = 0;
              })
            }

            let surveySubmissionDocuments;

            if ( sortedData !== "all" ) {
                
                surveySubmissionDocuments = 
                await database.models.surveySubmissions.find(
                    queryObject, 
                    projection
                ).sort(sortedData).lean();

            } else {
                
                surveySubmissionDocuments = 
                await database.models.surveySubmissions.find(
                    queryObject, 
                    projection
                ).lean();
            }   

            return resolve(surveySubmissionDocuments);
            
        } catch (error) {
            return resolve({
                success: false,
                message: error.message,
                data: false
            })
        }
    });
 }


    /**
   * Push completed survey submission in kafka for reporting.
   * @method
   * @name pushCompletedSurveySubmissionForReporting
   * @param {String} surveySubmissionId - survey submission id.
   * @returns {JSON} - message that survey submission is pushed to kafka.
   */

   static pushCompletedSurveySubmissionForReporting(surveySubmissionId = "") {
    return new Promise(async (resolve, reject) => {
        try {

            if (surveySubmissionId == "") {
                throw new Error(messageConstants.apiResponses.SURVEY_SUBMISSION_ID_REQUIRED);
            }

            if( typeof surveySubmissionId == "string" ) {
                surveySubmissionId = ObjectId(surveySubmissionId);
            }

            let surveySubmissionsDocument = await this.surveySubmissionDocuments
            (
                {
                _id: surveySubmissionId,
                status: messageConstants.common.SUBMISSION_STATUS_COMPLETED
                }
            )

            if (!surveySubmissionsDocument) {
                throw new Error(messageConstants.apiResponses.SUBMISSION_NOT_FOUND+"or"+messageConstants.apiResponses.SUBMISSION_STATUS_NOT_COMPLETE);
            }

            const kafkaMessage = await kafkaClient.pushCompletedSurveySubmissionToKafka(surveySubmissionsDocument[0]);

            if(kafkaMessage.status != "success") {
                let errorObject = {
                    formData: {
                        surveySubmissionId:surveySubmissionsDocument[0]._id.toString(),
                        message:kafkaMessage.message
                    }
                };
                slackClient.kafkaErrorAlert(errorObject);
            }

            return resolve(kafkaMessage);

        } catch (error) {
            return resolve({
                success: false,
                message: error.message,
                data: false
            });
        }
    })
}


   /**
   * Push incomplete survey submission for reporting.
   * @method
   * @name pushInCompleteSurveySubmissionForReporting
   * @param {String} surveySubmissionId - survey submission id.
   * @returns {JSON} consists of kafka message whether it is pushed for reporting
   * or not.
   */

  static pushInCompleteSurveySubmissionForReporting(surveySubmissionId) {
    return new Promise(async (resolve, reject) => {
        try {

            if (surveySubmissionId == "") {
                throw new Error(messageConstants.apiResponses.SURVEY_SUBMISSION_ID_REQUIRED);
            }

            if(typeof surveySubmissionId == "string") {
                surveySubmissionId = ObjectId(surveySubmissionId);
            }

            let surveySubmissionsDocument = await this.surveySubmissionDocuments
            ({
                _id: surveySubmissionId,
                status: {$ne : "completed"}
            })

            if (!surveySubmissionsDocument.length) {
                throw messageConstants.apiResponses.SUBMISSION_NOT_FOUND+"or"+messageConstants.apiResponses.SUBMISSION_STATUS_NOT_COMPLETE;
            }
        
            const kafkaMessage = await kafkaClient.pushInCompleteSurveySubmissionToKafka(surveySubmissionsDocument[0]);

            if(kafkaMessage.status != "success") {
                let errorObject = {
                    formData: {
                        surveySubmissionId:surveySubmissionsDocument[0]._id.toString(),
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
    * Check if survey submission is allowed.
    * @method
    * @name isAllowed
    * @param {String} submissionId - survey submissionId
    * @param {String} evidenceId - evidence id
    * @param {String} userId - logged in userId
    * @returns {Json} - survey list.
    */

    static isAllowed(submissionId = "", evidenceId = "", userId = "") {
        return new Promise(async (resolve, reject) => {
            try {

                if (submissionId == "") {
                    throw new Error(messageConstants.apiResponses.SURVEY_SUBMISSION_ID_REQUIRED)
                }

                if (evidenceId == "") {
                    throw new Error(messageConstants.apiResponses.EVIDENCE_ID_REQUIRED)
                }
                
                if (userId == "") {
                    throw new Error(messageConstants.apiResponses.USER_ID_REQUIRED_CHECK)
                }
                
                let result = {
                    allowed: true
                };

                let submissionDocument = await this.surveySubmissionDocuments
                (
                    { "_id": submissionId,
                      "evidencesStatus": {"$elemMatch": {externalId: evidenceId}}
                    },
                    [
                        "evidencesStatus.isSubmitted",
                        "evidencesStatus.submissions",
                        "status",
                        "createdBy"
                    ]
                );
                
                if (!submissionDocument.length) {
                    throw new Error(messageConstants.apiResponses.SUBMISSION_NOT_FOUND)
                }

                if (submissionDocument[0].status == messageConstants.common.SUBMISSION_STATUS_COMPLETED &&
                    submissionDocument[0].createdBy == userId) {
                    throw new Error(messageConstants.apiResponses.MULTIPLE_SUBMISSIONS_NOT_ALLOWED)
                }
               
                if (submissionDocument[0].evidencesStatus[0].isSubmitted && submissionDocument[0].evidencesStatus[0].isSubmitted == true) {
                    submissionDocument[0].evidencesStatus[0].submissions.forEach(submission => {
                        if (submission.submittedBy == userId) {
                            result.allowed = false;
                        }
                    })
                }

                return resolve({
                    success: true,
                    message: messageConstants.apiResponses.SURVEY_SUBMISSION_CHECK,
                    data: result
                });
            }
            catch (error) {
                return resolve({
                    success: false,
                    message: error.message,
                    data: false
                })
            }
        })
    }


     /**
    * List created and submitted surveys.
    * @method
    * @name list
    * @param {String} userId - logged in userId
    * @returns {Json} - survey list.
    */

    static list(userId = "") {
        return new Promise(async (resolve, reject) => {
            try {

                if (userId == "") {
                    throw new Error(messageConstants.apiResponses.USER_ID_REQUIRED_CHECK)
                }

                let getSurveyList = [
                    solutionsHelper.solutionDocumentsByAggregateQuery
                    (
                            [
                                {
                                    "$match": {
                                        "author": userId,
                                        "type": messageConstants.common.SURVEY,
                                        "isReusable": false,
                                        "isDeleted": false,
                                    }
                                },
                                {
                                    "$project": {
                                        "solutionId": "$_id",
                                        "name": 1,
                                        "status": 1,
                                        "_id": 0

                                    }
                                },
                                { "$sort": { createdAt:-1}}
                            ]
                        ),
                    database.models.surveySubmissions.aggregate
                        (
                            [
                                { "$match": { "createdBy": userId } },
                                {
                                    "$project": {
                                        'submissionId': "$_id",
                                        "surveyId": 1,
                                        "solutionId": 1,
                                        "surveyInformation.name" : 1,
                                        "surveyInformation.endDate": 1,
                                        "status": 1,
                                        "_id": 0

                                    }
                                },
                                { "$sort": { createdAt:-1}}
                            ]
                        )
                ]

                let result = [];

                await Promise.all(getSurveyList)
                    .then(function (response) {
                        
                        if (response[0].length > 0) {
                            result = result.concat(response[0]);
                        }

                        if (response[1].length > 0) {
                            response[1].forEach( async surveySubmission => {
                                if (new Date() > new Date(surveySubmission.surveyInformation.endDate)) {
                                     surveySubmission.status = messageConstants.common.EXPIRED
                                }
                                surveySubmission.name = surveySubmission.surveyInformation.name;
                                delete surveySubmission["surveyInformation"];
                                result.push(surveySubmission);
                            })
                        }
                    });

                return resolve({
                    success: true,
                    message: messageConstants.apiResponses.SURVEY_LIST_FETCHED,
                    data: result
                })

            } catch (error) {
                return resolve({
                    success: false,
                    message: error.message,
                    data: false
                });
            }
        });
    }

    /**
    * Get status of Survey submission.
    * @method
    * @name getStatus
    * @param {String} submissionId - survey submissionId
    * @returns {Json} - status of survey submission.
    */

   static getStatus(submissionId = "") {
    return new Promise(async (resolve, reject) => {
        try {

            if (submissionId == "") {
                throw new Error(messageConstants.apiResponses.SURVEY_SUBMISSION_ID_REQUIRED)
            }

            let submissionDocument = await this.surveySubmissionDocuments
            (
                { "_id": submissionId },
                [
                  "status"
                ]
            );

            if (!submissionDocument.length) {
                throw messageConstants.apiResponses.SUBMISSION_NOT_FOUND;
            } 

            return resolve({
                success: true,
                message: messageConstants.apiResponses.SUBMISSION_STATUS_FETCHED,
                data: {
                    status: submissionDocument[0].status
                }
            });
        }
        catch (error) {
            return resolve({
                success: false,
                message: error.message,
                data: false
            })
        }
    })
}


}