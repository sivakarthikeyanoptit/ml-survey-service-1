module.exports = class SchoolAssessors extends Abstract {
  /**
   * @apiDefine errorBody
   * @apiError {String} status 4XX,5XX
   * @apiError {String} message Error
   */

  /**
     * @apiDefine successBody
     *  @apiSuccess {String} status 200
     * @apiSuccess {String} result Data
     */

  constructor() {
    super(schoolAssessorsSchema);
  }

  static get name() {
    return "schoolAssessors";
  }

  /**
* @api {post} /assessment/api/v1/schoolAssessors/insert Insert Assesor
* @apiVersion 0.0.1
* @apiName Insert Assesor
* @apiGroup School Assessors
* @apiParamExample {json} Request-Body:
*{
*    "externalId" : "",
*    "userId" : "",
*    "role" : "",
*    "programId" : "",
*    "assessmentStatus" : "",
*    "parentId" : "",
*    "schools" : [ 
*        "String"
*    ],
*    "createdBy" : "",
*    "updatedBy" : ""
* }
*}
* @apiUse successBody
* @apiUse errorBody
*/

  insert(req) {
    // console.log("reached here!");
    // req.db = "cassandra";
    return super.insert(req);
  }

  /**
* @api {get} /assessment/api/v1/schoolAssessors/find Find School Assessors
* @apiVersion 0.0.1
* @apiName Find School Assessors
* @apiGroup School Assessors
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/schoolAssessors/find
* @apiUse successBody
* @apiUse errorBody
*/

  find(req) {
    // req.db = "cassandra";
    req.query = { userId: req.userDetails.userId };
    //req.populate = "schools";

    req.populate = {
      path: 'schools',
      select: ["name", "externalId"]
    };

    // return super.find(req);
    return super.populate(req);
  }
};
