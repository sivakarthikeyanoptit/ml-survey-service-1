/**
 * name : entityAssessorsController.js
 * author : Aman
 * created-date : 17-04-2020
 * Description : All Entity Assessors v2 related functionality.
 */

// Dependencies

const v1EntityAssessors = require(ROOT_PATH + "/controllers/v1/entityAssessorsController");
const entityAssessorsHelper = require(MODULES_BASE_PATH + "/entityAssessors/helper");


/**
    * EntityAssessors
    * @class
    * @extends v1EntityAssessors
*/

module.exports = class EntityAssessors extends v1EntityAssessors {

  /**
 * @api {get} /assessment/api/v2/entityAssessors/entities?type=:solutionType&subType=:solutionSubType&programId=:programInternalId&solutionId=:solutionInternalId Entity assessors details
 * @apiVersion 2.0.0
 * @apiName Entity assessor details.
 * @apiGroup Entity Assessor
 * @apiHeader {String} X-authenticated-user-token Authenticity token
 * @apiSampleRequest /assessment/api/v2/entityAssessors/entities?type=assessment&subType=institutional&programId=5b98d7b6d4f87f317ff615ee&solutionId=5b98fa069f664f7e1ae7498c
 * @apiUse successBody
 * @apiUse errorBody
 * @apiParamExample {json} Response:
 * {
 * "message": "Entities fetched successfull",
 * "status": 200,
 * result : [
 *  {
 * "_id": "5b98d7b6d4f87f317ff615ee",
 * "externalId": "PROGID01",
 * "name": "DCPCR School Development Index 2018-19",
 * "description": "DCPCR School Development Index 2018-19",
 * "startDate": "2018-06-28T06:03:48.590Z",
 * "endDate": "2020-06-28T06:03:48.591Z",
 * "entities": [
 * {
 * "_id": "5bfe53ea1d0c350d61b78d0a",
 * "externalId": "1207229",
 * "addressLine1": "Street No.-5 Sangam Vihar (Wazirabad - Jagatpur Road)",
 * "addressLine2": "",
 * "city": "Urban",
 * "name": "Sachdeva Convent School, Street No.-5 Sangam Vihar (Wazirabad - Jagatpur Road), Delhi",
 * "state": "Delhi",
 * "isParentInterviewCompleted": false,
 * "submissionStatus": "inprogress",
 * "submissionId": "5c6a352f77c8d249d68ec6d0",
 * "solutions": [
 * {
 * "_id": "5b98fa069f664f7e1ae7498c",
 * "externalId": "EF-DCPCR-2018-001",
 * "name": "DCPCR Assessment Framework 2018",
 * "description": "DCPCR Assessment Framework 2018",
 * "type": "assessment",
 * "subType": "institutional"
 * }]
 * }]
 * }]
 * }
 */

  /**
   * List all programs. Each program consists of list of entities and each entity
   * consists of list of solutions.
   * @method
   * @name entities
   * @param {Object} req - All requested Data.
   * @param {String} req.userDetails.userId - Logged in user id.
   * @param {String} req.query.programId - requested programId.
   * @param {String} req.query.solutionId - requested solutionId.
   * @param {String} req.query.type - requested entity type.
   * @param {String} req.query.subType - requested entity subType. 
   * @returns {JSON}
   */

  async entities(req) {

    return new Promise(async (resolve, reject) => {

      try {

        let entityAssessorsDocument = await entityAssessorsHelper.entities(
            req.query,
            req.userDetails.userId,
            "v2"
        );

        return resolve(entityAssessorsDocument);

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
