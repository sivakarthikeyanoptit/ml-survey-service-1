const entitiesHelper = require(MODULES_BASE_PATH + "/entities/helper")
const slackClient = require(ROOT_PATH + "/generics/helpers/slackCommunications");
const kafkaClient = require(ROOT_PATH + "/generics/helpers/kafkaCommunications");

module.exports = class observationsHelper {

    static observationDocuments(findQuery = "all", fields = "all") {
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

    static list(userId = "") {
        return new Promise(async (resolve, reject) => {
            try {

                if(userId == "") throw new Error("Invalid userId")

                let observations = new Array;

                let assessorObservationsQueryObject = [
                    {
                        $match: {
                            createdBy: userId,
                            status: { $ne: "inactive" }
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
                let submissions
                let entityObservationSubmissionStatus

                for (let pointerToAssessorObservationArray = 0; pointerToAssessorObservationArray < userObservations.length; pointerToAssessorObservationArray++) {

                    observation = userObservations[pointerToAssessorObservationArray];


                    submissions = await database.models.observationSubmissions.find(
                        {
                            observationId: observation._id,
                            entityId: {
                                $in: observation.entities
                            }
                        },
                        {
                            "themes": 0,
                            "criteria": 0,
                            "evidences": 0,
                            "answers": 0
                        }
                    ).sort( { createdAt: -1 } )

                    let observationEntitySubmissions = {}
                    submissions.forEach(observationEntitySubmission => {
                        if (!observationEntitySubmissions[observationEntitySubmission.entityId.toString()]) {
                            observationEntitySubmissions[observationEntitySubmission.entityId.toString()] = {
                                submissionStatus: "",
                                submissions: new Array,
                                entityId: observationEntitySubmission.entityId.toString()
                            }
                        }
                        observationEntitySubmissions[observationEntitySubmission.entityId.toString()].submissionStatus = observationEntitySubmission.status
                        observationEntitySubmissions[observationEntitySubmission.entityId.toString()].submissions.push(observationEntitySubmission)
                    })

                    // entityObservationSubmissionStatus = submissions.reduce(
                    //     (ac, entitySubmission) => ({ ...ac, [entitySubmission.entityId.toString()]: {submissionStatus:(entitySubmission.entityId && entitySubmission.status) ? entitySubmission.status : "pending"} }), {})


                    observation.entities = new Array
                    observation.entityDocuments.forEach(observationEntity => {
                        observation.entities.push({
                            _id: observationEntity._id,
                            submissionStatus: (observationEntitySubmissions[observationEntity._id.toString()]) ? observationEntitySubmissions[observationEntity._id.toString()].submissionStatus : "pending",
                            submissions: (observationEntitySubmissions[observationEntity._id.toString()]) ? observationEntitySubmissions[observationEntity._id.toString()].submissions : new Array,
                            ...observationEntity.metaInformation
                        })
                    })
                    observations.push(_.omit(observation, ["entityDocuments"]))
                }

                return resolve(observations);

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

    static findLastSubmissionForObservationEntity(observationId = "", entityId = "") {

        return new Promise(async (resolve, reject) => {

            try {

                if(observationId == "" || entityId == "") throw new Error("Invalid observation or entity id.")

                if(typeof observationId == "string") {
                    observationId = ObjectId(observationId)
                }

                if(typeof entityId == "string") {
                    entityId = ObjectId(entityId)
                }

                let submissionDocument = await database.models.observationSubmissions.find(
                    {
                        observationId: observationId,
                        entityId : entityId
                    },{
                        submissionNumber : 1
                    }
                ).sort( { createdAt: -1 } ).limit(1).lean();

                return resolve({
                    success: true,
                    message: "Submission Number fetched successfully.",
                    result: (submissionDocument[0] && submissionDocument[0].submissionNumber) ? submissionDocument[0].submissionNumber : 0 
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
                    title: "New Observation",
                    created_at: new Date(),
                    "appName": "samiksha"
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

     /**
      *  Helper function for observation details api.
      * @method
      * @name details
      * @param  {String} observationId observation id.
      * @returns {Promise} Returns a Promise.
     */

    static details(observationId) {
        return new Promise(async (resolve, reject) => {
            try {

                let observationDocument = await this.observationDocuments({
                    _id:observationId
                });

                if(!observationDocument[0]) {
                    throw new Error("No Observation found.");
                }

                if(observationDocument[0].entities.length>0) {

                    let entitiesDocument = await entitiesHelper.entityDocuments({
                        _id:{$in:observationDocument[0].entities}
                    });

                    observationDocument[0]["count"] = entitiesDocument.length;
                    observationDocument[0].entities = entitiesDocument;
                }

                return resolve(observationDocument[0]);

            }
            catch (error) {
                return reject(error);
            }
        })
    }

};