/**
 * name : surveysController.js
 * author : Deepa
 * created-date : 21-Dec-2020
 * Description : Surveys information.
 */

// Dependencies
const surveysHelper = require(MODULES_BASE_PATH + "/surveys/helper");

/**
    * Surveys
    * @class
*/
module.exports = class Surveys {


    /**
    * @api {get} /assessment/api/v2/surveys/details/:surveyId?solutionId=:solutionId&programId=:programId
    * Survey details.
    * @apiVersion 2.0.0
    * @apiGroup Surveys
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v2/surveys/details/5de8a220c210d4700813e695?solutionId=5f5b38ec45365677f64b2843&programId=5beaaa2baf0065f0e0a105c7
    * @apiUse successBody
    * @apiUse errorBody
    * @apiParamExample {json} Response:
    {
    "message": "Survey details fetched successfully",
    "status": 200,
    "result": {
        "solution": {
            "_id": "5f5b38ec45365677f64b2843",
            "externalId": "Test-survey-solution",
            "name": "test survey",
            "description": "Shikshalokam test Survey and feedback solution",
            "captureGpsLocationAtQuestionLevel": false,
            "enableQuestionReadOut": false
        },
        "program": {
            "_id": "5f5b1df69c70bd2973aee29e",
            "externalId": "Test-survey-program",
            "name": "new survey program",
            "description": "Shikshalokam new survey",
            "imageCompression": {
                "quality": 10
            }
        },
        "assessment": {
            "name": "test survey",
            "description": "Shikshalokam test Survey and feedback solution",
            "externalId": "Test-survey-solution",
            "submissionId": "5f5b657f9c3b881d2c711dc0",
            "evidences": [
                {
                    "code": "SF",
                    "sections": [
                        {
                            "code": "SQ",
                            "questions": [
                                {
                                    "_id": "5f5b394045365677f64b2844",
                                    "question": [
                                        "Roles and responsibilities",
                                        ""
                                    ],
                                    "isCompleted": false,
                                    "showRemarks": true,
                                    "options": [
                                        {
                                            "value": "R1",
                                            "label": "Not aware of their roles and responsibilities."
                                        },
                                        {
                                            "value": "R2",
                                            "label": "Aware of their roles and responsibilities."
                                        },
                                        {
                                            "value": "R3",
                                            "label": "Play their roles as described in RTE and SSA with guidance and support."
                                        },
                                        {
                                            "value": "R4",
                                            "label": "Takes initiative to provide his/her services to school and makes plans for school improvement."
                                        }
                                    ],
                                    "sliderOptions": [],
                                    "children": [],
                                    "questionGroup": [
                                        "A1"
                                    ],
                                    "fileName": [],
                                    "instanceQuestions": [],
                                    "isAGeneralQuestion": false,
                                    "autoCapture": false,
                                    "allowAudioRecording": false,
                                    "prefillFromEntityProfile": false,
                                    "entityFieldName": "",
                                    "isEditable": true,
                                    "showQuestionInPreview": false,
                                    "deleted": false,
                                    "remarks": "",
                                    "value": "",
                                    "usedForScoring": "",
                                    "questionType": "auto",
                                    "canBeNotApplicable": "false",
                                    "visibleIf": "",
                                    "validation": {
                                        "required": true
                                    },
                                    "externalId": "SUR01",
                                    "tip": "",
                                    "hint": "Hint for question (Leave blank for no hint)",
                                    "responseType": "radio",
                                    "modeOfCollection": "onfield",
                                    "accessibility": "No",
                                    "rubricLevel": "",
                                    "sectionHeader": "",
                                    "page": "P1",
                                    "updatedAt": "2020-09-11T08:45:52.490Z",
                                    "createdAt": "2020-09-11T08:45:52.490Z",
                                    "__v": 0,
                                    "evidenceMethod": "SF",
                                    "payload": {
                                        "criteriaId": "5f5b38ec45365677f64b2842",
                                        "responseType": "radio",
                                        "evidenceMethod": "SF",
                                        "rubricLevel": ""
                                    },
                                    "startTime": "",
                                    "endTime": "",
                                    "gpsLocation": "",
                                    "file": ""
                                }
                                    "isAGeneralQuestion": false,
                                    "autoCapture": false,
                                    "allowAudioRecording": false,
                                    "prefillFromEntityProfile": false,
                                    "entityFieldName": "",
                                    "isEditable": true,
                                    "showQuestionInPreview": false,
                                    "deleted": false,
                                    "remarks": "",
                                    "value": "",
                                    "usedForScoring": "",
                                    "questionType": "auto",
                                    "canBeNotApplicable": "false",
                                    "visibleIf": "",
                                    "validation": {
                                        "required": true
                                    },
                                    "externalId": "SUR10",
                                    "tip": "",
                                    "hint": "",
                                    "responseType": "radio",
                                    "modeOfCollection": "onfield",
                                    "accessibility": "No",
                                    "rubricLevel": "",
                                    "sectionHeader": "",
                                    "page": "",
                                    "updatedAt": "2020-09-11T08:45:52.698Z",
                                    "createdAt": "2020-09-11T08:45:52.698Z",
                                    "__v": 0,
                                    "evidenceMethod": "SF",
                                    "payload": {
                                        "criteriaId": "5f5b38ec45365677f64b2842",
                                        "responseType": "radio",
                                        "evidenceMethod": "SF",
                                        "rubricLevel": ""
                                    },
                                    "startTime": "",
                                    "endTime": "",
                                    "gpsLocation": "",
                                    "file": ""
                                }
                            ],
                            "name": "Survey Questions"
                        }
                    ],
                    "externalId": "SF",
                    "name": "Surevy And Feedback",
                    "description": "Surevy And Feedback",
                    "modeOfCollection": "",
                    "canBeNotApplicable": false,
                    "notApplicable": false,
                    "canBeNotAllowed": true,
                    "remarks": "",
                    "isActive": true,
                    "startTime": "",
                    "endTime": "",
                    "isSubmitted": false,
                    "submissions": []
                }
            ],
            "submissions": {}
        }
    }
    }
    */
    /**
    * Survey details.
    * @method
    * @name details
    * @param  {Request} req request body.
    * @returns {JSON} Response consists of message,status and result.
    * Result will have the details of survey.
    */

    async details(req) {
    return new Promise(async (resolve, reject) => {
        try {

            let surveyId = req.params._id ? req.params._id : "";
            let programId = req.query.programId ? req.query.programId : "";

            let surveyDetails = await surveysHelper.detailsV2
            (
                surveyId,
                req.query.solutionId,
                programId,
                req.userDetails.userId,
                req.rspObj.userToken
            );

            return resolve({
                message: surveyDetails.message,
                result: surveyDetails.data
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

}