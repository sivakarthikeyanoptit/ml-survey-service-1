const csv = require("csvtojson");
const solutionsHelper = require(ROOT_PATH + "/module/solutions/helper");
const criteriaHelper = require(ROOT_PATH + "/module/criteria/helper");
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
  * @apiParamExample {json} Response:
  * {
  * "result":{
  * "heading":"Solution Framework + rubric for - DCPCR Assessment Framework 2018",
  * "sections": [
  * {
  *  "table": true,
  * "data": [
  * {
  * "criteriaName": "Availability of School Leadership",
  * "L1": "School does not have a principal or vice-principal; there is  a teacher in-charge of the post",
  * "L2": "The school principal is not available only vice principal is available or vice principal has assumed charge as principal.  Most teachers are involved in administrative work along with principal / vice principal",
  * "L3": "The school has full time principal but no vice principal and some teachers are involved in administrative work along with principal / vice principal.",
  * "L4": "School has a full-time principal and vice principal as per norms (if applicable) or in case where vice principal is not mandated, Only principal and vice principal are involved in administrative work."
  * }
  * ]
  * }
  * ]
  * }
  * }
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
  * 
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

  /**
  * @api {post} /assessment/api/v1/solutions/uploadThemesRubricExpressions/{{solutionsExternalID}} Upload Rubric For Themes Of Solutions
  * @apiVersion 1.0.0
  * @apiName Upload Rubric For Themes Of Solutions
  * @apiGroup Solutions
  * @apiParam {File} themes Mandatory file upload with themes data.
  * @apiSampleRequest /assessment/api/v1/solutions/uploadThemesRubricExpressions/EF-DCPCR-2018-001 
  * @apiHeader {String} X-authenticated-user-token Authenticity token   
  * @apiUse successBody
  * @apiUse errorBody
  */
  async uploadThemesRubricExpressions(req) {

    return new Promise(async (resolve, reject) => {

      try {

        let solutionDocument = await database.models.solutions.findOne({
          externalId: req.params._id,
          scoringSystem : "pointsBasedScoring"
        }, { themes: 1, levelToScoreMapping : 1 }).lean()

        if (!solutionDocument) {
          return resolve({
            status: 400,
            message: "Solution does not exist"
          });
        }

        let themeData = await csv().fromString(req.files.themes.data.toString());

        if(!themeData.length>0) {
          throw new Error("Bad data.")
        }

        let solutionLevelKeys = new Array

        Object.keys(solutionDocument.levelToScoreMapping).forEach(level => {
          solutionLevelKeys.push(level)
        })

        const themesWithRubricDetails = await solutionsHelper.setThemeRubricExpressions(solutionDocument.themes, themeData, solutionLevelKeys)

        if(themesWithRubricDetails.themes) {
          await database.models.solutions.findOneAndUpdate(
            { _id: solutionDocument._id },
            {
                themes : themesWithRubricDetails.themes
            }
          );
        }

        const fileName = `Solution-Theme-Rubric-Upload-Result`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        })();

        if(!themesWithRubricDetails.csvData) {
          throw new Error("Something went wrong! No CSV Data found.")
        }

        for (let pointerToThemeRow = 0; pointerToThemeRow < themesWithRubricDetails.csvData.length; pointerToThemeRow++) {
          input.push(themesWithRubricDetails.csvData[pointerToThemeRow])
        }

        input.push(null)

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }

  /**
  * @api {post} /assessment/api/v1/solutions/uploadCriteriaRubricExpressions/{{solutionsExternalID}} Upload Rubric For Criteria Of Solutions
  * @apiVersion 1.0.0
  * @apiName Upload Rubric For Criteria Of Solutions
  * @apiGroup Solutions
  * @apiParam {File} criteria Mandatory file upload with criteria data.
  * @apiSampleRequest /assessment/api/v1/solutions/uploadCriteriaRubricExpressions/EF-DCPCR-2018-001 
  * @apiHeader {String} X-authenticated-user-token Authenticity token   
  * @apiUse successBody
  * @apiUse errorBody
  */
  async uploadCriteriaRubricExpressions(req) {

    return new Promise(async (resolve, reject) => {

      try {

        let solutionDocument = await database.models.solutions.findOne({
          externalId: req.params._id,
        }, { themes: 1, levelToScoreMapping: 1, type : 1, subType : 1 }).lean()

        if (!solutionDocument) {
          return resolve({
            status: 400,
            message: "Solution does not exist"
          });
        }

        let criteriaData = await csv().fromString(req.files.criteria.data.toString());

        if(!criteriaData.length>0) {
          throw new Error("Bad data.")
        }

        let solutionLevelKeys = new Array

        Object.keys(solutionDocument.levelToScoreMapping).forEach(level => {
          solutionLevelKeys.push(level)
        })

        let allCriteriaIdInSolution = new Array
        let allCriteriaIdWithWeightageInSolution = {}
        let allCriteriaExternalIdToInternalIdMap = {}
        let allCriteriaInSolution = gen.utils.getCriteriaIdsAndWeightage(solutionDocument.themes);

        allCriteriaInSolution.forEach(eachCriteria => {
          allCriteriaIdInSolution.push(eachCriteria.criteriaId)
          allCriteriaIdWithWeightageInSolution[eachCriteria.criteriaId.toString()] = {
            criteriaId: eachCriteria.criteriaId,
            weightage: eachCriteria.weightage
          }
        })

        let allCriteriaDocuments = await database.models.criteria.find({
          _id: {
            $in : allCriteriaIdInSolution
          },
        }, { _id: 1, externalId : 1, name: 1, description: 1, criteriaType: 1, rubric: 1}).lean()

        if (!allCriteriaDocuments || allCriteriaDocuments.length < 1) {
          criteriaData = criteriaData.map(function(criteriaRow) {
            criteriaRow.status = "No criteria found for the solution.";
            return criteriaRow;
          })
        } else {
          allCriteriaDocuments.forEach(criteriaDocument => {
            allCriteriaExternalIdToInternalIdMap[criteriaDocument.externalId] = criteriaDocument
          })
        }

        let allCriteriaRubricUpdatedSuccessfully = true

        let criteriaWeightageToUpdate = new Array

        if(Object.keys(allCriteriaExternalIdToInternalIdMap).length > 0) {

          criteriaData = await Promise.all(criteriaData.map(async (criteriaRow) => {
            
            criteriaRow = gen.utils.valueParser(criteriaRow)
            
            if(!allCriteriaExternalIdToInternalIdMap[criteriaRow.externalId]) {
              criteriaRow.status = "Invalid criteria external ID.";
              allCriteriaRubricUpdatedSuccessfully = false
              return criteriaRow;
            }

            const criteriaId = allCriteriaExternalIdToInternalIdMap[criteriaRow.externalId]._id

            let criteriaRubricUpdation = await criteriaHelper.setCriteriaRubricExpressions(criteriaId, allCriteriaExternalIdToInternalIdMap[criteriaRow.externalId], criteriaRow)
            
            if(criteriaRubricUpdation.success) {
              criteriaRow.status = "Success.";
            }

            if(criteriaRow.hasOwnProperty('weightage') && allCriteriaIdWithWeightageInSolution[criteriaId.toString()].weightage != criteriaRow.weightage) {
              criteriaWeightageToUpdate.push({
                criteriaId :  criteriaId,
                weightage : criteriaRow.weightage
              })
              allCriteriaIdWithWeightageInSolution[criteriaId.toString()] = {
                criteriaId: criteriaId,
                weightage: criteriaRow.weightage
              }
            }

            return criteriaRow

          }));
        }

        let updateSubmissions = false
        if(allCriteriaRubricUpdatedSuccessfully) {

          if(Object.keys(criteriaWeightageToUpdate).length > 0) {

            const solutionThemes = await solutionsHelper.updateCriteriaWeightageInThemes(solutionDocument.themes, criteriaWeightageToUpdate)

            if(solutionThemes.success && solutionThemes.themes) {
              await database.models.solutions.findOneAndUpdate(
                { _id: solutionDocument._id },
                {
                    themes : solutionThemes.themes
                }
              );
              updateSubmissions = true
            }

          } else {
            updateSubmissions = true
          }

        }

        if(updateSubmissions) {

          let criteriaQuestionDocument = await database.models.criteriaQuestions.find({ _id: { $in: allCriteriaIdInSolution } })

          let submissionDocumentCriterias = new Array

          criteriaQuestionDocument.forEach(criteria => {
            criteria.weightage = allCriteriaIdWithWeightageInSolution[criteria._id.toString()].weightage
            submissionDocumentCriterias.push(
              _.omit(criteria._doc, [
                "resourceType",
                "language",
                "keywords",
                "concepts",
                "createdFor",
                "evidences"
              ])
            );
          });

          let updatedCriteriasObject = {}

          if(submissionDocumentCriterias.length > 0) {
            updatedCriteriasObject.$set = {
              criteria: submissionDocumentCriterias
            }
          }

          let submissionCollectionToUpdate = ""

          if(updatedCriteriasObject.$set.criteria) {
            if(solutionDocument.type == "observation") {
              submissionCollectionToUpdate = "observationSubmissions"
            } else if(solutionDocument.type == "assessment") {
              submissionCollectionToUpdate = "submissions"
            }
          }

          if(submissionCollectionToUpdate != "") {
            await database.models[submissionCollectionToUpdate].updateMany(
              { solutionId: solutionDocument._id },
              updatedCriteriasObject
            );
          }

        }

        const fileName = `Solution-Criteria-Rubric-Upload-Result`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        })();

        for (let pointerToCriteriaRow = 0; pointerToCriteriaRow < criteriaData.length; pointerToCriteriaRow++) {
          input.push(criteriaData[pointerToCriteriaRow])
        }

        input.push(null)

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }

};
