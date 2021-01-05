/**
 * name : scope.js
 * author : Aman
 * created-date : 28-Dec-2020
 * Description : Add scope in program and solution.
*/

// Dependencies
const entityTypesHelper = require(MODULES_BASE_PATH + "/entityTypes/helper");
const entitiesHelper = require(MODULES_BASE_PATH + "/entities/helper");
const userRolesHelper = require(MODULES_BASE_PATH + "/userRoles/helper");

 /**
    * ScopeHelper
    * @class
*/

module.exports = class ScopeHelper {
    
    /**
    * Add scope in program.
    * @method
    * @name addScopeInProgramSolution
    * @param {String} programId - program id.
    * @param {Object} scopeData  - Program scope.
    * @returns {Object} - Add scope in program.
    */

   static addScopeInProgramSolution( programId,scopeData,solutionId = "" ) {
    return new Promise(async (resolve, reject) => {
        try {

          let filterQuery = {
            programId : programId
          };
          
          let programSolutionMap = {}

          if( solutionId !== "" ) {

            let solutionData = await database.models.solutions.find({
              _id : solutionId,
              programId : programId,
              status : messageConstants.common.ACTIVE_STATUS
            },{
              "externalId" : 1,
              "programId" : 1,
              "type" : 1,
              "subType" : 1
            }).lean();

            if( !solutionData.length > 0 ) {
              return resolve({
                status : httpStatusCode.bad_request.status,
                message : messageConstants.apiResponses.SOLUTION_NOT_FOUND
              });
            }

            programSolutionMap["solutionId"] = solutionData[0]._id;
            programSolutionMap["solutionExternalId"] = solutionData[0].externalId;
            programSolutionMap["solutionType"] = solutionData[0].type;
            programSolutionMap["solutionSubType"] = solutionData[0].subType;

          } else {

            let programData = await database.models.programs.find({
              _id : programId
            },{
              "name" : 1,
              "externalId" : 1
            }).lean();
  
            if( !programData.length > 0 ) {
              return resolve({
                status : httpStatusCode.bad_request.status,
                message : messageConstants.apiResponses.PROGRAM_NOT_FOUND
              });
            }
            programSolutionMap["programExternalId"] = programData[0].externalId;
          }

          if( !scopeData.entityType ) {
            return resolve({
              status : httpStatusCode.bad_request.status,
              message : messageConstants.apiResponses.ENTITY_TYPE_REQUIRED_IN_SCOPE
            });
          }
            
          let entityTypeData = 
          await entityTypesHelper.list(
            {
              name : scopeData.entityType
            },
            {
              "name" : 1
            }
          );
          
          if( !entityTypeData.length > 0 ) {
            return resolve({
              status : httpStatusCode.bad_request.status,
              message : messageConstants.apiResponses.ENTITY_TYPES_NOT_FOUND
            });
          }

          let scope = {
            entityType : entityTypeData[0].name,
            entityTypeId : entityTypeData[0]._id
          }

          if( !scopeData.entities && !scopeData.entities.length > 0 ) {
            return resolve({
              status : httpStatusCode.bad_request.status,
              message : messageConstants.apiResponses.ENTITIES_REQUIRED_IN_SCOPE
            });
          }

          let entities = 
          await entitiesHelper.entityDocuments(
            {
              _id : { $in : scopeData.entities },
              entityTypeId : entityTypeData[0]._id
            },["_id"]
          );
          
          if( !entities.length > 0 ) {
            return resolve({
              status : httpStatusCode.bad_request.status,
              message : messageConstants.apiResponses.ENTITIES_NOT_FOUND
            });
          }

          scope["entities"] = entities.map(entity => {
            return entity._id;
          });

          if( !scopeData.roles ) {
            return resolve({
              status : httpStatusCode.bad_request.status,
              message : messageConstants.apiResponses.ROLE_REQUIRED_IN_SCOPE
            });
          }

          let userRoles = await userRolesHelper.list({
            code : { $in : scopeData.roles }
          },{
            _id : 1,
            code : 1
          });
          
          if( !userRoles.length > 0 ) {
            return resolve({
              status : httpStatusCode.bad_request.status,
              message : messageConstants.apiResponses.INVALID_ROLE_CODE
            });
          }

          scope["roles"] = userRoles;
          programSolutionMap["scope"] = scope;

          let programScopeData = 
          await database.models.programsSolutionsMap.update(
            filterQuery,
            { $set : programSolutionMap },{ upsert : true, new: true }
          ).lean();

          if( !programScopeData.n ) {
            throw {
              status : messageConstants.apiResponses.PROGRAM_SCOPE_NOT_ADDED
            };
          }
          
          return resolve({
            success : true,
            message : messageConstants.apiResponses.PROGRAM_SCOPE_ADDED,
            data : programScopeData.data
          });

        } catch (error) {
            return resolve({
                success : false,
                message : error.message,
                data : {}
            });
        }
    });
   }  
}