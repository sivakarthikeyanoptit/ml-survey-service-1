
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

  static uploadTheme(modelName, modelId, themes, headerSequence) {
    return new Promise(async (resolve, reject) => {
      try {

        let allCriteriaDocument = await database.models.criteria.find(
          {},
          { _id: 1 }
        ).lean();

        let criteriaArray = allCriteriaDocument.map(eachCriteria => eachCriteria._id.toString())

        let modifiedThemes = []
        let themeObject = {}
        let csvArray = []


        // get Array of object with splitted value
        for (let pointerToTheme = 0; pointerToTheme < themes.length; pointerToTheme++) {

          let result = {}
          let csvObject = {}

          csvObject = { ...themes[pointerToTheme] }
          csvObject["status"] = ""
          let themesKey = Object.keys(themes[pointerToTheme])
          let firstThemeKey = themesKey[0]

          themesKey.forEach(themeKey => {

            if (themes[pointerToTheme][themeKey] !== "") {

              let themesSplittedArray = themes[pointerToTheme][themeKey].split("###")


              if (themeKey !== "criteriaInternalId") {
                if (themesSplittedArray.length < 2) {
                  csvObject["status"] = "Name or externalId is missing "

                } else {
                  let name = themesSplittedArray[0] ? themesSplittedArray[0] : ""

                  result[themeKey] = {
                    name: name
                  }

                  themeObject[themesSplittedArray[0]] = {
                    name: name,
                    label: themeKey,
                    type: firstThemeKey === themeKey ? "theme" : "subtheme",
                    externalId: themesSplittedArray[1],
                    weightage: themesSplittedArray[2] ? parseInt(themesSplittedArray[2]) : 0
                  }
                }
              } else {

                if (criteriaArray.includes(themesSplittedArray[0])) {
                  result[themeKey] = {
                    criteriaId: ObjectId(themesSplittedArray[0]),
                    weightage: themesSplittedArray[1] ? parseInt(themesSplittedArray[1]) : 0,
                  }
                } else {
                  csvObject["status"] = "Criteria is not Present"

                }

              }

            }
          })
          csvArray.push(csvObject)
          modifiedThemes.push(result)
        }

        function generateNestedThemes(nestedThemes, headerData) {
          return nestedThemes.reduce((acc, eachFrameworkData) => {
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
              eachData["name"] = themeObject[eachDataKey].name
              eachData["type"] = themeObject[eachDataKey].type
              eachData["label"] = themeObject[eachDataKey].label
              eachData["externalId"] = themeObject[eachDataKey].externalId
              eachData["weightage"] = themeObject[eachDataKey].weightage
            }

            if (data[eachDataKey].criteriaId) eachData["criteria"] = data[eachDataKey].criteriaId
            if (eachDataKey !== "criteriaId" && _.isObject(data[eachDataKey])) {
              return _.merge(eachData, data[eachDataKey].criteriaId ? {} : { children: themeArray(data[eachDataKey]) });
            }
          });
        }

        let checkCsvArray = csvArray.every(csvData => csvData.status === "")

        if (checkCsvArray) {

          csvArray = csvArray.map(csvData => {
            csvData.status = "success"
            return csvData
          })

          let nestedThemeObject = generateNestedThemes(modifiedThemes, headerSequence)

          let themesData = themeArray(nestedThemeObject)

          await database.models[modelName].findOneAndUpdate({
            _id: modelId
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

  static search(entityTypeId = "notRequired", searchText, pageSize, pageNo, type) {
    return new Promise(async (resolve, reject) => {
      try {

        let solutionDocument = []

        let matchQuery = {}
        matchQuery["$match"] = {}

        if (entityTypeId !== "notRequired") {
          matchQuery["$match"]["entityTypeId"] = ObjectId(entityTypeId);
        }

        matchQuery["$match"]["type"] = type
        matchQuery["$match"]["isReusable"] = true

        let projection1 = {}
        projection1["$project"] = {
          name: 1,
          description: 1,
          keywords: 1,
          externalId: 1,
          programId: 1,
          entityTypeId: 1
        };

        let facetQuery = {}
        facetQuery["$facet"] = {}

        facetQuery["$facet"]["totalCount"] = [
          { "$count": "count" }
        ]

        facetQuery["$facet"]["data"] = [{
          $unwind: "$externalId"
        }]

        let projection2 = {}
        projection2["$project"] = {
          "data": 1,
          "count": {
            $arrayElemAt: ["$totalCount.count", 0]
          }
        }

        if (searchText && pageSize && pageNo) {

          matchQuery["$match"]["$or"] = []
          matchQuery["$match"]["$or"].push({ "name": new RegExp(searchText, 'i') }, { "description": new RegExp(searchText, 'i') }, { "keywords": new RegExp(searchText, 'i') })

          facetQuery["$facet"]["data"] = [
            { $skip: pageSize * (pageNo - 1) },
            { $limit: pageSize }
          ]
        }

        solutionDocument.push(matchQuery, projection1, facetQuery, projection2)

        let solutionDocuments = await database.models.solutions.aggregate(solutionDocument)

        return resolve(solutionDocuments)

      } catch (error) {
        return reject(error);
      }
    })
  }

  static mandatoryField() {

    let mandatoryFields = {
      type: "assessment",
      subType: "institutional",

      status: "active",

      isDeleted: false,

      roles: {
        projectManagers: {
          acl: {
            entityProfile: {
              editable: [
                "all"
              ],
              visible: [
                "all"
              ]
            }
          }
        },
        leadAssessors: {
          acl: {
            entityProfile: {
              editable: [
                "all"
              ],
              visible: [
                "all"
              ]
            }
          }
        },
        assessors: {
          acl: {
            entityProfile: {
              editable: [
                "all"
              ],
              visible: [
                "all"
              ]
            }
          }
        }
      },

      evidenceMethods: {
        LW: {
          "externalId": "LW",
          "tip": "Some tip for the criteria.",
          "name": "Learning Walk",
          "description": "Criteria description",
          "modeOfCollection": "onfield",
          "canBeNotApplicable": true,
          "notApplicable": false,
          "canBeNotAllowed": true,
          "remarks": ""
        }
      },
      registry: [
        "schoolLeader",
        "teacher"
      ],
      type: "assessment",
      subType: "institutional",
      entityProfileFieldsPerEntityTypes: {
        "A1": [
          "externalId",
          "emailId",
          "addressLine1",
          "addressLine2",
          "city",
          "name",
          "phone",
          "principalName",
          "pincode",
          "administration",
          "gender",
          "shift",
          "types",
          "totalStudents",
          "totalBoys",
          "totalGirls",
          "lowestGrade",
          "highestGrade",
          "gpsLocation",
          "totalSection",
          "totalTeachersPresentInTheSchool",
          "totalEnglishTeachers",
          "totalHindiTeachers",
          "totalMathsTeachers",
          "totalScienceTeachers",
          "totalSocialTeachers",
          "totalSocialScienceTeachers",
          "totalComputerTeachers",
          "totalStudentsInGrade9",
          "totalStudentsInGrade10",
          "totalStudentsInGrade11",
          "totalStudentsInGrade12",
          "mediumOfInstruction"
        ],
        "A3": [
          "totalSanctionedTeachingPosts",
          "totalFilledTeachingPosts",
          "totalPermanentTeachers",
          "totalGuestTeachers"
        ],
        "A4": [
          "totalPrimaryTeachersHavingDiploma",
          "totalTeachersTeaching6to10",
          "totalCTETQualifiedTeachers",
          "totalStudentsAdmittedIn2018-19InLowestClass",
          "totalEWS/DGStudentsStudyingIn2018-19InLowestClass",
          "totalStudentsAdmittedLastYearInLowestClass",
          "totalEWS/DGStudentsAdmittedLastYearInLowestClass",
          "totalEWS/DGStudentsCurrentlyStudyingInSecondLowestClass"
        ],
        "A5": [
          "totalPhysicsTeachers",
          "totalChemistryTeachers",
          "totalBiologyTeachers",
          "totalEconomicsTeachers",
          "totalPoliticalScienceTeachers",
          "totalAccountsTeachers",
          "totalBusinessStudiesTeachers",
          "totalHistoryTeachers",
          "totalGeographyTeachers",
          "streamOffered"
        ]
      }

    }

    return mandatoryFields

  }
};
