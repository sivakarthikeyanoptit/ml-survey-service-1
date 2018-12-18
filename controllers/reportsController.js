const json2csv = require("json2csv").Parser;
const _ = require("lodash");
const moment = require("moment-timezone");
const schedule = require("node-schedule");
const request = require("request");
const fs = require("fs");
let csvReports = require("../generics/helpers/csvReports");
// const express = require("express");
// const app = express();

module.exports = class Reports extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "submissions";
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
          { schoolId: 1, status: 1, completedDate: 1, createdAt: 1 }
        );

        let schoolSubmission = {};
        submissionDocument.forEach(submission => {
          schoolSubmission[submission.schoolId.toString()] = {
            status: submission.status,
            completedDate: submission.completedDate
              ? this.gmtToIst(submission.completedDate)
              : "-",
            createdAt: this.gmtToIst(submission.createdAt)
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
                : "-"
            });
          } else {
            programSchoolStatusList.push({
              id,
              schoolName: school.name,
              schoolId: school.externalId,
              status: "pending",
              createdAt: "-",
              completedDate: "-"
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
          }
        ];
        const json2csvParser = new json2csv({ fields });
        const csv = json2csvParser.parse(programSchoolStatusList);

        let response = {
          data: csv,
          csvResponse: true,
          fileName:
            " programSchoolsStatus " + new Date().toDateString() + ".csv"
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

        return resolve({
          data: csvData
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
