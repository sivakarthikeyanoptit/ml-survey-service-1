const json2csv = require("json2csv").Parser;
const _ = require("lodash");
const moment = require("moment-timezone");
let csvReports = require("../generics/helpers/csvReports");

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
        let currentResult = new Array();
        let submissions = await database.models.submissions.find({});

        submissions.forEach(submission => {
          let res = new Array();
          let result = {};

          if (submission.schoolInformation) {
            result.schoolId = submission.schoolInformation.externalId;
            result.schoolName = submission.schoolInformation.name;
          } else {
            result.schoolId = submission.schoolId;
          }

          if (submission.programInformation) {
            result.programId = submission.programId;
            result.programName = submission.programInformation.name;
          } else {
            result.programId = submission.programId;
          }

          result.status = submission.status;

          let evidenceMethodStatuses = Object.entries(submission.evidences).map(
            evidenceMethod => ({
              [evidenceMethod[0]]: evidenceMethod[1].isSubmitted
            })
          );
          evidenceMethodStatuses.forEach(evidenceMethodStatus => {
            _.merge(result, evidenceMethodStatus);
          });

          let hasConflicts = Object.entries(submission.evidences).map(
            evidenceMethod => ({
              [evidenceMethod[1].name]: evidenceMethod[1].hasConflicts
            })
          );
          hasConflicts.forEach(hasConflictsObject => {
            _.merge(result, hasConflictsObject);
          });

          res.push(result);
          res.forEach(individualResult => {
            currentResult.push(individualResult);
          });
        });

        const fields = [
          {
            label: "Program Id",
            value: "programId"
          },
          {
            label: "Program Name",
            value: "programName"
          },
          {
            label: "School Id",
            value: "schoolId"
          },
          {
            label: "School Name",
            value: "schoolName"
          },
          {
            label: "School status",
            value: "status"
          },
          {
            label: "BL",
            value: "BL"
          },
          {
            label: "BL-dup",
            value: "Book Look"
          },
          {
            label: "LW",
            value: "LW"
          },
          {
            label: "LW-dup",
            value: "Learning Walk"
          },
          {
            label: "SI",
            value: "SI"
          },
          {
            label: "SI-dup",
            value: "Student Interview"
          },
          {
            label: "AC3",
            value: "AC3"
          },
          {
            label: "AC3-dup",
            value: "Assessment- Class 3"
          },
          {
            label: "AC5",
            value: "AC5"
          },
          {
            label: "AC5",
            value: "Assessment- Class 5"
          },
          {
            label: "AC8",
            value: "AC8"
          },
          {
            label: "AC8-dup",
            value: "Assessment- Class 8"
          },
          {
            label: "PI",
            value: "PI"
          },
          {
            label: "PI-dup",
            value: "Principal Interview"
          },
          {
            label: "PAI",
            value: "PAI"
          },
          {
            label: "PAI-dup",
            value: "Parent Interview"
          },
          {
            label: "CO",
            value: "CO"
          },
          {
            label: "CO-dup",
            value: "Classroom Observation"
          },
          {
            label: "TI",
            value: "TI"
          },
          {
            label: "TI-dup",
            value: "Teacher Interview"
          }
        ];

        const json2csvParser = new json2csv({ fields });
        const csv = json2csvParser.parse(currentResult);
        return resolve({
          data: csv,
          csvResponse: true,
          fileName:
            "schoolWiseSubmissionReport " + new Date().toDateString() + ".csv"
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

        let assessorSchools = new Array();
        assessorsWithSchoolDetails.result.forEach(assessor => {
          assessor.schools.forEach(assessorSchool => {
            assessorSchools.push({
              id: assessor.externalId,
              userId: assessor.userId,
              parentId: assessor.parentId,
              name: assessor.name,
              email: assessor.email,
              role: assessor.role,
              programId: assessor.programId.toString(),
              schoolId: assessorSchool.externalId,
              schoolName: assessorSchool.name
            });
          });
        });

        const fields = [
          {
            label: "Id",
            value: "id"
          },
          {
            label: "User Id",
            value: "userId"
          },
          {
            label: "Parent Id",
            value: "parentId"
          },
          {
            label: "Name",
            value: "name"
          },
          {
            label: "Email",
            value: "email"
          },
          {
            label: "Role",
            value: "role"
          },
          {
            label: "Program Id",
            value: "programId"
          },
          {
            label: "School Id",
            value: "schoolId"
          },
          {
            label: "School Name",
            value: "schoolName"
          }
        ];
        const json2csvParser = new json2csv({ fields });
        const csv = json2csvParser.parse(assessorSchools);
        return resolve({
          data: csv,
          csvResponse: true,
          fileName:
            "assessorwiseSchoolReport " + new Date().toDateString() + ".csv"
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

        let schoolAssessors = new Array();
        assessorsWithSchoolDetails.result.forEach(assessor => {
          assessor.schools.forEach(assessorSchool => {
            schoolAssessors.push({
              id: assessorSchool.externalId,
              name: assessorSchool.name,
              assessorUserId: assessor.userId,
              assessorId: assessor.externalId,
              assessorName: assessor.name,
              assessorEmail: assessor.email,
              assessorParentId: assessor.parentId,
              assessorRole: assessor.role,
              programId: assessor.programId.toString()
            });
          });
        });

        const fields = [
          {
            label: "Id",
            value: "id"
          },
          {
            label: "Name",
            value: "name"
          },
          {
            label: "Assessor User Id",
            value: "assessorUserId"
          },
          {
            label: "Assessor Id",
            value: "assessorId"
          },
          {
            label: "Assessor Name",
            value: "assessorName"
          },
          {
            label: "Assessor Email",
            value: "assessorEmail"
          },
          {
            label: "Assessor Parent Id",
            value: "assessorParentId"
          },
          {
            label: "Assessor Role",
            value: "assessorRole"
          },
          {
            label: "Program Id",
            value: "programId"
          }
        ];
        const json2csvParser = new json2csv({ fields });
        const csv = json2csvParser.parse(schoolAssessors);
        return resolve({
          data: csv,
          csvResponse: true,
          fileName:
            "schoolwiseAssessorReport " + new Date().toDateString() + ".csv"
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

  async programSchoolsStatus(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let result = {};
        let programSchoolStatusList = [];
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

        let submissionDocument = await database.models.submissions.find(
          submissionQuery,
          {
            schoolId: 1,
            status: 1,
            completedDate: 1,

            createdAt: 1,
            evidencesStatus: 1
          }
        );

        let schoolSubmission = {};
        submissionDocument.forEach(submission => {
          let evidencesStatusCount = submission.evidencesStatus.filter(
            singleEvidenceStatus => singleEvidenceStatus.isSubmitted
          ).length;

          schoolSubmission[submission.schoolId.toString()] = {
            status: submission.status,
            completedDate: submission.completedDate
              ? this.gmtToIst(submission.completedDate)
              : "-",
            createdAt: this.gmtToIst(submission.createdAt),
            submissionCount: evidencesStatusCount
          };
        });

        schoolDocument.forEach(school => {
          var id = programQueryObject.externalId;
          if (schoolSubmission[school._id.toString()]) {
            programSchoolStatusList.push({
              id,
              schoolName: school.name,
              schoolId: school.externalId,
              status: schoolSubmission[school._id.toString()].status,
              createdAt: schoolSubmission[school._id.toString()].createdAt,
              completedDate: schoolSubmission[school._id.toString()]
                .completedDate
                ? schoolSubmission[school._id.toString()].completedDate
                : "-",
              submissionCount:
                schoolSubmission[school._id.toString()].status == "started"
                  ? 0
                  : schoolSubmission[school._id.toString()].submissionCount
            });
          } else {
            programSchoolStatusList.push({
              id,
              schoolName: school.name,
              schoolId: school.externalId,
              status: "pending",
              createdAt: "-",
              completedDate: "-",
              submissionCount: 0
            });
          }
        });

        const fields = [
          {
            label: "Program Id",
            value: "id"
          },
          {
            label: "School Id",
            value: "schoolId"
          },
          {
            label: "School Name",
            value: "schoolName"
          },
          {
            label: "Status",
            value: "status"
          },
          {
            label: "Start Date",
            value: "createdAt"
          },
          {
            label: "Completed Date",
            value: "completedDate"
          },
          {
            label: "Submission Count",
            value: "submissionCount"
          }
        ];
        const json2csvParser = new json2csv({ fields });
        const csv = json2csvParser.parse(programSchoolStatusList);
        var currentDate = new Date();
        let response = {
          data: csv,
          csvResponse: true,
          fileName:
            " programSchoolsStatus_" +
            moment(currentDate)
              .tz("Asia/Kolkata")
              .format("YYYY_MM_DD_HH_mm") +
            ".csv"
        };
        return resolve(response);
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
        let csvData = await csvReports.getCSVData(
          req.params._id,
          req.query.evidenceId
        );
        let currentDate = new Date();
        return resolve({
          data: csvData,
          csvResponse: true,
          fileName:
            "ecmWiseReport_" +
            req.query.evidenceId +
            "_" +
            moment(currentDate)
              .tz("Asia/Kolkata")
              .format("YYYY_MM_DD_HH_mm") +
            ".csv"
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

  async generateCriteriasBySchoolId(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let schoolId = {
          ["schoolInformation.externalId"]: req.params._id
        };

        let submissionDocument = await database.models.submissions.find(
          schoolId,
          {
            criterias: 1
          }
        );

        let evaluationFrameworksDocuments = await database.models[
          "evaluation-frameworks"
        ].find({});

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

        let criteriaReports = [];
        submissionDocument[0].criterias.forEach(submissionCriterias => {
          let levels = Object.values(submissionCriterias.rubric.levels);

          if (submissionCriterias._id) {
            let criteriaReportObject = {
              themeName: evaluationNameObject[submissionCriterias._id]
                ? evaluationNameObject[submissionCriterias._id].themeName
                : "",
              aoiName: evaluationNameObject[submissionCriterias._id]
                ? evaluationNameObject[submissionCriterias._id].aoiName
                : "",
              "Level 1": levels.find(level => level.level == "L1").description,
              "Level 2": levels.find(level => level.level == "L2").description,
              "Level 3": levels.find(level => level.level == "L3").description,
              "Level 4": levels.find(level => level.level == "L4").description,
              score: submissionCriterias.score
                ? submissionCriterias.score
                : "NA"
            };
            criteriaReports.push(criteriaReportObject);
          }
        });

        const fields = [
          {
            label: "Theme Name",
            value: "themeName"
          },
          {
            label: "AOI Name",
            value: "aoiName"
          },
          {
            label: "Indicator Name",
            value: "indicatorName"
          },
          {
            label: "Criteria Name",
            value: "criteriaName"
          },
          {
            label: "Level 1",
            value: "Level 1"
          },
          {
            label: "Level 2",
            value: "Level 2"
          },
          {
            label: "Level 3",
            value: "Level 3"
          },
          {
            label: "Level 4",
            value: "Level 4"
          },
          {
            label: "Score",
            value: "score"
          }
        ];

        const json2csvParser = new json2csv({ fields });
        const csv = json2csvParser.parse(criteriaReports);
        return resolve({
          data: csv,
          csvResponse: true,
          fileName:
            "criteriaswiseSchoolReport " + new Date().toDateString() + ".csv"
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

  async generateSubmissionReportsBySchoolId(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let allCriterias = await database.models.criterias.find(
          {},
          { evidences: 1, name: 1 }
        );

        let criteriaQuestionDetailsObject = {};

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

        let allQuestionWithOptions = await database.models.questions.find(
          { responseType: { $in: ["radio", "multiselect"] } },
          { options: 1 }
        );

        let questionOptionObject = {};
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

        let schoolSubmissionQuery = {
          ["schoolInformation.externalId"]: req.params._id
        };

        let schoolSubmissionDocument = await database.models.submissions.find(
          schoolSubmissionQuery,
          {
            answers: 1,
            criterias: 1
          }
        );

        let criteriaScoreObject = {};

        let csvReportOutput = [];

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

          Object.values(singleSchoolSubmission.answers).forEach(
            singleAnswer => {
              if (singleAnswer.payload) {
                let singleAnswerRecord = {
                  criteriaName:
                    criteriaQuestionDetailsObject[singleAnswer.qid] == undefined
                      ? " Question Deleted Post Submission"
                      : criteriaQuestionDetailsObject[singleAnswer.qid]
                          .criteriaName,
                  question: singleAnswer.payload.question[0],
                  options:
                    questionOptionObject[singleAnswer.qid] == undefined
                      ? " No Options"
                      : questionOptionObject[singleAnswer.qid],
                  answer: singleAnswer.notApplicable ? "Not Applicable" : "",
                  files: "",
                  score: criteriaScoreObject[singleAnswer.criteriaId].score
                };

                if (singleAnswer.fileName.length > 0) {
                  singleAnswer.fileName.forEach(file => {
                    singleAnswerRecord.files +=
                      imageBaseUrl + file.sourcePath + ",";
                  });
                  singleAnswerRecord.files = singleAnswerRecord.files.replace(
                    /,\s*$/,
                    ""
                  );
                }

                if (!singleAnswer.notApplicable) {
                  if (singleAnswer.responseType != "matrix") {
                    singleAnswerRecord.answer = singleAnswer.payload[
                      "labels"
                    ].toString();
                  } else {
                    singleAnswerRecord.answer = "Instance Question";

                    if (singleAnswer.payload.labels[0]) {
                      for (
                        let instance = 0;
                        instance < singleAnswer.payload.labels[0].length;
                        instance++
                      ) {
                        singleAnswer.payload.labels[0][instance].forEach(
                          eachInstanceChildQuestion => {
                            let eachInstanceChildRecord = {
                              criteriaName:
                                criteriaQuestionDetailsObject[
                                  eachInstanceChildQuestion._id
                                ] == undefined
                                  ? " Question Deleted Post Submission"
                                  : criteriaQuestionDetailsObject[
                                      eachInstanceChildQuestion._id
                                    ].criteriaName,
                              question: eachInstanceChildQuestion.question[0],
                              options:
                                questionOptionObject[
                                  eachInstanceChildQuestion._id
                                ] == undefined
                                  ? " No Options"
                                  : questionOptionObject[
                                      eachInstanceChildQuestion._id
                                    ],
                              answer: eachInstanceChildQuestion.value,
                              files: "",
                              score:
                                criteriaScoreObject[
                                  eachInstanceChildQuestion.payload.criteriaId
                                ].score
                            };

                            if (eachInstanceChildQuestion.fileName.length > 0) {
                              eachInstanceChildQuestion.fileName.forEach(
                                file => {
                                  eachInstanceChildRecord.files +=
                                    imageBaseUrl + file + ",";
                                }
                              );
                              eachInstanceChildRecord.files = eachInstanceChildRecord.files.replace(
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
                              eachInstanceChildRecord.answer =
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

                              eachInstanceChildRecord.answer = multiSelectResponseArray.toString();
                            }

                            csvReportOutput.push(eachInstanceChildRecord);
                          }
                        );
                      }
                    }
                  }
                }

                csvReportOutput.push(singleAnswerRecord);
              }
            }
          );
        });

        let fields = [
          {
            label: "Criteria Name",
            value: "criteriaName"
          },
          {
            label: "Question",
            value: "question"
          },
          {
            label: "Options",
            value: "options"
          },
          {
            label: "Responses",
            value: "answer"
          },
          {
            label: "Files",
            value: "files"
          },
          {
            label: "Score",
            value: "score"
          }
        ];
        const json2csvParser = new json2csv({ fields });
        const csv = json2csvParser.parse(csvReportOutput);
        let currentDate = new Date();
        return resolve({
          data: csv,
          csvResponse: true,
          fileName:
            "submissionReportByschoolId" +
            req.query.evidenceId +
            "_" +
            moment(currentDate)
              .tz("Asia/Kolkata")
              .format("YYYY_MM_DD_HH_mm") +
            ".csv"
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
