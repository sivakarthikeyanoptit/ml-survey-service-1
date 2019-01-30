const moment = require("moment-timezone");
const FileStream = require("../generics/fileStream");
const imageBaseUrl = "https://storage.cloud.google.com/sl-" + (process.env.NODE_ENV == "production" ? "prod" : "dev") + "-storage/";

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

        const assessorDocument = await database.models['school-assessors'].find({ programId: programsDocumentIds[0]._id }, { _id: 1 })

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

            assessorsDocuments = await database.models["school-assessors"].aggregate(assessorQueryObject)

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

        const assessorDocument = await database.models['school-assessors'].find({ programId: programsDocumentIds[0]._id }, { _id: 1 })

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

            assessorsDocuments = await database.models["school-assessors"].aggregate(assessorQueryObject)

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

        Promise.all([submissionDocument, submissionEvidencesCount]).then(submissionDocumentWithCount => {
          let submissionDocument = submissionDocumentWithCount[0];
          let submissionEvidencesCount = submissionDocumentWithCount[1];
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
          if (!schoolDocument.length || !submissionDocument.length) {
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

        let parentRegistryQueryParams = {}

        parentRegistryQueryParams["programId"] = programsDocumentIds[0]._id;
        parentRegistryQueryParams["createdAt"] = {};
        parentRegistryQueryParams["createdAt"]["$gte"] = {};
        parentRegistryQueryParams["createdAt"]["$lte"] = {};
        if (req.query.fromDate) {
          parentRegistryQueryParams["createdAt"]["$gte"] = new Date(req.query.fromDate.split("-").reverse().join("-")
          )
        } else {
          parentRegistryQueryParams["createdAt"]["$gte"] = new Date(0)
        }

        if (req.query.toDate) {
          parentRegistryQueryParams["createdAt"]["$lte"] = new Date(req.query.toDate.split("-").reverse().join("-"))
        } else {
          parentRegistryQueryParams["createdAt"]["$lte"] = new Date()
        }

        const parentRegistryIdsArray = await database.models['parent-registry'].find(parentRegistryQueryParams, { _id: 1 })

        let fileName = "parentRegistry";
        (req.query.fromDate != "") ? fileName += " from " + req.query.fromDate : "";
        (req.query.toDate != "") ? fileName += " to " + req.query.toDate : "";

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

            parentRegistryDocuments = await database.models['parent-registry'].aggregate(parentRegistryQueryObject);

            await Promise.all(parentRegistryDocuments.map(async (parentRegistry) => {
              let parentRegistryObject = {};
              Object.keys(parentRegistry).forEach(singleKey => {
                if (["deleted", "_id", "__v", "createdAt", "updatedAt", "schoolId", "programId"].indexOf(singleKey) == -1) {
                  parentRegistryObject[gen.utils.camelCaseToTitleCase(singleKey)] = parentRegistry[singleKey];
                }
              })
              parentRegistryObject['Program External Id'] = programQueryParams.externalId;
              parentRegistryObject['School External Id'] = parentRegistry.schoolId;
              parentRegistryObject['Created At'] = parentRegistry.createdAt;
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

  async schoolProfileInformation(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let queryParams = {
          programExternalId: req.params._id
        };

        const submissionIds = await database.models.submissions.find(queryParams, {
          _id: 1
        })

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
              let schoolProfile = eachSchoolProfileSubmissionDocument.schoolProfile;
              if (schoolProfile) {
                let schoolProfileObject = {};
                schoolProfileObject['School External Id'] = eachSchoolProfileSubmissionDocument.schoolExternalId;
                schoolProfileObject['Program External Id'] = eachSchoolProfileSubmissionDocument.programExternalId;
                Object.keys(schoolProfile).forEach(singleKey => {
                  if (["deleted", "_id", "__v", "createdAt", "updatedAt"].indexOf(singleKey) == -1) {
                    schoolProfileObject[gen.utils.camelCaseToTitleCase(singleKey)] = schoolProfile[singleKey] || "";
                  }
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

  async generateEcmReportByDate(req) {
    return new Promise(async (resolve, reject) => {

      try {
        let fromDate = req.query.fromDate
        let toDate = req.query.toDate
        if (!fromDate) {
          return resolve({
            status: 404,
            message: "From date is a mandatory field."
          });
        }


        let fetchRequiredSubmissionDocumentIdQueryObj = {};
        fetchRequiredSubmissionDocumentIdQueryObj["programInformation.externalId"] = req.params._id,
          fetchRequiredSubmissionDocumentIdQueryObj["evidencesStatus.submissions.submissionDate"] = {
            '$gte': new Date(fromDate.split("-").reverse().join("-")),
            '$lte': (toDate) ? new Date(toDate.split("-").reverse().join("-")) : toDate = new Date()
          }
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

        const fileName = `EcmReport from date ${fromDate} to ${toDate} `;
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

                    if ((assessors[evidenceSubmission.submittedBy.toString()]) && (evidenceSubmission.isValid === true) && (evidenceSubmission.submissionDate >= new Date(fromDate.split("-").reverse().join("-")) && evidenceSubmission.submissionDate < new Date(toDate.split("-").reverse().join("-")))) {


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
                            "ECM": evidenceSubmission.externalId,
                            "Created At": singleAnswer.createdAt ? this.gmtToIst(singleAnswer.createdAt) : ""
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
                                        "Created At": this.gmtToIst(eachInstanceChildQuestion.createdAt),
                                        "Answer": "",
                                        "Assessor Id": assessors[evidenceSubmission.submittedBy.toString()].externalId,
                                        "Remarks": eachInstanceChildQuestion.remarks || "",
                                        "Start Time": this.gmtToIst(eachInstanceChildQuestion.startTime),
                                        "End Time": this.gmtToIst(eachInstanceChildQuestion.endTime),
                                        "Files": "",
                                        "ECM": evidenceSubmission.externalId
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