
module.exports = class solutionsHelper {

    static solutionDocument(solutionIds = "all", fields = "all") {
        return new Promise(async (resolve, reject) => {
            try {

                let queryObject = {}

                if (solutionIds != "all") {
                    queryObject = {
                        _id: {
                            $in: solutionIds
                        }
                    }
                }


                let projectionObject = {}

                if (fields != "all") {
                    fields.forEach(element => {
                        projectionObject[element] = 1
                    });
                }

                let solutionDocuments = await database.models.solutions.find(queryObject, projectionObject);
                return resolve(solutionDocuments)

            } catch (error) {
                return reject(error);
            }
        })

    }

    static checkForScoringSystemFromInsights(solutionId) {
        return new Promise(async (resolve, reject) => {
            try {

                let solutionDocument = await database.models.solutions.find(
                    {
                      _id: solutionId,
                      scoringSystem: {
                        $exists: true,
                        $ne:  ""
                      }
                    },
                    {
                      scoringSystem:1
                    }
                  ).lean()
                  
                  return resolve(solutionDocument)


            } catch (error) {
                return reject(error);
            }

        })

    }

    static getEntityProfileFields(entityProfileFieldsPerEntityTypes) {
        let entityFieldArray = [];
      
        Object.values(entityProfileFieldsPerEntityTypes).forEach(eachEntityProfileFieldPerEntityType => {
          eachEntityProfileFieldPerEntityType.forEach(eachEntityField => {
            entityFieldArray.push(eachEntityField)
          })
        })
        return entityFieldArray;
    }
};