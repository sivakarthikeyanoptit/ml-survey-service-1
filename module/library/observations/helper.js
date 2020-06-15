/**
 * name : helper.js
 * author : Aman
 * created-date : 04-Jun-2020
 * Description : Observation solutions helper functionality.
 */

// Dependencies 
const solutionsHelper = require(MODULES_BASE_PATH + "/solutions/helper");
const criteriaQuestionsHelper = require(MODULES_BASE_PATH + "/criteriaQuestions/helper");

 /**
    * ObservationHelper
    * @class
*/
module.exports = class ObservationHelper {

    /**
      * List of library solution
      * @method
      * @name list
      * @param {String} search - Search Data.
      * @param {Number} limit - limitting value.
      * @param {Number} pageNo
      * @returns {Object} returns list of observation solutions
     */

    static list(search,limit,pageNo) {
        return new Promise(async (resolve, reject) => {
            try {
                
                let observationSolution = 
                await solutionsHelper.templates( 
                  messageConstants.common.OBSERVATION,
                  search, 
                  limit, 
                  pageNo,  
                );

                return resolve({
                  message : messageConstants.apiResponses.OBSERVATION_SOLUTIONS_LIST,
                  result : observationSolution
                });
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
      * Observation solution details information
      * @method
      * @name details
      * @param {String} templateId - Template id.
      * @returns {Object} returns creator,about and questions of observation solutions.
     */

    static details(templateId) {
        return new Promise(async (resolve, reject) => {
            try {
                
                let solutionDetails = 
                await solutionsHelper.details(
                  templateId
                );

                let criteriaIds = gen.utils.getCriteriaIds(solutionDetails.themes);

                let questionDetails = 
                await criteriaQuestionsHelper.details(
                    criteriaIds,
                    {
                        $project : {
                            "ecm" : "$evidences.code",
                            "question" : "$evidences.sections.questions.question"
                          }
                    }
                 );

                let questions = [];

                if( questionDetails.length > 0 ) {
                  questions = questionDetails.map(questionData=>{
                    return questionData.question[0]
                  });

                  questions = [...new Set(questions)]
                }

                let result = {
                  name : solutionDetails.name,
                  creator : solutionDetails.creator ? solutionDetails.creator : "",
                  description : solutionDetails.description,
                  linkTitle : solutionDetails.linkTitle ? solutionDetails.linkTitle : "",
                  linkUrl : solutionDetails.linkUrl ? solutionDetails.linkUrl : "",
                  questions : questions
                }
                  
                return resolve({
                  message : messageConstants.apiResponses.OBSERVATION_SOLUTION_DETAILS,
                  result : result
                });
            } catch (error) {
                return reject({
                    status: error.status || httpStatusCode.internal_server_error.status,
                    message: error.message || httpStatusCode.internal_server_error.message,
                    errorObject: error
                });
            }
        })
    }
};
