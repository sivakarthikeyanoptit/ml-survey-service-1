const _ = require("lodash");
const moment = require("moment-timezone");
const FileStream = require("../generics/fileStream")
const NOT_FOUND = {
  statusCode:404,
  message:"no records found"
};

module.exports = class Reports extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "submissions";
  }

  async dataFix(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let dataFixer = require("../generics/helpers/dataFixer");
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

  async status(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let submissions = await database.models.submissions.find(
          {},
          {"schoolInformation.externalId":1,
          "schoolInformation.name":1,
          "programInformation.name":1,
          "schoolId":1,
          "programId":1,
          "status":1,
          "evidencesStatus":1
        });

        const fileNameWithPath = `status_`;
        let fileStream = new FileStream(fileNameWithPath);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if(!submissions.length) return resolve(NOT_FOUND);
        submissions.forEach(submission => {
          let res = new Array();
          let result = {};

          if (submission.schoolInformation) {
            result["School Id"] = submission.schoolInformation.externalId;
            result["School Name"] = submission.schoolInformation.name;
          } else {
            result["School Id"] = submission.schoolId;
          }

          if (submission.programInformation) {
            result["Program Id"] = submission.programId;
            result["Program Name"] = submission.programInformation.name;
          } else {
            result["Program Id"] = submission.programId;
          }

          result["Status"] = submission.status;

          let evidenceMethodStatuses = submission.evidencesStatus.map(evidenceMethod=>
            ({[evidenceMethod.externalId]: evidenceMethod.isSubmitted})
          )

          evidenceMethodStatuses.forEach(evidenceMethodStatus => {
            _.merge(result, evidenceMethodStatus);
          });

          res.push(result);
          res.forEach(individualResult => {
          input.push(individualResult);
          });
        });
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

  async assessorSchools(req) {
    return new Promise(async (resolve, reject) => {
      try {
        req.query = {};
        req.populate = {
          path: "schools",
          select: ["name", "externalId"]
        };
        const assessorsWithSchoolDetails = await controllers.schoolAssessorsController.populate(
          req
        );

        const fileNameWithPath = `assessorSchools_`;
        let fileStream = new FileStream(fileNameWithPath);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if(!assessorsWithSchoolDetails.length) return resolve(NOT_FOUND);
        assessorsWithSchoolDetails.result.forEach(assessor => {
          assessor.schools.forEach(assessorSchool => {
            input.push({
              "Assessor Id": assessor.externalId,
              "Assessor UserId": assessor.userId,
              "Parent Id": assessor.parentId,
              "Assessor Name": assessor.name,
              "Assessor Email": assessor.email,
              "Assessor Role": assessor.role,
              "Program Id": assessor.programId.toString(),
              "School Id": assessorSchool.externalId,
              "School Name": assessorSchool.name
            });
          });
        });
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

  async schoolAssessors(req) {
    return new Promise(async (resolve, reject) => {
      try {
        req.query = {};
        req.populate = {
          path: "schools",
          select: ["name", "externalId"]
        };
        const assessorsWithSchoolDetails = await controllers.schoolAssessorsController.populate(
          req
        );
        
        const fileNameWithPath = `schoolAssessors_`;
        let fileStream = new FileStream(fileNameWithPath);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if(!assessorsWithSchoolDetails.length) return resolve(NOT_FOUND);
        assessorsWithSchoolDetails.result.forEach(assessor => {
          assessor.schools.forEach(assessorSchool => {
            input.push({
              "Assessor School Id": assessorSchool.externalId,
              "Assessor School Name": assessorSchool.name,
              "Assessor User Id": assessor.userId,
              "Assessor Id": assessor.externalId,
              "Assessor Name": assessor.name,
              "Assessor Email": assessor.email,
              "Parent Id": assessor.parentId,
              "Assessor Role": assessor.role,
              "Program Id": assessor.programId.toString()
            });
          });
        });
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
        programDocument.components.forEach(document => {
          result.schoolId = document.schools;
          result.id = programDocument._id;
        });

        let schoolQueryObject = {
          _id: { $in: Object.values(result.schoolId) }
        };
        let schoolDocument = await database.models.schools.find(
          schoolQueryObject
        );

        let submissionQuery = {
          programId: { $in: ObjectId(result.id) }
        };

        let submissionDocument = database.models.submissions.find(
          submissionQuery,
          {
            schoolId: 1,
            status: 1,
            completedDate: 1,
            createdAt: 1
          }
        ).exec();

        let submissionEvidencesCount = database.models.submissions.aggregate(
          [
            {
              $project: {
                schoolId: 1,
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

        

        const fileNameWithPath = `programSchoolsStatusByProgramId_${req.params._id}_`;

        let fileStream = new FileStream(fileNameWithPath);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        Promise.all([submissionDocument, submissionEvidencesCount]).then(data => {
          let submissionDocument = data[0];
          let submissionEvidencesCount = data[1];
          let schoolSubmission = {};
          submissionDocument.forEach(submission => {

            let evidencesStatus = submissionEvidencesCount.find(singleEvidenceCount => {
              return singleEvidenceCount.schoolId.toString() == submission.schoolId.toString()
            })
            schoolSubmission[submission.schoolId.toString()] = {
              status: submission.status,
              completedDate: submission.completedDate
                ? this.gmtToIst(submission.completedDate)
                : "-",
              createdAt: this.gmtToIst(submission.createdAt),
              submissionCount: evidencesStatus.submissionCount
            };
          });

          if(!schoolDocument.length) return resolve(NOT_FOUND);

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
              programSchoolStatusObject["Submission Count"]= 0;

            }
            input.push(programSchoolStatusObject)
          });
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

  async programsSubmissionStatus(req) {
    return new Promise(async (resolve, reject) => {

      try { 

        const evidenceIdFromRequestParam = req.query.evidenceId;
        const evidenceQueryObject = "evidences." + evidenceIdFromRequestParam + ".isSubmitted";

        const imageBaseUrl = "https://storage.cloud.google.com/sl-" + (process.env.NODE_ENV == "production" ? "prod" : "dev") + "-storage/";

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

        const fileNameWithPath = `programsSubmissionStatus_${evidenceIdFromRequestParam}_`;
        let fileStream = new FileStream(fileNameWithPath);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        if (submissionDocumentIdsToProcess.length > 0) {

          const chunkSize = 10
          const chunkOfSubmissionIds = _.chunk(submissionDocumentIdsToProcess, chunkSize)

          const pathToSubmissionAnswers = "evidences." + evidenceIdFromRequestParam + ".submissions.answers";
          const pathToSubmissionSubmittedBy = "evidences." + evidenceIdFromRequestParam + ".submissions.submittedBy";
          const pathToSubmissionisValid = "evidences." + evidenceIdFromRequestParam + ".submissions.isValid";

          let submissionIds
          let submissionDocuments
          let submissionData
          let totalRecordCountInCurrentChunk
          let totalSubmissionCountInCurrentChunk

          let totalRecordCount = 0
          let totalSubmissionCount = 0

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


            submissionData = await Promise.all(submissionDocuments.map(async (submission) => {

              let assessors = {}

              submission.assessors.forEach(assessor => {
                assessors[assessor.userId] = {
                  externalId: assessor.externalId
                };
              });


              let totalRecordInSubmission = 0;

              if(!submission.evidences[evidenceIdFromRequestParam].submissions.length) return resolve(NOT_FOUND);
              submission.evidences[evidenceIdFromRequestParam].submissions.forEach(evidenceSubmission => {

                if (assessors[evidenceSubmission.submittedBy.toString()] && evidenceSubmission.isValid === true) {

                  Object.values(evidenceSubmission.answers).forEach(singleAnswer => {

                    if (singleAnswer.payload) {

                      let singleAnswerRecord = {
                        "School Name": submission.schoolInformation.name,
                        "School Id": submission.schoolInformation.externalId,
                        "Question": singleAnswer.payload.question[0],
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
                                  totalRecordInSubmission += 1;
                                }
                              );
                            }
                          }
                        }
                        input.push(singleAnswerRecord)
                        totalRecordInSubmission += 1;
                      }
                    }
                  })
                }
              });

              return {
                // submissionId: submission._id.toString(),
                recordCount: totalRecordInSubmission
              }

            }));


            totalRecordCountInCurrentChunk = 0
            totalSubmissionCountInCurrentChunk = 0

            submissionData.forEach((submission) => {
              totalSubmissionCountInCurrentChunk += 1
              totalRecordCountInCurrentChunk += submission.recordCount
            })

            totalSubmissionCount += totalSubmissionCountInCurrentChunk
            totalRecordCount += totalRecordCountInCurrentChunk

          }


          console.log("Total Submissions Processed - " + totalSubmissionCount)
          console.log("Total Records Processed - " + totalRecordCount)
          input.push(null)

        }


      } catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }

    });
  }

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
          "evaluation-frameworks"
        ].find({},{themes:1}).exec();

        const fileNameWithPath = `generateCriteriasBySchoolId_schoolId_${req.params._id}_`;
        let fileStream = new FileStream(fileNameWithPath);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        Promise.all([submissionDocument,evaluationFrameworksDocuments]).then(data=>{
          let submissionDocument = data[0];
          let evaluationFrameworksDocuments = data[1];

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
          if(!submissionDocument.length) return resolve(NOT_FOUND);
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

        const fileNameWithPath = `generateSubmissionReportsBySchoolId_${req.params._id}_`;
        let fileStream = new FileStream(fileNameWithPath);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());

        Promise.all([allCriterias,allQuestionWithOptions,schoolSubmissionDocument]).then(data=>{

          let allCriterias = data[0];
          let allQuestionWithOptions = data[1];
          let schoolSubmissionDocument = data[2];
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
          
          const imageBaseUrl =
            "https://storage.cloud.google.com/sl-" +
            (process.env.NODE_ENV == "production" ? "prod" : "dev") +
            "-storage/";

          schoolSubmissionDocument.forEach(singleSchoolSubmission => {
            singleSchoolSubmission.criterias.forEach(singleCriteria => {
              criteriaScoreObject[singleCriteria._id.toString()] = {
                id: singleCriteria._id,
                score: singleCriteria.score
              };
            });
            if(!Object.values(singleSchoolSubmission.answers).length) return resolve(NOT_FOUND);
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

  gmtToIst(gmtTime) {
    let istStart = moment(gmtTime)
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD HH:mm:ss");

    if (istStart == "Invalid date") {
      istStart = "-";
    }
    return istStart;
  }
};