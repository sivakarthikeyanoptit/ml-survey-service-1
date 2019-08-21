const userExtensionHelper = require(ROOT_PATH + "/module/userExtension/helper")
const entitiesHelper = require(ROOT_PATH + "/module/entities/helper")

module.exports = class Observations extends Abstract {

    constructor() {
        super(observationsSchema);
    }


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

                let userId = req.userDetails.userId
                let searchText = req.searchText
                let pageSize = req.pageSize
                let pageNo = req.pageNo
                let result


                if (req.query.observationId) {
                    result = await this.searchEntitiesByObservation(req.query.observationId, userId)
                }

                if (req.query.solutionId) {
                    result = await this.searchEntitiesBySolution(req.query.solutionId, userId)
                }

                let entityDocuments = await entitiesHelper.search(result.entityTypeId, searchText, pageSize, pageNo, result.userExtension ? result.userExtension : false);
                let responseDocument = this.searchEntitiesResponse(entityDocuments, result.entities ? result.entities : false)
                return resolve(responseDocument);

            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || error,
                    errorObject: error
                });
            }

        });

    }

    searchEntitiesByObservation(observationId, userId) {
        return new Promise(async (resolve, reject) => {
            try {

                let observationDocument = await database.models.observations.findOne(
                    {
                        _id: observationId,
                        createdBy: userId,

                    },
                    {
                        entityTypeId: 1,
                        entities: 1
                    }
                ).lean();

                if (!observationDocument) throw { status: 400, message: "Observation not found for given params." }

                return resolve({
                    entityTypeId: observationDocument.entityTypeId,
                    entities: observationDocument.entities
                });
            }
            catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || error,
                    errorObject: error
                })
            }
        })
    }

    searchEntitiesBySolution(solutionId, userId) {
        return new Promise(async (resolve, reject) => {
            try {

                let solutionDocument = await database.models.solutions.findOne(
                    {
                        _id: solutionId,

                    },
                    {
                        entityTypeId: 1,
                    }
                ).lean();

                if (!solutionDocument) throw { status: 400, message: "Solution not found for given params." }

                let userExtensionDocument = await userExtensionHelper.entities(userId)

                return resolve({
                    entityTypeId: solutionDocument.entityTypeId,
                    userExtension: userExtensionDocument.entities
                });
            }
            catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || error,
                    errorObject: error
                })
            }
        })
    }

    searchEntitiesResponse(entityDocuments, observationEntities) {

        let response = {
            result: {}
        };

        if (observationEntities && observationEntities.length > 0) {
            let observationEntityIds = observationEntities.map(entity => entity.toString());

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

        return response;
    }


}