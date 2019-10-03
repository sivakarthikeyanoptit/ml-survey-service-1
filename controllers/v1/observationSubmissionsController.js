const submissionsHelper = require(ROOT_PATH + "/module/submissions/helper")

const observationSubmissionsHelper = require(ROOT_PATH + "/module/observationSubmissions/helper")

module.exports = class ObservationSubmissions extends Abstract {

  constructor() {
    super(observationSubmissionsSchema);
  }

  static get name() {
    return "observationSubmissions";
  }

  /**
* @api {post} /assessment/api/v1/observationSubmissions/make/{{submissionId}} create observation submission
* @apiVersion 1.0.0
* @apiName create observation submission
* @apiGroup ObservationSubmissions
* @apiParamExample {json} Request-Body:
* {
* 	"evidence": {
*                   "externalId" : "",
*                   "answers" : {
*                       "5be442149a14ba4b5038dce4" : {
*                           "qid" : "",
*                           "responseType":"",
*                           "value" : [ 
*                               {
*                                   "5be442dd9a14ba4b5038dce5" : {
*                                       "qid" : "",
*                                       "value" : "",
*                                       "remarks" : "",
*                                       "fileName" : [],
*                                       "payload" : {
*                                           "question" : [ 
*                                               "", 
*                                               ""
*                                           ],
*                                           "labels" : [ 
*                                               ""
*                                           ],
*                                           "responseType" : ""
*                                       },
*                                       "criteriaId" : ""
*                                   },
*                                   "5be52f5d9a14ba4b5038dd0c" : {
*                                       "qid" : "",
*                                       "value" : [ 
*                                           "String", 
*                                           "String"
*                                       ],
*                                       "remarks" : "",
*                                       "fileName" : [],
*                                       "payload" : {
*                                           "question" : [ 
*                                               "", 
*                                               ""
*                                           ],
*                                           "labels" : [ 
*                                              "String", 
*                                           "String"
*                                           ],
*                                           "responseType" : """
*                                       },
*                                       "criteriaId" : ""
*                                   }
*                               }
*                           ],
*                           "remarks" : "",
*                           "fileName" : [],
*                           "payload" : {
*                               "question" : [ 
*                                   "String"", 
*                                   "Stgring"
*                               ],
*                              "labels" : [ 
*                                   [ 
*                                       [ 
*                                           {
*                                               "_id" : "",
*                                               "question" : [ 
*                                                   "String", 
*                                                   "String"
*                                               ],
*                                               "options" : [ 
*                                                   {
*                                                       "value" : "",
*                                                       "label" : ""
*                                                   }
*                                               ],
*                                               "children" : [],
*                                               "questionGroup" : [ 
*                                                   ""
*                                               ],
*                                               "fileName" : [],
*                                               "instanceQuestions" : [],
*                                               "deleted" : Boolean,
*                                               "tip" : "",
*                                               "externalId" : "",
*                                               "visibleIf" : "",
*                                               "file" : "",
*                                               "responseType" : "",
*                                               "validation" : {
*                                                   "required" : Boolean
*                                               },
*                                               "showRemarks" : Boolean,
*                                               "isCompleted" : Boolean,
*                                               "remarks" : "",
*                                               "value" : "",
*                                               "canBeNotApplicable" : "Boolean",
*                                               "usedForScoring" : "",
*                                               "modeOfCollection" : "",
*                                               "questionType" : "",
*                                               "accessibility" : "",
*                                               "updatedAt" : "Date",
*                                               "createdAt" : "Date",
*                                               "__v" : 0,
*                                               "payload" : {
*                                                   "criteriaId" : ""
*                                               }
*                                           }, 
*                                           {
*                                               "_id" : "",
*                                               "question" : [ 
*                                                   "String", 
*                                                   "String"
*                                               ],
*                                               "options" : [ 
*                                                   {
*                                                       "value" : "",
*                                                       "label" : ""
*                                                   }
*                                               ],
*                                               "children" : [],
*                                               "questionGroup" : [ 
*                                                   "String"
*                                               ],
*                                               "fileName" : [],
*                                               "instanceQuestions" : [],
*                                               "deleted" : Boolean,
*                                               "tip" : "",
*                                               "externalId" : "",
*                                               "visibleIf" : "",
*                                               "file" : "",
*                                               "responseType" : "",
*                                               "validation" : {
*                                                   "required" : Boolean
*                                               },
*                                               "showRemarks" : Boolean,
*                                               "isCompleted" : Boolean,
*                                               "remarks" : "",
*                                               "value" : "",
*                                               "canBeNotApplicable" : "Boolean",
*                                               "usedForScoring" : "",
*                                               "modeOfCollection" : "",
*                                               "questionType" : "",
*                                               "accessibility" : "",
*                                               "updatedAt" : "Date",
*                                               "createdAt" : "Date",
*                                               "__v" : 0,
*                                               "payload" : {
*                                                   "criteriaId" : ""
*                                               }
*                                           }
*                                       ], 
*                                   ]
*                               ],
*                               "responseType" : ""
*                           },
*                           "criteriaId" : ""
*                       }
*                   },
*                   "startTime" : Date,
*                   "endTime" : Date,
*                   "gpsLocation" : "String,String",
*                   "submittedBy" : """,
*                   "isValid" : Boolean
*               }
* }
* @apiUse successBody
* @apiUse errorBody
*/

  async make(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let response = await submissionsHelper.createEvidencesInSubmission(req, "observationSubmissions", false);

        if (response.result.status && response.result.status === "completed") {
          await observationSubmissionsHelper.generateHtml(req.params._id)
        }

        return resolve(response);

      } catch (error) {

        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });

      }

    })
  }

  /**
  * @api {get} /assessment/api/v1/observationSubmissions/isAllowed:observationSubmissionId?evidenceId="LW" check submissions status 
  * @apiVersion 1.0.0
  * @apiName check submissions status 
  * @apiGroup ObservationSubmissions
  * @apiParam {String} evidenceId Evidence ID.
  * @apiSampleRequest /assessment/api/v1/observationSubmissions/isAllowed/5d2c1c57037306041ef0c7ea?evidenceId=SO
  * @apiParamExample {json} Response:
  * "result": {
      "allowed": true
    }
  * @apiUse successBody
  * @apiUse errorBody
  */

  async isAllowed(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = {
          allowed: true
        }

        let message = "Observation submission check completed successfully";

        let submissionDocument = await database.models.observationSubmissions.findOne(
          { "_id": req.params._id },
          {
            ["evidences." + req.query.evidenceId + ".isSubmitted"]: 1,
            ["evidences." + req.query.evidenceId + ".submissions"]: 1
          }
        );

        if (!submissionDocument || !submissionDocument._id) {
          throw "Couldn't find the submission document"
        } else {
          if (submissionDocument.evidences[req.query.evidenceId].isSubmitted && submissionDocument.evidences[req.query.evidenceId].isSubmitted == true) {
            submissionDocument.evidences[req.query.evidenceId].submissions.forEach(submission => {
              if (submission.submittedBy == req.userDetails.userId) {
                result.allowed = false
              }
            })
          }
        }

        let response = {
          message: message,
          result: result
        };

        return resolve(response);

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }


  /**
  * @api {get} /assessment/api/v1/observationSubmissions/delete/:observationSubmissionId Delete observation submission. 
  * @apiVersion 1.0.0
  * @apiName Delete observation submission. 
  * @apiGroup ObservationSubmissions
  * @apiUse successBody
  * @apiUse errorBody
  */

  async delete(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let message = "Observation submission deleted successfully";

        let submissionDocument = await database.models.observationSubmissions.deleteOne(
          {
            "_id": req.params._id,
            status: "started",
            createdBy: req.userDetails.userId
          }
        );

        if (!submissionDocument.n) {
          throw "Couldn't find the submission document"
        }

        let response = {
          message: message
        };

        return resolve(response);

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }

  /**
* @api {get} /assessment/api/v1/observationSubmissions/generateHtml/:observationSubmissionId  observation submissions pdf 
* @apiVersion 1.0.0
* @apiName Generate Observation Submissions PDF 
* @apiGroup ObservationSubmissions
* @apiUse successBody
* @apiUse errorBody
*/
  async generateHtml(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let generatePdf = await observationSubmissionsHelper.generateHtml(req.params._id)
        return resolve(generatePdf);

      } catch (error) {
        return reject({
          status: 500,
          message: error
        });
      }
    })
  }


  /**
  * @api {get} /assessment/api/v1/observationSubmissions/pdfFileUrl/:observationSubmissionId Get observation submission PDF URL
  * @apiVersion 1.0.0
  * @apiName Get observation submission PDF URL
  * @apiGroup ObservationSubmissions
  * @apiUse successBody
  * @apiUse errorBody
  */

  async pdfFileUrl(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = {
          url: ""
        }

        let message = "Observation submission PDF File URL fetched successfully";

        let submissionDocument = await database.models.observationSubmissions.findOne(
          {
            $and: [
              { "_id": req.params._id },
              { pdfFileUrl: { $ne: "" } },
              { pdfFileUrl: { $exists: true } }
            ]
          },
          {
            pdfFileUrl: 1
          }
        );

        if (!submissionDocument || !submissionDocument._id) {
          message = "PDF not available."
        } else {
          result.url = "https://storage.googleapis.com/sl-" + (process.env.NODE_ENV == "production" ? "prod" : "dev") + "-storage/" + submissionDocument.pdfFileUrl
        }

        let response = {
          message: message,
          result: result
        };

        return resolve(response);


      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }

};

