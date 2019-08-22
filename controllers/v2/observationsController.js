const userExtensionHelper = require(ROOT_PATH + "/module/userExtension/helper")
const entitiesHelper = require(ROOT_PATH + "/module/entities/helper")
const observationsHelper = require(ROOT_PATH + "/module/observations/helper")
const solutionsHelper = require(ROOT_PATH + "/module/solutions/helper")
const v1Observation = require(ROOT_PATH + "/controllers/v1/observationsController")

module.exports = class Observations extends v1Observation {


    /**
     * @api {get} /assessment/api/v2/observations/searchEntities?solutionId=:solutionId&&search=:searchText&&limit=1&&page=1 Search Entities based on observationId or solutionId
     * @apiVersion 0.0.2
     * @apiName Search Entities
     * @apiGroup Observations
     * @apiHeader {String} X-authenticated-user-token Authenticity token
     * @apiSampleRequest /assessment/api/v1/observations/searchEntities?observationId=5d4bdcab44277a08145d7258&&search=a&&limit=10&&page=1
     * @apiUse successBody
     * @apiUse errorBody
     */

    async searchEntities(req) {

        return new Promise(async (resolve, reject) => {

            try {

                let response = {
                    result: {}
                };

                let userId = req.userDetails.userId
                let result

                let findQuery = {}
                let projection = {}


                if (req.query.observationId) {
                    findQuery["_id"] = req.query.observationId
                    findQuery["createdBy"] = userId
                    projection["entityTypeId"] = 1
                    projection["entities"] = 1

                    result = await observationsHelper.getObservationDocument(findQuery, projection)
                }

                if (req.query.solutionId) {
                    findQuery["_id"] = req.query.solutionId
                    projection["entityTypeId"] = 1

                    let solutionDocument = await solutionsHelper.getSolutionDocument(findQuery, projection)
                    let userExtensionDocument = await userExtensionHelper.entities(userId)
                    result = _.merge(solutionDocument, userExtensionDocument)
                }


                let entityDocuments = await entitiesHelper.search(result.entityTypeId, req.searchText, req.pageSize, req.pageNo, result.userExtensionEntities ? result.userExtensionEntities : false);

                if (result.entities && result.entities.length > 0) {
                    let observationEntityIds = result.entities.map(entity => entity.toString());

                    entityDocuments[0].data.forEach(eachMetaData => {
                        eachMetaData.selected = (observationEntityIds.includes(eachMetaData._id.toString())) ? true : false;
                    })
                }

                let messageData = "Entities fetched successfully"
                if (!entityDocuments[0].count) {
                    entityDocuments[0].count = 0
                    messageData = "No entities found"
                }
                response.result = entityDocuments
                response["message"] = messageData

                return resolve(response);

            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || error,
                    errorObject: error
                });
            }

        });

    }

}