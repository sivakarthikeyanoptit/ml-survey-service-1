const ejs = require('ejs');
const fs = require('fs');
const moment = require("moment-timezone");


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
* @apiVersion 0.0.1
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
* @api {get} /assessment/api/v1/observationSubmissions/isAllowed/:observationSubmissionId?evidenceId="LW" check submissions status 
* @apiVersion 0.0.1
* @apiName check submissions status 
* @apiGroup ObservationSubmissions
* @apiParam {String} evidenceId Evidence ID.
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
* @api {get} /assessment/api/v1/observationSubmissions/makePdf/:observationSubmissionId  observation submissions pdf 
* @apiVersion 0.0.1
* @apiName Generate Observation Submissions PDF 
* @apiGroup ObservationSubmissions
* @apiUse successBody
* @apiUse errorBody
*/
  async makePdf(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let observationSubmissionsDocument = await database.models.observationSubmissions.findOne({
          _id: req.params._id,
          status: "completed"
        }, {
            "entityInformation.name": 1,
            "entityInformation.schoolName": 1,
            "observationInformation.name": 1,
            "observationInformation.createdBy": 1,
            "answers": 1,
            "solutionExternalId": 1,
          }).lean()

        if (!observationSubmissionsDocument) {
          throw "Observation Submissions is not found/Status is not completed"
        }

        let answerData = Object.values(observationSubmissionsDocument.answers)
        let questionIds = []

        for (let pointerToAnswer = 0; pointerToAnswer < answerData.length; pointerToAnswer++) {
          questionIds.push(answerData[pointerToAnswer].qid)
        }

        let questionDocument = await database.models.questions.find({
          _id: { $in: questionIds }
        }, { options: 1, question: 1, responseType: 1, validation: 1 }).lean();

        let questionData = questionDocument.reduce((acc, currentData) => {

          if (currentData.options && currentData.options.length > 0) {
            acc[currentData._id.toString()] = {
              questionOptions: currentData.options,
              questionName: currentData.question
            }
          } else if (currentData.responseType === "slider") {
            let splitMaximumValue = currentData.validation.regex.split("[")[1].split("s]")[0]
            let maximum = splitMaximumValue.split("-")[1]
            acc[currentData._id.toString()] = {
              maximumValue: maximum
            }
          }
          return acc
        }, {})

        let generalInfo = [{
          keyword: "School Name",
          name: observationSubmissionsDocument.entityInformation.schoolName ? observationSubmissionsDocument.entityInformation.schoolName : observationSubmissionsDocument.entityInformation.name
        },
        {
          keyword: "Observation Name",
          name: observationSubmissionsDocument.observationInformation.name ? observationSubmissionsDocument.observationInformation.name : "Sample Observation"
        }, {
          keyword: "Assessors Name",
          name: observationSubmissionsDocument.observationInformation.createdBy
        },
        {
          keyword: "Entity Name",
          name: observationSubmissionsDocument.entityInformation.name
        }
        ]

        let allSubmittedData = []
        let count = 0

        function text(answer) {
          let textData = {}
          textData["answer"] = answer.value
          textData["responseType"] = answer.responseType
          return textData
        }

        function number(answer) {
          let number = text(answer)
          number.answer = parseInt(number.answer)
          return number
        }

        function date(answer) {
          let date = text(answer)
          let newDate = moment(date.answer).format("YYYY-MM-DD")
          date["day"] = newDate.split("-")[2]
          date["month"] = newDate.split("-")[1]
          date["year"] = newDate.split("-")[0]
          return date
        }

        function radio(answer) {
          let radioResponse = {}
          radioResponse["options"] = new Array

          questionData[answer.qid] !== undefined && questionData[answer.qid].questionOptions.forEach(eachDataOption => {
            let radioItems = {}
            radioItems["label"] = eachDataOption.label
            if (eachDataOption.value === answer.value) {
              radioItems["checked"] = true
            } else {
              radioItems["checked"] = false
            }
            radioResponse.options.push(radioItems)
          })
          return radioResponse
        }

        function multiselect(answer) {
          let multiSelectResponse = {}
          multiSelectResponse["options"] = new Array

          questionData[answer.qid].questionOptions.forEach(eachDataOption => {
            let multiSelectItems = {}

            let answerValueIndex = answer.value.findIndex(item => item === eachDataOption.value)

            multiSelectItems["label"] = eachDataOption.label

            if (answerValueIndex < 0) {
              multiSelectItems["checked"] = false

            } else {
              multiSelectItems["checked"] = true
            }
            multiSelectResponse.options.push(multiSelectItems)

          })
          return multiSelectResponse
        }

        function slider(answer) {
          let sliderResponse = {}
          sliderResponse["answer"] = `${parseInt(answer.value)} of ${parseInt(questionData[answer.qid].maximumValue)}`

          if (questionData[answer.qid].maximumValue) {
            sliderResponse["sliderWidth"] = "width:" + (parseInt(answer.value) / parseInt(questionData[answer.qid].maximumValue)) * 100 + "%"
          }

          return sliderResponse
        }

        function matrix(value, parentQuestion) {
          let matrixResponse = {}
          let matrixData = []
          matrixResponse["question"] = `${count + 1}. ${parentQuestion}`
          matrixResponse["responseType"] = "matrix"
          let matrixCount = 0

          for (let pointerToMatrixData = 0; pointerToMatrixData < value.length; pointerToMatrixData++) {

            let singleData = []
            let allValueArray = Object.values(value[pointerToMatrixData])

            for (let i = 0; i < allValueArray.length; i++) {
              let result

              if (allValueArray[i].responseType === "number") {
                result = number(allValueArray[i])

              }
              if (allValueArray[i].responseType == "text") {
                result = text(allValueArray[i])

              }
              if (allValueArray[i].responseType === "radio") {
                result = radio(allValueArray[i])

              }
              if (allValueArray[i].responseType === "multiselect") {
                result = multiselect(allValueArray[i])
              }
              if (allValueArray[i].responseType === "slider") {
                result = slider(allValueArray[i])
              }
              if (allValueArray[i].responseType === "date") {
                result = date(allValueArray[i])
              }
              result["instanceChildrenCount"] = matrixCount + 1

              result["question"] = `${i + 1}. ${allValueArray[i].payload.question[0]}`
              result["responseType"] = allValueArray[i].responseType

              singleData.push(result)

            }
            ++matrixCount
            matrixData.push(singleData)
          }
          matrixResponse["data"] = matrixData
          count++
          return matrixResponse
        }


        for (let pointerToAnswer = 0; pointerToAnswer < answerData.length; pointerToAnswer++) {

          let result

          if (answerData[pointerToAnswer].responseType != "matrix" &&
            answerData[pointerToAnswer].value != undefined) {

            if (answerData[pointerToAnswer].responseType === "text") {
              result = text(answerData[pointerToAnswer])
            }
            if (answerData[pointerToAnswer].responseType === "number") {
              result = number(answerData[pointerToAnswer])
            }
            if (answerData[pointerToAnswer].responseType === "radio") {
              result = radio(answerData[pointerToAnswer])
            }
            if (answerData[pointerToAnswer].responseType === "multiselect") {
              result = multiselect(answerData[pointerToAnswer])
            }
            if (answerData[pointerToAnswer].responseType === "slider") {
              result = slider(answerData[pointerToAnswer])
            }
            if (answerData[pointerToAnswer].responseType === "date") {
              result = date(answerData[pointerToAnswer])
            }

            result["question"] = `${count + 1}. ${answerData[pointerToAnswer].payload.question[0]}`
            result["responseType"] = answerData[pointerToAnswer].responseType
            ++count
            allSubmittedData.push(result)
          } else {

            if (answerData[pointerToAnswer].value && answerData[pointerToAnswer].value.length > 0) {
              allSubmittedData.push(matrix(answerData[pointerToAnswer].value, answerData[pointerToAnswer].payload.question[0]))
            }
          }
        }

        const htmlPath = `${process.env.HTML_PATH}/${observationSubmissionsDocument._id.toString()}/`;
        if (!fs.existsSync(htmlPath)) fs.mkdirSync(htmlPath);

        let indexTemplate = ROOT_PATH + "/template/observationSubmissions/index.ejs"
        let header = ROOT_PATH + "/template/observationSubmissions/header.ejs"
        let footer = ROOT_PATH + "/template/observationSubmissions/footer.ejs"


        if (fs.existsSync(htmlPath + "index.html")) {
          fs.unlinkSync(htmlPath + "index.html");
        }

        if (fs.existsSync(htmlPath + "header.html")) {
          fs.unlinkSync(htmlPath + "header.html");
        }

        if (fs.existsSync(htmlPath + "footer.html")) {
          fs.unlinkSync(htmlPath + "footer.html");
        }

        ejs.renderFile(indexTemplate, { generalInfo: generalInfo, submissionData: allSubmittedData }).then((resolve) => {
          fs.appendFile(fileToBeAppended, resolve, function (err) {
            if (err) throw err;
            console.log('Saved!');
          });
        })

        ejs.renderFile(header).then((resolve) => {
          fs.appendFile(htmlPath + "header.html", resolve, function (err) {
            if (err) throw err;
            console.log('Saved!');
          });
        })

        ejs.renderFile(footer).then((resolve) => {
          fs.appendFile(htmlPath + "footer.html", resolve, function (err) {
            if (err) throw err;
            console.log('Saved!');
          });
        })

        const gotenbergHelper = await observationSubmissionsHelper.generatePdf(req.params._id)

        console.log("here")
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


