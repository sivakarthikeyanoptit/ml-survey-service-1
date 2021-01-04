/**
 * name : programsSolutionsMapController.js
 * author : Aman
 * created-date : 28-Dec-2020
 * Description : Programs Solutions map.
 */

// Dependencies
const programsSolutionsHelper = require(MODULES_BASE_PATH + "/programsSolutionsMap/helper");

 /**
    * ProgramsSolutionsMap
    * @class
*/

module.exports = class ProgramsSolutionsMap extends Abstract {
    constructor() {
        super(programsSolutionsMapSchema);
    }

    static get name() {
        return "ProgramsSolutionsMap";
    }

    /**
    * @api {post} /assessment/api/v1/programsSolutionsMap/targetedSolutions?type=:type&subType=:subType&page=:page&limit=:limit
    * @apiVersion 1.0.0
    * @apiName Get user targeted solutions.
    * @apiGroup programsSolutionsMap
    * @apiParamExample {json} Request-Body:
    {
   		"role" : "HM",
   		"state" : "5c0bbab881bdbe330655da7f",
   		"block" : "5c0bbab881bdbe330655da7f",
   		"cluster" : "5c0bbab881bdbe330655da7f",
        "school" : "5c0bbab881bdbe330655da7f"
    }
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/programsSolutionsMap/targetedSolutions?type=observation&subType=school&page=1&limit=1
    * @apiUse successBody
    * @apiUse errorBody
    * @apiParamExample {json} Response:
    * {
    * "message": "Successfully targeted solutions fetched",
    * "status": 200,
    * "result": {
            "data": [
                {
                    "_id": "5f8688e7d7f86f040b77f460",
                    "programId": "5f4e538bdf6dd17bab708173",
                    "programName": "My-Test-Program",
                    "name": "Improvement project name",
                    "description": "Improvement project description"
                }   
            ],
            "count": 1
        }
    }
    */

     /**
   * List of user targeted solutions.
   * @method
   * @name targetedSolutions
   * @param {Object} req - requested data.
   * @returns {JSON} consists message of successfully mapped entities
   */

  async targetedSolutions(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let solutions = await programsSolutionsHelper.targetedSolutions(
          req.body,
          req.query.type,
          req.query.subType,
          req.pageSize,
          req.pageNo,
          req.searchText
        );

        solutions.result = solutions.data;

        return resolve(solutions);

      } catch (error) {
        return reject({
          status: error.status || httpStatusCode.internal_server_error.status,
          message: error.message || httpStatusCode.internal_server_error.message,
          errorObject: error
        });
      }
    });
  }

  /**
    * @api {post} /assessment/api/v1/programsSolutionsMap/programSolutionDetails/:programId?solutionId=:solutionId
    * @apiVersion 1.0.0
    * @apiName Targeted solution details.
    * @apiGroup programsSolutionsMap
    * @apiParamExample {json} Request-Body:
    {
   		"role" : "HM",
   		"state" : "5c0bbab881bdbe330655da7f",
   		"block" : "5c0bbab881bdbe330655da7f",
   		"cluster" : "5c0bbab881bdbe330655da7f",
        "school" : "5c0bbab881bdbe330655da7f"
    }
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/programsSolutionsMap/programSolutionDetails/5f4e538bdf6dd17bab708173?solutionId=5f8688e7d7f86f040b77f460
    * @apiUse successBody
    * @apiUse errorBody
    * @apiParamExample {json} Response:
    * {
    * "message": "Targeted solution fetched successfully",
    * "status": 200,
    * "result": {
    * }
    }
    */

     /**
   * List of user targeted solutions.
   * @method
   * @name programSolutionDetails
   * @param {Object} req - requested data.
   * @returns {JSON} consists message of successfully mapped entities
   */

  async programSolutionDetails(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let solutionDetails = await programsSolutionsHelper.programSolutionDetails(
            req.params._id,
            req.query.solutionId,
            req.body
        );

        solutionDetails.result = solutionDetails.data;

        return resolve(solutionDetails);

      } catch (error) {
        return reject({
          status: error.status || httpStatusCode.internal_server_error.status,
          message: error.message || httpStatusCode.internal_server_error.message,
          errorObject: error
        });
      }
    });
  }

  /**
    * @api {post} /assessment/api/v1/programsSolutionsMap/targetedPrograms?page=:page&limit=:limit&search=:search
    * @apiVersion 1.0.0
    * @apiName Get user targeted programs.
    * @apiGroup programsSolutionsMap
    * @apiParamExample {json} Request-Body:
    {
   		"role" : "HM",
   		"state" : "5c0bbab881bdbe330655da7f",
   		"block" : "5c0bbab881bdbe330655da7f",
   		"cluster" : "5c0bbab881bdbe330655da7f",
      "school" : "5c0bbab881bdbe330655da7f"
    }
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/programsSolutionsMap/targetedPrograms?page=1&limit=1&search=i
    * @apiUse successBody
    * @apiUse errorBody
    * @apiParamExample {json} Response:
    * {
    * "message": "Tageted programs fetched successfully",
    * "status": 200,
    * "result": {
            "data": [
                {
                  "_id" : "5b98d7b6d4f87f317ff615ee",
                  "externalId" : "PROGID01",
                  "name" : "DCPCR School Development",
                  "solutions" :  4
                }   
            ],
            "count": 1
        }
    }
    */

     /**
   * List of user targeted programs.
   * @method
   * @name targetedPrograms
   * @param {Object} req - requested data.
   * @returns {JSON} list of user targeted programs
   */

  async targetedPrograms(req) {
    return new Promise(async (resolve, reject) => {
      try {
      
        let programs = await programsSolutionsHelper.targetedPrograms(
          req.body,
          req.pageSize,
          req.pageNo,
          req.searchText
        );

        return resolve({
            message: programs.message,
            result: programs.data
        });

      } catch (error) {
        return reject({
          status: error.status || httpStatusCode.internal_server_error.status,
          message: error.message || httpStatusCode.internal_server_error.message,
          errorObject: error
        });
      }
    });
  }

  /**
    * @api {post} /assessment/api/v1/programsSolutionsMap/targetedSolutionsByProgram/:programId?page=:page&limit=:limit&search=:search
    * @apiVersion 1.0.0
    * @apiName Get user targeted solutions by program.
    * @apiGroup programsSolutionsMap
    * @apiParamExample {json} Request-Body:
    {
   		"role" : "HM",
   		"state" : "5c0bbab881bdbe330655da7f",
   		"block" : "5c0bbab881bdbe330655da7f",
   		"cluster" : "5c0bbab881bdbe330655da7f",
      "school" : "5c0bbab881bdbe330655da7f"
    }
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/programsSolutionsMap/targetedSolutionsByProgram/5doabab881bdbe330655dbf7?page=1&limit=1&search=i
    * @apiUse successBody
    * @apiUse errorBody
    * @apiParamExample {json} Response:
    * {
    * "message": "Tageted solutions fetched successfully",
    * "status": 200,
    * "result": {
            "data": [
                {
                  "_id" : "5b98d7b6d4f87f317ff615ee",
                  "externalId": "TAF-2019-1603193283094",
                  "name": "obs1",
                  "type": "observation",
                  "programId": "5d287326652f311044f41dbb" 
                }   
            ],
            "count": 1
        }
    }
    */

     /**
   * List of user targeted solutions by programId.
   * @method
   * @name targetedSolutionsByProgram
   * @param {Object} req - requested data.
   * @returns {JSON} list of user targeted solution by programId
   */

  async targetedSolutionsByProgram(req) {
    return new Promise(async (resolve, reject) => {
      try {
      
        let solutions = await programsSolutionsHelper.targetedSolutionsByProgram(
          req.params._id,
          req.body,
          req.pageSize,
          req.pageNo,
          req.searchText
        );

        return resolve({
            message: solutions.message,
            result: solutions.data
        });

      } catch (error) {
        return reject({
          status: error.status || httpStatusCode.internal_server_error.status,
          message: error.message || httpStatusCode.internal_server_error.message,
          errorObject: error
        });
      }
    });
  }

   /**
    * @api {post} /assessment/api/v1/programsSolutionsMap/create/:programId?solutionId=:solutionId
    * @apiVersion 1.0.0
    * @apiName Targeted solution details.
    * @apiGroup programsSolutionsMap
    * @apiParamExample {json} Request-Body:
    {
      "scope" :{
        "programs":{
            "entityType" : "state",
            "entityTypeId" : ObjectId("5d6605db652f3110440de195"),
            "entities" : [ 
                ObjectId("5d6609ef81a57a6173a79e78")
            ]
        }
          
      }
    }
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/programsSolutionsMap/update/5f4e538bdf6dd17bab708173?solutionId=5f8688e7d7f86f040b77f460
    * @apiUse successBody
    * @apiUse errorBody
    * @apiParamExample {json} Response:
    * {
    * "message": "ProgramSolutionMap updated successfully",
    * "status": 200,
    * "result": {
        "_id" : ObjectId("5fe9dbc180c27b311b7ebb4b"),
        "programId" : ObjectId("5fc7be1e8164f7246f1113e8"),
        "solutionId" : ObjectId("5f92b5b79a530908731ac195"),
        "scope" : {
          "programs" : {
            "entityType" : "school",
            "entityTypeId" : ObjectId("5ce23d633c330302e720e665"),
            "entities" : [
              ObjectId("5c0bbab881bdbe330655da7f")
            ],
            "roles" : [
              {
                "_id" : ObjectId("5d6e521066a9a45df3aa891e"),
                "code" : "HM"
              }
            ]
          }
        },
        "solutionType" : "survey",
        "solutionSubType" : "survey",
        "isReusable" : false
    * }
    }
    */

     /**
   * update program solution map.
   * @method
   * @name update
   * @param {Object} req - requested data.
   * @param {String} req.params._id - program id.  
   * @param {String} req.query.solutionId - solution id.  
   * @returns {JSON} programSolutionMap details
   */

  async update(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let programSolutionMapDetails = await programsSolutionsHelper.update(
            req.params._id,
            req.query.solutionId,
            req.body
        );

        return resolve(programSolutionMapDetails);

      } catch (error) {

        return reject({
          status: error.status || httpStatusCode.internal_server_error.status,
          message: error.message || httpStatusCode.internal_server_error.message,
          errorObject: error
        });
      }
    });
  }

}