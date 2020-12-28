/**
 * name : programsSolutionsMap.js
 * author : Aman
 * created-date : 28-Dec-2020
 * Description : Programs Solutions map helper functionality.
*/

// Dependencies
const solutionsHelper = require(MODULES_BASE_PATH + "/solutions/helper");

 /**
    * ProgramsSolutionsMapHelper
    * @class
*/

module.exports = class ProgramsSolutionsMapHelper {
    
    /**
    * List of user targeted solutions.
    * @method
    * @name targetedSolutions
    * @param {Object} bodyData - requested body data.
    * @param {String} type - solution type.
    * @param {String} subType - solution sub type.
    * @param {Number} pageSize - Size of page.
    * @param {Number} pageNo - Page no.
    * @param {String} searchText - text to search.
    * @returns {String} - List of targeted solutions.
    */

   static targetedSolutions(bodyData,type,subType,pageSize,pageNo,searchText) {
    return new Promise(async (resolve, reject) => {
        try {

          let filterEntities = 
          Object.values(_.omit(bodyData,["role","filteredData"])).map(entity => {
            return ObjectId(entity);
          });

          let targetedSolutions = 
          await database.models.programsSolutionsMap.find({
            $or : [
              {
                "scope.solutions.roles.code" : bodyData.role,
                "scope.solutions.entities" : { $in : filterEntities }
              }, {
                "scope.programs.roles.code" : bodyData.role,
                "scope.programs.entities" : { $in : filterEntities }
              }
            ],
            solutionType : type,
            solutionSubType : subType,
            isReusable : false
          },{ solutionId : 1 }).lean();

          if( !targetedSolutions.length > 0 ) {
            throw {
              message : messageConstants.apiResponses.SOLUTION_NOT_FOUND
            };
          }

          let targetedSolutionIds = [];

          targetedSolutions.forEach(targetedSolution => {
            targetedSolutionIds.push(targetedSolution.solutionId);
          });

          let matchQuery = {
            "$match" : {
              _id : { $in : targetedSolutionIds },
              "isDeleted" : false
            }
          };

          if( bodyData.filteredData ) {
            Object.keys(bodyData.filteredData).forEach(filterKey => {
                matchQuery["$match"].filterKey = bodyData.filteredData[filterKey]
            });
          }

          let targettedSolutions = await solutionsHelper.search(
            matchQuery,
            pageSize,
            pageNo,
            {
              name : 1,
              description : 1,
              programName : 1,
              programId : 1,
            },
            searchText
          );

          return resolve({
            success: true,
            message: messageConstants.apiResponses.TARGETED_SOLUTIONS_FETCHED,
            data: targettedSolutions[0]
          });

        } catch (error) {
            return resolve({
                success : false,
                message : error.message,
                data : []
            });
        }
    });
   }

}