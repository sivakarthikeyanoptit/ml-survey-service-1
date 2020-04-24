/**
 * name : entityAssessorsController.js
 * author : Akash
 * created-date : 22-Nov-2018
 * Description : All Entity Assessors related information.
 */

// Dependencies
const entityAssessorsHelper = require(MODULES_BASE_PATH + "/entityAssessors/helper");

/**
    * EntityAssessors
    * @class
*/
module.exports = class EntityAssessors extends Abstract {
  constructor() {
    super(entityAssessorsSchema);
  }

  static get name() {
    return "entityAssessors";
  }

  /**
 * @api {get} /assessment/api/v1/entityAssessors/entities?type=:solutionType&subType=:solutionSubType&programId=:programInternalId&solutionId=:solutionInternalId Entity assessor list
 * @apiVersion 1.0.0
 * @apiName Entity assessor list
 * @apiGroup Entity Assessor
 * @apiHeader {String} X-authenticated-user-token Authenticity token
 * @apiSampleRequest /assessment/api/v1/entityAssessors/entities?type=assessment&subType=institutional&programId=5cfa4ebcfc7cae61da9add8b&solutionId=5cfdf0e5e8dc32060234571c
 * @apiUse successBody
 * @apiUse errorBody
 * @apiParamExample {json} Response:
 * "result": [
     {
      "_id": "5cfa4ebcfc7cae61da9add8b",
      "externalId": "PGM-SMC",
      "name": "SMC Program Index 2018-19",
      "description": "SMC Program Index 2018-19",
      "startDate": "2018-05-20T05:39:26.970Z",
      "endDate": "2020-05-20T05:39:26.970Z",
      "solutions": [
      {
        "_id": "5cfdf0e5e8dc32060234571c",
        "type": "assessment",
        "subType": "institutional",
        "externalId": "SOLUTION-SMC",
        "name": "SMC Assessment Framework 2019",
        "description": "SMC Assessment Framework 2019",
        "entities": [
          {
            "_id": "5cfe1f29f5fcff1170088cf3",
            "isParentInterviewCompleted": false,
            "submissionId": "5d7b3870491ec9303b93d098",
            "submissionStatus": "started",
            "externalId": "SMC01",
            "name": "SMC of School 1",
            "city": "Bengaluru",
            "state": "Delhi"
          }
        ]
      }
    ]
  }
]
 */

  /**
   * Get all the entities for particular assessor.
   * @method
   * @name entities
   * @param {Object} req - All requested Data.
   * @param {String} req.userDetails.userId - Logged in user id.
   * @param {String} req.query.programId - requested programId.
   * @param {String} req.query.solutionId - requested solutionId.
   * @param {String} req.query.type - requested entity type.
   * @param {String} req.query.subType - requested entity subType. 
   * @returns {JSON} - Entities details information.
   */

  async entities(req) {

    return new Promise(async (resolve, reject) => {

      try {

        let entityAssessorsDocument = await entityAssessorsHelper.entities(
          req.query,
          req.userDetails.userId
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

  /**
* @api {post} /assessment/api/v1/entityAssessors/upload Upload Entity Information CSV
* @apiVersion 1.0.0
* @apiName Upload Entity Assessor Information CSV
* @apiGroup Entity Assessor
* @apiParam {File} assessors Mandatory assessors file of type CSV.
* @apiSampleRequest /assessment/api/v1/entityAssessors/upload
* @apiUse successBody
* @apiUse errorBody
*/

  /**
   * Upload entity assessors via csv.
   * @method
   * @name upload
   * @param {Object} req - All requested Data.
   * @param {String} req.userDetails.userId - Logged in user id.
   * @param {Object} req.files - requested files.
   * @param {String} req.rspObj.userToken - requested user token.
   * @returns {JSON} - message indicating entity assessors created.
   */

  async upload(req) {

    return new Promise(async (resolve, reject) => {

      try {

        await entityAssessorsHelper.upload(req.files, null, null, req.userDetails.userId, req.rspObj.userToken);

        let response = { message : messageConstants.apiResponses.ASSESSOR_CREATED };

        return resolve(response);

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
* @api {post} /assessment/api/v1/entityAssessors/uploadForPortal?programId=:programExternalId&solutionId=:solutionExternalId Upload Entity Information CSV Using Portal
* @apiVersion 1.0.0
* @apiName Upload Entity Assessor Information CSV Using Portal
* @apiGroup Entity Assessor
* @apiParam {File} assessors Mandatory assessors file of type CSV.
* @apiSampleRequest /assessment/api/v1/entityAssessors/uploadForPortal?programId=PROGID01&solutionId=EF-DCPCR-2018-001
* @apiUse successBody
* @apiUse errorBody
*/

/**
   * Upload entity assessors via csv in portal.
   * @method
   * @name uploadForPortal
   * @param {Object} req - All requested Data.
   * @param {String} req.userDetails.userId - Logged in user id.
   * @param {String} req.query.programId - program id.
   * @param {String} req.query.solutionId - solution id. 
   * @param {Object} req.files - requested files.
   * @param {String} req.rspObj.userToken - requested user token.
   * @returns {JSON} - message indicating entity assessors created.
  */

  async uploadForPortal(req) {

    return new Promise(async (resolve, reject) => {

      try {

        let programId = req.query.programId;
        let solutionId = req.query.solutionId;

        await entityAssessorsHelper.upload(req.files, programId, solutionId, req.userDetails.userId, req.rspObj.userToken);

        let response = { message: messageConstants.apiResponses.ASSESSOR_CREATED };

        return resolve(response);

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
  * @api {get} /assessment/api/v1/entityAssessors/pendingAssessments Pending Assessments
  * @apiVersion 1.0.0
  * @apiName Pending Assessments
  * @apiGroup Entity Assessor
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/entityAssessors/pendingAssessments
  * @apiUse successBody
  * @apiUse errorBody
  * @apiParamExample {json} Response:
  {
      "message": "Pending Assessments",
      "status": 200,
      "result": [
          {
              "_id": "5dca4478284feccded8f35c6",
              "userId": "e97b5582-471c-4649-8401-3cc4249359bb",
              "solutionId": "5b98fa069f664f7e1ae7498c",
              "createdAt": "2019-01-01T00:00:00.000Z",
              "entityId": "5c0bbab881bdbe330655d83c",
              "programId": "5b98d7b6d4f87f317ff615ee"
          }
        ]
    }
  */

  /**
   * Pending Assessments.
   * @method
   * @name pendingAssessments
   * @returns {JSON} - List of pending assessments.
  */

  async pendingAssessments() {
    return new Promise(async (resolve, reject) => {
      try {

        let pendingAssessmentDocument = 
        await entityAssessorsHelper.pendingAssessment();

        return resolve({
          message: messageConstants.apiResponses.PENDING_ASSESSMENT,
          result: pendingAssessmentDocument
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
  * @api {get} /assessment/api/v1/entityAssessors/completedAssessments Completed Assessments
  * @apiVersion 1.0.0
  * @apiName Completed Assessments
  * @apiGroup Entity Assessor
  * @apiParam {String} fromDate From Date
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/entityAssessors/completedAssessments
  * @apiUse successBody
  * @apiUse errorBody
  * @apiParamExample {json} Response:
    {
        "message": "Completed Assessments",
        "status": 200,
        "result": [
            {
                "_id": "5dca4478284feccded8f35c6",
                "userId": "e97b5582-471c-4649-8401-3cc4249359bb",
                "solutionId": "5b98fa069f664f7e1ae7498c",
                "createdAt": "2019-01-01T00:00:00.000Z",
                "entityId": "5c0bbab881bdbe330655d83c",
                "programId": "5b98d7b6d4f87f317ff615ee"
            }
          ]
    }
  */

  /**
   * Completed Assessments.
   * @method
   * @name completedAssessments
   * @returns {JSON} - List of completed assessments.
  */

  async completedAssessments(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let completedAssessmentDocument = 
        await entityAssessorsHelper.completedAssessment(
          req.query.fromDate,
          req.query.toDate
        );

        return resolve({
          message: messageConstants.apiResponses.COMPLETED_ASSESSMENT,
          result: completedAssessmentDocument
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

};
