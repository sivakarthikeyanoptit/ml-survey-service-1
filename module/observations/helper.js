const entitiesHelper = require(ROOT_PATH + "/module/entities/helper")
const slackClient = require(ROOT_PATH + "/generics/helpers/slackCommunications");
const kafkaClient = require(ROOT_PATH + "/generics/helpers/kafkaCommunications");

module.exports = class observationsHelper {

    static observationDocument(findQuery = "all", fields = "all") {
        return new Promise(async (resolve, reject) => {
            try {
                let queryObject = {};

                if (findQuery != "all") {
                    queryObject = _.merge(queryObject, findQuery)
                }

                let projectionObject = {};

                if (fields != "all") {
                    fields.forEach(element => {
                        projectionObject[element] = 1;
                    });
                }

                let observationDocuments = await database.models.observations
                    .find(queryObject, projectionObject)
                    .lean();
                return resolve(observationDocuments);
            } catch (error) {
                return reject(error);
            }
        });
    }

    static create(solutionId, data, userDetails) {
        return new Promise(async (resolve, reject) => {
            try {

                let solutionDocument = await database.models.solutions.findOne({
                    _id: ObjectId(solutionId),
                    isReusable: true
                }, {
                        _id: 1,
                        frameworkId: 1,
                        frameworkExternalId: 1,
                        externalId: 1,
                        entityTypeId: 1,
                        entityType: 1
                    }).lean();

                if (!solutionDocument) throw "No solution id found."

                if (data.entities) {
                    let entitiesToAdd = await entitiesHelper.validateEntities(data.entities, solutionDocument.entityTypeId)

                    data.entities = entitiesToAdd.entityIds

                }

                let observationData = await database.models.observations.create(
                    _.merge(data, {
                        "solutionId": solutionDocument._id,
                        "solutionExternalId": solutionDocument.externalId,
                        "frameworkId": solutionDocument.frameworkId,
                        "frameworkExternalId": solutionDocument.frameworkExternalId,
                        "entityTypeId": solutionDocument.entityTypeId,
                        "entityType": solutionDocument.entityType,
                        "author": userDetails.id,
                        "updatedBy": userDetails.id,
                        "createdBy": userDetails.id
                    })
                );

                return resolve(_.pick(observationData, ["_id", "name", "description"]));

            } catch (error) {
                return reject(error);
            }
        })

    }

    static list(entityType, entityId) {
        return new Promise(async (resolve, reject) => {
            try {

                let queryObject = { _id: ObjectId(entityId) };
                let projectObject = { [`groups.${entityType}`]: 1 };

                let result = await database.models.entities.findOne(queryObject, projectObject).lean();

                let entityIds = result.groups[entityType];

                let entityData = await database.models.entities.find({ _id: { $in: entityIds } }, {
                    metaInformation: 1
                }).lean();

                result = entityData.map(entity => {
                    return {
                        entityId: entity._id,
                        ...entity.metaInformation
                    }
                })

                return resolve(result);

            } catch (error) {
                return reject(error);
            }
        })


    }

    static findSubmission(document) {

        return new Promise(async (resolve, reject) => {

            try {

                let submissionDocument = await database.models.observationSubmissions.findOne(
                    {
                        entityId: document.entityId,
                        solutionId: document.solutionId,
                        observationId: document.observationId,
                        submissionNumber: document.submissionNumber
                    }
                ).lean();

                if (!submissionDocument) {

                    submissionDocument = await database.models.observationSubmissions.create(
                        document
                    );

                }

                return resolve({
                    message: "Submission found",
                    result: submissionDocument
                });


            } catch (error) {
                return reject(error);
            }

        })

    }

    static bulkCreate(solution, entityDocument, userId) {
        return new Promise(async (resolve, reject) => {
            try {

                let status

                let startDate = new Date()
                let endDate = new Date()
                endDate.setFullYear(endDate.getFullYear() + 1);

                let observationDocument = await database.models.observations.findOne({
                    solutionExternalId: solution.externalId,
                    createdBy: userId,
                    status: "published"
                }, { _id: 1 }).lean()

                if (observationDocument) {
                    let updateObservationData = await database.models.observations.findOneAndUpdate({ _id: observationDocument._id }, {
                        $addToSet: { entities: entityDocument._id }
                    }).lean();
                    updateObservationData ? status = `${updateObservationData._id.toString()} Updated Successfully` : status = `${updateObservationData._id.toString()} Could not be Updated`
                } else {

                    let observation = {}

                    observation["status"] = "published"
                    observation["deleted"] = "false"
                    observation["solutionId"] = solution._id
                    observation["solutionExternalId"] = solution.externalId
                    observation["frameworkId"] = solution.frameworkId
                    observation["frameworkExternalId"] = solution.frameworkExternalId
                    observation["entityTypeId"] = entityDocument.entityTypeId
                    observation["entityType"] = entityDocument.entityType
                    observation["parentId"] = entityDocument.parentId ? entityDocument.parentId : ""
                    observation["createdBy"] = userId
                    observation["startDate"] = startDate
                    observation["endDate"] = endDate
                    observation["name"] = solution.name
                    observation["description"] = solution.description
                    observation["entities"] = []
                    observation["entities"].push(entityDocument._id)

                    let observationDocument = await database.models.observations.create(
                        observation
                    );
                    observationDocument._id ? status = `${observationDocument._id} created` : status = `${observationDocument._id} could not be created`

                    if (observationDocument._id) {
                        await this.sendUserNotifications(userId, {
                            solutionType: solution.type,
                            solutionId: solution._id.toString(),
                            observationId: observationDocument._id.toString()
                        });
                    }
                }

                return resolve({
                    status: status
                })

            } catch (error) {
                return reject(error)
            }
        })
    }

    static sendUserNotifications(userId = "", observationData = {}) {
        return new Promise(async (resolve, reject) => {
            try {

                if (userId == "") {
                    throw new Error("Invalid user id.")
                }

                const kafkaMessage = await kafkaClient.pushEntityAssessorNotificationToKafka({
                    user_id: userId,
                    internal: false,
                    text: `New observation available now (Observation form)`,
                    type: "information",
                    action: "mapping",
                    payload: {
                        type: observationData.solutionType,
                        solution_id: observationData.solutionId,
                        observation_id: observationData.observationId
                    },
                    title: "Pending",
                    created_at: new Date()
                })

                if (kafkaMessage.status != "success") {
                    let errorObject = {
                        formData: {
                            userId: userId,
                            message: `Failed to push entity notification for observation ${observationData._id.toString()} in the solution ${observationData.solutionName}`
                        }
                    }
                    slackClient.kafkaErrorAlert(errorObject)
                    throw new Error(`Failed to push entity notification for observation ${observationData._id.toString()} in the solution ${observationData.solutionName}`);
                }

                return resolve({
                    success: true,
                    message: "Notification successfully pushed to Kafka."
                })

            } catch (error) {
                return reject(error);
            }
        })
    }

    static pendingOrCompletedObservations(observationStatus) {
        return new Promise(async (resolve, reject) => {
            try {

                let findQuery = {};

                if (observationStatus.pending) {
                    findQuery["status"] = { $ne: "completed" }
                }

                if (observationStatus.completed) {
                    findQuery["status"] = "completed"
                }

                let observationDocuments = await database.models.observationSubmissions.find(findQuery, {
                    _id: 1
                }).lean()

                if (!observationDocuments.length > 0) {
                    throw "No Pending or Completed Observations found"
                }

                let lengthOfObservationSubmissionsChunk = 500;

                let chunkOfObservationSubmissions = _.chunk(observationDocuments, lengthOfObservationSubmissionsChunk);

                let observationData = [];
                let observationSubmissionsIds;
                let observationSubmissionsDocument;

                for (let pointerToObservationSubmission = 0; pointerToObservationSubmission < chunkOfObservationSubmissions.length; pointerToObservationSubmission++) {

                    observationSubmissionsIds = chunkOfObservationSubmissions[pointerToObservationSubmission].map(eachObservationSubmission => {
                        return eachObservationSubmission._id
                    })

                    observationSubmissionsDocument = await database.models.observationSubmissions.find({
                        _id: { $in: observationSubmissionsIds }
                    }, { _id: 1, solutionId: 1, createdAt: 1, entityId: 1, observationId: 1, createdBy: 1, "entityInformation.name": 1 }).lean()

                    await Promise.all(observationSubmissionsDocument.map(async eachObservationData => {

                        observationData.push({
                            _id: eachObservationData._id,
                            userId: eachObservationData.createdBy,
                            solutionId: eachObservationData.solutionId,
                            createdAt: eachObservationData.createdAt,
                            entityId: eachObservationData.entityId,
                            observationId: eachObservationData.observationId,
                            entityName: eachObservationData.entityInformation.name
                        })

                    })
                    )
                }

                return resolve(observationData);

            }
            catch (error) {
                return reject(error);
            }
        })
    }

};