const moment = require("moment-timezone");
const FileStream = require(ROOT_PATH + "/generics/fileStream");
const imageBaseUrl = "https://storage.cloud.google.com/sl-" + (process.env.NODE_ENV == "production" ? "prod" : "dev") + "-storage/";

module.exports = class Reports {
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
  }

  static get name() {
    return "submissions";
  }

  async dataFix(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let dataFixer = require(ROOT_PATH + "/generics/helpers/dataFixer");
        dataFixer.processData(req.params._id);

        return resolve({
          status: 200,
          message: "All good! for " + req.params._id
        });
      } catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }
    });
  }

  /**
 * @api {get} /assessment/api/v1/reports/status/ Fetch submission reports for school
 * @apiVersion 0.0.1
 * @apiName Fetch submission reports for school
 * @apiGroup Report
 * @apiUse successBody
 * @apiUse errorBody
 */

  async status(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let submissionQueryObject = {
          ["programInformation.externalId"]: req.params._id
        }

        if (!req.params._id) {
          throw "Program ID missing."
        }

        let submissionsIds = await database.models.submissions.find(
          submissionQueryObject,
          {
            _id: 1
          }
        );

        const fileName = `status`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (!submissionsIds.length) {
          return resolve({
            status: 404,
            message: "No submissions found for given params."
          });
        }

        else {
          let chunkOfSubmissionsIdsDocument = _.chunk(submissionsIds, 10)
          let submissionId
          let submissionDocumentsArray


          for (let pointerTosubmissionIdDocument = 0; pointerTosubmissionIdDocument < chunkOfSubmissionsIdsDocument.length; pointerTosubmissionIdDocument++) {
            submissionId = chunkOfSubmissionsIdsDocument[pointerTosubmissionIdDocument].map(submissionModel => {
              return submissionModel._id
            });


            submissionDocumentsArray = await database.models.submissions.find(
              {
                _id: {
                  $in: submissionId
                }
              },
              {
                "schoolInformation.externalId": 1,
                "schoolInformation.name": 1,
                "programInformation.name": 1,
                "programInformation.externalId": 1,
                "schoolId": 1,
                "programId": 1,
                "status": 1,
                "evidencesStatus.isSubmitted": 1,
                "evidencesStatus.hasConflicts": 1,
                "evidencesStatus.externalId": 1,
                "evidencesStatus.notApplicable": 1
              }
            )
            await Promise.all(submissionDocumentsArray.map(async (eachSubmissionDocument) => {
              let result = {};

              if (eachSubmissionDocument.schoolInformation) {
                result["School Id"] = eachSubmissionDocument.schoolInformation.externalId;
                result["School Name"] = eachSubmissionDocument.schoolInformation.name;
              } else {
                result["School Id"] = eachSubmissionDocument.schoolId;
              }

              if (eachSubmissionDocument.programInformation) {
                result["Program Id"] = eachSubmissionDocument.programId;
                result["Program Name"] = eachSubmissionDocument.programInformation.name;
              } else {
                result["Program Id"] = eachSubmissionDocument.programId;
              }

              result["Status"] = eachSubmissionDocument.status;

              let totalEcmsSubmittedCount = 0
              eachSubmissionDocument.evidencesStatus.forEach(evidenceMethod => {
                if ((evidenceMethod.isSubmitted) && (evidenceMethod.notApplicable != true)) {
                  totalEcmsSubmittedCount += 1
                }
                _.merge(result, { [evidenceMethod.externalId]: (evidenceMethod.isSubmitted) ? (evidenceMethod.notApplicable != true) ? true : "NA" : false })
                _.merge(result, { [evidenceMethod.externalId + "-duplication"]: (evidenceMethod.hasConflicts) ? evidenceMethod.hasConflicts : false })
              })

              result["Total ECMs Submitted"] = totalEcmsSubmittedCount
              input.push(result);

            }))

          }
        }
        input.push(null);

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }
    });
  }

  /**
* @api {get} /assessment/api/v1/reports/assessorSchools/ Fetch assessors reports for school
* @apiVersion 0.0.1
* @apiName Fetch assessors reports for school
* @apiGroup Report
* @apiUse successBody
* @apiUse errorBody
*/

  async assessorSchools(req) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!req.params._id) {
          throw "Program ID missing."
        }

        const programQueryParams = {
          externalId: req.params._id
        };
        const programsDocumentIds = await database.models.programs.find(programQueryParams, { externalId: 1 })

        if (!programsDocumentIds.length) {
          return resolve({
            status: 404,
            message: "No programs found for given params."
          });
        }

        const assessorDocument = await database.models.schoolAssessors.find({ programId: programsDocumentIds[0]._id }, { _id: 1 })

        const fileName = `assessorSchoolsfile`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());
        if (!assessorDocument.length) {
          return resolve({
            status: 404,
            message: "No assessor found for given params."
          });
        }
        else {
          let chunkOfAssessorDocument = _.chunk(assessorDocument, 10)
          let assessorId
          let assessorsDocuments


          for (let pointerToAssessorIdDocument = 0; pointerToAssessorIdDocument < chunkOfAssessorDocument.length; pointerToAssessorIdDocument++) {
            assessorId = chunkOfAssessorDocument[pointerToAssessorIdDocument].map(assessorModel => {
              return assessorModel._id
            });


            let assessorQueryObject = [
              {
                $match: {
                  _id: {
                    $in: assessorId
                  }
                }
              }, { "$addFields": { "schoolIdInObjectIdForm": "$schools" } },
              {
                $lookup: {
                  from: "schools",
                  localField: "schoolIdInObjectIdForm",
                  foreignField: "_id",
                  as: "schoolDocument"

                }
              }
            ];

            assessorsDocuments = await database.models.schoolAssessors.aggregate(assessorQueryObject)

            await Promise.all(assessorsDocuments.map(async (assessor) => {
              assessor.schoolDocument.forEach(eachAssessorSchool => {
                input.push({
                  "Assessor Id": assessor.externalId,
                  "Assessor UserId": assessor.userId,
                  "Parent Id": assessor.parentId,
                  "Assessor Name": assessor.name,
                  "Assessor Email": assessor.email,
                  "Assessor Role": assessor.role,
                  "Program Id": req.params._id,
                  "School Id": eachAssessorSchool.externalId,
                  "School Name": eachAssessorSchool.name
                });
              })
            }))
          }
        }
        input.push(null);
      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }
    });
  }

  /**
 * @api {get} /assessment/api/v1/reports/schoolAssessors/ Fetch school wise assessor reports
 * @apiVersion 0.0.1
 * @apiName Fetch school wise assessor reports
 * @apiGroup Report
 * @apiUse successBody
 * @apiUse errorBody
 */

  async schoolAssessors(req) {
    return new Promise(async (resolve, reject) => {
      try {

        if (!req.params._id) {
          throw "Program ID missing."
        }

        const programQueryParams = {
          externalId: req.params._id
        };
        const programsDocumentIds = await database.models.programs.find(programQueryParams, { externalId: 1 })

        if (!programsDocumentIds.length) {
          return resolve({
            status: 404,
            message: "No programs found for given params."
          });
        }

        const assessorDocument = await database.models.schoolAssessors.find({ programId: programsDocumentIds[0]._id }, { _id: 1 })

        const fileName = `schoolAssessors`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());
        if (!assessorDocument.length) {
          return resolve({
            status: 404,
            message: "No assessor found for given params."
          });
        }
        else {
          let chunkOfAssessorDocument = _.chunk(assessorDocument, 10)
          let assessorId
          let assessorsDocuments


          for (let pointerToAssessorIdDocument = 0; pointerToAssessorIdDocument < chunkOfAssessorDocument.length; pointerToAssessorIdDocument++) {
            assessorId = chunkOfAssessorDocument[pointerToAssessorIdDocument].map(assessorModel => {
              return assessorModel._id
            });

            let assessorQueryObject = [
              {
                $match: {
                  _id: {
                    $in: assessorId
                  }
                }
              }, { "$addFields": { "schoolIdInObjectIdForm": "$schools" } },
              {
                $lookup: {
                  from: "schools",
                  localField: "schoolIdInObjectIdForm",
                  foreignField: "_id",
                  as: "schoolDocument"
                }
              }
            ];

            assessorsDocuments = await database.models.schoolAssessors.aggregate(assessorQueryObject)

            await Promise.all(assessorsDocuments.map(async (assessor) => {
              assessor.schoolDocument.forEach(eachAssessorSchool => {
                input.push({
                  "Assessor School Id": eachAssessorSchool.externalId,
                  "Assessor School Name": eachAssessorSchool.name,
                  "Assessor User Id": assessor.userId,
                  "Assessor Id": assessor.externalId,
                  "Assessor Name": assessor.name,
                  "Assessor Email": assessor.email,
                  "Parent Id": assessor.parentId,
                  "Assessor Role": assessor.role,
                  "Program Id": assessor.programId.toString()
                });
              })
            }))

          }
        }
        input.push(null)
      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }
    });
  }

  /**
* @api {get} /assessment/api/v1/reports/programSchoolsStatus/:programId Fetch school status based on program Id
* @apiVersion 0.0.1
* @apiName Fetch school status based on program Id
* @apiGroup Report
* @apiUse successBody
* @apiUse errorBody
*/

  async programSchoolsStatus(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let result = {};
        req.body = req.body || {};

        let programQueryObject = {
          externalId: req.params._id
        };
        let programDocument = await database.models.programs.findOne(
          programQueryObject
        );

        if (!programDocument) {
          return resolve({
            status: 404,
            message: "No programs found for given params."
          });
        }

        result.id = programDocument._id;
        result.schoolId = [];

        programDocument.components.forEach(document => {
          result.schoolId.push(...document.schools);
        });

        let schoolDocument = database.models.schools.find(
          {
            _id: { $in: result.schoolId }
          }
        ).exec();

        let submissionDataWithEvidencesCount = database.models.submissions.aggregate(
          [
            {
              $match: { programId: result.id }
            },
            {
              $project: {
                schoolId: 1,
                status: 1,
                completedDate: 1,
                createdAt: 1,
                programExternalId: 1,
                submissionCount: {
                  $reduce: {
                    input: "$evidencesStatus",
                    initialValue: 0,
                    in: {
                      $sum: [
                        "$$value",
                        { $cond: [{ $eq: ["$$this.isSubmitted", true] }, 1, 0] }
                      ]
                    }
                  }
                }
              }
            }
          ]
        ).exec();

        const fileName = `programSchoolsStatusByProgramId_${req.params._id}`;

        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        Promise.all([schoolDocument, submissionDataWithEvidencesCount]).then(submissionWithSchoolDocument => {
          let schoolDocument = submissionWithSchoolDocument[0];
          let submissionDataWithEvidencesCount = submissionWithSchoolDocument[1];
          let schoolSubmission = {};
          submissionDataWithEvidencesCount.forEach(submission => {
            schoolSubmission[submission.schoolId.toString()] = {
              status: submission.status,
              completedDate: submission.completedDate
                ? this.gmtToIst(submission.completedDate)
                : "-",
              createdAt: this.gmtToIst(submission.createdAt),
              submissionCount: submission.submissionCount
            };
          });
          if (!schoolDocument.length || !submissionDataWithEvidencesCount.length) {
            return resolve({
              status: 404,
              message: "No data found for given params."
            });
          }
          else {
            schoolDocument.forEach(school => {
              let programSchoolStatusObject = {
                "Program Id": programQueryObject.externalId,
                "School Name": school.name,
                "School Id": school.externalId
              }

              if (schoolSubmission[school._id.toString()]) {
                programSchoolStatusObject["Status"] = schoolSubmission[school._id.toString()].status;
                programSchoolStatusObject["Created At"] = schoolSubmission[school._id.toString()].createdAt;
                programSchoolStatusObject["Completed Date"] = schoolSubmission[school._id.toString()].completedDate
                  ? schoolSubmission[school._id.toString()].completedDate
                  : "-";
                programSchoolStatusObject["Submission Count"] =
                  schoolSubmission[school._id.toString()].status == "started"
                    ? 0
                    : schoolSubmission[school._id.toString()].submissionCount
              }
              else {
                programSchoolStatusObject["Status"] = "pending";
                programSchoolStatusObject["Created At"] = "-";
                programSchoolStatusObject["Completed Date"] = "-";
                programSchoolStatusObject["Submission Count"] = 0;

              }
              input.push(programSchoolStatusObject)
            });
          }
          input.push(null)
        })

      } catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong",
          errorObject: error
        });
      }
    });
  }

  /**
* @api {get} /assessment/api/v1/reports/programsSubmissionStatus/:programId Fetch program submission status
* @apiVersion 0.0.1
* @apiName Fetch program submission status
* @apiGroup Report
* @apiParam {String} evidenceId Evidence ID.
* @apiUse successBody
* @apiUse errorBody
*/

  async programsSubmissionStatus(req) {
    return new Promise(async (resolve, reject) => {

      try {

        const evidenceIdFromRequestParam = req.query.evidenceId;
        const evidenceQueryObject = "evidences." + evidenceIdFromRequestParam + ".isSubmitted";
        const fetchRequiredSubmissionDocumentIdQueryObj = {
          ["programInformation.externalId"]: req.params._id,
          [evidenceQueryObject]: true,
          status: {
            $nin:
              ["started"]
          }
        };

        const submissionDocumentIdsToProcess = await database.models.submissions.find(
          fetchRequiredSubmissionDocumentIdQueryObj,
          { _id: 1 }
        ).lean()

        let questionIdObject = {}
        const questionDocument = await database.models.questions.find({}, { externalId: 1,options:1,question:1 }).lean()

        questionDocument.forEach(eachQuestionId => {
          questionIdObject[eachQuestionId._id] = {
            questionExternalId: eachQuestionId.externalId,
            questionOptions: eachQuestionId.options,
            questionName:eachQuestionId.question
          }
        })

        const fileName = `programsSubmissionStatus_${evidenceIdFromRequestParam}`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (!submissionDocumentIdsToProcess.length) {
          return resolve({
            status: 404,
            message: "No submissions found for given params."
          });
        } else {

          const chunkOfSubmissionIds = _.chunk(submissionDocumentIdsToProcess, 10)

          const pathToSubmissionAnswers = "evidences." + evidenceIdFromRequestParam + ".submissions.answers";
          const pathToSubmissionSubmittedBy = "evidences." + evidenceIdFromRequestParam + ".submissions.submittedBy";
          const pathToSubmissionisValid = "evidences." + evidenceIdFromRequestParam + ".submissions.isValid";

          let submissionIds
          let submissionDocuments

          for (let pointerToSubmissionIdChunkArray = 0; pointerToSubmissionIdChunkArray < chunkOfSubmissionIds.length; pointerToSubmissionIdChunkArray++) {

            submissionIds = chunkOfSubmissionIds[pointerToSubmissionIdChunkArray].map(submissionModel => {
              return submissionModel._id
            });

            submissionDocuments = await database.models.submissions.find(
              {
                _id: {
                  $in: submissionIds
                }
              },
              {
                "assessors.userId": 1,
                "assessors.externalId": 1,
                "schoolInformation.name": 1,
                "schoolInformation.externalId": 1,
                status: 1,
                [pathToSubmissionAnswers]: 1,
                [pathToSubmissionSubmittedBy]: 1,
                [pathToSubmissionisValid]: 1
              }
            ).lean()


            await Promise.all(submissionDocuments.map(async (submission) => {

              let assessors = {}

              submission.assessors.forEach(assessor => {
                assessors[assessor.userId] = {
                  externalId: assessor.externalId
                };
              });

              submission.evidences[evidenceIdFromRequestParam].submissions.forEach(evidenceSubmission => {
                  
                let asssessorId = (assessors[evidenceSubmission.submittedBy.toString()]) ? assessors[evidenceSubmission.submittedBy.toString()].externalId : (evidenceSubmission.submittedByName ? evidenceSubmission.submittedByName.replace(' null', '') : null);
                
                if ((evidenceSubmission.isValid === true)){
                  Object.values(evidenceSubmission.answers).forEach(singleAnswer => {
                      if(singleAnswer.value !== "NA"){
                        let singleAnswerRecord = {
                        "School Name": submission.schoolInformation.name,
                        "School Id": submission.schoolInformation.externalId,
                        "Question":  (questionIdObject[singleAnswer.qid]) ? questionIdObject[singleAnswer.qid].questionName[0] : "",
                        "Question Id": (questionIdObject[singleAnswer.qid]) ? questionIdObject[singleAnswer.qid].questionExternalId : "",
                        "Answer": singleAnswer.notApplicable ? "Not Applicable" : "",
                        "Assessor Id": asssessorId,
                        "Remarks": singleAnswer.remarks || "",
                        "Start Time": this.gmtToIst(singleAnswer.startTime),
                        "End Time": this.gmtToIst(singleAnswer.endTime),
                        "Files": "",
                        "Submission Date": this.gmtToIst(evidenceSubmission.submissionDate)
                        }

                        if (singleAnswer.fileName && singleAnswer.fileName.length > 0) {
                        singleAnswer.fileName.forEach(file => {
                          singleAnswerRecord.Files +=
                            imageBaseUrl + file.sourcePath + ",";
                        });
                        singleAnswerRecord.Files = singleAnswerRecord.Files.replace(
                          /,\s*$/,
                          ""
                        );
                        }

                        if (!singleAnswer.notApplicable) {

                          if (singleAnswer.responseType != "matrix") {

                            let radioResponse = {};
                            let multiSelectResponse = {};
                            let multiSelectResponseArray = [];

                            if (
                              singleAnswer.responseType == "radio"
                            ) {
                              questionIdObject[singleAnswer.qid].questionOptions.forEach(
                                option => {

                                  radioResponse[option.value] = option.label;
                                }
                              );
                              singleAnswerRecord.Answer =
                              radioResponse[singleAnswer.value];
                          }
                            else if (singleAnswer.responseType == "multiselect") {

                              questionIdObject[singleAnswer.qid].questionOptions.forEach(
                                option => {
                                  multiSelectResponse[option.value] =
                                    option.label;
                                }
                              );

                              if (typeof singleAnswer.value == "object" || typeof singleAnswer.value == "array") {
                                if (singleAnswer.value) {
                                singleAnswer.value.forEach(value => {
                                  multiSelectResponseArray.push(
                                    multiSelectResponse[value]
                                  );
                                });
                              }
                            }
                              singleAnswerRecord.Answer = multiSelectResponseArray.toString();
                          } else {
                              singleAnswerRecord.Answer = singleAnswer.value;
                          }
                            input.push(singleAnswerRecord)
                        } else {

                          singleAnswerRecord.Answer = "Instance Question";
                          input.push(singleAnswerRecord)

                          if (singleAnswer.value.length) {
                            for (
                              let instance = 0;
                              instance < singleAnswer.value.length;
                              instance++
                            ) {

                              Object.values(singleAnswer.value[instance]).forEach(
                                eachInstanceChildQuestion => {
                                  let eachInstanceChildRecord = {
                                    "School Name": submission.schoolInformation.name,
                                    "School Id": submission.schoolInformation.externalId,
                                    "Question": (questionIdObject[eachInstanceChildQuestion.qid]) ? questionIdObject[eachInstanceChildQuestion.qid].questionName[0] : "",
                                    "Question Id": (questionIdObject[eachInstanceChildQuestion.qid]) ? questionIdObject[eachInstanceChildQuestion.qid].questionExternalId : "",
                                    "Submission Date": this.gmtToIst(evidenceSubmission.submissionDate),
                                    "Answer": "",
                                    "Assessor Id": asssessorId,
                                    "Remarks": eachInstanceChildQuestion.remarks || "",
                                    "Start Time": this.gmtToIst(eachInstanceChildQuestion.startTime),
                                    "End Time": this.gmtToIst(eachInstanceChildQuestion.endTime),
                                    "Files": ""
                                  };

                                  if (eachInstanceChildQuestion.fileName && eachInstanceChildQuestion.fileName.length > 0) {
                                    eachInstanceChildQuestion.fileName.forEach(
                                      file => {
                                        if (file.sourcePath.split('/').length == 1) {
                                          file.sourcePath = submission._id.toString() + "/" + evidenceSubmission.submittedBy + "/" + file.name
                                        }
                                        eachInstanceChildRecord.Files +=
                                          imageBaseUrl + file.sourcePath + ",";
                                      }
                                    );
                                    eachInstanceChildRecord.Files = eachInstanceChildRecord.Files.replace(
                                      /,\s*$/,
                                      ""
                                    );
                                  }

                                  let radioResponse = {};
                                  let multiSelectResponse = {};
                                  let multiSelectResponseArray = [];

                                  if (
                                    eachInstanceChildQuestion.responseType == "radio"
                                  ) {
                                    (questionIdObject[eachInstanceChildQuestion.qid]).questionOptions.forEach(
                                      option => {
                                        radioResponse[option.value] = option.label;
                                      }
                                    );
                                    eachInstanceChildRecord.Answer =
                                      radioResponse[eachInstanceChildQuestion.value];
                                  } else if (
                                    eachInstanceChildQuestion.responseType ==
                                    "multiselect"
                                  ) {
                                    (questionIdObject[eachInstanceChildQuestion.qid]).questionOptions.forEach(
                                      option => {
                                        multiSelectResponse[option.value] =
                                          option.label;
                                      }
                                    );

                                    if (typeof eachInstanceChildQuestion.value == "object" || typeof eachInstanceChildQuestion.value == "array") {

                                      if (eachInstanceChildQuestion.value) {
                                        eachInstanceChildQuestion.value.forEach(value => {
                                          multiSelectResponseArray.push(
                                            multiSelectResponse[value]
                                          );
                                        });
                                      }

                                      eachInstanceChildRecord.Answer = multiSelectResponseArray.toString();
                                    } else {
                                      eachInstanceChildRecord.Answer = eachInstanceChildQuestion.value
                                    }

                                  }
                                  else {
                                    eachInstanceChildRecord.Answer = eachInstanceChildQuestion.value;
                                  }

                                  input.push(eachInstanceChildRecord)
                                }
                              );
                            }
                          }
                        }

                      }
                      input.push(singleAnswerRecord);
                    } 
                  })
                }

              });
            }));
          }

        }
        input.push(null)


      } catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }

    });
  }

  /**
* @api {get} /assessment/api/v1/reports/generateCriteriasBySchoolId/:schoolExternalId Fetch criterias based on schoolId
* @apiVersion 0.0.1
* @apiName Fetch criterias based on schoolId
* @apiGroup Report
* @apiUse successBody
* @apiUse errorBody
*/

  async generateCriteriasBySchoolId(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let schoolId = {
          ["schoolInformation.externalId"]: req.params._id
        };

        let submissionDocument = database.models.submissions.find(
          schoolId,
          {
            criterias: 1
          }
        ).exec();

        let evaluationFrameworksDocuments = database.models[
          "evaluationFrameworks"
        ].find({}, { themes: 1 }).exec();

        const fileName = `generateCriteriasBySchoolId_schoolId_${req.params._id}`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        Promise.all([submissionDocument, evaluationFrameworksDocuments]).then(submissionAndEvaluationFrameworksDocuments => {
          let submissionDocument = submissionAndEvaluationFrameworksDocuments[0];
          let evaluationFrameworksDocuments = submissionAndEvaluationFrameworksDocuments[1];

          let evaluationNameObject = {};
          evaluationFrameworksDocuments.forEach(singleDocument => {
            singleDocument.themes.forEach(singleTheme => {
              singleTheme.children && singleTheme.children.forEach(subThemes => {
                subThemes.children && subThemes.children.forEach(singleSubTheme => {
                  singleSubTheme.criteria.forEach(singleCriteria => {
                    evaluationNameObject[singleCriteria.toString()] = {
                      themeName: singleTheme.name,
                      aoiName: subThemes.name,
                      indicatorName: singleSubTheme.name
                    };
                  });
                })
              })
            });
          });

          if (!submissionDocument && !submissionDocument[0].criterias.length) {
            return resolve({
              status: 404,
              message: "No submissions found for given params."
            });
          }
          else {
            submissionDocument[0].criterias.forEach(submissionCriterias => {
              let levels = Object.values(submissionCriterias.rubric.levels);

              if (submissionCriterias._id) {
                let criteriaReportObject = {
                  "Theme Name": evaluationNameObject[submissionCriterias._id]
                    ? evaluationNameObject[submissionCriterias._id].themeName
                    : "",
                  "AoI Name": evaluationNameObject[submissionCriterias._id]
                    ? evaluationNameObject[submissionCriterias._id].aoiName
                    : "",
                  "Level 1": levels.find(level => level.level == "L1").description,
                  "Level 2": levels.find(level => level.level == "L2").description,
                  "Level 3": levels.find(level => level.level == "L3").description,
                  "Level 4": levels.find(level => level.level == "L4").description,
                  "Score": submissionCriterias.score
                    ? submissionCriterias.score
                    : "NA"
                };
                input.push(criteriaReportObject);
              }
            });
          }
          input.push(null)
        })


      } catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }
    });
  }

  /**
* @api {get} /assessment/api/v1/reports/generateSubmissionReportsBySchoolId/:schoolExternalId Fetch school submission status
* @apiVersion 0.0.1
* @apiName Fetch school submission status
* @apiGroup Report
* @apiUse successBody
* @apiUse errorBody
*/

  async generateSubmissionReportsBySchoolId(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let schoolSubmissionQuery = {
          ["schoolExternalId"]: req.params._id
        };

        let submissionForEvaluationFrameworkId = await database.models.submissions.findOne(
          schoolSubmissionQuery,
          {
            evaluationFrameworkId: 1
          }
        ).lean();

        let evaluationFrameworkThemes = await database.models.evaluationFrameworks.findOne({ _id: submissionForEvaluationFrameworkId.evaluationFrameworkId }, { themes: 1 }).lean();

        let criteriaIdsByFramework = gen.utils.getCriteriaIds(evaluationFrameworkThemes.themes);

        let allCriterias = database.models.criterias.find(
          { _id: { $in: criteriaIdsByFramework } },
          { evidences: 1, name: 1 }
        ).lean().exec();

        let schoolSubmissionDocument = database.models.submissions.find(
          schoolSubmissionQuery,
          {
            answers: 1,
            criterias: 1
          }
        ).lean().exec();

        const fileName = `generateSubmissionReportsBySchoolId_${req.params._id}`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        Promise.all([allCriterias, schoolSubmissionDocument]).then(async (documents) => {

          let allCriterias = documents[0];
          let schoolSubmissionDocument = documents[1];
          let criteriaQuestionDetailsObject = {};
          let criteriaScoreObject = {};
          let questionOptionObject = {};

          allCriterias.forEach(eachCriteria => {
            eachCriteria.evidences.forEach(eachEvidence => {
              eachEvidence.sections.forEach(eachSection => {
                eachSection.questions.forEach(eachquestion => {
                  criteriaQuestionDetailsObject[eachquestion.toString()] = {
                    criteriaId: eachCriteria._id,
                    criteriaName: eachCriteria.name,
                    questionId: eachquestion.toString()
                  };
                });
              });
            });
          });

          let questionIds = Object.values(criteriaQuestionDetailsObject).map(criteria => criteria.questionId);

          let allQuestionWithOptions = await database.models.questions.find(
            { _id: { $in: questionIds }},
            { options: 1,question:1 }
          ).lean();

          allQuestionWithOptions.forEach(question => {
            if (question.options.length > 0) {
              let optionString = "";
              question.options.forEach(option => {
                optionString += option.label + ",";
              });
              optionString = optionString.replace(/,\s*$/, "");

              questionOptionObject[question._id.toString()] = {
                questionOptions:question.options,
                questionOptionString:optionString,
                questionName:question.question
              };
            }
          });

          schoolSubmissionDocument.forEach(singleSchoolSubmission => {
            singleSchoolSubmission.criterias.forEach(singleCriteria => {
              criteriaScoreObject[singleCriteria._id.toString()] = {
                id: singleCriteria._id,
                score: singleCriteria.score
              };
            });
            if (!Object.values(singleSchoolSubmission.answers).length) {
              return resolve({
                status: 404,
                message: "No submissions found for given params."
              });
            }
            else {
             Object.values(singleSchoolSubmission.answers).forEach(
                singleAnswer => {
                  if (criteriaScoreObject[singleAnswer.criteriaId]) {
                    let singleAnswerRecord = {
                      "Criteria Name":
                        criteriaQuestionDetailsObject[singleAnswer.qid] == undefined
                          ? " Question Deleted Post Submission"
                          : criteriaQuestionDetailsObject[singleAnswer.qid]
                            .criteriaName,
                      "Question":questionOptionObject[singleAnswer.qid]?questionOptionObject[singleAnswer.qid].questionName[0]:"",
                      "Answer": singleAnswer.notApplicable ? "Not Applicable" : "",
                      "Options":
                        questionOptionObject[singleAnswer.qid] == undefined
                          ? " No Options"
                          : questionOptionObject[singleAnswer.qid].questionOptionString,
                      "Score": criteriaScoreObject[singleAnswer.criteriaId]?criteriaScoreObject[singleAnswer.criteriaId].score:"",
                      "Remarks": singleAnswer.remarks || "",
                      "Files": "",
                    };

                    if (singleAnswer.fileName && singleAnswer.fileName.length > 0) {
                      singleAnswer.fileName.forEach(file => {
                        singleAnswerRecord.Files +=
                          imageBaseUrl + file.sourcePath + ",";
                      });
                      singleAnswerRecord.Files = singleAnswerRecord.Files.replace(
                        /,\s*$/,
                        ""
                      );
                    }

                    if (!singleAnswer.notApplicable) {
                      if (singleAnswer.responseType != "matrix") {
                        let radioResponse = {};
                        let multiSelectResponse = {};
                        let multiSelectResponseArray = [];

                        if (
                          singleAnswer.responseType == "radio"
                        ) {
                          questionOptionObject[singleAnswer.qid].questionOptions.forEach(
                            option => {

                              radioResponse[option.value] = option.label;
                            }
                          );
                          singleAnswerRecord.Answer =
                            radioResponse[singleAnswer.value]?radioResponse[singleAnswer.value]:"NA";
                        }
                        else if (singleAnswer.responseType == "multiselect") {

                          questionOptionObject[singleAnswer.qid].questionOptions.forEach(
                            option => {
                              multiSelectResponse[option.value] =
                                option.label;
                            }
                          );
                          if (typeof singleAnswer.value == "object" || typeof singleAnswer.value == "array") {
                            if (singleAnswer.value) {
                              singleAnswer.value.forEach(value => {
                                multiSelectResponseArray.push(
                                  multiSelectResponse[value]
                              );
                            });
                          }
                        }
                          singleAnswerRecord.Answer = multiSelectResponseArray.toString();
                        } else {
                          singleAnswerRecord.Answer = singleAnswer.value
                        }
                        input.push(singleAnswerRecord)

                      } else {
                        singleAnswerRecord["Answer"] = "Instance Question";

                        if (singleAnswer.value.length) {
                          
                          for (let instance = 0;instance < singleAnswer.value.length;instance++) {

                            Object.values(singleAnswer.value[instance]).forEach(
                              eachInstanceChildQuestion => {
                                let eachInstanceChildRecord = {
                                  "Criteria Name":criteriaQuestionDetailsObject[eachInstanceChildQuestion._id] == undefined
                                      ? " Question Deleted Post Submission"
                                      : criteriaQuestionDetailsObject[
                                        eachInstanceChildQuestion._id
                                      ].criteriaName,
                                  "Question":questionOptionObject[eachInstanceChildQuestion.qid]?questionOptionObject[eachInstanceChildQuestion.qid].questionName[0]:"",
                                  "Answer": eachInstanceChildQuestion.value,
                                  "Options":questionOptionObject[eachInstanceChildQuestion.qid] == undefined
                                      ? " No Options"
                                      : questionOptionObject[eachInstanceChildQuestion.qid].questionOptionString,
                                  "Score":criteriaScoreObject[eachInstanceChildQuestion.criteriaId]?criteriaScoreObject[eachInstanceChildQuestion.criteriaId].score:"",
                                  "Remarks": eachInstanceChildQuestion.remarks || "",
                                  "Files": "",
                                };

                                if (eachInstanceChildQuestion.fileName && eachInstanceChildQuestion.fileName.length > 0) {
                                  eachInstanceChildQuestion.fileName.forEach(
                                    file => {
                                      eachInstanceChildRecord["Files"] +=
                                        imageBaseUrl + file + ",";
                                    }
                                  );
                                  eachInstanceChildRecord["Files"] = eachInstanceChildRecord["Files"].replace(
                                    /,\s*$/,
                                    ""
                                  );
                                }

                                let radioResponse = {};
                                let multiSelectResponse = {};
                                let multiSelectResponseArray = [];

                                if (eachInstanceChildQuestion.responseType == "radio") {

                                  questionOptionObject[eachInstanceChildQuestion.qid].questionOptions.forEach(
                                    option => {
                                      radioResponse[option.value] = option.label;
                                    }
                                  );
                                  eachInstanceChildRecord["Answer"] =
                                    radioResponse[eachInstanceChildQuestion.value]?radioResponse[eachInstanceChildQuestion.value]:"NA";
                                } else if (eachInstanceChildQuestion.responseType == "multiselect") {
                                  
                                  questionOptionObject[eachInstanceChildQuestion.qid].questionOptions.forEach(
                                    option => {
                                      multiSelectResponse[option.value] =
                                        option.label;
                                    }
                                  );

                                  if(eachInstanceChildQuestion.value != "" &&  eachInstanceChildQuestion.value != "NA") {
                                    eachInstanceChildQuestion.value.forEach(value => {
                                      multiSelectResponseArray.push(
                                        multiSelectResponse[value]
                                      );
                                    });
                                    eachInstanceChildRecord["Answer"] = multiSelectResponseArray.toString();
                                  } else {
                                    eachInstanceChildRecord["Answer"] = "No value given";
                                  }

                                }

                                input.push(eachInstanceChildRecord);
                                
                              }

                            );
                          }
                        }
                      }
                    }
                    input.push(singleAnswerRecord);
                  }
                }
              );
            }
            input.push(null)
          });

        })

      } catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }
    });
  }

  /**
  * @api {get} /assessment/api/v1/reports/parentRegistry/:programId Fetch Parent Registry
  * @apiVersion 0.0.1
  * @apiName Fetch Parent Registry
  * @apiGroup Report
  * @apiParam {String} fromDate From Date
  * @apiParam {String} toDate To Date
  * @apiUse successBody
  * @apiUse errorBody
  */

  async parentRegistry(req) {
    return new Promise(async (resolve, reject) => {
      try {

        const programQueryParams = {
          externalId: req.params._id
        };

        let programsDocumentIds = await database.models.programs.find(programQueryParams, { externalId: 1 })

        if (!programsDocumentIds.length) {
          return resolve({
            status: 404,
            message: "No parent registry found for given parameters."
          });
        }

        let fromDateValue = req.query.fromDate ? new Date(req.query.fromDate.split("-").reverse().join("-")) : new Date(0)
        let toDate = req.query.toDate ? new Date(req.query.toDate.split("-").reverse().join("-")) : new Date()
        toDate.setHours(23, 59, 59)

        if (fromDateValue > toDate) {
          return resolve({
            status: 400,
            message: "From Date cannot be greater than to date !!!"
          })
        }

        let parentRegistryQueryParams = {}

        parentRegistryQueryParams["programId"] = programsDocumentIds[0]._id;
        parentRegistryQueryParams['createdAt'] = {}
        parentRegistryQueryParams['createdAt']["$gte"] = fromDateValue
        parentRegistryQueryParams['createdAt']["$lte"] = toDate

        const parentRegistryIdsArray = await database.models.parentRegistry.find(parentRegistryQueryParams, { _id: 1 })

        let fileName = "parentRegistry";
        (fromDateValue != "") ? fileName += " from " + fromDateValue : "";
        (toDate != "") ? fileName += " to " + toDate : "";

        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (!parentRegistryIdsArray.length) {
          return resolve({
            status: 404,
            message: "No submissions found for given params."
          });
        }

        else {

          let chunkOfParentRegistryDocument = _.chunk(parentRegistryIdsArray, 10)
          let parentRegistryId
          let parentRegistryDocuments


          for (let pointerToParentRegistryIdArray = 0; pointerToParentRegistryIdArray < chunkOfParentRegistryDocument.length; pointerToParentRegistryIdArray++) {
            parentRegistryId = chunkOfParentRegistryDocument[pointerToParentRegistryIdArray].map(parentRegistryModel => {
              return parentRegistryModel._id
            });

            let parentRegistryQueryObject = [
              {
                $match: {
                  _id: {
                    $in: parentRegistryId
                  }
                }
              },
              { "$addFields": { "schoolId": { "$toObjectId": "$schoolId" } } },
              {
                $lookup: {
                  from: "schools",
                  localField: "schoolId",
                  foreignField: "_id",
                  as: "schoolDocument"
                }
              },
              {
                $unwind: '$schoolDocument'
              },
              { "$addFields": { "schoolId": "$schoolDocument.externalId" } },
              {
                $project: {
                  "schoolDocument": 0
                }
              }
            ];

            parentRegistryDocuments = await database.models.parentRegistry.aggregate(parentRegistryQueryObject);

            await Promise.all(parentRegistryDocuments.map(async (parentRegistry) => {
              let parentRegistryObject = {};
              Object.keys(parentRegistry).forEach(singleKey => {
                if (["deleted", "_id", "__v", "schoolId", "programId"].indexOf(singleKey) == -1) {
                  parentRegistryObject[gen.utils.camelCaseToTitleCase(singleKey)] = parentRegistry[singleKey];
                }
              })

              parentRegistryObject['Program External Id'] = programQueryParams.externalId;
              parentRegistryObject['School External Id'] = parentRegistry.schoolId;
              (parentRegistry.createdAt) ? parentRegistryObject['Created At'] = this.gmtToIst(parentRegistry.createdAt) : parentRegistryObject['Created At'] = "";
              (parentRegistry.updatedAt) ? parentRegistryObject['Updated At'] = this.gmtToIst(parentRegistry.updatedAt) : parentRegistryObject['Updated At'] = "";
              input.push(parentRegistryObject);
            }))
          }
        }

        input.push(null);
      } catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }
    });
  }

  /**
 * @api {get} /assessment/api/v1/reports/teacherRegistry/:programId Fetch Teacher Registry
 * @apiVersion 0.0.1
 * @apiName Fetch Teacher Registry
 * @apiGroup Report
 * @apiParam {String} fromDate From Date
 * @apiParam {String} toDate To Date
 * @apiUse successBody
 * @apiUse errorBody
 */

  async teacherRegistry(req) {
    return (new Promise(async (resolve, reject) => {
      try {
        const programsQueryParams = {
          externalId: req.params._id
        }
        const programsDocument = await database.models.programs.find(programsQueryParams, {
          externalId: 1
        })

        let fromDateValue = req.query.fromDate ? new Date(req.query.fromDate.split("-").reverse().join("-")) : new Date(0)
        let toDate = req.query.toDate ? new Date(req.query.toDate.split("-").reverse().join("-")) : new Date()
        toDate.setHours(23, 59, 59)

        if (fromDateValue > toDate) {
          return resolve({
            status: 400,
            message: "From Date cannot be greater than to date !!!"
          })
        }

        let teacherRegistryQueryParams = {}

        teacherRegistryQueryParams['programId'] = programsDocument[0]._id

        teacherRegistryQueryParams['createdAt'] = {}
        teacherRegistryQueryParams['createdAt']["$gte"] = fromDateValue
        teacherRegistryQueryParams['createdAt']["$lte"] = toDate

        const teacherRegistryDocument = await database.models.teacherRegistry.find(teacherRegistryQueryParams, { _id: 1 })

        let fileName = "Teacher Registry";
        (fromDateValue) ? fileName += "from" + fromDateValue : "";
        (toDate) ? fileName += "to" + toDate : "";

        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (!teacherRegistryDocument.length) {
          return resolve({
            status: 404,
            message: "No submissions found for given params."
          });
        }

        else {
          let teacherChunkData = _.chunk(teacherRegistryDocument, 10)
          let teacherRegistryIds
          let teacherRegistryData

          for (let pointerToTeacherRegistry = 0; pointerToTeacherRegistry < teacherChunkData.length; pointerToTeacherRegistry++) {
            teacherRegistryIds = teacherChunkData[pointerToTeacherRegistry].map(teacherRegistryId => {
              return teacherRegistryId._id
            })

            let teacherRegistryParams = [
              {
                $match: {
                  _id: {
                    $in: teacherRegistryIds
                  }
                }
              },
              { "$addFields": { "schoolId": { "$toObjectId": "$schoolId" } } },
              {
                $lookup: {
                  from: "schools",
                  localField: "schoolId",
                  foreignField: "_id",
                  as: "schoolDocument"
                }
              },
              {
                $unwind: '$schoolDocument'
              },
              { "$addFields": { "schoolId": "$schoolDocument.externalId" } },
              {
                $project: {
                  "schoolDocument": 0
                }
              }
            ];


            teacherRegistryData = await database.models.teacherRegistry.aggregate(teacherRegistryParams)

            await Promise.all(teacherRegistryData.map(async (teacherRegistry) => {

              let teacherRegistryObject = {};
              Object.keys(teacherRegistry).forEach(singleKey => {
                if (["deleted", "_id", "__v", "schoolId", "programId"].indexOf(singleKey) == -1) {
                  teacherRegistryObject[gen.utils.camelCaseToTitleCase(singleKey)] = teacherRegistry[singleKey];
                }
              })
              teacherRegistryObject['Program External Id'] = programsQueryParams.externalId;
              teacherRegistryObject['School External Id'] = teacherRegistry.schoolId;
              (teacherRegistry.createdAt) ? teacherRegistryObject['Created At'] = this.gmtToIst(teacherRegistry.createdAt) : teacherRegistryObject['Created At'] = "";
              (teacherRegistry.updatedAt) ? teacherRegistryObject['Updated At'] = this.gmtToIst(teacherRegistry.updatedAt) : teacherRegistryObject['Updated At'] = "";
              input.push(teacherRegistryObject);
            }))
          }
        }
        input.push(null);
      }
      catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }
    }))
  }

  /**
* @api {get} /assessment/api/v1/reports/schoolLeaderRegistry/:programId Fetch School Leader Information
* @apiVersion 0.0.1
* @apiName Fetch School Leader Registry Information
* @apiGroup Report
* @apiParam {String} fromDate From Date
* @apiParam {String} toDate To Date
* @apiUse successBody
* @apiUse errorBody
*/

  async schoolLeaderRegistry(req) {
    return (new Promise(async (resolve, reject) => {
      try {
        const programsQueryParams = {
          externalId: req.params._id
        }
        const programsDocument = await database.models.programs.find(programsQueryParams, {
          externalId: 1
        })

        let fromDateValue = req.query.fromDate ? new Date(req.query.fromDate.split("-").reverse().join("-")) : new Date(0)
        let toDate = req.query.toDate ? new Date(req.query.toDate.split("-").reverse().join("-")) : new Date()
        toDate.setHours(23, 59, 59)

        if (fromDateValue > toDate) {
          return resolve({
            status: 400,
            message: "From Date cannot be greater than to date !!!"
          })
        }

        let schoolLeaderRegistryQueryParams = {}

        schoolLeaderRegistryQueryParams['programId'] = programsDocument[0]._id

        schoolLeaderRegistryQueryParams['createdAt'] = {}
        schoolLeaderRegistryQueryParams['createdAt']["$gte"] = fromDateValue
        schoolLeaderRegistryQueryParams['createdAt']["$lte"] = toDate

        const schoolLeaderRegistryDocument = await database.models.schoolLeaderRegistry.find(schoolLeaderRegistryQueryParams, { _id: 1 })

        let fileName = "School Leader Registry";
        (fromDateValue) ? fileName += "from" + fromDateValue : "";
        (toDate) ? fileName += "to" + toDate : "";

        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (!schoolLeaderRegistryDocument.length) {
          return resolve({
            status: 404,
            message: "No submissions found for given params."
          });
        }

        else {
          let schoolLeaderChunkData = _.chunk(schoolLeaderRegistryDocument, 10)
          let schoolLeaderRegistryIds
          let schoolLeaderRegistryData

          for (let pointerToSchoolLeaderRegistry = 0; pointerToSchoolLeaderRegistry < schoolLeaderChunkData.length; pointerToSchoolLeaderRegistry++) {
            schoolLeaderRegistryIds = schoolLeaderChunkData[pointerToSchoolLeaderRegistry].map(schoolLeaderRegistryId => {
              return schoolLeaderRegistryId._id
            })

            let schoolLeaderRegistryParams = [
              {
                $match: {
                  _id: {
                    $in: schoolLeaderRegistryIds
                  }
                }
              },
              { "$addFields": { "schoolId": { "$toObjectId": "$schoolId" } } },
              {
                $lookup: {
                  from: "schools",
                  localField: "schoolId",
                  foreignField: "_id",
                  as: "schoolDocument"
                }
              },
              {
                $unwind: '$schoolDocument'
              },
              { "$addFields": { "schoolId": "$schoolDocument.externalId" } },
              {
                $project: {
                  "schoolDocument": 0
                }
              }
            ];


            schoolLeaderRegistryData = await database.models.schoolLeaderRegistry.aggregate(schoolLeaderRegistryParams)

            await Promise.all(schoolLeaderRegistryData.map(async (schoolLeaderRegistry) => {

              let schoolLeaderRegistryObject = {};
              Object.keys(schoolLeaderRegistry).forEach(singleKey => {
                if (["deleted", "_id", "__v", "schoolId", "programId"].indexOf(singleKey) == -1) {
                  schoolLeaderRegistryObject[gen.utils.camelCaseToTitleCase(singleKey)] = schoolLeaderRegistry[singleKey];
                }
              })
              schoolLeaderRegistryObject['Program External Id'] = programsQueryParams.externalId;
              schoolLeaderRegistryObject['School External Id'] = schoolLeaderRegistry.schoolId;
              (schoolLeaderRegistry.createdAt) ? schoolLeaderRegistryObject['Created At'] = this.gmtToIst(schoolLeaderRegistry.createdAt) : schoolLeaderRegistryObject['Created At'] = "";
              (schoolLeaderRegistry.updatedAt) ? schoolLeaderRegistryObject['Updated At'] = this.gmtToIst(schoolLeaderRegistry.updatedAt) : schoolLeaderRegistryObject['Updated At'] = "";
              input.push(schoolLeaderRegistryObject);
            }))
          }
        }
        input.push(null);
      }
      catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }
    }))
  }

  /**
  * @api {get} /assessment/api/v1/reports/schoolProfileInformation/:programId Fetch School Profile Information
  * @apiVersion 0.0.1
  * @apiName Fetch School Profile Information
  * @apiGroup Report
  * @apiUse successBody
  * @apiUse errorBody
  */

  async schoolProfileInformation(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let queryParams = {
          programExternalId: req.params._id
        };

        const submissionIds = await database.models.submissions.find(queryParams, {
          _id: 1
        })

        const programsDocument = await database.models.programs.findOne({
          externalId: req.params._id
        }, { "components.schoolProfileFieldsPerSchoolTypes": 1 })

        let schoolProfileFields = await this.getSchoolProfileFields(programsDocument.components[0].schoolProfileFieldsPerSchoolTypes);

        const fileName = `schoolProfileInformation`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (!submissionIds.length) {
          return resolve({
            status: 404,
            message: "No submissions found for given params."
          });
        }

        else {
          let chunkOfSubmissionIds = _.chunk(submissionIds, 10)
          let submissionIdArray
          let schoolProfileSubmissionDocuments

          for (let pointerToSchoolProfileSubmissionArray = 0; pointerToSchoolProfileSubmissionArray < chunkOfSubmissionIds.length; pointerToSchoolProfileSubmissionArray++) {
            submissionIdArray = chunkOfSubmissionIds[pointerToSchoolProfileSubmissionArray].map(eachSubmissionId => {
              return eachSubmissionId._id
            })

            schoolProfileSubmissionDocuments = await database.models.submissions.find(
              {
                _id: {
                  $in: submissionIdArray
                }
              }, {
                "schoolProfile": 1,
                "_id": 1,
                "programExternalId": 1,
                "schoolExternalId": 1
              })

            await Promise.all(schoolProfileSubmissionDocuments.map(async (eachSchoolProfileSubmissionDocument) => {

              let schoolProfile = _.omit(eachSchoolProfileSubmissionDocument.schoolProfile, ["deleted", "_id", "_v", "createdAt", "updatedAt"]);
              if (schoolProfile) {
                let schoolProfileObject = {};
                schoolProfileObject['School External Id'] = eachSchoolProfileSubmissionDocument.schoolExternalId;
                schoolProfileObject['Program External Id'] = eachSchoolProfileSubmissionDocument.programExternalId;

                schoolProfileFields.forEach(eachSchoolField => {
                  schoolProfileObject[gen.utils.camelCaseToTitleCase(eachSchoolField)] = schoolProfile[eachSchoolField] ? schoolProfile[eachSchoolField] : ""
                })
                input.push(schoolProfileObject);
              }
            }))
          }
        }
        input.push(null);
      } catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }
    });
  }

  /**
 * @api {get} /assessment/api/v1/reports/generateEcmReportByDate/:programId Generate all ecm report by date
 * @apiVersion 0.0.1
 * @apiName Generate all ecm report by date
 * @apiGroup Report
 * @apiParam {String} fromDate From Date
 * @apiParam {String} toDate To Date
 * @apiUse successBody
 * @apiUse errorBody
 */

  async generateEcmReportByDate(req) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!req.query.fromDate) {
          return resolve({
            status: 404,
            message: "From date is a mandatory field."
          });
        }

        let fromDate = new Date(req.query.fromDate.split("-").reverse().join("-"))
        let toDate = req.query.toDate ? new Date(req.query.toDate.split("-").reverse().join("-")) : new Date()
        toDate.setHours(23, 59, 59)

        if (fromDate > toDate) {
          return resolve({
            status: 400,
            message: "From date cannot be greater than to date."
          });
        }

        let fetchRequiredSubmissionDocumentIdQueryObj = {};
        fetchRequiredSubmissionDocumentIdQueryObj["programExternalId"] = req.params._id
        fetchRequiredSubmissionDocumentIdQueryObj["evidencesStatus.submissions.submissionDate"] = {}
        fetchRequiredSubmissionDocumentIdQueryObj["evidencesStatus.submissions.submissionDate"]["$gte"] = fromDate
        fetchRequiredSubmissionDocumentIdQueryObj["evidencesStatus.submissions.submissionDate"]["$lte"] = toDate

        fetchRequiredSubmissionDocumentIdQueryObj["status"] = {
          $nin:
            ["started"]
        }

        const submissionDocumentIdsToProcess = await database.models.submissions.find(
          fetchRequiredSubmissionDocumentIdQueryObj,
          { _id: 1 }
        ).lean();

        let questionIdObject = {}
        const questionDocument = await database.models.questions.find({}, { externalId: 1, options: 1,question:1 }).lean();

        questionDocument.forEach(eachQuestionId => {
          questionIdObject[eachQuestionId._id] = {
            questionExternalId: eachQuestionId.externalId,
            questionOptions: eachQuestionId.options,
            questionName:eachQuestionId.question
          }
        })

        let fileName = `EcmReport`;
        (fromDate) ? fileName += moment(fromDate).format('DD-MM-YYYY') : "";
        (toDate) ? fileName += "-" + moment(toDate).format('DD-MM-YYYY') : moment(fromDate).format('DD-MM-YYYY');

        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (!submissionDocumentIdsToProcess.length) {
          return resolve({
            status: 404,
            message: "No submissions found for given params."
          });
        } else {

          const chunkOfSubmissionIds = _.chunk(submissionDocumentIdsToProcess, 100)

          let submissionIds
          let submissionDocuments

          for (let pointerToSubmissionIdChunkArray = 0; pointerToSubmissionIdChunkArray < chunkOfSubmissionIds.length; pointerToSubmissionIdChunkArray++) {

            submissionIds = chunkOfSubmissionIds[pointerToSubmissionIdChunkArray].map(submissionModel => {
              return submissionModel._id
            });

            submissionDocuments = await database.models.submissions.find(
              {
                _id: {
                  $in: submissionIds
                },
              },
              {
                "assessors.userId": 1,
                "assessors.externalId": 1,
                "schoolInformation.name": 1,
                "schoolInformation.externalId": 1,
                "evidences": 1,
                status: 1,
              }
            ).lean()


            await Promise.all(submissionDocuments.map(async (submission) => {

              let assessors = {}

              submission.assessors.forEach(assessor => {
                assessors[assessor.userId] = {
                  externalId: assessor.externalId
                };
              });

              Object.values(submission.evidences).forEach(singleEvidence => {
                if (singleEvidence.submissions) {
                  singleEvidence.submissions && singleEvidence.submissions.forEach(evidenceSubmission => {

                    let asssessorId = (assessors[evidenceSubmission.submittedBy.toString()]) ? assessors[evidenceSubmission.submittedBy.toString()].externalId : (evidenceSubmission.submittedByName ? evidenceSubmission.submittedByName.replace(' null', '') : null);
 
                    if ((evidenceSubmission.isValid === true) && (evidenceSubmission.submissionDate >= fromDate && evidenceSubmission.submissionDate < toDate)) {

                      Object.values(evidenceSubmission.answers).forEach(singleAnswer => {

                              let singleAnswerRecord = {
                                "School Name": submission.schoolInformation.name,
                                "School Id": submission.schoolInformation.externalId,
                                "Question":  (questionIdObject[singleAnswer.qid]) ? questionIdObject[singleAnswer.qid].questionName[0] : "",
                                "Question Id": (questionIdObject[singleAnswer.qid]) ? questionIdObject[singleAnswer.qid].questionExternalId : "",
                                "Answer": singleAnswer.notApplicable ? "Not Applicable" : "",
                                "Assessor Id": asssessorId,
                                "Remarks": singleAnswer.remarks || "",
                                "Start Time": this.gmtToIst(singleAnswer.startTime),
                                "End Time": this.gmtToIst(singleAnswer.endTime),
                                "Files": "",
                                "ECM": evidenceSubmission.externalId,
                                "Submission Date": this.gmtToIst(evidenceSubmission.submissionDate)
                            }

                            if (singleAnswer.fileName && singleAnswer.fileName.length > 0) {
                              singleAnswer.fileName.forEach(file => {
                                singleAnswerRecord.Files +=
                                  imageBaseUrl + file.sourcePath + ",";
                              });
                              singleAnswerRecord.Files = singleAnswerRecord.Files.replace(
                                /,\s*$/,
                                ""
                              );
                            }

                          if (!singleAnswer.notApplicable) {

                            if (singleAnswer.responseType != "matrix") {

                              let radioResponse = {};
                              let multiSelectResponse = {};
                              let multiSelectResponseArray = [];

                              if (
                                singleAnswer.responseType == "radio"
                              ) {
                                questionIdObject[singleAnswer.qid] && questionIdObject[singleAnswer.qid].questionOptions && questionIdObject[singleAnswer.qid].questionOptions.forEach(
                                  option => {

                                    radioResponse[option.value] = option.label;
                                  }
                                );
                                singleAnswerRecord.Answer =
                                  radioResponse[singleAnswer.value];
                              }
                              else if (singleAnswer.responseType == "multiselect") {

                                questionIdObject[singleAnswer.qid].questionOptions.forEach(
                                  option => {
                                    multiSelectResponse[option.value] =
                                      option.label;
                                  }
                                );


                                if (typeof singleAnswer.value == "object" || typeof singleAnswer.value == "array") {
                                  if (singleAnswer.value) {
                                  singleAnswer.value.forEach(value => {
                                    multiSelectResponseArray.push(
                                      multiSelectResponse[value]
                                    );
                                  });
                                }
                              }
                                singleAnswerRecord.Answer = multiSelectResponseArray.toString();
                              } else {
                                singleAnswerRecord.Answer = singleAnswer.value;
                              }
                              input.push(singleAnswerRecord)
                            } else {

                              singleAnswerRecord.Answer = "Instance Question";

                              if (singleAnswer.value && singleAnswer.value.length) {
                                for (
                                  let instance = 0;
                                  instance < singleAnswer.value.length;
                                  instance++
                                ) {

                                  Object.values(singleAnswer.value[instance]).forEach(
                                    eachInstanceChildQuestion => {
                                      let eachInstanceChildRecord = {
                                        "School Name": submission.schoolInformation.name,
                                        "School Id": submission.schoolInformation.externalId,
                                        "Question":(questionIdObject[eachInstanceChildQuestion.qid]) ? questionIdObject[eachInstanceChildQuestion.qid].questionName[0] : "",
                                        "Question Id": (questionIdObject[eachInstanceChildQuestion.qid]) ? questionIdObject[eachInstanceChildQuestion.qid].questionExternalId : "",
                                        "Submission Date": this.gmtToIst(evidenceSubmission.submissionDate),
                                        "Answer": "",
                                        "Assessor Id": asssessorId,
                                        "Remarks": eachInstanceChildQuestion.remarks || "",
                                        "Start Time": this.gmtToIst(eachInstanceChildQuestion.startTime),
                                        "End Time": this.gmtToIst(eachInstanceChildQuestion.endTime),
                                        "Files": "",
                                        "ECM": evidenceSubmission.externalId
                                      };

                                      if (eachInstanceChildQuestion.fileName && eachInstanceChildQuestion.fileName.length > 0) {
                                        eachInstanceChildQuestion.fileName.forEach(
                                          file => {
                                            if (file.sourcePath.split('/').length == 1) {
                                              file.sourcePath = submission._id.toString() + "/" + evidenceSubmission.submittedBy + "/" + file.name
                                            }
                                            eachInstanceChildRecord.Files +=
                                              imageBaseUrl + file.sourcePath + ",";
                                          }
                                        );
                                        eachInstanceChildRecord.Files = eachInstanceChildRecord.Files.replace(
                                          /,\s*$/,
                                          ""
                                        );
                                      }

                                      let radioResponse = {};
                                      let multiSelectResponse = {};
                                      let multiSelectResponseArray = [];

                                      if (
                                        eachInstanceChildQuestion.responseType == "radio"
                                      ) {
                                        questionIdObject[eachInstanceChildQuestion.qid] && questionIdObject[eachInstanceChildQuestion.qid].questionOptions && questionIdObject[eachInstanceChildQuestion.qid].questionOptions.forEach(
                                          option => {
                                            radioResponse[option.value] = option.label;
                                          }
                                        );
                                        eachInstanceChildRecord.Answer =
                                          radioResponse[eachInstanceChildQuestion.value];
                                      } else if (
                                        eachInstanceChildQuestion.responseType ==
                                        "multiselect"
                                      ) {
                                        (questionIdObject[eachInstanceChildQuestion.qid]).questionOptions.forEach(
                                          option => {
                                            multiSelectResponse[option.value] =
                                              option.label;
                                          }
                                        );

                                        if (typeof eachInstanceChildQuestion.value == "object" || typeof eachInstanceChildQuestion.value == "array") {

                                          if (eachInstanceChildQuestion.value) {
                                            eachInstanceChildQuestion.value.forEach(value => {
                                              multiSelectResponseArray.push(
                                                multiSelectResponse[value]
                                              );
                                            });
                                          }

                                          eachInstanceChildRecord.Answer = multiSelectResponseArray.toString();
                                        } else {
                                          eachInstanceChildRecord.Answer = eachInstanceChildQuestion.value
                                        }

                                      }
                                      else {
                                        eachInstanceChildRecord.Answer = eachInstanceChildQuestion.value;
                                      }

                                      input.push(eachInstanceChildRecord)
                                    }
                                  );
                                }
                              }
                            }
                          }
                      })
                    }
                  });
                }
              })
            }));

            function sleep(ms) {
              return new Promise(resolve => {
                setTimeout(resolve, ms)
              })
            }

            if (input.readableBuffer && input.readableBuffer.length) {
              while (input.readableBuffer.length > 20000) {
                await sleep(2000)
              }
            }

          }

        }
        input.push(null)


      } catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }

    });
  }

  /**
  * @api {get} /assessment/api/v1/reports/submissionFeedback/:programId Generate feedback for the submissions
  * @apiVersion 0.0.1
  * @apiName Generate feedback for the submissions
  * @apiGroup Report
  * @apiParam {String} fromDate From Date
  * @apiParam {String} toDate To Date
  * @apiUse successBody
  * @apiUse errorBody
  */

  async submissionFeedback(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let fromDate = req.query.fromDate ? new Date(req.query.fromDate.split("-").reverse().join("-")) : new Date(0)
        let toDate = req.query.toDate ? new Date(req.query.toDate.split("-").reverse().join("-")) : new Date()
        toDate.setHours(23, 59, 59)

        if (fromDate > toDate) {
          throw "From date cannot be greater than to date."
        }

        let submissionQueryObject = {};
        submissionQueryObject.programExternalId = req.params._id
        submissionQueryObject["feedback.submissionDate"] = {}
        submissionQueryObject["feedback.submissionDate"]["$gte"] = fromDate
        submissionQueryObject["feedback.submissionDate"]["$lte"] = toDate

        if (!req.params._id) {
          throw "Program ID missing."
        }

        let submissionsIds = await database.models.submissions.find(
          submissionQueryObject,
          {
            _id: 1
          }
        );

        const fileName = `Generate Feedback For Submission`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (!submissionsIds.length) {
          throw "No submission found for given params"
        }

        else {
          let chunkOfSubmissionsIdsDocument = _.chunk(submissionsIds, 10)
          let submissionId
          let submissionDocumentsArray


          for (let pointerTosubmissionIdDocument = 0; pointerTosubmissionIdDocument < chunkOfSubmissionsIdsDocument.length; pointerTosubmissionIdDocument++) {
            submissionId = chunkOfSubmissionsIdsDocument[pointerTosubmissionIdDocument].map(submissionModel => {
              return submissionModel._id
            });


            submissionDocumentsArray = await database.models.submissions.find(
              {
                _id: {
                  $in: submissionId
                }
              },
              { feedback: 1, assessors: 1 }
            )
            await Promise.all(submissionDocumentsArray.map(async (eachSubmission) => {
              let result = {};
              let assessorObject = {};

              eachSubmission.assessors.forEach(eachAssessor => {
                assessorObject[eachAssessor.userId] = { externalId: eachAssessor.externalId };
              })

              eachSubmission.feedback.forEach(eachFeedback => {
                result["Q1"] = eachFeedback.q1;
                result["Q2"] = eachFeedback.q2;
                result["Q3"] = eachFeedback.q3;
                result["Q4"] = eachFeedback.q4;
                result["School Id"] = eachFeedback.schoolId;
                result["School Name"] = eachFeedback.schoolName;
                result["Program Id"] = eachFeedback.programId;
                result["User Id"] = assessorObject[eachFeedback.userId] ? assessorObject[eachFeedback.userId].externalId : " ";
                result["Submission Date"] = eachFeedback.submissionDate;
              });
              input.push(result);
            }))
          }
        }
        input.push(null);

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }
    });
  }

  /**
  * @api {get} /assessment/api/v1/reports/ecmSubmissionByDate/:programId Generate ECM submissions By date
  * @apiVersion 0.0.1
  * @apiName Generate ECM submissions By date
  * @apiGroup Report
  * @apiParam {String} fromDate From Date
  * @apiParam {String} toDate To Date
  * @apiUse successBody
  * @apiUse errorBody
  */
  async ecmSubmissionByDate(req) {
    return new Promise(async (resolve, reject) => {
      try {

        if (!req.params._id) {
          return resolve({
            status: 400,
            message: "Please provide program id."
          })
        }

        let fromDate = req.query.fromDate ? new Date(req.query.fromDate.split("-").reverse().join("-")) : new Date(0)
        let toDate = req.query.toDate ? new Date(req.query.toDate.split("-").reverse().join("-")) : new Date()
        toDate.setHours(23, 59, 59)

        if (fromDate > toDate) {
          return resolve({
            status: 400,
            message: "From Date cannot be greater than to date !!!"
          })
        }

        const fileName = `ecmSubmissionByDate`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();


        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        let schoolProfileSubmissionDocuments = await database.models.submissions.aggregate([
          {
            $match: { programExternalId: req.params._id }
          },
          {
            $project: { 'schoolId': 1, 'evidencesStatus': 1, 'schoolName': '$schoolInformation.name', schoolExternalId: 1 }
          },
          {
            $unwind: "$evidencesStatus"
          },
          {
            $unwind: "$evidencesStatus.submissions"
          },
          {
            $project: { 'schoolName': 1, 'ecmName': '$evidencesStatus.name', 'ecmExternalId': '$evidencesStatus.externalId', 'submmissionDate': '$evidencesStatus.submissions.submissionDate', schoolExternalId: 1 }
          },
          {
            $match: { submmissionDate: { $gte: fromDate, $lte: toDate } }
          }
        ]);

        if (!schoolProfileSubmissionDocuments.length) {
          return resolve({
            status: 200,
            message: "No data found for given params."
          })
        }

        function sleep(ms) {
          return new Promise(resolve => {
            setTimeout(resolve, ms)
          })
        }

        for (
          let counter = 0;
          counter < schoolProfileSubmissionDocuments.length;
          counter++
        ) {

          let schoolProfileObject = {};
          schoolProfileObject['School External Id'] = schoolProfileSubmissionDocuments[counter].schoolExternalId;
          schoolProfileObject['School Name'] = schoolProfileSubmissionDocuments[counter].schoolName;
          schoolProfileObject['ECM Name'] = schoolProfileSubmissionDocuments[counter].ecmName;
          schoolProfileObject['ECM External Id'] = schoolProfileSubmissionDocuments[counter].ecmExternalId;
          schoolProfileObject['Submmission Date'] = moment(schoolProfileSubmissionDocuments[counter].submmissionDate).format('MM-DD-YYYY');
          input.push(schoolProfileObject);

          if (input.readableBuffer && input.readableBuffer.length) {
            while (input.readableBuffer.length > 20000) {
              await sleep(2000)
            }
          }

        }
        input.push(null);

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
 * @api {get} /assessment/api/v1/reports/completedParentInterviewsByDate/:programId Generate all parent report by date
 * @apiVersion 0.0.1
 * @apiName Generate all parent interview completed report by date
 * @apiGroup Report
 * @apiParam {String} fromDate From Date
 * @apiParam {String} toDate To Date
 * @apiUse successBody
 * @apiUse errorBody
 */

  async completedParentInterviewsByDate(req) {
    return new Promise(async (resolve, reject) => {
      try {

        if (!req.query.fromDate) {
          throw "From Date is mandatory"
        }

        let fromDate = new Date(req.query.fromDate.split("-").reverse().join("-"))
        let toDate = req.query.toDate ? new Date(req.query.toDate.split("-").reverse().join("-")) : new Date()
        toDate.setHours(23, 59, 59)

        if (fromDate > toDate) {
          throw "From date cannot be greater than to date."
        }

        let fetchRequiredSubmissionDocumentIdQueryObj = {};
        fetchRequiredSubmissionDocumentIdQueryObj["programExternalId"] = req.params._id
        fetchRequiredSubmissionDocumentIdQueryObj["parentInterviewResponses"] = { $exists: true }
        fetchRequiredSubmissionDocumentIdQueryObj["parentInterviewResponsesStatus.completedAt"] = {}
        fetchRequiredSubmissionDocumentIdQueryObj["parentInterviewResponsesStatus.completedAt"]["$gte"] = fromDate
        fetchRequiredSubmissionDocumentIdQueryObj["parentInterviewResponsesStatus.completedAt"]["$lte"] = toDate

        const submissionDocumentIdsToProcess = await database.models.submissions.find(
          fetchRequiredSubmissionDocumentIdQueryObj,
          { _id: 1 }
        ).lean()

        let fileName = `ParentInterview-Completed`;
        (fromDate) ? fileName += "fromDate_" + moment(fromDate).format('DD-MM-YYYY') : "";
        (toDate) ? fileName += "toDate_" + moment(toDate).format('DD-MM-YYYY') : moment().format('DD-MM-YYYY');

        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (!submissionDocumentIdsToProcess) {
          throw "No submissions found"
        }
        else {

          const chunkOfSubmissionIds = _.chunk(submissionDocumentIdsToProcess, 20)
          let submissionIds
          let submissionDocuments


          for (let pointerToSubmissionIdChunkArray = 0; pointerToSubmissionIdChunkArray < chunkOfSubmissionIds.length; pointerToSubmissionIdChunkArray++) {

            submissionIds = chunkOfSubmissionIds[pointerToSubmissionIdChunkArray].map(submissionModel => {
              return submissionModel._id
            });

            submissionDocuments = await database.models.submissions.find({
              _id: { $in: submissionIds }
            }, {
                "schoolInformation.name": 1,
                "schoolInformation.externalId": 1,
                "schoolInformation.administration": 1,
                "parentInterviewResponsesStatus.status": 1,
                "parentInterviewResponsesStatus.completedAt": 1,
                "parentInterviewResponsesStatus.parentType": 1,
              }
            ).lean()

            await Promise.all(submissionDocuments.map(async (eachSubmission) => {
              let result = {}

              let parentTypeObject = {
                "P1": {
                  name: "Parent only",
                  count: 0
                },
                "P2": {
                  name: "SMC Parent Member",
                  count: 0
                },
                "P3": {
                  name: "Safety Committee Member",
                  count: 0
                },
                "P4": {
                  name: "EWS-DG Parent",
                  count: 0
                },
                "P5": {
                  name: "Social Worker",
                  count: 0
                },
                "P6": {
                  name: "Elected Representative Nominee",
                  count: 0
                }
              }

              result["schoolId"] = eachSubmission.schoolInformation.externalId;
              result["schoolName"] = eachSubmission.schoolInformation.name;
              result["School (SDMC, EDMC, DOE, NDMC, North DMC, DCB, Private)"] = eachSubmission.schoolInformation.administration;

              Object.values(parentTypeObject).forEach(type => result[type.name] = 0)

              eachSubmission.parentInterviewResponsesStatus.forEach(eachParentInterviewResponse => {
                if ((eachParentInterviewResponse.status === 'completed' && eachParentInterviewResponse.completedAt >= fromDate && eachParentInterviewResponse.completedAt <= toDate)) {

                  result["Date"] = moment(eachParentInterviewResponse.completedAt).format('DD-MM-YYYY');
                  eachParentInterviewResponse.parentType.forEach(eachParentType => {
                    if (Object.keys(parentTypeObject).includes(eachParentType)) result[parentTypeObject[eachParentType].name] = ++parentTypeObject[eachParentType].count

                  })
                }
              })
              if (result["Date"] && result["Date"] != "") input.push(result);
            }))


          }
        }
        input.push(null)

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
 * @api {get} /assessment/api/v1/reports/parentInterviewCallDidNotPickupReportByDate/:programId Generate report whose parent did not pick up the call
 * @apiVersion 0.0.1
 * @apiName Generate report of all the call responses recorded for parents by date
 * @apiGroup Report
 * @apiParam {String} fromDate From Date
 * @apiParam {String} toDate To Date
 * @apiUse successBody
 * @apiUse errorBody
 */

  async parentInterviewCallDidNotPickupReportByDate(req) {
    return new Promise(async (resolve, reject) => {
      try {

        if (!req.query.fromDate) {
          throw "From Date is mandatory"
        }

        const programQueryParams = {
          externalId: req.params._id
        };

        let programsDocumentIds = await database.models.programs.find(programQueryParams, { externalId: 1 })

        if (!programsDocumentIds.length) {
          return resolve({
            status: 404,
            message: "No program document was found for given parameters."
          });
        }

        let schoolExternalId = {}
        let schoolDocument = await database.models.schools.find({}, { externalId: 1 })
        schoolDocument.forEach(eachSchool => {
          schoolExternalId[eachSchool._id.toString()] = {
            externalId: eachSchool.externalId
          }
        })

        let fromDate = new Date(req.query.fromDate.split("-").reverse().join("-"))
        let toDate = req.query.toDate ? new Date(req.query.toDate.split("-").reverse().join("-")) : new Date()
        toDate.setHours(23, 59, 59)

        if (fromDate > toDate) {
          throw "From date cannot be greater than to date."
        }

        let parentRegistryQueryParams = {}

        parentRegistryQueryParams["programId"] = programsDocumentIds[0]._id;
        parentRegistryQueryParams["callResponse"] = "R2"
        parentRegistryQueryParams['callResponseUpdatedTime'] = {}
        parentRegistryQueryParams['callResponseUpdatedTime']["$gte"] = fromDate
        parentRegistryQueryParams['callResponseUpdatedTime']["$lte"] = toDate

        const parentRegistryIdsArray = await database.models.parentRegistry.find(parentRegistryQueryParams, { _id: 1 }).lean()

        let fileName = `ParentInterview-CallNotPickedupReport`;
        (fromDate) ? fileName += "fromDate_" + moment(fromDate).format('DD-MM-YYYY') : "";
        (toDate) ? fileName += "toDate_" + moment(toDate).format('DD-MM-YYYY') : moment().format('DD-MM-YYYY');

        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (!parentRegistryIdsArray) {
          throw "No submissions found"
        }
        else {

          const chunkOfParentRegistryDocumentIds = _.chunk(parentRegistryIdsArray, 20)

          let parentIds
          let parentRegistryDocuments

          for (let pointerToParentIdChunkArray = 0; pointerToParentIdChunkArray < chunkOfParentRegistryDocumentIds.length; pointerToParentIdChunkArray++) {

            parentIds = chunkOfParentRegistryDocumentIds[pointerToParentIdChunkArray].map(parentModel => {
              return parentModel._id
            });

            parentRegistryDocuments = await database.models.parentRegistry.find({
              _id: { $in: parentIds }
            }, {
                callResponseUpdatedTime: 1,
                name: 1,
                callResponse: 1,
                phone1: 1,
                schoolName: 1,
                schoolId: 1
              }
            ).lean()

            await Promise.all(parentRegistryDocuments.map(async (eachParentRegistry) => {
              let result = {}
              result["Date"] = moment(eachParentRegistry.callResponseUpdatedTime).format('DD-MM-YYYY')
              result["School Name"] = eachParentRegistry.schoolName
              result["School Id"] = schoolExternalId[eachParentRegistry.schoolId].externalId
              result["Parents Name"] = eachParentRegistry.name
              result["Mobile number"] = eachParentRegistry.phone1
              input.push(result)
            }))
          }
        }
        input.push(null)
      }
      catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }
    })
  }

  /**
 * @api {get} /assessment/api/v1/reports/parentInterviewCallResponseByDate/:programId Generate report for the parent whose callResponse is present.
 * @apiVersion 0.0.1
 * @apiName Generate report for the parent whose callResponse is present.
 * @apiGroup Report
 * @apiParam {String} fromDate From Date
 * @apiParam {String} toDate To Date
 * @apiUse successBody
 * @apiUse errorBody
 */
  async parentInterviewCallResponseByDate(req) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!req.query.fromDate) {
          throw "From Date is mandatory"
        }

        const programQueryParams = {
          externalId: req.params._id
        };

        let programsDocumentIds = await database.models.programs.find(programQueryParams, { externalId: 1 })

        if (!programsDocumentIds.length) {
          return resolve({
            status: 404,
            message: "No program document was found for given parameters."
          });
        }

        let fromDate = new Date(req.query.fromDate.split("-").reverse().join("-"))
        let toDate = req.query.toDate ? new Date(req.query.toDate.split("-").reverse().join("-")) : new Date()
        toDate.setHours(23, 59, 59)

        if (fromDate > toDate) {
          throw "From date cannot be greater than to date."
        }

        let parentRegistryQueryParams = {}

        parentRegistryQueryParams["programId"] = programsDocumentIds[0]._id;
        parentRegistryQueryParams['callResponseUpdatedTime'] = {}
        parentRegistryQueryParams['callResponseUpdatedTime']["$gte"] = fromDate
        parentRegistryQueryParams['callResponseUpdatedTime']["$lte"] = toDate

        const parentRegistryIdsArray = await database.models.parentRegistry.find(parentRegistryQueryParams, { callResponse: 1, callResponseUpdatedTime: 1 }).lean()

        let fileName = `ParentInterview-CallResponsesReport`;
        (fromDate) ? fileName += "fromDate_" + moment(fromDate).format('DD-MM-YYYY') : "";
        (toDate) ? fileName += "toDate_" + moment(toDate).format('DD-MM-YYYY') : moment().format('DD-MM-YYYY');

        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (!parentRegistryIdsArray) {
          throw "No submissions found"
        }
        else {

          let arrayOfDate = [];

          let callResponseObj = {
            "R1": {
              name: "Call not initiated"
            },
            "R2": {
              name: "Did not pick up"
            },
            "R3": {
              name: "Not reachable"
            },
            "R4": {
              name: "Call back later"
            },
            "R5": {
              name: "Wrong number"
            },
            "R6": {
              name: "Call disconnected mid way"
            },
            "R7": {
              name: "Completed"
            },
            "R00": {
              name: "Call Response Completed But Survey Not Completed."
            }
          }

          await Promise.all(parentRegistryIdsArray.map(async (eachParentRegistry) => {
            if (eachParentRegistry.callResponseUpdatedTime >= fromDate && eachParentRegistry.callResponseUpdatedTime <= toDate && eachParentRegistry.callResponse) {
              arrayOfDate.push({
                date: moment(eachParentRegistry.callResponseUpdatedTime).format('YYYY-MM-DD'),
                callResponse: eachParentRegistry.callResponse
              })
            }

          }))

          let groupByDate = _.mapValues(_.groupBy(arrayOfDate, "date"), v => _.sortBy(v, "date"))

          Object.values(groupByDate).forEach(eachGroupDate => {
            let result = {}
            result["date"] = eachGroupDate[0].date;

            Object.values(callResponseObj).forEach(type => result[type.name] = 0)
            let callResponseForEachGroupDate = _.countBy(eachGroupDate, 'callResponse')

            Object.keys(callResponseForEachGroupDate).forEach(eachCallResponse => {
              result[callResponseObj[eachCallResponse].name] = callResponseForEachGroupDate[eachCallResponse]
            })

            input.push(result)
          })
        }
        input.push(null)
      }
      catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        })
      }
    })
  }

    /**
* @api {get} /assessment/api/v1/reports/schoolList Fetch School list based on programId and evaluationFrameworkId
* @apiVersion 0.0.1
* @apiName Fetch school list
* @apiGroup Report
* @apiParam {String} programId program externalId.
* @apiParam {String} componentId evaluationFramework Id.
* @apiUse successBody
* @apiUse errorBody
*/
  async schoolList(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let programId = req.params._id

        if (!programId) {
          throw "Program id is missing"
        }

        let componentId = req.query.componentId

          if (!componentId) {
          throw "Component id is missing"
        }

        let componentDocumentId = await database.models.evaluationFrameworks.findOne({
          externalId:componentId
        },{_id:1}).lean()

        let programDocument = await database.models.programs.aggregate([
          {
            $match: {
              externalId: programId
            }
          },   {
            $unwind: "$components"
          }, {
            $match: {
              "components.id": componentDocumentId._id
            }
          },
          {
            $project:{
              "components.schools":1  
            }
          }
        ])

        let schoolDocumentList = await database.models.schools.find({
          _id:{$in:programDocument[0].components.schools}
        },{_id:1}).lean()

        const fileName = `School List`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (!schoolDocumentList.length) {
          return resolve({
            status: 404,
            message: "No school found for given params."
          });
        }

        else {
          let chunkOfSchoolDocument = _.chunk(schoolDocumentList, 10)
          let schoolId
          let schoolDocumentsArray


          for (let pointerToSchoolDocument = 0; pointerToSchoolDocument < chunkOfSchoolDocument.length; pointerToSchoolDocument++) {
            schoolId = chunkOfSchoolDocument[pointerToSchoolDocument].map(schoolModel => {
              return schoolModel._id
            });

            schoolDocumentsArray = await database.models.schools.find(
              {
                _id: {
                  $in: schoolId
                }
              }
            ).lean()

            await Promise.all(schoolDocumentsArray.map(async (eachSchoolDocument) => {
              let result = {};

              Object.keys(eachSchoolDocument).forEach(singleKey => {
                if (["schoolTypes", "_id","_v"].indexOf(singleKey) == -1) {
                  result[gen.utils.camelCaseToTitleCase(singleKey)] = eachSchoolDocument[singleKey];
                }
              })
                result["schoolTypes"] = eachSchoolDocument.schoolTypes.join(",")
                input.push(result);
            }))
          }
        }
        input.push(null);

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }
    });
  }

  async teacherRegistry(req) {
    return (new Promise(async (resolve, reject) => {
      try {
        const programsQueryParams = {
          externalId: req.params._id
        }
        const programsDocument = await database.models.programs.findOne(programsQueryParams, {
          externalId: 1
        }).lean()

        const teacherRegistryDocument = await database.models.teacherRegistry.find({programId:programsDocument._id}, { _id: 1 }).lean()

        let fileName = "Teacher Registry";

        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (!teacherRegistryDocument.length) {
          return resolve({
            status: 404,
            message: "No document found for given params."
          });
        }

        else {
          let teacherChunkData = _.chunk(teacherRegistryDocument, 10)
          let teacherRegistryIds
          let teacherRegistryData

          for (let pointerToParentRegistry = 0; pointerToParentRegistry < teacherChunkData.length; pointerToParentRegistry++) {
            teacherRegistryIds = teacherChunkData[pointerToParentRegistry].map(teacherRegistryId => {
              return teacherRegistryId._id
            })

            let teacherRegistryParams = {_id: {$in: teacherRegistryIds}}


            teacherRegistryData = await database.models.teacherRegistry.find(teacherRegistryParams).lean()

            await Promise.all(teacherRegistryData.map(async (teacherRegistry) => {

              let teacherRegistryObject = {};
              Object.keys(teacherRegistry).forEach(singleKey => {
                if (["deleted", "_id", "__v", "schoolId", "programId"].indexOf(singleKey) == -1) {
                  teacherRegistryObject[gen.utils.camelCaseToTitleCase(singleKey)] = teacherRegistry[singleKey];
                }
              })
              input.push(teacherRegistryObject);
            }))
          }
        }
        input.push(null);
      }
      catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }
    }))
  }

  gmtToIst(gmtTime) {
    let istStart = moment(gmtTime)
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD HH:mm:ss");

    if (istStart == "Invalid date") {
      istStart = "-";
    }
    return istStart;
  }

  getSchoolProfileFields(schoolProfileFieldsPerSchoolTypes) {
    let schoolFieldArray = [];

    Object.values(schoolProfileFieldsPerSchoolTypes).forEach(eachSchoolProfileFieldPerSchoolType => {
      eachSchoolProfileFieldPerSchoolType.forEach(eachSchoolField => {
        schoolFieldArray.push(eachSchoolField)
      })
    })
    return schoolFieldArray;
  }
};