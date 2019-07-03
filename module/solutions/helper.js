
module.exports = class solutionsHelper {
  static solutionDocument(solutionIds = "all", fields = "all") {
    return new Promise(async (resolve, reject) => {
      try {
        let queryObject = {};

        if (solutionIds != "all") {
          queryObject = {
            _id: {
              $in: solutionIds
            }
          };
        }

        let projectionObject = {};

        if (fields != "all") {
          fields.forEach(element => {
            projectionObject[element] = 1;
          });
        }

        let solutionDocuments = await database.models.solutions
          .find(queryObject, projectionObject)
          .lean();
        return resolve(solutionDocuments);
      } catch (error) {
        return reject(error);
      }
    });
  }

  static checkForScoringSystemFromInsights(solutionId) {
    return new Promise(async (resolve, reject) => {
      try {
        let solutionDocument = await database.models.solutions
          .find(
            {
              _id: solutionId,
              scoringSystem: {
                $exists: true,
                $ne: ""
              }
            },
            {
              scoringSystem: 1
            }
          )
          .lean();

        return resolve(solutionDocument);
      } catch (error) {
        return reject(error);
      }
    });
  }

  static getEntityProfileFields(entityProfileFieldsPerEntityTypes) {
    let entityFieldArray = [];

    Object.values(entityProfileFieldsPerEntityTypes).forEach(
      eachEntityProfileFieldPerEntityType => {
        eachEntityProfileFieldPerEntityType.forEach(eachEntityField => {
          entityFieldArray.push(eachEntityField);
        });
      }
    );
    return entityFieldArray;
  }

  static allSubGroupEntityIdsByGroupName(solutionExternalId = "", groupName = "") {
    return new Promise(async (resolve, reject) => {
      try {
        if (solutionExternalId == "" || groupName == "") {
          throw "Invalid paramters";
        }

        let solutionEntities = await database.models.solutions.findOne(
          {
            externalId: solutionExternalId
          },
          {
            entities: 1
          }
        );

        let allSubGroupEntityIdToParentMap = {};

        if (!(solutionEntities.entities.length > 0)) {
          return resolve(allSubGroupEntityIdToParentMap);
        }

        let groupType = "groups." + groupName;

        let entitiyDocuments = await database.models.entities
          .find(
            {
              _id: {
                $in: solutionEntities.entities
              },
              [groupType]: { $exists: true }
            },
            {
              "metaInformation.name": 1,
              "metaInformation.externalId": 1,
              [groupType]: 1
            }
          )
          .lean();

        entitiyDocuments.forEach(entitiyDocument => {
          entitiyDocument.groups[groupName].forEach(eachSubEntity => {
            allSubGroupEntityIdToParentMap[eachSubEntity.toString()] = {
              parentEntityId: eachSubEntity._id.toString(),
              parentEntityName: entitiyDocument.metaInformation.name
                ? entitiyDocument.metaInformation.name
                : "",
              parentEntityExternalId: entitiyDocument.metaInformation.externalId
                ? entitiyDocument.metaInformation.externalId
                : ""
            };
          });
        });

        return resolve(allSubGroupEntityIdToParentMap);
      } catch (error) {
        return reject(error);
      }
    });
  }

  static updateTheme(modelName, modelExternalId, themesArray, headerSequence) {
    return new Promise(async (resolve, reject) => {
      try {

        let allCriteriaDocument = await database.models.criteria.find(
          {},
          { _id: 1 }
        ).lean();

        let criteriaArray = allCriteriaDocument.map(eachCriteria => eachCriteria._id.toString())

        let splittedFrameworkArray = []
        let frameworkObject = {}
        let valueIncluded = ["theme", "subtheme"]
        let csvArray = []


        // get Array of object with splitted value
        for (let pointerToThemeCsv = 0; pointerToThemeCsv < themesArray.length; pointerToThemeCsv++) {

          let result = {}
          let csvObject = {}
          csvObject = { ...themesArray[pointerToThemeCsv] }
          csvObject["status"] = ""

          Object.keys(themesArray[pointerToThemeCsv]).forEach(eachThemesKey => {

            if (themesArray[pointerToThemeCsv][eachThemesKey] !== "") {

              let themesSplittedArray = themesArray[pointerToThemeCsv][eachThemesKey].split("###")

              if (eachThemesKey !== "criteriaInternalId") {

                if (!valueIncluded.includes(themesSplittedArray[1])) {
                  csvObject["status"] = "Type should be theme or subTheme"
                } else {
                  let name = themesSplittedArray[0] ? themesSplittedArray[0] : ""

                  result[eachThemesKey] = {
                    name: name
                  }

                  frameworkObject[themesSplittedArray[0]] = {
                    name: name,
                    label: eachThemesKey,
                    type: themesSplittedArray[1] ? themesSplittedArray[1] : "",
                    externalId: themesSplittedArray[2],
                    weightage: themesSplittedArray[3] ? themesSplittedArray[3] : 0
                  }
                }
              } else {

                if (criteriaArray.includes(themesSplittedArray[0])) {
                  result[eachThemesKey] = {
                    criteriaId: ObjectId(themesSplittedArray[0]),
                    weightage: themesSplittedArray[1] ? themesSplittedArray[1] : 0,
                  }
                } else {
                  csvObject["status"] = "Criteria is not Present"

                }

              }
            }
          })
          csvArray.push(csvObject)
          splittedFrameworkArray.push(result)
        }

        function tree(frameworkArray, headerData) {
          return frameworkArray.reduce((acc, eachFrameworkData) => {
            headerData.reduce((parent, headerKey, index) => {
              if (index === headerData.length - 1) {
                if (!parent["criteriaId"]) {
                  parent["criteriaId"] = []
                }
                parent.criteriaId.push(eachFrameworkData.criteriaInternalId)

              } else {
                if (eachFrameworkData[headerKey] !== undefined) {
                  parent[eachFrameworkData[headerKey].name] = parent[eachFrameworkData[headerKey].name] ||
                    {}
                  return parent[eachFrameworkData[headerKey].name]
                } else {
                  return parent
                }
              }

            }, acc);
            return acc;
          }, {});
        }

        function themeArray(data) {

          return Object.keys(data).map(function (eachDataKey) {
            let eachData = {}

            if (eachDataKey !== "criteriaId") {
              eachData["name"] = frameworkObject[eachDataKey].name
              eachData["type"] = frameworkObject[eachDataKey].type
              eachData["label"] = frameworkObject[eachDataKey].label
              eachData["externalId"] = frameworkObject[eachDataKey].externalId
              eachData["weightage"] = frameworkObject[eachDataKey].weightage
            }

            if (data[eachDataKey].criteriaId) eachData["criteria"] = data[eachDataKey].criteriaId
            if (eachDataKey !== "criteriaId" && _.isObject(data[eachDataKey])) {
              return _.merge(eachData, data[eachDataKey].criteriaId ? {} : { children: themeArray(data[eachDataKey]) });
            }
          });
        }

        let treeDataOfAnFrameworkObject = tree(splittedFrameworkArray, headerSequence)

        let themesData = themeArray(treeDataOfAnFrameworkObject)

        let checkCsvArray = csvArray.every(csvData => csvData.status === "")

        if (checkCsvArray) {
          await database.models[modelName].findOneAndUpdate({
            externalId: modelExternalId
          }, {
              $set: {
                themes: themesData
              }
            })
        }

        return resolve(csvArray);
      } catch (error) {
        return reject(error);
      }
    });
  }

};
