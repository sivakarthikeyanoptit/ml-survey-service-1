/**
 * name : criteriaController.js
 * author : Akash
 * created-date : 22-Nov-2018
 * Description : Criteria related information.
 */

// Dependencies
const csv = require("csvtojson");
const FileStream = require(ROOT_PATH + "/generics/fileStream");

 /**
    * Criteria
    * @class
*/
module.exports = class Criteria extends Abstract {

  constructor() {
    super(criteriaSchema);
  }

  static get name() {
    return "criteria";
  }

  /**
  * @api {post} /assessment/api/v1/criteria/upload Upload Criteria CSV
  * @apiVersion 1.0.0
  * @apiName Upload Criteria CSV
  * @apiGroup Criteria
  * @apiParam {File} criteria Mandatory criteria file of type CSV.
  * @apiUse successBody
  * @apiUse errorBody
  */

  /**
   * Insert bulk criteria.
   * @method
   * @name upload
   * @param {Object} req - All requested Data.
   * @param {Object} req.files - requested files.
   * @returns {CSV} A CSV with name Criteria-Upload is saved inside 
   * public/reports/currentDate
   */

  async upload(req) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!req.files || !req.files.criteria) {
          throw messageConstants.apiResponses.CRITERIA_FILE_NOT_FOUND;
        }

        let criteriaData = await csv().fromString(req.files.criteria.data.toString());

        const fileName = `Criteria-Upload`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        }());


        await Promise.all(criteriaData.map(async criteria => {

          let csvData = {};
          let rubric = {};
          let parsedCriteria = gen.utils.valueParser(criteria);

          rubric.name = parsedCriteria.criteriaName;
          rubric.description = parsedCriteria.criteriaName;
          rubric.type = parsedCriteria.type;
          rubric.expressionVariables = {};
          rubric.levels = {};
          let countLabel = 1;

          Object.keys(parsedCriteria).forEach(eachCriteriaKey => {

            let regExpForLevels = /^L+[0-9]/;
            if (regExpForLevels.test(eachCriteriaKey)) {

              let label = "Level " + countLabel++;

              rubric.levels[eachCriteriaKey] = {
                level: eachCriteriaKey,
                label: label,
                description: parsedCriteria[eachCriteriaKey],
                expression: ""
              };
            }
          })

          let criteriaStructure = {
            owner: req.userDetails.id,
            name: parsedCriteria.criteriaName,
            description: parsedCriteria.criteriaName,
            resourceType: [
              "Program",
              "Framework",
              "Criteria"
            ],
            language: [
              "English"
            ],
            keywords: [
              "Keyword 1",
              "Keyword 2"
            ],
            concepts: [
              {
                identifier: "LPD20100",
                name: "Teacher_Performance",
                objectType: "Concept",
                relation: "associatedTo",
                description: null,
                index: null,
                status: null,
                depth: null,
                mimeType: null,
                visibility: null,
                compatibilityLevel: null
              },
              {
                identifier: "LPD20400",
                name: "Instructional_Programme",
                objectType: "Concept",
                relation: "associatedTo",
                description: null,
                index: null,
                status: null,
                depth: null,
                mimeType: null,
                visibility: null,
                compatibilityLevel: null
              },
              {
                identifier: "LPD20200",
                name: "Teacher_Empowerment",
                objectType: "Concept",
                relation: "associatedTo",
                description: null,
                index: null,
                status: null,
                depth: null,
                mimeType: null,
                visibility: null,
                compatibilityLevel: null
              }
            ],
            createdFor: [
              "0125747659358699520",
              "0125748495625912324"
            ],
            evidences: [],
            deleted: false,
            externalId: criteria.criteriaID,
            owner: req.userDetails.id,
            timesUsed: 12,
            weightage: 20,
            remarks: "",
            name: parsedCriteria.criteriaName,
            description: parsedCriteria.criteriaName,
            criteriaType: "auto",
            score: "",
            flag: "",
            rubric: rubric
          };

          let criteriaDocuments = await database.models.criteria.create(
            criteriaStructure
          );

          csvData["Criteria Name"] = parsedCriteria.criteriaName;
          csvData["Criteria External Id"] = parsedCriteria.criteriaID;

          if (criteriaDocuments._id) {
            csvData["Criteria Internal Id"] = criteriaDocuments._id;
          } else {
            csvData["Criteria Internal Id"] = "Not inserted";
          }

          input.push(csvData);
        }))

        input.push(null);

      }
      catch (error) {
        return reject({
          status: error.status || httpStatusCode.internal_server_error.status,
          message: error.message || httpStatusCode.internal_server_error.message,
          errorObject: error
        });
      }
    })
  }

};



