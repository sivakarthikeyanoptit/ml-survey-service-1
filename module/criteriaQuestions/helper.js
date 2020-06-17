/**
 * name : helper.js
 * author : Aman
 * created-date : 10-Jun-2020
 * Description : Criteria questions related functionality
 */

 /**
    * CriteriaQuestionsHelper
    * @class
*/
module.exports = class CriteriaQuestionsHelper {

     /**
      * List of criteria questions
      * @method
      * @name list
      * @param {Object} [ findQuery = "all" ] - filtered query data.
      * @param {Array} [ fields = "all" ] - fields to include.
      * @param {Array} [ skipFields = "none" ] - skip fields.   
      * @returns {Array} List of criteria questions.
     */

    static list( findQuery = "all", fields = "all", skipFields = "none" ) {
        return new Promise(async (resolve, reject) => {
            try {
        
                let queryObject = {};

                if( findQuery !== "all" ) {
                    queryObject = findQuery;
                }
        
                let projection = {};
        
                if (fields != "all") {
                    fieldsArray.forEach(field => {
                        projection[field] = 1;
                    });
                }

                if (skipFields != "none") {
                    skipFields.forEach(element => {
                        projection[element] = 0;
                    });
                }
        
                let criteriaQuestionDocuments = 
                await database.models.criteriaQuestions.find(
                    queryObject, 
                    projection
                ).lean();
                
                return resolve(criteriaQuestionDocuments);
                
            } catch (error) {
                return reject(error);
            }
        });
    }
    
    /**
      * Details of criteria questions
      * @method
      * @name details
      * @param {Array} criteriaIds - criteria ids
      * @param {Object} projection - projected data
      * @param {Object} query - additional query if any    
      * @returns {Array} List of criteria questions.
     */

    static details(criteriaIds,projection,query) {
        return new Promise(async (resolve, reject) => {
            try {

                let queryData = {
                    $match : { 
                        _id : { $in : criteriaIds }
                    }
                }

                if(query) {
                    queryData["$match"] = _.merge(queryData["$match"],query);
                }

                let unwindEvidences = {
                    $unwind : "$evidences"
                };

                let unwindSections = {
                    $unwind : "$evidences.sections"
                };

                let unwindQuestions = {
                    $unwind : "$evidences.sections.questions"
                };

                let questionInCriteria = 
                await database.models.criteriaQuestions.aggregate([
                    queryData,
                    unwindEvidences,
                    unwindSections,
                    unwindQuestions,
                    projection
                ])

                return resolve(questionInCriteria);

            } catch (error) {
                return reject(error);
            }
        })

    }

};