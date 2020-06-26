/**
 * name : criteriaQuestions.js
 * author : Aman
 * created-date : 24-Jun-2020
 * Description : Criteria questions related information.
 */

/**
 * CriteriaQuestionsHelper
 * @class
*/

module.exports = class CriteriaQuestionsHelper {

    /**
   * Create Or update criteria Questions.
   * @method
   * @name createOrUpdate
   * @param {String} criteriaIds - criteria ids.
   * @param {String} [ updateQuestion = false ] - update question or criteria.
   * @returns {JSON} - success true or false
   */

    static createOrUpdate( 
        criteriaIds,
        updateQuestion = false
    ) {
        return new Promise(async (resolve, reject) => {
            try {

                let result = "";

                if( Array.isArray(criteriaIds) ) {

                    result = [];

                    for (
                        let criteria = 0; 
                        criteria < criteriaIds.length ; 
                        criteria++ 
                    ) {
                        
                        let data = await singleCriteriaCreateOrUpdate(
                            criteriaIds[criteria]
                        );

                        result.push({
                            criteriaId : criteriaIds[criteria],
                            success : data.success
                        });
                    }
                } else {
                    
                    result = 
                    await singleCriteriaCreateOrUpdate(
                        criteriaIds,
                        updateQuestion
                    );
                }

                return resolve(result);

            } catch (error) {
                return reject(error);
            }
        })
    }
    
};

   /**
   * Create Or update criteria Questions.
   * @method
   * @name singleCriteriaCreateOrUpdate
   * @param {String} criteriaId - criteria id.
   * @param {String} updateQuestion - update question or criteria.
   * @returns {JSON} success true or false
   */

  function singleCriteriaCreateOrUpdate(criteriaId,updateQuestion) {
    return new Promise(async function (resolve, reject) {
        try {

            let criteriaModel = 
            Object.keys(criteriaSchema.schema);

            let findQuery = {
                "$match" : {
                    "_id" : ObjectId(criteriaId),
                    "frameworkCriteriaId" : { $exists : true }
                }
            };

            let unwindEvidences = {
                "$unwind": "$evidences"
            };

            let unwindSections = {
                "$unwind": "$evidences.sections"
            };

            let lookupQuestions = {
                "$lookup": {
                    "from": "questions",
                    "localField": "evidences.sections.questions",
                    "foreignField": "_id",
                    "as": "evidences.sections.questions"
                }
            };

            let addCriteriaIdInQuestion = {
                "$addFields": {
                    "evidences.sections.questions.criteriaId": "$_id"
                }
            };

            let groupData =  {
                "$group": {
                    "_id" : "$_id"
                }
            };

            criteriaModel.forEach(criteria=>{
                if( ["evidences"].indexOf(criteria) == -1 ) {
                    groupData["$group"][criteria] = {
                        "$first" : `$${criteria}`
                    }
                }
            });

            if( updateQuestion ) {
                groupData["$group"]["evidences"] = {};
                groupData["$group"]["evidences"]["$push"] = {};
                groupData["$group"]["evidences"]["$push"]["code"] = "$evidences.code";
                groupData["$group"]["evidences"]["$push"]["sections"] =  {};
                groupData["$group"]["evidences"]["$push"]["sections"] = "$evidences.sections";
            }

            let criteriaData = 
            await database.models.criteria.aggregate([
                findQuery,
                unwindEvidences,
                unwindSections,
                lookupQuestions,
                addCriteriaIdInQuestion,
                groupData
            ]);

            if ( !criteriaData[0] ) {
                return resolve({
                    success : false
                })
            }

            await database.models.criteriaQuestions.findOneAndUpdate(
                {
                    _id : criteriaId
                },{
                    $set : criteriaData[0]
                },{
                    upsert: true
                }
            );

            return resolve({
                success : true
            });
        
        } catch(error) {
            return reject(error);
        }
    })
  }
