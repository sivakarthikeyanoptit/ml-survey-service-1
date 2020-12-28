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
    * @apiGroup Solutions
    * @apiParamExample {json} Request-Body:
    {
   		"role" : "HM",
   		"state" : "5c0bbab881bdbe330655da7f",
   		"block" : "5c0bbab881bdbe330655da7f",
   		"cluster" : "5c0bbab881bdbe330655da7f",
        "school" : "5c0bbab881bdbe330655da7f"
    }
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/solutions/programsSolutionsMap/targetedSolutions?type=observation&subType=school&page=1&limit=1
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

        let solutionData = await programsSolutionsHelper.targetedSolutions(
          req.body,
          req.query.type,
          req.query.subType,
          req.pageSize,
          req.pageNo,
          req.searchText
        );

        solutionData.result = solutionData.data;

        return resolve(solutionData);

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