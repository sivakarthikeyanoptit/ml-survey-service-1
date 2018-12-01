const Json2csvParser = require("json2csv").Parser;
const _ = require("lodash");

module.exports = class Reports {
  async school(req) {
    return new Promise(async (resolve, reject) => {
      var currentResult = new Array();
      let reportsDocument = await database.models.submissions.find({});
      reportsDocument.forEach(objectOfreport => {
        let res = new Array();
        var result = {};
        var evidenceData = objectOfreport.evidences;
        var schoolProfile = objectOfreport.schoolProfile;
        result.status = objectOfreport.status;
        result.programId = objectOfreport.programId;
        result.schoolId = schoolProfile.externalId;
        result.schoolName = schoolProfile.name;
        var isSubmitted = Object.entries(evidenceData).map(item => ({
          [item[0]]: item[1].isSubmitted
        }));
        isSubmitted.forEach(itemArray => {
          _.merge(result, itemArray);
        });
        var hasConflicts = Object.entries(evidenceData).map(item => ({
          [item[1].name]: item[1].hasConflicts
        }));
        hasConflicts.forEach(hasConflictsObject => {
          _.merge(result, hasConflictsObject);
        });

        res.push(result);
        res.forEach(individualResult => {
          currentResult.push(individualResult);
        });

        let finalResult = {
          message: "Successfully set status based on schoolId",
          currentResult: currentResult
        };

        resolve(finalResult);
      });
      const fields = [
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
      const json2csvParser = new Json2csvParser({ fields });
      const csv = json2csvParser.parse(currentResult);
      console.log(csv);
    });
  }
};
