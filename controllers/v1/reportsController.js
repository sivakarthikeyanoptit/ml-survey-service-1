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
                "evidencesStatus": 1
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
                if (evidenceMethod.isSubmitted) {
                  totalEcmsSubmittedCount += 1
                }
                _.merge(result, { [evidenceMethod.externalId]: evidenceMethod.isSubmitted })
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
        )

        let questionIdObject = {}
        const questionDocument = await database.models.questions.find({}, { externalId: 1 })

        questionDocument.forEach(eachQuestionId => {
          questionIdObject[eachQuestionId._id] = {
            questionExternalId: eachQuestionId.externalId
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
            )


            await Promise.all(submissionDocuments.map(async (submission) => {

              let assessors = {}

              submission.assessors.forEach(assessor => {
                assessors[assessor.userId] = {
                  externalId: assessor.externalId
                };
              });

              submission.evidences[evidenceIdFromRequestParam].submissions.forEach(evidenceSubmission => {

                if (assessors[evidenceSubmission.submittedBy.toString()] && evidenceSubmission.isValid === true) {

                  Object.values(evidenceSubmission.answers).forEach(singleAnswer => {


                    if (singleAnswer.payload) {

                      let singleAnswerRecord = {
                        "School Name": submission.schoolInformation.name,
                        "School Id": submission.schoolInformation.externalId,
                        "Question": singleAnswer.payload.question[0],
                        "Question Id": (questionIdObject[singleAnswer.qid]) ? questionIdObject[singleAnswer.qid].questionExternalId : "",
                        "Answer": singleAnswer.notApplicable ? "Not Applicable" : "",
                        "Assessor Id": assessors[evidenceSubmission.submittedBy.toString()].externalId,
                        "Remarks": singleAnswer.remarks || "",
                        "Start Time": this.gmtToIst(singleAnswer.startTime),
                        "End Time": this.gmtToIst(singleAnswer.endTime),
                        "Files": "",
                      }

                      if (singleAnswer.fileName.length > 0) {
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

                          singleAnswerRecord.Answer = singleAnswer.payload[
                            "labels"
                          ].toString();

                        } else {

                          singleAnswerRecord.Answer = "Instance Question";

                          if (singleAnswer.payload.labels[0]) {
                            for (
                              let instance = 0;
                              instance < singleAnswer.payload.labels[0].length;
                              instance++
                            ) {

                              singleAnswer.payload.labels[0][instance].forEach(
                                eachInstanceChildQuestion => {
                                  let eachInstanceChildRecord = {
                                    "School Name": submission.schoolInformation.name,
                                    "School Id": submission.schoolInformation.externalId,
                                    "Question": eachInstanceChildQuestion.question[0],
                                    "Question Id": (questionIdObject[eachInstanceChildQuestion._id]) ? questionIdObject[eachInstanceChildQuestion._id].questionExternalId : "",
                                    "Answer": "",
                                    "Assessor Id": assessors[evidenceSubmission.submittedBy.toString()].externalId,
                                    "Remarks": eachInstanceChildQuestion.remarks || "",
                                    "Start Time": this.gmtToIst(eachInstanceChildQuestion.startTime),
                                    "End Time": this.gmtToIst(eachInstanceChildQuestion.endTime),
                                    "Files": "",
                                  };

                                  if (eachInstanceChildQuestion.fileName.length > 0) {
                                    eachInstanceChildQuestion.fileName.forEach(
                                      file => {
                                        if (file.split('/').length == 1) {
                                          file = submission._id.toString() + "/" + evidenceSubmission.submittedBy + "/" + file
                                        }
                                        eachInstanceChildRecord.Files +=
                                          imageBaseUrl + file + ",";
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
                                    eachInstanceChildQuestion.options.forEach(
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
                                    eachInstanceChildQuestion.options.forEach(
                                      option => {
                                        multiSelectResponse[option.value] =
                                          option.label;
                                      }
                                    );

                                    eachInstanceChildQuestion.value.forEach(value => {
                                      multiSelectResponseArray.push(
                                        multiSelectResponse[value]
                                      );
                                    });

                                    eachInstanceChildRecord.Answer = multiSelectResponseArray.toString();
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
                        input.push(singleAnswerRecord)
                      }
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
              singleTheme.aoi.forEach(singleAoi => {
                singleAoi.indicators.forEach(singleIndicator => {
                  singleIndicator.criteria.forEach(singleCriteria => {
                    evaluationNameObject[singleCriteria.toString()] = {
                      themeName: singleTheme.name,
                      aoiName: singleAoi.name,
                      indicatorName: singleIndicator.name
                    };
                  });
                });
              });
            });
          });

          if (!submissionDocument[0].criterias.length) {
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

        let allCriterias = database.models.criterias.find(
          {},
          { evidences: 1, name: 1 }
        ).exec();

        let allQuestionWithOptions = database.models.questions.find(
          { responseType: { $in: ["radio", "multiselect"] } },
          { options: 1 }
        ).exec();

        let schoolSubmissionQuery = {
          ["schoolInformation.externalId"]: req.params._id
        };

        let schoolSubmissionDocument = database.models.submissions.find(
          schoolSubmissionQuery,
          {
            answers: 1,
            criterias: 1
          }
        ).exec();

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

        Promise.all([allCriterias, allQuestionWithOptions, schoolSubmissionDocument]).then(documents => {

          let allCriterias = documents[0];
          let allQuestionWithOptions = documents[1];
          let schoolSubmissionDocument = documents[2];
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

          allQuestionWithOptions.forEach(question => {
            if (question.options.length > 0) {
              let optionString = "";
              question.options.forEach(option => {
                optionString += option.label + ",";
              });
              optionString = optionString.replace(/,\s*$/, "");
              questionOptionObject[question._id.toString()] = optionString;
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
                  if (singleAnswer.payload) {
                    let singleAnswerRecord = {
                      "Criteria Name":
                        criteriaQuestionDetailsObject[singleAnswer.qid] == undefined
                          ? " Question Deleted Post Submission"
                          : criteriaQuestionDetailsObject[singleAnswer.qid]
                            .criteriaName,
                      "Question": singleAnswer.payload.question[0],
                      "Answer": singleAnswer.notApplicable ? "Not Applicable" : "",
                      "Options":
                        questionOptionObject[singleAnswer.qid] == undefined
                          ? " No Options"
                          : questionOptionObject[singleAnswer.qid],
                      "Score": criteriaScoreObject[singleAnswer.criteriaId].score,
                      "Remarks": singleAnswer.remarks || "",
                      "Files": "",
                    };

                    if (singleAnswer.fileName.length > 0) {
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
                        singleAnswerRecord["Answer"] = singleAnswer.payload[
                          "labels"
                        ].toString();
                      } else {
                        singleAnswerRecord["Answer"] = "Instance Question";

                        if (singleAnswer.payload.labels[0]) {
                          for (
                            let instance = 0;
                            instance < singleAnswer.payload.labels[0].length;
                            instance++
                          ) {
                            singleAnswer.payload.labels[0][instance].forEach(
                              eachInstanceChildQuestion => {
                                let eachInstanceChildRecord = {
                                  "Criteria Name":
                                    criteriaQuestionDetailsObject[
                                      eachInstanceChildQuestion._id
                                    ] == undefined
                                      ? " Question Deleted Post Submission"
                                      : criteriaQuestionDetailsObject[
                                        eachInstanceChildQuestion._id
                                      ].criteriaName,
                                  "Question": eachInstanceChildQuestion.question[0],
                                  "Answer": eachInstanceChildQuestion.value,
                                  "Options":
                                    questionOptionObject[
                                      eachInstanceChildQuestion._id
                                    ] == undefined
                                      ? " No Options"
                                      : questionOptionObject[
                                      eachInstanceChildQuestion._id
                                      ],
                                  "Score":
                                    criteriaScoreObject[
                                      eachInstanceChildQuestion.payload.criteriaId
                                    ].score,
                                  "Remarks": eachInstanceChildQuestion.remarks || "",
                                  "Files": "",
                                };

                                if (eachInstanceChildQuestion.fileName.length > 0) {
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

                                if (
                                  eachInstanceChildQuestion.responseType == "radio"
                                ) {
                                  eachInstanceChildQuestion.options.forEach(
                                    option => {
                                      radioResponse[option.value] = option.label;
                                    }
                                  );
                                  eachInstanceChildRecord["Answer"] =
                                    radioResponse[eachInstanceChildQuestion.value];
                                } else if (
                                  eachInstanceChildQuestion.responseType ==
                                  "multiselect"
                                ) {
                                  eachInstanceChildQuestion.options.forEach(
                                    option => {
                                      multiSelectResponse[option.value] =
                                        option.label;
                                    }
                                  );

                                  eachInstanceChildQuestion.value.forEach(value => {
                                    multiSelectResponseArray.push(
                                      multiSelectResponse[value]
                                    );
                                  });

                                  eachInstanceChildRecord["Answer"] = multiSelectResponseArray.toString();
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

        let schoolProfileFields = await this.schoolProfileFieldsPerType(programsDocument.components[0].schoolProfileFieldsPerSchoolTypes);

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
        )

        let questionIdObject = {}
        const questionDocument = await database.models.questions.find({}, { externalId: 1 })

        questionDocument.forEach(eachQuestionId => {
          questionIdObject[eachQuestionId._id] = {
            questionExternalId: eachQuestionId.externalId
          }
        })

        let fileName = `EcmReport`;
        (fromDate) ? fileName += "from date _" + fromDate : "";
        (toDate) ? fileName += "to date _" + toDate : new Date();

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
            )


            await Promise.all(submissionDocuments.map(async (submission) => {

              let assessors = {}

              submission.assessors.forEach(assessor => {
                assessors[assessor.userId] = {
                  externalId: assessor.externalId
                };
              });

              Object.values(submission.evidences).forEach(singleEvidence => {
                if (singleEvidence.submissions) {
                  singleEvidence.submissions.forEach(evidenceSubmission => {

                    let asssessorId = (assessors[evidenceSubmission.submittedBy.toString()]) ? assessors[evidenceSubmission.submittedBy.toString()].externalId : evidenceSubmission.submittedByName.replace(' null', '');

                    // if ((assessors[evidenceSubmission.submittedBy.toString()]) && (evidenceSubmission.isValid === true) && (evidenceSubmission.submissionDate >= fromDate && evidenceSubmission.submissionDate < toDate)) {
                    if ((evidenceSubmission.isValid === true) && (evidenceSubmission.submissionDate >= fromDate && evidenceSubmission.submissionDate < toDate)) {


                      Object.values(evidenceSubmission.answers).forEach(singleAnswer => {


                        if (singleAnswer.payload) {

                          let singleAnswerRecord = {
                            "School Name": submission.schoolInformation.name,
                            "School Id": submission.schoolInformation.externalId,
                            "Question": singleAnswer.payload.question[0],
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

                          if (singleAnswer.fileName.length > 0) {
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

                              singleAnswerRecord.Answer = singleAnswer.payload[
                                "labels"
                              ].toString();
                              input.push(singleAnswerRecord)
                            } else {

                              singleAnswerRecord.Answer = "Instance Question";
                              input.push(singleAnswerRecord)

                              if (singleAnswer.payload.labels[0]) {
                                for (
                                  let instance = 0;
                                  instance < singleAnswer.payload.labels[0].length;
                                  instance++
                                ) {

                                  singleAnswer.payload.labels[0][instance].forEach(
                                    eachInstanceChildQuestion => {
                                      let eachInstanceChildRecord = {
                                        "School Name": submission.schoolInformation.name,
                                        "School Id": submission.schoolInformation.externalId,
                                        "Question": eachInstanceChildQuestion.question[0],
                                        "Question Id": (questionIdObject[eachInstanceChildQuestion._id]) ? questionIdObject[eachInstanceChildQuestion._id].questionExternalId : "",
                                        "Submission Date": this.gmtToIst(evidenceSubmission.submissionDate),
                                        "Answer": "",
                                        "Assessor Id": asssessorId,
                                        "Remarks": eachInstanceChildQuestion.remarks || "",
                                        "Start Time": this.gmtToIst(eachInstanceChildQuestion.startTime),
                                        "End Time": this.gmtToIst(eachInstanceChildQuestion.endTime),
                                        "Files": "",
                                        "ECM": evidenceSubmission.externalId
                                      };

                                      if (eachInstanceChildQuestion.fileName.length > 0) {
                                        eachInstanceChildQuestion.fileName.forEach(
                                          file => {
                                            if (file.split('/').length == 1) {
                                              file = submission._id.toString() + "/" + evidenceSubmission.submittedBy + "/" + file
                                            }
                                            eachInstanceChildRecord.Files +=
                                              imageBaseUrl + file + ",";
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
                                        eachInstanceChildQuestion.options.forEach(
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
                                        eachInstanceChildQuestion.options.forEach(
                                          option => {
                                            multiSelectResponse[option.value] =
                                              option.label;
                                          }
                                        );

                                        if (typeof eachInstanceChildQuestion.value == "object" || typeof eachInstanceChildQuestion.value == "array") {

                                          eachInstanceChildQuestion.value.forEach(value => {
                                            multiSelectResponseArray.push(
                                              multiSelectResponse[value]
                                            );
                                          });

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

  gmtToIst(gmtTime) {
    let istStart = moment(gmtTime)
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD HH:mm:ss");

    if (istStart == "Invalid date") {
      istStart = "-";
    }
    return istStart;
  }

  schoolProfileFieldsPerType(arrayOfObjects) {
    let schoolFieldArray = [];

    Object.values(arrayOfObjects).forEach(arrayFields => {
      arrayFields.forEach(eachArray => {
        schoolFieldArray.push(eachArray)
      })
    })
    return schoolFieldArray;
  }
};