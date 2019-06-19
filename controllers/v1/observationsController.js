const observationsHelper = require(ROOT_PATH + "/module/observations/helper")
const entitiesHelper = require(ROOT_PATH + "/module/entities/helper")

module.exports = class Observations extends Abstract {

    /**
     * @apiDefine errorBody
     * @apiError {String} status 4XX,5XX
     * @apiError {String} message Error
     */

    /**
       * @apiDefine successBody
       *  @apiSuccess {String} status 200
       * @apiSuccess {String} result Data
       */

    constructor() {
        super(observationsSchema);
    }

    /**
    * @api {get} /assessment/api/v1/observations/solutions/:entityTypeId Observation Solution
    * @apiVersion 0.0.1
    * @apiName Observation Solution
    * @apiGroup Observations
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/observations/solutions
    * @apiUse successBody
    * @apiUse errorBody
    */

    async solutions(req) {

        return new Promise(async (resolve, reject) => {

            try {

                if (!req.params._id) {
                    let responseMessage = "Bad request.";
                    return resolve({ status: 400, message: responseMessage })
                }


                let solutionsData = await database.models.solutions.find({
                    entityTypeId: ObjectId(req.params._id),
                    type: "observation",
                    isReusable: true
                }, {
                        name: 1,
                        description: 1,
                        externalId: 1,
                        programId: 1,
                        entityTypeId: 1
                    }).lean();

                return resolve({
                    message: "Solution list fetched successfully.",
                    result: solutionsData
                });

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
    * @api {get} /assessment/api/v1/observations/metaForm/:solutionId Observation Creation Meta Form
    * @apiVersion 0.0.1
    * @apiName Observation Creation Meta Form
    * @apiGroup Observations
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/observations/metaForm
    * @apiUse successBody
    * @apiUse errorBody
    */

    async metaForm(req) {

        return new Promise(async (resolve, reject) => {

            try {

                if (!req.params._id) {
                    let responseMessage = "Bad request.";
                    return resolve({ status: 400, message: responseMessage })
                }


                let solutionsData = await database.models.solutions.findOne({
                    _id: ObjectId(req.params._id),
                    isReusable: true
                }, {
                        observationMetaFormKey: 1
                    }).lean();


                if (!solutionsData._id) {
                    let responseMessage = "Bad request.";
                    return resolve({ status: 400, message: responseMessage })
                }

                let observationsMetaForm = await database.models.forms.findOne({ "name": (solutionsData.observationMetaFormKey && solutionsData.observationMetaFormKey != "") ? solutionsData.observationMetaFormKey : "defaultObservationMetaForm" }, { value: 1 }).lean();

                return resolve({
                    message: "Observation meta fetched successfully.",
                    result: observationsMetaForm.value
                });

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
     * @api {post} /assessment/api/v1/observations/create?solutionId=:solutionInternalId Create Observation
     * @apiVersion 0.0.1
     * @apiName Create Observation
     * @apiGroup Observations
     * @apiParamExample {json} Request-Body:
     * {
     *	    "data": {
     *          "name": String,
     *          "description": String,
     *          "startDate": String,
     *          "endDate": String,
     *          "status": String
     *      }
     * }
     * @apiUse successBody
     * @apiUse errorBody
     */
    create(req) {
        return new Promise(async (resolve, reject) => {

            try {

                if (!req.query.solutionId || req.query.solutionId == "") {
                    let responseMessage = "Bad request.";
                    return resolve({ status: 400, message: responseMessage })
                }

                let result = await observationsHelper.create(req.query.solutionId, req.body.data, req.userDetails);

                return resolve({
                    message: "Observation created successfully.",
                    result: result
                });

            } catch (error) {

                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! something went wrong.",
                    errorObject: error
                })

            }


        })
    }


    /**
     * @api {get} /assessment/api/v1/observations/list Observations list
     * @apiVersion 0.0.1
     * @apiName Observations list
     * @apiGroup Observations
     * @apiHeader {String} X-authenticated-user-token Authenticity token
     * @apiSampleRequest /assessment/api/v1/observations/list
     * @apiUse successBody
     * @apiUse errorBody
     */

    async list(req) {

        return new Promise(async (resolve, reject) => {

            try {

                let observations = new Array;

                let assessorObservationsQueryObject = [
                    {
                        $match: {
                            createdBy: req.userDetails.userId
                        }
                    },
                    {
                        $lookup: {
                            from: "entities",
                            localField: "entities",
                            foreignField: "_id",
                            as: "entityDocuments"
                        }
                    },
                    {
                        $project: {
                            "name": 1,
                            "description": 1,
                            "entities": 1,
                            "startDate": 1,
                            "endDate": 1,
                            "status": 1,
                            "solutionId": 1,
                            "entityDocuments._id": 1,
                            "entityDocuments.metaInformation.externalId": 1,
                            "entityDocuments.metaInformation.name": 1
                        }
                    }
                ];

                const userObservations = await database.models.observations.aggregate(assessorObservationsQueryObject)

                let observation

                for (let pointerToAssessorObservationArray = 0; pointerToAssessorObservationArray < userObservations.length; pointerToAssessorObservationArray++) {

                    observation = userObservations[pointerToAssessorObservationArray];
                    observation.entities = new Array
                    observation.entityDocuments.forEach(observationEntity => {
                        observation.entities.push({
                            _id: observationEntity._id,
                            ...observationEntity.metaInformation
                        })
                    })
                    observations.push(_.omit(observation, ["entityDocuments"]))
                }

                let responseMessage = "Observation list fetched successfully"

                return resolve({
                    message: responseMessage,
                    result: observations
                });

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
     * @api {post} /assessment/api/v1/observations/addEntityToObservation/:observationId Map entities to observations
     * @apiVersion 0.0.1
     * @apiName Map entities to observations
     * @apiGroup Observations
    * @apiParamExample {json} Request-Body:
     * {
     *	    "data": ["5beaa888af0065f0e0a10515","5beaa888af0065f0e0a10516"]
     * }
     * @apiUse successBody
     * @apiUse errorBody
     */

    async addEntityToObservation(req) {

        return new Promise(async (resolve, reject) => {

            try {

                let responseMessage = "Updated successfully."

                let observationDocument = await database.models.observations.findOne(
                    {
                        _id: req.params._id
                    },
                    {
                        entityTypeId: 1,
                        status: 1
                    }
                ).lean()

                if (observationDocument.status != "published") {
                    return resolve({
                        status: 400,
                        message: "Observation already completed or not published."
                    })
                }

                let entitiesDocuments = await database.models.entities.find(
                    {
                        _id: { $in: gen.utils.arrayIdsTobjectIds(req.body.data) },
                        entityTypeId: observationDocument.entityTypeId
                    },
                    {
                        _id: 1
                    }
                );

                let entityIds = entitiesDocuments.map(entityId => entityId._id);

                await database.models.observations.updateOne(
                    {
                        _id: observationDocument._id
                    },
                    {
                        $addToSet: { entities: entityIds }
                    }
                );

                if (entityIds.length != req.body.data.length) {
                    responseMessage = "Not all entities are updated."
                }

                return resolve({
                    message: responseMessage
                })


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
     * @api {post} /assessment/api/v1/observations/removeEntityFromObservation/:observationId Un Map entities to observations
     * @apiVersion 0.0.1
     * @apiName Un Map entities to observations
     * @apiGroup Observations
    * @apiParamExample {json} Request-Body:
     * {
     *	    "data": ["5beaa888af0065f0e0a10515","5beaa888af0065f0e0a10516"]
     * }
     * @apiUse successBody
     * @apiUse errorBody
     */
    async removeEntityFromObservation(req) {

        return new Promise(async (resolve, reject) => {

            try {

                await database.models.observations.updateOne(
                    {
                        _id: ObjectId(req.params._id)
                    },
                    {
                        $pull: {
                            entities: { $in: gen.utils.arrayIdsTobjectIds(req.body.data) }
                        }
                    }
                );

                return resolve({
                    message: "Entity Removed successfully."
                })


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
     * @api {get} /assessment/api/v1/observations/search/:observationId Search Entities
     * @apiVersion 0.0.1
     * @apiName Search Entities
     * @apiGroup Observations
     * @apiHeader {String} X-authenticated-user-token Authenticity token
     * @apiSampleRequest /assessment/api/v1/observations/search/:observationId
     * @apiUse successBody
     * @apiUse errorBody
     */
    async search(req) {

        return new Promise(async (resolve, reject) => {

            try {

                let response = {
                    message: "Entities fetched successfully",
                    result: {}
                };


                let observationDocument = await database.models.observations.findOne(
                    {
                        _id: req.params._id
                    },
                    {
                        entityTypeId: 1
                    }
                ).lean();

                if (!observationDocument) throw { status: 400, message: "Observation not found for given params." }

                let entityDocuments = await entitiesHelper.search(observationDocument.entityTypeId, req.searchText, req.pageSize, req.pageNo);

                response.result = entityDocuments

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
