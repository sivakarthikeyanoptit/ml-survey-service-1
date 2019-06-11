
module.exports = class programsHelper {



  static programDocument(programIds = "all", fields = "all", pageIndex = "all", pageSize = "all") {

    return new Promise(async (resolve, reject) => {

      try {

        let queryObject = {}

        if (programIds != "all") {
          queryObject = {
            _id: {
              $in: programIds
            }
          }
        }

        let projectionObject = {}

        if (fields != "all") {
          fields.forEach(element => {
            projectionObject[element] = 1
          });
        }

        let pageIndexValue = 0;
        let limitingValue = 0;

        if (pageIndex != "all" && pageSize !== "all") {
          pageIndexValue = (pageIndex - 1) * pageSize;
          limitingValue = pageSize;
        }

        let programDocuments = await database.models.programs.find(queryObject, projectionObject).skip(pageIndexValue).limit(limitingValue)

        return resolve(programDocuments)

      } catch (error) {

        return reject(error);

      }

    })
  }
};