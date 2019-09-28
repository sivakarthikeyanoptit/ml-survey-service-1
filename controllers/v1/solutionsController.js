const csv = require("csvtojson");
const solutionsHelper = require(ROOT_PATH + "/module/solutions/helper");
const FileStream = require(ROOT_PATH + "/generics/fileStream");
module.exports = class Solutions extends Abstract {

  constructor() {
    super(solutionsSchema);
  }

  static get name() {
    return "solutions";
  }

  /**
  * @api {get} /assessment/api/v1/solutions/details/:solutionInternalId Framework & Rubric Details
  * @apiVersion 1.0.0
  * @apiName Framework & Rubric Details of a Solution
  * @apiGroup Solutions
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/solutions/details/5b98fa069f664f7e1ae7498c
  * @apiUse successBody
  * @apiUse errorBody
  */

  async details(req) {
    return new Promise(async (resolve, reject) => {
      try {

        if (!req.params._id || req.params._id == "") {
          throw "Invalid parameters."
        }

        let findQuery = {
          _id: req.params._id
        }

        let solutionDocument = await database.models.solutions.findOne(findQuery, { themes: 1, levelToScoreMapping: 1, name: 1 }).lean()

        let criteriasIdArray = gen.utils.getCriteriaIds(solutionDocument.themes);
        let criteriaDocument = await database.models.criteria.find({ _id: { $in: criteriasIdArray } }, { "name": 1, "rubric.levels": 1 }).lean()

        let criteriaObject = {}

        criteriaDocument.forEach(eachCriteria => {
          let levelsDescription = {}

          for (let k in eachCriteria.rubric.levels) {
            levelsDescription[k] = eachCriteria.rubric.levels[k].description
          }

          criteriaObject[eachCriteria._id.toString()] = _.merge({
            name: eachCriteria.name
          }, levelsDescription)
        })

        let responseObject = {}
        responseObject.heading = "Solution Framework + rubric for - " + solutionDocument.name

        responseObject.sections = new Array

        let levelValue = {}

        let sectionHeaders = new Array

        sectionHeaders.push({
          name: "criteriaName",
          value: "Domain"
        })

        for (let k in solutionDocument.levelToScoreMapping) {
          levelValue[k] = ""
          sectionHeaders.push({ name: k, value: solutionDocument.levelToScoreMapping[k].label })
        }

        let generateCriteriaThemes = function (themes, parentData = []) {

          themes.forEach(theme => {

            if (theme.children) {
              let hierarchyTrackToUpdate = [...parentData]
              hierarchyTrackToUpdate.push(_.pick(theme, ["type", "label", "externalId", "name"]))

              generateCriteriaThemes(theme.children, hierarchyTrackToUpdate)

            } else {

              let tableData = new Array
              let levelObjectFromCriteria = {}

              let hierarchyTrackToUpdate = [...parentData]
              hierarchyTrackToUpdate.push(_.pick(theme, ["type", "label", "externalId", "name"]))

              theme.criteria.forEach(criteria => {

                if (criteriaObject[criteria.criteriaId.toString()]) {

                  Object.keys(levelValue).forEach(eachLevel => {
                    levelObjectFromCriteria[eachLevel] = criteriaObject[criteria.criteriaId.toString()][eachLevel]
                  })

                  tableData.push(_.merge({
                    criteriaName: criteriaObject[criteria.criteriaId.toString()].name,
                  }, levelObjectFromCriteria))
                }

              })

              let eachSection = {
                table: true,
                data: tableData,
                tabularData: {
                  headers: sectionHeaders
                },
                summary: hierarchyTrackToUpdate
              }

              responseObject.sections.push(eachSection)
            }
          })

        }

        generateCriteriaThemes(solutionDocument.themes)

        let response = {
          message: "Solution framework + rubric fetched successfully.",
          result: responseObject
        };

        return resolve(response);

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
  * @api {get} /assessment/api/v1/solutions/importFromFramework/?programId:programExternalId&frameworkId:frameworkExternalId&entityType:entityType Create solution from framework.
  * @apiVersion 1.0.0
  * @apiName Create solution from framework.
  * @apiGroup Solutions
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiParam {String} programId Program External ID.
  * @apiParam {String} frameworkId Framework External ID.
  * @apiParam {String} entityType Entity Type.
  * @apiSampleRequest /assessment/api/v1/solutions/importFromFramework?programId=PGM-SMC&frameworkId=EF-SMC&entityType=school
  * @apiUse successBody
  * @apiUse errorBody
  */

  async importFromFramework(req) {
    return new Promise(async (resolve, reject) => {
      try {

        if (!req.query.programId || req.query.programId == "" || !req.query.frameworkId || req.query.frameworkId == "" || !req.query.entityType || req.query.entityType == "") {
          throw "Invalid parameters."
        }

        let frameworkDocument = await database.models.frameworks.findOne({
          externalId: req.query.frameworkId
        }).lean()

        if (!frameworkDocument._id) {
          throw "Invalid parameters."
        }

        let programDocument = await database.models.programs.findOne({
          externalId: req.query.programId
        }, {
            _id: 1,
            externalId: 1,
            name: 1,
            description: 1
          }).lean()

        if (!programDocument._id) {
          throw "Invalid parameters."
        }

        let entityTypeDocument = await database.models.entityTypes.findOne({
          name: req.query.entityType
        }, {
            _id: 1,
            name: 1
          }).lean()

        if (!entityTypeDocument._id) {
          throw "Invalid parameters."
        }

        let criteriasIdArray = gen.utils.getCriteriaIds(frameworkDocument.themes);

        let frameworkCriteria = await database.models.criteria.find({ _id: { $in: criteriasIdArray } }).lean();

        let solutionCriteriaToFrameworkCriteriaMap = {}

        await Promise.all(frameworkCriteria.map(async (criteria) => {
          criteria.frameworkCriteriaId = criteria._id
          let newCriteriaId = await database.models.criteria.create(_.omit(criteria, ["_id"]))
          if (newCriteriaId._id) {
            solutionCriteriaToFrameworkCriteriaMap[criteria._id.toString()] = newCriteriaId._id
          }
        }))


        let updateThemes = function (themes) {
          themes.forEach(theme => {
            let criteriaIdArray = new Array
            let themeCriteriaToSet = new Array
            if (theme.children) {
              updateThemes(theme.children);
            } else {
              criteriaIdArray = theme.criteria;
              criteriaIdArray.forEach(eachCriteria => {
                eachCriteria.criteriaId = solutionCriteriaToFrameworkCriteriaMap[eachCriteria.criteriaId.toString()] ? solutionCriteriaToFrameworkCriteriaMap[eachCriteria.criteriaId.toString()] : eachCriteria.criteriaId
                themeCriteriaToSet.push(eachCriteria)
              })
              theme.criteria = themeCriteriaToSet
            }
          })
          return true;
        }

        let newSolutionDocument = _.cloneDeep(frameworkDocument)

        updateThemes(newSolutionDocument.themes)

        newSolutionDocument.externalId = frameworkDocument.externalId + "-TEMPLATE"

        newSolutionDocument.frameworkId = frameworkDocument._id
        newSolutionDocument.frameworkExternalId = frameworkDocument.externalId

        newSolutionDocument.entityTypeId = entityTypeDocument._id
        newSolutionDocument.entityType = entityTypeDocument.name
        newSolutionDocument.isReusable = true

        let newBaseSolutionId = await database.models.solutions.create(_.omit(newSolutionDocument, ["_id"]))

        let newSolutionId

        if (newBaseSolutionId._id) {

          newSolutionDocument.programId = programDocument._id
          newSolutionDocument.programExternalId = programDocument.externalId
          newSolutionDocument.programName = programDocument.name
          newSolutionDocument.programDescription = programDocument.description

          newSolutionDocument.parentSolutionId = newBaseSolutionId._id
          newSolutionDocument.isReusable = false
          newSolutionDocument.externalId = frameworkDocument.externalId

          newSolutionId = await database.models.solutions.create(_.omit(newSolutionDocument, ["_id"]))

          if (newSolutionId._id) {
            await database.models.programs.updateOne({ _id: programDocument._id }, { $addToSet: { components: newSolutionId._id } })
          }

        }

        let response = {
          message: "Solution generated and mapped to the program.",
          result: newSolutionId._id
        };

        return resolve(response);

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
    * @api {get} /assessment/api/v1/solutions/mapEntityToSolution/:solutionExternalId Map entity id to solution
    * @apiVersion 1.0.0
    * @apiName Map entity id to solution
    * @apiGroup Solutions
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiParam {String} solutionId solution id.
    * @apiUse successBody
    * @apiUse errorBody
    */

  async mapEntityToSolution(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let responseMessage = "Entities updated successfully.";

        let entityIdsFromCSV = await csv().fromString(req.files.entities.data.toString());

        entityIdsFromCSV = entityIdsFromCSV.map(entity => ObjectId(entity.entityIds));

        let solutionDocument = await database.models.solutions.findOne({ externalId: req.params._id }, { entityType: 1 }).lean();

        let entitiesDocument = await database.models.entities.find({ _id: { $in: entityIdsFromCSV }, entityType: solutionDocument.entityType }, { _id: 1 }).lean();

        let entityIds = entitiesDocument.map(entity => entity._id);

        if (entityIdsFromCSV.length != entityIds.length) responseMessage = "Not all entities are updated.";

        await database.models.solutions.updateOne(
          { externalId: req.params._id },
          { $addToSet: { entities: entityIds } }
        )

        return resolve({ message: responseMessage });

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
  * @api {post} /assessment/api/v1/solutions/uploadThemes/{solutionsExternalID} Upload Themes For Solutions
  * @apiVersion 1.0.0
  * @apiName Upload Themes in Solutions
  * @apiGroup Solutions
  * @apiParam {File} themes Mandatory file upload with themes data.
  * @apiSampleRequest /assessment/api/v1/solutions/uploadThemes/EF-DCPCR-2018-001 
  * @apiHeader {String} X-authenticated-user-token Authenticity token   
  * @apiUse successBody
  * @apiUse errorBody
  */
  async uploadThemes(req) {
    return new Promise(async (resolve, reject) => {
      try {

        const fileName = `Solution-Upload-Result`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        })();

        let solutionDocument = await database.models.solutions
          .findOne({ externalId: req.params._id }, { _id: 1 })
          .lean();

        if (!solutionDocument) {
          return resolve({
            status: 404,
            message: "No solution found."
          });
        }

        let headerSequence
        let themes = await csv().fromString(req.files.themes.data.toString()).on('header', (headers) => { headerSequence = headers });

        let solutionThemes = await solutionsHelper.uploadTheme("solutions", solutionDocument._id, themes, headerSequence)

        for (let pointerToEditTheme = 0; pointerToEditTheme < solutionThemes.length; pointerToEditTheme++) {
          input.push(solutionThemes[pointerToEditTheme])
        }

        input.push(null)

      }
      catch (error) {
        reject({
          status: 500,
          message: error,
          errorObject: error
        })
      }
    })
  }

  /**
* @api {post} /assessment/api/v1/solutions/update?solutionExternalId={solutionExternalId} Update Solutions
* @apiVersion 1.0.0
* @apiName update Solutions
* @apiGroup Solutions
* @apiParam {File} Mandatory solution file of type json.
* @apiSampleRequest /assessment/api/v1/solutions/update
* @apiHeader {String} X-authenticated-user-token Authenticity token  
* @apiUse successBody
* @apiUse errorBody
*/

  async update(req) {
    return new Promise(async (resolve, reject) => {
      try {


        let solutionData = JSON.parse(req.files.solution.data.toString());

        let queryObject = {
          externalId: req.query.solutionExternalId
        };

        let solutionDocument = await database.models.solutions.findOne(queryObject, { themes: 0 }).lean()

        if (!solutionDocument) {
          return resolve({
            status: 400,
            message: "Solution doesnot exist"
          });
        }

        let solutionMandatoryField = solutionsHelper.mandatoryField()

        Object.keys(solutionMandatoryField).forEach(eachSolutionMandatoryField => {
          if (solutionDocument[eachSolutionMandatoryField] === undefined && solutionData[eachSolutionMandatoryField] === undefined) {
            solutionData[eachSolutionMandatoryField] = solutionMandatoryField[eachSolutionMandatoryField]
          }
        })

        let updateObject = _.merge(_.omit(solutionDocument, "createdAt"), solutionData)

        updateObject.updatedBy = req.userDetails.id

        await database.models.solutions.findOneAndUpdate({
          _id: solutionDocument._id
        }, updateObject)

        return resolve({
          status: 200,
          message: "Solution updated successfully."
        });
      }
      catch (error) {
        reject({
          status: 500,
          message: error,
          errorObject: error
        })
      }
    })
  }

};
