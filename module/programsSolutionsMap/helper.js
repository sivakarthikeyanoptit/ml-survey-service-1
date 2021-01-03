/**
 * name : programsSolutionsMap.js
 * author : Aman
 * created-date : 28-Dec-2020
 * Description : Programs Solutions map helper functionality.
*/

// Dependencies
const solutionsHelper = require(MODULES_BASE_PATH + "/solutions/helper");
const programsHelper = require(MODULES_BASE_PATH + "/programs/helper");

 /**
    * ProgramsSolutionsMapHelper
    * @class
*/

module.exports = class ProgramsSolutionsMapHelper {

  /**
   * find programsSolutionsMap
   * @method
   * @name programsSolutionsMapDocuments
   * @param {Array} [programsSolutionsMapFilter = "all"] - solution ids.
   * @param {Array} [fieldsArray = "all"] - projected fields.
   * @param {Array} [skipFields = "none"] - field not to include
   * @returns {Array} List of programsSolutionsMap. 
   */
  
  static programsSolutionsMapDocuments(
    programsSolutionsMapFilter = "all", 
    fieldsArray = "all",
    skipFields = "none"
  ) {
    return new Promise(async (resolve, reject) => {
        try {
    
            let queryObject = (programsSolutionsMapFilter != "all") ? programsSolutionsMapFilter : {};
    
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
    
            let programsSolutionsMapDocuments = 
            await database.models.programsSolutionsMap.find(
              queryObject, 
              projection
            ).lean();
            
            return resolve(programsSolutionsMapDocuments);
            
        } catch (error) {
            return reject(error);
        }
    });
  }
    
      /**
   * Programs solutions map documents.
   * @method
   * @name list
   * @param {Array} [filterQuery = "all"] - filter query data.
   * @param {Array} [fields = "all"] - projected data
   * @param {Array} [skipFields = "none"] - fields to skip
   * @returns {JSON} - Programs solutions map documents.
   */

  static list(filterQuery = "all" , fields = "all", skipFields = "none") {
    return new Promise(async (resolve, reject) => {
      try {

        let filteredData = {};

        if( filterQuery !== "all" ) {
          filteredData = filterQuery;
        }

        let projection = {};

        if (fields != "all") {
          fields.forEach(element => {
            projection[element] = 1;
          });
        }

        if (skipFields != "none") {
          
          skipFields.forEach(element => {
            projection[element] = 0;
          });
        }
        
        const programsSolutionsMapDocuments = 
        await database.models.programsSolutionsMap.find(
          filteredData, 
          projection
        ).lean();

        return resolve(programsSolutionsMapDocuments);

      } catch(error) {
        return reject(error);
      }
    })
  }
    
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
    * @returns {Object} - List of targeted solutions.
    */

   static targetedSolutions(bodyData,type,subType,pageSize,pageNo,searchText) {
    return new Promise(async (resolve, reject) => {
        try {

          let filterEntities = 
          Object.values(_.omit(bodyData,["role","filteredData"])).map(entity => {
            return ObjectId(entity);
          });

          let targetedSolutionQuery = {
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
            isReusable : false
          }

          if (subType !== "") {
            targetedSolutionQuery.solutionSubType = subType;
          }

          let targetedSolutions = 
          await this.list(targetedSolutionQuery,["solutionId"]);

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
              "isDeleted" : false,
              status : messageConstants.common.ACTIVE_STATUS
            }
          };

          if( bodyData.filteredData ) {
            Object.keys(bodyData.filteredData).forEach(filterKey => {
              if( matchQuery["$match"][filterKey] ) {
                matchQuery["$match"][filterKey] = _.merge(
                  matchQuery["$match"][filterKey],
                  bodyData.filteredData[filterKey]
                )
              } else {
                matchQuery["$match"][filterKey] = bodyData.filteredData[filterKey]
              }
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

    /**
    * Programs and solution details.
    * @method
    * @name programSolutionDetails
    * @param {String} programId - program id.
    * @param {String} solutionId - solution id.
    * @param {Object} bodyData - requested body data.
    * @returns {Object} - Program and  solution details.
    */

   static programSolutionDetails(programId,solutionId,bodyData) {
    return new Promise(async (resolve, reject) => {
        try {

          let filterEntities = 
          Object.values(_.omit(bodyData,["role","filteredData"])).map(entity => {
            return ObjectId(entity);
          });

          let targetedSolutions = 
          await this.list({
            $or : [
              {
                "scope.solutions.roles.code" : bodyData.role,
                "scope.solutions.entities" : { $in : filterEntities }
              }, {
                "scope.programs.roles.code" : bodyData.role,
                "scope.programs.entities" : { $in : filterEntities }
              }
            ],
            programId : programId,
            solutionId : solutionId
          },["_id"]);

          if( !targetedSolutions.length > 0 ) {
            throw {
              message : messageConstants.apiResponses.NOT_FOUND_TARGETED_PROGRAM_SOLUTION
            };
          }

          let programsQuery = {
            _id : programId
          };

          let programDetails = await programsHelper.list(
              programsQuery,"all",[
                "components",
                "imageCompression",
                "updatedAt",
                "createdAt",
                "startDate",
                "endDate",
                "updatedBy"
              ]
          );

          if( !programDetails.length > 0 ) {
            throw {
                message : messageConstants.apiResponses.PROGRAM_NOT_FOUND
            };
          }

          let matchQuery = {
              _id : solutionId,
              "isDeleted" : false,
              status : messageConstants.common.ACTIVE_STATUS
          };

          let solutionDetails = await solutionsHelper.solutionDocuments(
            matchQuery,
            "all",
            [
                "levelToScoreMapping",
                "scoringSystem",
                "themes",
                "flattenedThemes",
                "questionSequenceByEcm",
                "entityProfileFieldsPerEntityTypes",
                "evidenceMethods",
                "sections",
                "noOfRatingLevels",
                "roles",
                "captureGpsLocationAtQuestionLevel",
                "enableQuestionReadOut",
                "entities"
            ]
          );

          if( !solutionDetails.length > 0 ) {
            throw {
                message : messageConstants.apiResponses.SOLUTION_NOT_FOUND
            };
          }

          return resolve({
            success : true,
            message : messageConstants.apiResponses.TARGETED_PROGRAM_SOLUTION_FETCHED,
            data : {
                program : programDetails[0],
                solution : solutionDetails[0]
            }
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


   /**
    * List of user targeted programs.
    * @method
    * @name targetedPrograms
    * @param {Object} bodyData - requested body data.
    * @param {Number} pageSize - Size of page.
    * @param {Number} pageNo - Page no.
    * @param {String} searchText - text to search.
    * @returns {Object} - List of targeted programs.
    */

   static targetedPrograms(bodyData,pageSize,pageNo,searchText) {
    return new Promise(async (resolve, reject) => {
        try {
          
          let filterEntities = 
          Object.values(_.omit(bodyData,["role","filteredData"])).map(entity => {
            return ObjectId(entity);
          });

          let targetedProgramQuery = {
            "scope.programs.roles.code" : bodyData.role,
            "scope.programs.entities" : { $in : filterEntities }
          }

          let targetedPrograms =  await this.list(targetedProgramQuery,["programId"]);

          if( !targetedPrograms.length > 0 ) {
            throw {
              message : messageConstants.apiResponses.PROGRAM_NOT_FOUND
            };
          }

          let targetedProgramIds = [];
          
          targetedPrograms.forEach(targetedProgram => {
            targetedProgramIds.push(targetedProgram.programId);
          });
          
          let matchQuery = {
            "$match" : {
              _id : { $in : targetedProgramIds },
              "isDeleted" : false,
              status : messageConstants.common.ACTIVE_STATUS
            }
          };

          let targettedPrograms = await programsHelper.search(
            matchQuery,
            pageSize,
            pageNo,
            {
              name : 1,
              description : 1,
              externalId: 1,
              components: 1
            },
            searchText
          );
         
          if (targettedPrograms[0].data && targettedPrograms[0].data.length > 0) {
            targettedPrograms[0].data.map( program => {
                program.solutions = program.components.length;
                delete program.components;
             })
          }
          
          return resolve({
            success: true,
            message: messageConstants.apiResponses.TARGETED_PROGRAMS_FETCHED,
            data: targettedPrograms[0]
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


   /**
    * List of user targeted solutions by program.
    * @method
    * @name targetedSolutionsByProgram
    * @param {String} programId - program id
    * @param {Object} bodyData - requested body data.
    * @param {Number} pageSize - Size of page.
    * @param {Number} pageNo - Page no.
    * @param {String} searchText - text to search.
    * @returns {Object} - List of targeted programs.
    */

   static targetedSolutionsByProgram(programId, bodyData,pageSize,pageNo,searchText) {
    return new Promise(async (resolve, reject) => {
        try {
          
          let filterEntities = 
          Object.values(_.omit(bodyData,["role"])).map(entity => {
            return ObjectId(entity);
          });

          let targetedSolutionQuery = {
            $or : [
              {
                "scope.solutions.roles.code" : bodyData.role,
                "scope.solutions.entities" : { $in : filterEntities }
              }, {
                "scope.programs.roles.code" : bodyData.role,
                "scope.programs.entities" : { $in : filterEntities }
              }
            ],
            programId : programId,
            isReusable : false
          }

          let targetedSolutions =  await this.list(targetedSolutionQuery,["solutionId"]);

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
              "isDeleted" : false,
              status : messageConstants.common.ACTIVE_STATUS
            }
          };

          let targettedSolutions = await solutionsHelper.search(
            matchQuery,
            pageSize,
            pageNo,
            {
              name : 1,
              externalId: 1,
              type: 1,
              programId: 1
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



   /**
     * Create programSolutionMap
     * @method
     * @name create
     * @param {Object} scope - scope data
     * @param {String} programId - programId
     * @param {String} solutionId - solutionId
     * @returns {Object} - ProgramSolutionMap details.
     */

    static create(programId= "", solutionId= "",scope= {}) {

        return new Promise(async (resolve, reject) => {
            try {

              if (Object.keys(scope).length == 0) {
                  throw new Error (messageConstants.apiResponses.PROGRAM_SOLUTION_MAP_DATA_REQUIRED);
              }

              let program = await programsHelper.programDocument(
              {
                _id : programId
              }, [
                "_id"
              ]);

              if (!program.length ) {
                throw new Error(messageConstants.apiResponses.PROGRAM_NOT_FOUND)
              }

              let solution = await solutionsHelper.solutionDocuments(
              {
                _id : solutionId
              }, [
                "_id","type","subType"
              ]);

              if (!solution.length ) {
                throw new Error(messageConstants.apiResponses.SOLUTION_NOT_FOUND)
              }

              let programSolutionData = {};
              programSolutionData.scope = scope;
              programSolutionData.programId = program[0]._id;
              programSolutionData.solutionId = solution[0]._id;
              programSolutionData.solutionType = solution[0].type;
              programSolutionData.solutionSubType = solution[0].subType;
              programSolutionData.isReusable = false;

              const programsSolutionsMapDocument = await database.models.programsSolutionsMap.create(
                  programSolutionData
              );

              if(!programsSolutionsMapDocument){
                throw { 
                    status: httpStatusCode.bad_request.status, 
                    message: messageConstants.apiResponses.ERROR_CREATING_PROGRAM_SOLUTION_MAP 
                };
                
              }

              return resolve({
                  success: true,
                  message: messageConstants.apiResponses.PROGRAM_SOLUTION_MAP_CREATED,
                  data: programsSolutionsMapDocument
              });
                
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
   * Create programSolutionMap
   * @method
   * @name update
   * @param {Object} scope - scope data
   * @param {String} programId - programId
   * @param {String} solutionId - solutionId
   * @returns {Object} - ProgramSolutionMap details.
   */

  static update(programId= "", solutionId= "",scope= {}) {

      return new Promise(async (resolve, reject) => {
          try {

            if (Object.keys(scope).length == 0) {
                throw new Error (messageConstants.apiResponses.PROGRAM_SOLUTION_MAP_DATA_REQUIRED);
            }

            let program = await programsHelper.programDocument(
            {
              _id : programId
            }, [
              "_id"
            ]);

            if (!program.length ) {
              throw new Error(messageConstants.apiResponses.PROGRAM_NOT_FOUND)
            }

            let solution = await solutionsHelper.solutionDocuments(
            {
              _id : solutionId
            }, [
              "_id"
            ]);

            if (!solution.length ) {
              throw new Error(messageConstants.apiResponses.SOLUTION_NOT_FOUND)
            }

            let updateProgramsSolutionsMapDocument = await database.models.programsSolutionsMap.findOneAndUpdate({
              programId : programId,
              solutionId : solutionId
            }, {
              $set: {
                scope : scope
              }
            });

            if(!updateProgramsSolutionsMapDocument){
              throw { 
                  status: httpStatusCode.bad_request.status, 
                  message: messageConstants.apiResponses.ERROR_UPDATING_PROGRAM_SOLUTION_MAP 
              };
              
            }

            return resolve({
                success: true,
                message: messageConstants.apiResponses.PROGRAM_SOLUTION_MAP_UPDATED,
                data: updateProgramsSolutionsMapDocument
            });
              
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
    * Create or update program solution map.
    * @method
    * @name createOrUpdate
    * @param {Object} findQuery - find query.
    * @param {Object} bodyData - requested body data.
    * @returns {Object} - Create program and solution map data.
    */

   static createOrUpdate(findQuery,bodyData) {
    return new Promise(async (resolve, reject) => {
        try {

          let programSolutionMapCreation = 
          await database.models.programsSolutionsMap.update(
            findQuery,
            { $set : bodyData },{ upsert : true, new: true }
          ).lean();

          return resolve({
            success : true,
            message : messageConstants.apiResponses.PROGRAM_SOLUTION_MAP_CREATED,
            data : programSolutionMapCreation
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