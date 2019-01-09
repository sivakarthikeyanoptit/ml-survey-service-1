const json2csv = require("json2csv").Parser;
const json2csvTransform = require('json2csv').Transform;
const stream = require("stream");
const fs = require("fs");
const _ = require("lodash");
const moment = require("moment-timezone");
// let csvReports = require("../generics/helpers/csvReports");

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
          "evidencesStatus.name":1,
          "evidencesStatus.externalId":1,
          "evidencesStatus.isSubmitted":1,
          "evidencesStatus.hasConflicts":1
        });

        const currentDate = new Date();
        const fileNameWithPath = "./public/csvFileBackup/" + "status" + moment(currentDate).tz("Asia/Kolkata").format("YYYY_MM_DD_HH_mm") + ".csv";

        const input = new stream.Readable({ objectMode: true });
        input._read = () => { };
        const output = fs.createWriteStream(fileNameWithPath, { encoding: 'utf8' });

        const opts = {};
        const transformOpts = { objectMode: true };

        const json2csv = new json2csvTransform(opts, transformOpts);
        const processor = input.pipe(json2csv).pipe(output);

        var checkProcessor = new Promise(function (resolve, reject) {
          processor.on('finish', resolve);
        });

        (async function () {
          console.log("---stream start---")
          await checkProcessor;
          console.log("---stream end---")
          return resolve({
            isResponseAStream: true,
            csvResponse: true,
            fileNameWithPath: fileNameWithPath
          });
        }());

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

          let evidenceMethodStatuses = submission.evidencesStatus.map(evidenceMethod=>
            ({[evidenceMethod.externalId]: evidenceMethod.isSubmitted})
          )

          evidenceMethodStatuses.forEach(evidenceMethodStatus => {
            _.merge(result, evidenceMethodStatus);
          });

          let hasConflicts = submission.evidencesStatus.map(evidenceMethod=>
            ({[evidenceMethod.name]: evidenceMethod.hasConflicts})
          )

          hasConflicts.forEach(hasConflictsObject => {
            _.merge(result, hasConflictsObject);
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
        const currentDate = new Date();

        const fileNameWithPath = "./public/csvFileBackup/" + "assessorSchools" + moment(currentDate).tz("Asia/Kolkata").format("YYYY_MM_DD_HH_mm") + ".csv";

        const input = new stream.Readable({ objectMode: true });
        input._read = () => { };
        const output = fs.createWriteStream(fileNameWithPath, { encoding: 'utf8' });

        const opts = {};
        const transformOpts = { objectMode: true };

        const json2csv = new json2csvTransform(opts, transformOpts);
        const processor = input.pipe(json2csv).pipe(output);

        var checkProcessor = new Promise(function (resolve, reject) {
          processor.on('finish', resolve);
        });

        (async function () {
          console.log("---stream start---")
          await checkProcessor;
          console.log("---stream end---")
          return resolve({
            isResponseAStream: true,
            csvResponse: true,
            fileNameWithPath: fileNameWithPath
          });
        }());

        assessorsWithSchoolDetails.result.forEach(assessor => {
          assessor.schools.forEach(assessorSchool => {
            input.push({
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
        const currentDate = new Date();

        const fileNameWithPath = "./public/csvFileBackup/" + "schoolAssessors" + moment(currentDate).tz("Asia/Kolkata").format("YYYY_MM_DD_HH_mm") + ".csv";

        const input = new stream.Readable({ objectMode: true });
        input._read = () => { };
        const output = fs.createWriteStream(fileNameWithPath, { encoding: 'utf8' });

        const opts = {};
        const transformOpts = { objectMode: true };

        const json2csv = new json2csvTransform(opts, transformOpts);
        const processor = input.pipe(json2csv).pipe(output);

        var checkProcessor = new Promise(function (resolve, reject) {
          processor.on('finish', resolve);
        });

        (async function () {
          console.log("---stream start---")
          await checkProcessor;
          console.log("---stream end---")
          return resolve({
            isResponseAStream: true,
            csvResponse: true,
            fileNameWithPath: fileNameWithPath
          });
        }());

        assessorsWithSchoolDetails.result.forEach(assessor => {
          assessor.schools.forEach(assessorSchool => {
            input.push({
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

        const currentDate = new Date();

        const fileNameWithPath = "./public/csvFileBackup/" + "programSchoolsStatusByProgramId_" + req.params._id + "_" + moment(currentDate).tz("Asia/Kolkata").format("YYYY_MM_DD_HH_mm") + ".csv";

        const input = new stream.Readable({ objectMode: true });
        input._read = () => { };
        const output = fs.createWriteStream(fileNameWithPath, { encoding: 'utf8' });

        const opts = {};
        const transformOpts = { objectMode: true };

        const json2csv = new json2csvTransform(opts, transformOpts);
        const processor = input.pipe(json2csv).pipe(output);

        var checkProcessor = new Promise(function (resolve, reject) {
          processor.on('finish', resolve);
        });

        (async function () {
          console.log("---stream start---")
          await checkProcessor;
          console.log("---stream end---")
          return resolve({
            isResponseAStream: true,
            csvResponse: true,
            fileNameWithPath: fileNameWithPath
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

          schoolDocument.forEach(school => {
            let programSchoolStatusObject = {
              programId: programQueryObject.externalId,
              schoolName: school.name,
              schoolId: school.externalId
            }

            if (schoolSubmission[school._id.toString()]) {
              programSchoolStatusObject.status = schoolSubmission[school._id.toString()].status;
              programSchoolStatusObject.createdAt = schoolSubmission[school._id.toString()].createdAt;
              programSchoolStatusObject.completedDate = schoolSubmission[school._id.toString()].completedDate
                ? schoolSubmission[school._id.toString()].completedDate
                : "-";
              programSchoolStatusObject.submissionCount =
                schoolSubmission[school._id.toString()].status == "started"
                  ? 0
                  : schoolSubmission[school._id.toString()].submissionCount
            }
            else {
              programSchoolStatusObject.status = "pending";
              programSchoolStatusObject.createdAt = "-";
              programSchoolStatusObject.completedDate = "-";
              programSchoolStatusObject.submissionCount = 0;

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

        const currentDate = new Date();
        const evidenceIdFromRequestParam = req.query.evidenceId;
        const evidenceQueryObject = "evidences." + evidenceIdFromRequestParam + ".isSubmitted";

        const imageBaseUrl = "https://storage.cloud.google.com/sl-" + (process.env.NODE_ENV == "production" ? "prod" : "dev") + "-storage/";

        const fileNameWithPath = "./public/csvFileBackup/" + "programsSubmissionStatus_evidenceId_" + evidenceIdFromRequestParam + "_" + moment(currentDate).tz("Asia/Kolkata").format("YYYY_MM_DD_HH_mm") + ".csv";

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

        const input = new stream.Readable({ objectMode: true });
        input._read = () => { };
        const output = fs.createWriteStream(fileNameWithPath, { encoding: 'utf8' });

        const opts = {};
        const transformOpts = { objectMode: true };

        const json2csv = new json2csvTransform(opts, transformOpts);
        const processor = input.pipe(json2csv).pipe(output);

        var checkProcessor = new Promise(function (resolve, reject) {
          processor.on('finish', resolve);
        });

        (async function () {
          console.log("---stream start---")
          await checkProcessor;
          console.log("---stream end---")
          return resolve({
            isResponseAStream: true,
            csvResponse: true,
            fileNameWithPath: fileNameWithPath
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

              submission.evidences[evidenceIdFromRequestParam].submissions.forEach(evidenceSubmission => {

                if (assessors[evidenceSubmission.submittedBy.toString()] && evidenceSubmission.isValid === true) {

                  Object.values(evidenceSubmission.answers).forEach(singleAnswer => {

                    if (singleAnswer.payload) {

                      let singleAnswerRecord = {
                        schoolName: submission.schoolInformation.name,
                        schoolId: submission.schoolInformation.externalId,
                        question: singleAnswer.payload.question[0],
                        answer: singleAnswer.notApplicable ? "Not Applicable" : "",
                        assessorId: assessors[evidenceSubmission.submittedBy.toString()].externalId,
                        files: "",
                        remarks: singleAnswer.remarks || "",
                        startTime: this.gmtToIst(singleAnswer.startTime),
                        endTime: this.gmtToIst(singleAnswer.endTime)
                      }

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
                                    schoolName: submission.schoolInformation.name,
                                    schoolId: submission.schoolInformation.externalId,
                                    question: eachInstanceChildQuestion.question[0],
                                    answer: "",
                                    remarks: eachInstanceChildQuestion.remarks || "",
                                    assessorId: assessors[evidenceSubmission.submittedBy.toString()].externalId,
                                    startTime: this.gmtToIst(eachInstanceChildQuestion.startTime),
                                    endTime: this.gmtToIst(eachInstanceChildQuestion.endTime),
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
                                  else {
                                    eachInstanceChildRecord.answer = eachInstanceChildQuestion.value;
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

        const currentDate = new Date();
        const fileNameWithPath = "./public/csvFileBackup/" + "generateCriteriasBySchoolId_schoolId_" + req.params._id + "_" + moment(currentDate).tz("Asia/Kolkata").format("YYYY_MM_DD_HH_mm") + ".csv";

        const input = new stream.Readable({ objectMode: true });
        input._read = () => { };
        const output = fs.createWriteStream(fileNameWithPath, { encoding: 'utf8' });

        const opts = {};
        const transformOpts = { objectMode: true };
        const json2csv = new json2csvTransform(opts, transformOpts);
        const processor = input.pipe(json2csv).pipe(output);

        let checkProcessor = new Promise(function (resolve, reject) {
          processor.on('finish', resolve);
        });

        (async function () {
          console.log("---stream start---")
          await checkProcessor;
          console.log("---stream end---")
          return resolve({
            isResponseAStream: true,
            csvResponse: true,
            fileNameWithPath: fileNameWithPath
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
        
        const currentDate = new Date();

        const fileNameWithPath = "./public/csvFileBackup/" + "generateSubmissionReportsBySchoolId_" + req.params._id + "_" + moment(currentDate).tz("Asia/Kolkata").format("YYYY_MM_DD_HH_mm") + ".csv";

        const input = new stream.Readable({ objectMode: true });
        input._read = () => { };
        const output = fs.createWriteStream(fileNameWithPath, { encoding: 'utf8' });

        const opts = {};
        const transformOpts = { objectMode: true };

        const json2csv = new json2csvTransform(opts, transformOpts);
        const processor = input.pipe(json2csv).pipe(output);

        var checkProcessor = new Promise(function (resolve, reject) {
          processor.on('finish', resolve);
        });

        (async function () {
          console.log("---stream start---")
          await checkProcessor;
          console.log("---stream end---")
          return resolve({
            isResponseAStream: true,
            csvResponse: true,
            fileNameWithPath: fileNameWithPath
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
                    score: criteriaScoreObject[singleAnswer.criteriaId].score,
                    remarks: singleAnswer.remarks || "",
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
                                  ].score,
                                  remarks: eachInstanceChildQuestion.remarks || "",
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