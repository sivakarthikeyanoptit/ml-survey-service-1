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
};
