const userExtensionHelper = require(ROOT_PATH + "/module/userExtension/helper")
const entitiesHelper = require(ROOT_PATH + "/module/entities/helper")
const observationsHelper = require(ROOT_PATH + "/module/observations/helper")
const solutionsHelper = require(ROOT_PATH + "/module/solutions/helper")
const v1Observation = require(ROOT_PATH + "/controllers/v1/observationsController")

module.exports = class Observations extends v1Observation {


    /**
     * @api {get} /assessment/api/v2/observations/searchEntities?solutionId=:solutionId&search=:searchText&limit=1&page=1 Search Entities based on observationId or solutionId
     * @apiVersion 0.0.2
     * @apiName Search Entities
     * @apiGroup Observations
     * @apiHeader {String} X-authenticated-user-token Authenticity token
     * @apiSampleRequest /assessment/api/v1/observations/searchEntities?observationId=5d4bdcab44277a08145d7258&search=a&limit=10&page=1
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

                let projection = []

                if (req.query.observationId) {
                    let findObject = {}
                    findObject["_id"] = req.query.observationId
                    findObject["createdBy"] = userId

                    projection.push("entityTypeId", "entities")

                    let observationDocument = await observationsHelper.observationDocument(findObject, projection)
                    result = observationDocument[0]
                }

                if (req.query.solutionId) {
                    let findQuery = []
                    findQuery.push(req.query.solutionId)
                    projection.push("entityTypeId")

                    let solutionDocument = await solutionsHelper.solutionDocument(findQuery, projection)
                    result = _.merge(solutionDocument[0])
                }

                let userAllowedEntities = new Array
                
                try {
                    userAllowedEntities = await userExtensionHelper.getUserEntities(userId)
                } catch (error) {
                    userAllowedEntities = []
                }
                

                let entityDocuments = await entitiesHelper.search(result.entityTypeId, req.searchText, req.pageSize, req.pageNo, userAllowedEntities && userAllowedEntities.length > 0 ? userAllowedEntities : false);

                if (result.entities && result.entities.length > 0) {
                    let observationEntityIds = result.entities.map(entity => entity.toString());

                    entityDocuments[0].data.forEach(eachMetaData => {
                        eachMetaData.selected = (observationEntityIds.includes(eachMetaData._id.toString())) ? true : false;
                    })
                }

                let messageData = "Entities fetched successfully"
                if (!entityDocuments[0].count) {
                    entityDocuments[0].count = 0
                    messageData = "No entity found"
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