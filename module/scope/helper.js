/**
 * name : scope.js
 * author : Aman
 * created-date : 28-Dec-2020
 * Description : Add scope in program and solution.
*/

// Dependencies
const entityTypesHelper = require(MODULES_BASE_PATH + "/entityTypes/helper");
const entitiesHelper = require(MODULES_BASE_PATH + "/entities/helper");
const programSolutionMapHelper = require(MODULES_BASE_PATH + "/programsSolutionsMap/helper");
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

          let programSolutionMap = {
            scope : {}
          }

          if( solutionId !== "" ) {
            
          } else {

            let programData = await database.models.programs.find({
              _id : programId
            },{
              "name" : 1,
              "description" : 1,
              "externalId" : 1
            }).lean();
  
            if( !programData.length > 0 ) {
              return resolve({
                status : httpStatusCode.bad_request.status,
                message : messageConstants.apiResponses.PROGRAM_NOT_CREATED
              });
            }

            programSolutionMap["programId"] = programData[0]._id;
            programSolutionMap["programName"] = programData[0].name;
            programSolutionMap["programExternalId"] = programData[0].externalId;
            programSolutionMap["programDescription"] = 
            programData[0].description ? programData[0].description : "";
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
          let filterQuery = {
            programId : programId
          };

          if( solutionId === "" ) {
            programSolutionMap.scope["programs"] = scope;
          } else {

          }

          let programScopeData = await programSolutionMapHelper.createOrUpdate(
            filterQuery,
            programSolutionMap
          );

          if( !programScopeData.success ) {
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