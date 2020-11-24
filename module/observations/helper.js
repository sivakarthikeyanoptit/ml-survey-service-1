/**
 * name : observations/helper.js
 * author : Akash
 * created-date : 22-Nov-2018
 * Description : Observations helper functionality.
 */

// Dependencies
const entitiesHelper = require(MODULES_BASE_PATH + "/entities/helper");
const userExtensionHelper = require(MODULES_BASE_PATH + "/userExtension/helper");
const observationSubmissionsHelper = require(MODULES_BASE_PATH + "/observationSubmissions/helper");
const shikshalokamHelper = require(MODULES_BASE_PATH + "/shikshalokam/helper");
const slackClient = require(ROOT_PATH + "/generics/helpers/slackCommunications");
const kafkaClient = require(ROOT_PATH + "/generics/helpers/kafkaCommunications");
const chunkOfObservationSubmissionsLength = 500;
const solutionHelper = require(MODULES_BASE_PATH + "/solutions/helper");
const kendraService = require(ROOT_PATH + "/generics/services/kendra");
const moment = require("moment-timezone");
const appsPortalBaseUrl = (process.env.APP_PORTAL_BASE_URL && process.env.APP_PORTAL_BASE_URL !== "") ? process.env.APP_PORTAL_BASE_URL + "/" : "https://apps.shikshalokam.org/";


/**
    * ObservationsHelper
    * @class
*/
module.exports = class ObservationsHelper {

    /**
     * Get Observation document based on filtered data provided.
     * @method
     * @name observationDocuments
     * @param {Object} [findQuery = "all"] -filter data.
     * @param {Array} [fields = "all"] - Projected fields.
     * @returns {Array} - List of observations.
     */

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

    /**
     * Create observation.
     * @method
     * @name create
     * @param {String} solutionId -solution id.
     * @param {Object} data - Observation creation data.
     * @param {Object} userId - User id.
     * @param {String} requestingUserAuthToken - Requesting user auth token.
     * @param {String} [programId = ""] - program id
     * @returns {Object} observation creation data.
     */

    static create(
        solutionId,
        data, 
        userId, 
        requestingUserAuthToken = "",
        programId = ""
    ) {
        return new Promise(async (resolve, reject) => {
            try {

                if( requestingUserAuthToken == "" ) {
                    throw new Error(messageConstants.apiResponses.REQUIRED_USER_AUTH_TOKEN);
                }

                let organisationAndRootOrganisation = 
                await shikshalokamHelper.getOrganisationsAndRootOrganisations(
                    requestingUserAuthToken,
                    userId
                );

                let duplicateSolution = 
                await solutionHelper.createProgramAndSolutionFromTemplate
                (
                    solutionId,
                    {
                        _id : programId
                    },
                    userId,
                    _.omit(data,["entities"]),
                    true,
                    organisationAndRootOrganisation.createdFor,
                    organisationAndRootOrganisation.rootOrganisations
                );


                let observationData = 
                await this.createObservation(
                    data,
                    userId,
                    duplicateSolution,
                    organisationAndRootOrganisation
                );

                return resolve(_.pick(observationData, ["_id", "name", "description"]));

            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
     * Create observation.
     * @method
     * @name createObservation
     * @param {Object} data - Observation creation data.
     * @param {String} userId - Logged in user id.
     * @param {Object} solution - Solution detail data.
     * @param {Object} solution - Solution detail data.
     * @param {String} organisationAndRootOrganisation - organisation and root organisation details. 
     * @returns {Object} observation creation data.
     */

    static createObservation(data,userId,solution,organisationAndRootOrganisation) {
        return new Promise(async (resolve, reject) => {
            try {

                if (data.entities) {
                    let entitiesToAdd = 
                    await entitiesHelper.validateEntities(data.entities, solution.entityTypeId);
                    data.entities = entitiesToAdd.entityIds;
                }
                
                let observationData = 
                await database.models.observations.create(
                    _.merge(data, {
                        "solutionId": solution._id,
                        "solutionExternalId": solution.externalId,
                        "programId" : solution.programId,
                        "programExternalId" : solution.programExternalId,
                        "frameworkId": solution.frameworkId,
                        "frameworkExternalId": solution.frameworkExternalId,
                        "entityTypeId": solution.entityTypeId,
                        "entityType": solution.entityType,
                        "updatedBy": userId,
                        "createdBy": userId,
                        "createdFor": organisationAndRootOrganisation.createdFor,
                        "rootOrganisations": organisationAndRootOrganisation.rootOrganisations,
                        "isAPrivateProgram" : solution.isAPrivateProgram
                    })
                );

                if( !observationData._id ) {
                    throw {
                        status : httpStatusCode.bad_request.status,
                        message : messageConstants.apiResponses.OBSERVATION_NOT_CREATED
                    }
                }

                return resolve(observationData);
            } catch(error) {
                return reject(error);
            }
        })
    }

    /**
     * Fetch user organisation details.
     * @method
     * @name getUserOrganisationDetails
     * @param {Array} userIds - Array of user ids required..
     * @param {String} requestingUserAuthToken - Requesting user auth token. 
     * @returns {Object} User organisation details.
     */

    static getUserOrganisationDetails(userIds = [], requestingUserAuthToken = "") {
        return new Promise(async (resolve, reject) => {
            try {

                if(requestingUserAuthToken == "") {
                    throw new Error(messageConstants.apiResponses.REQUIRED_USER_AUTH_TOKEN);
                }

                let userOrganisationDetails = {};

                if(userIds.length > 0) {
                    for (let pointerToUserIds = 0; pointerToUserIds < userIds.length; pointerToUserIds++) {
                        
                        const user = userIds[pointerToUserIds];
                        let userOrganisations = 
                        await shikshalokamHelper.getOrganisationsAndRootOrganisations(
                            requestingUserAuthToken, 
                            userIds[pointerToUserIds]
                        );
                        
                        userOrganisationDetails[user] = userOrganisations;
                    }
                }

                return resolve({
                    success : true,
                    message : "User organisation details fetched successfully.",
                    data : userOrganisationDetails
                });

            } catch (error) {
                return reject({
                    success : false,
                    message : error.message
                });
            }
        })

    }

    /**
     * list observation v1.
     * @method
     * @name listV1
     * @param {String} [userId = ""] -Logged in user id.
     * @returns {Object} observation list.
     */

    static listV1(userId = "") {
        return new Promise(async (resolve, reject) => {
            try {

                if(userId == "") {
                    throw new Error(messageConstants.apiResponses.INVALID_USER_ID);
                }

                let observations = this.listCommon(userId, "v1");

                return resolve(observations);

            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
     * list observation v2.
     * @method
     * @name listV2
     * @param {String} [userId = ""] -Logged in user id.
     * @returns {Object} observation list.
     */

    static listV2(userId = "") {
        return new Promise(async (resolve, reject) => {
            try {

                if(userId == "") {
                    throw new Error(messageConstants.apiResponses.INVALID_USER_ID);
                }

                let observations = this.listCommon(userId, "v2");

                return resolve(observations);

            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
     * list observation v2.
     * @method
     * @name listV2
     * @param {String} [userId = ""] -Logged in user id.
     * @returns {Object} observation list.
     */

    static listCommon(userId = "", sourceApi = "v2") {
        return new Promise(async (resolve, reject) => {
            try {

                if(userId == "") {
                    throw new Error(messageConstants.apiResponses.INVALID_USER_ID);
                }

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

                const userObservations = await database.models.observations.aggregate(assessorObservationsQueryObject);

                let observation;
                let submissions;
                let entityObservationSubmissionStatus;

                for (let pointerToAssessorObservationArray = 0; pointerToAssessorObservationArray < userObservations.length; pointerToAssessorObservationArray++) {

                    observation = userObservations[pointerToAssessorObservationArray];

                    if(sourceApi == "v2") {

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
                        ).sort( { createdAt: -1 } );

                    } else {

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
                        );
                        
                    }

                    let observationEntitySubmissions = {};
                    submissions.forEach(observationEntitySubmission => {
                        if (!observationEntitySubmissions[observationEntitySubmission.entityId.toString()]) {
                            observationEntitySubmissions[observationEntitySubmission.entityId.toString()] = {
                                submissionStatus: "",
                                submissions: new Array,
                                entityId: observationEntitySubmission.entityId.toString()
                            };
                        }
                        observationEntitySubmissions[observationEntitySubmission.entityId.toString()].submissionStatus = observationEntitySubmission.status;
                        observationEntitySubmissions[observationEntitySubmission.entityId.toString()].submissions.push(observationEntitySubmission);
                    })

                    // entityObservationSubmissionStatus = submissions.reduce(
                    //     (ac, entitySubmission) => ({ ...ac, [entitySubmission.entityId.toString()]: {submissionStatus:(entitySubmission.entityId && entitySubmission.status) ? entitySubmission.status : "pending"} }), {})


                    observation.entities = new Array;
                    observation.entityDocuments.forEach(observationEntity => {
                        observation.entities.push({
                            _id: observationEntity._id,
                            submissionStatus: (observationEntitySubmissions[observationEntity._id.toString()]) ? observationEntitySubmissions[observationEntity._id.toString()].submissionStatus : "pending",
                            submissions: (observationEntitySubmissions[observationEntity._id.toString()]) ? observationEntitySubmissions[observationEntity._id.toString()].submissions : new Array,
                            ...observationEntity.metaInformation
                        });
                    })
                    observations.push(_.omit(observation, ["entityDocuments"]));
                }

                return resolve(observations);

            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
     * find observation submission. 
     * @method
     * @name findSubmission
     * @param {Object} document
     * @param {Object} document.entityId - entity id.
     * @param {Object} document.solutionId - solution id.
     * @param {Object} document.observationId - observation id.
     * @param {Object} document.submissionNumber - submission number.     
     * @returns {Object} Submission document.
     */

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

                    // Push new observation submission to kafka for reporting/tracking.
                    observationSubmissionsHelper.pushInCompleteObservationSubmissionForReporting(submissionDocument._id);
                }

                return resolve({
                    message: messageConstants.apiResponses.FOUND_SUBMISSION,
                    result: submissionDocument
                });


            } catch (error) {
                return reject(error);
            }

        })

    }

    /**
     * find last submission for observation entity. 
     * @method
     * @name findLastSubmissionForObservationEntity
     * @param {String} [observationId = ""] - observation id.
     * @param {String} [entityId = ""] - entity id.       
     * @returns {Object} submissionNumber.
     */

    static findLastSubmissionForObservationEntity(observationId = "", entityId = "") {

        return new Promise(async (resolve, reject) => {

            try {

                if(observationId == "" || entityId == "") {
                    throw new Error(messageConstants.apiResponses.INVALID_OBSERVATION_ENTITY_ID);
                }

                if(typeof observationId == "string") {
                    observationId = ObjectId(observationId);
                }

                if(typeof entityId == "string") {
                    entityId = ObjectId(entityId);
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
                    message: messageConstants.apiResponses.SUBMISSION_NUMBER_FETCHED,
                    result: (submissionDocument[0] && submissionDocument[0].submissionNumber) ? submissionDocument[0].submissionNumber : 0 
                });


            } catch (error) {
                return reject(error);
            }

        })

    }

    /**
     * Bulk create observation. 
     * @method
     * @name bulkCreate
     * @param {Object} solution - solution document.
     * @param {String} solution.externalId - solution external id.
     * @param {String} solution.frameworkId - framework id.
     * @param {String} solution.frameworkExternalId - framework external id.
     * @param {String} solution.name - solution name.   
     * @param {String} solution.description - solution description.  
     * @param {String} solution.type - solution type. 
     * @param {String} solution.entityTypeId - entity type id.
     * @param {String} solution.entityType - entity type.
     * @param {String} solution._id - solution id. 
     * @param {Object} entityDocument - entity document. 
     * @param {String} entityDocument._id - entity id.
     * @param {String} entityDocument.parentId - parent id.
     * @param {String} userId - logged in user id.      
     * @param {Array} userOrganisations - User organisations
     * @returns {Object} status.
     */
    
    static bulkCreate(userId, solution, entityDocument = {}, userOrganisations) {
        return new Promise(async (resolve, reject) => {
            try {

                let status;
                let startDate = new Date();
                let endDate = new Date();
                let isEntityDocumentValid = false;
                
                endDate.setFullYear(endDate.getFullYear() + 1);

                if(entityDocument._id && entityDocument._id.toString() != "") {
                    if(solution.entityTypeId.toString() === entityDocument.entityTypeId.toString() && solution.entityType === entityDocument.entityType) {
                        isEntityDocumentValid = true
                    }
                }

                let observationDocument = await database.models.observations.findOne({
                    solutionExternalId: solution.externalId,
                    createdBy: userId,
                    status: "published"
                }, { _id: 1 }).lean()

                if (observationDocument) {
                    if(isEntityDocumentValid) {
                        let updateObservationData = await database.models.observations.findOneAndUpdate({
                             _id: observationDocument._id
                            }, {
                            $addToSet: { entities: entityDocument._id }
                        }).lean();
                        updateObservationData ? status = `${updateObservationData._id.toString()} Updated Successfully` : status = `${updateObservationData._id.toString()} Could not be Updated`;
                    } else {
                        status = messageConstants.apiResponses.INVALID_ENTITY_TYPE;
                    }
                } else {

                    let observation = {}

                    observation["createdFor"] = userOrganisations.createdFor;
                    observation["rootOrganisations"] = userOrganisations.rootOrganisations;
                    observation["status"] = "published";
                    observation["deleted"] = false;
                    observation["solutionId"] = solution._id;
                    observation["solutionExternalId"] = solution.externalId;
                    observation["programId"] = solution.programId;
                    observation["programExternalId"] = solution.programExternalId;
                    observation["frameworkId"] = solution.frameworkId;
                    observation["frameworkExternalId"] = solution.frameworkExternalId;
                    observation["entityTypeId"] = solution.entityTypeId;
                    observation["entityType"] = solution.entityType;
                    observation["createdBy"] = userId;
                    observation["startDate"] = startDate;
                    observation["endDate"] = endDate;
                    observation["name"] = solution.name;
                    observation["description"] = solution.description;
                    observation["entities"] = new Array;
                    
                    if(isEntityDocumentValid) {
                        observation["entities"].push(entityDocument._id);
                    }

                    let observationDocument = await database.models.observations.create(
                        observation
                    );
                    observationDocument._id ? status = `${observationDocument._id} created` : status = `${observationDocument._id} could not be created`;

                    if (observationDocument._id) {
                        await this.sendUserNotifications(userId, {
                            solutionType: solution.type,
                            solutionId: solution._id.toString(),
                            programId : solution.programId,
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

    /**
     * Send user notifications. 
     * @method
     * @name sendUserNotifications
     * @param {Object} [observationData = {}] - .
     * @param {String} [userId = ""] - logged in user id.      
     * @returns {Object} message and success status.
     */

    static sendUserNotifications(userId = "", observationData = {}) {
        return new Promise(async (resolve, reject) => {
            try {

                if (userId == "") {
                    throw new Error(messageConstants.apiResponses.INVALID_USER_ID)
                }

                const kafkaMessage = await kafkaClient.pushUserMappingNotificationToKafka({
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
                    appType: process.env.MOBILE_APPLICATION_APP_TYPE
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
                    message: messageConstants.apiResponses.NOTIFICATION_PUSHED_TO_KAFKA
                })

            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
     * Pending observation.
     * @method
     * @name pendingObservations  
     * @returns {Object} list of pending observation.
     */

    static pendingObservations() {
        return new Promise(async (resolve, reject) => {
            try {

                let findQuery = {
                    status : {
                        $ne: messageConstants.apiResponses.STATUS_COMPLETED
                    }
                };

                let observationSubmissionsDocuments = 
                await database.models.observationSubmissions.find(
                    findQuery, {
                    _id: 1
                }).lean();

                if ( observationSubmissionsDocuments.length < 0 ) {
                    throw {
                        message : 
                        messageConstants.apiResponses.NO_PENDING_OBSERVATION
                    }
                }

                let chunkOfObservationSubmissions = 
                _.chunk(observationSubmissionsDocuments, chunkOfObservationSubmissionsLength);

                let observationData = [];
                let observationSubmissionsIds;
                let observationSubmissionsDocument;

                for (
                    let pointerToObservationSubmission = 0; 
                    pointerToObservationSubmission < chunkOfObservationSubmissions.length; 
                    pointerToObservationSubmission++
                ) {

                    observationSubmissionsIds = chunkOfObservationSubmissions[pointerToObservationSubmission].map(observationSubmission => {
                        return observationSubmission._id;
                    })

                    observationSubmissionsDocument = 
                    await database.models.observationSubmissions.find({
                        _id: { $in: observationSubmissionsIds }
                    }, { _id: 1, 
                        solutionId: 1, 
                        createdAt: 1, 
                        entityId: 1, 
                        observationId: 1, 
                        createdBy: 1, 
                        "entityInformation.name": 1, 
                        "entityInformation.externalId": 1,
                        programId : 1 
                    }).lean();

                    await Promise.all(observationSubmissionsDocument.map(async eachObservationData => {

                        let entityName = ""
                        if(eachObservationData.entityInformation && eachObservationData.entityInformation.name) {
                            entityName = eachObservationData.entityInformation.name;
                        } else if (eachObservationData.entityInformation && eachObservationData.entityInformation.externalId) {
                            entityName = eachObservationData.entityInformation.externalId;
                        }
                        
                        observationData.push({
                            _id: eachObservationData._id,
                            userId: eachObservationData.createdBy,
                            solutionId: eachObservationData.solutionId,
                            createdAt: eachObservationData.createdAt,
                            entityId: eachObservationData.entityId,
                            observationId: eachObservationData.observationId,
                            entityName: entityName,
                            programId : eachObservationData.programId
                        });

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
     * Completed observations.
     * @method
     * @name completedObservations
     * @param {String} fromDate  - from Date.
     * @param {String} toDate  - to Date.      
     * @returns {Object} list of completed observations.
     */

    static completedObservations(fromDate,toDate) {
        return new Promise(async (resolve, reject) => {
            try {

                let findQuery = {
                    status : messageConstants.apiResponses.STATUS_COMPLETED,
                    completedDate : {
                        $exists : true,
                        $gte : fromDate,
                        $lte : toDate
                    }
                };

                let observationDocuments = 
                await database.models.observationSubmissions.find(
                    findQuery, {
                    _id: 1
                }).lean();

                if ( !observationDocuments.length > 0 ) {
                    throw {
                        message : 
                        messageConstants.apiResponses.NO_COMPLETED_OBSERVATIONS
                    }
                }

                let chunkOfObservationSubmissions = 
                _.chunk(observationDocuments, chunkOfObservationSubmissionsLength);

                let observationData = [];
                let observationSubmissionsIds;
                let observationSubmissionsDocument;

                for (
                    let pointerToObservationSubmission = 0; 
                    pointerToObservationSubmission < chunkOfObservationSubmissions.length; 
                    pointerToObservationSubmission++
                ) {

                    observationSubmissionsIds = 
                    chunkOfObservationSubmissions[pointerToObservationSubmission].map(observationSubmission => {
                        return observationSubmission._id;
                    })

                    observationSubmissionsDocument = 
                    await database.models.observationSubmissions.find({
                        _id: { $in: observationSubmissionsIds }
                    }, { 
                        _id: 1, 
                        solutionId: 1,
                        entityId: 1, 
                        observationId: 1, 
                        "createdBy": 1, 
                        "entityInformation.name": 1, 
                        "entityInformation.externalId": 1,
                        "completedDate" : 1,
                        programId : 1  
                    }).lean();
                    await Promise.all(
                        observationSubmissionsDocument.map(async eachObservationData => {

                        let entityName = ""
                        if(
                            eachObservationData.entityInformation && 
                            eachObservationData.entityInformation.name
                        ) {
                            entityName = 
                            eachObservationData.entityInformation.name;

                        } else if (
                            eachObservationData.entityInformation && 
                            eachObservationData.entityInformation.externalId
                        ) {
                            entityName = 
                            eachObservationData.entityInformation.externalId;

                        }
                        
                        observationData.push({
                            _id: eachObservationData._id,
                            userId: eachObservationData.createdBy,
                            solutionId: eachObservationData.solutionId,
                            entityId: eachObservationData.entityId,
                            observationId: eachObservationData.observationId,
                            entityName: entityName,
                            completedDate : eachObservationData.completedDate,
                            programId : eachObservationData.programId
                        });

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
      * observation details.
      * @method
      * @name details
      * @param  {String} observationId observation id.
      * @returns {details} observation details.
     */

    static details(observationId) {
        return new Promise(async (resolve, reject) => {
            try {

                let observationDocument = await this.observationDocuments({
                    _id:observationId
                });

                if(!observationDocument[0]) {
                    throw new Error(messageConstants.apiResponses.OBSERVATION_NOT_FOUND);
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

     /**
      *  Helper function for list of fields to be selected from solution document.
      * @method
      * @name solutionDocumentProjectionFieldsForDetailsAPI
      * @returns {Promise} Returns a Promise.
     */

    static solutionDocumentProjectionFieldsForDetailsAPI() {
        
        return new Promise(async (resolve, reject) => {
            return resolve({
                name: 1,
                externalId: 1,
                programId : 1,
                programExternalId : 1,
                description: 1,
                themes: 1,
                entityProfileFieldsPerEntityTypes: 1,
                registry: 1,
                questionSequenceByEcm: 1,
                frameworkId: 1,
                frameworkExternalId: 1,
                roles: 1,
                evidenceMethods: 1,
                sections: 1,
                entityTypeId: 1,
                entityType: 1,
                captureGpsLocationAtQuestionLevel : 1,
                enableQuestionReadOut : 1,
                scoringSystem: 1,
                isRubricDriven: 1
            });
        })
    }

     /**
      *  Helper function for list of solution fields to be sent in response.
      * @method
      * @name solutionDocumentFieldListInResponse
      * @returns {Promise} Returns a Promise.
     */

    static solutionDocumentFieldListInResponse() {

        return new Promise(async (resolve, reject) => {
            return resolve([
                "_id",
                "externalId",
                "name",
                "description",
                "registry",
                "captureGpsLocationAtQuestionLevel",
                "enableQuestionReadOut",
                "scoringSystem",
                "isRubricDriven"
            ]);
        })
    }

     /**
     * Create solution from library template. 
     * @method
     * @name createV2
     * @param {String} templateId - observation solution library id. 
     * @param {String} userId - Logged in user id.
     * @param {Object} requestedData - request body data.
     * @param {String} token - logged in token.    
     * @returns {Array} - Create solution from library template.
     */

    static createV2( templateId,userId,requestedData,token ) {
        return new Promise(async (resolve, reject) => {
            try {
  
              let organisationAndRootOrganisation = 
              await shikshalokamHelper.getOrganisationsAndRootOrganisations(
                token,
                userId
              );

              let solutionInformation =  {
                name : requestedData.name,
                description : requestedData.description
              };

              if( requestedData.taskId ) {
                  solutionInformation["taskId"] = solutionInformation["taskId"];
              }

              if( requestedData.projectId ) {
                solutionInformation["projectId"] = ObjectId(solutionInformation["projectId"]);
              }
  
              let createdSolutionAndProgram = 
              await solutionHelper.createProgramAndSolutionFromTemplate(
                templateId,
                requestedData.program,
                userId,
                solutionInformation,
                true,
                organisationAndRootOrganisation.createdFor,
                organisationAndRootOrganisation.rootOrganisations
              );

              let startDate = new Date();
              let endDate = new Date();
              endDate.setFullYear(endDate.getFullYear() + 1);

              let observationData = {
                name : requestedData.name,
                description : requestedData.description,
                status : requestedData.status,
                startDate : startDate,
                endDate : endDate,
                entities : requestedData.entities
              };

              if( requestedData.taskId ) {
                observationData["taskId"] = requestedData["taskId"];
              }

              if( requestedData.projectId ) {
               observationData["projectId"] = ObjectId(requestedData["projectId"]);
              }

              let observation = 
              await this.createObservation(
                observationData,
                userId,
                createdSolutionAndProgram,
                organisationAndRootOrganisation
              );

              createdSolutionAndProgram["observationName"] = observation.name;
              createdSolutionAndProgram["observationId"] = observation._id;
              createdSolutionAndProgram["observationExternalId"] = observation.externalId;

              return resolve({
                message: messageConstants.apiResponses.CREATED_SOLUTION,
                result : createdSolutionAndProgram
              });
  
            } catch (error) {
                return reject(error);
            }
        });
    }


    /**
      * observation link.
      * @method
      * @name getObservationLink
      * @param  {String} observationSolutionId observation solution external Id.
      * @param  {String} appName name of app.
      * @returns {getObservationLink} observation getObservationLink.
     */

    static getObservationLink(observationSolutionId, appName) {
        return new Promise(async (resolve, reject) => {
            try {
                
                let observationData = await solutionHelper.solutionDocuments({
                        externalId : observationSolutionId,
                        isReusable : false,
                        type : messageConstants.common.OBSERVATION

                        },[
                            "link"
                    ]);

                if(!Array.isArray(observationData) || observationData.length < 1) {
                    return resolve({
                        message: messageConstants.apiResponses.OBSERVATION_NOT_FOUND,
                        result: {}
                    });
                }

                let appDetails = await kendraService.getAppDetails(appName);
                
                if(appDetails.result === false){
                    throw new Error(messageConstants.apiResponses.APP_NOT_FOUND);
                }

                let link = appsPortalBaseUrl+ appName + messageConstants.common.CREATE_OBSERVATION + observationData[0].link;

                return resolve({
                    message: messageConstants.apiResponses.OBSERVATION_LINK_GENERATED,
                    result: link
                });
               
                
            }
            catch (error) {
                return reject(error);
            }
        })
    }

    /**
     * Verfy observation link.
     * @method
     * @name verifyLink
     * @param {Object} data - observation link.
     * @param {String} requestingUserAuthToken - Requesting user auth token.
     * @returns {Object} observation data.
     */

    static verifyLink(
        link = "", 
        requestingUserAuthToken = "",
        userId = ""
    ) {
        return new Promise(async (resolve, reject) => {

            try {

                if (link == "") {
                    throw new Error(messageConstants.apiResponses.LINK_REQUIRED_CHECK)
                }

                if (requestingUserAuthToken == "") {
                    throw new Error(messageConstants.apiResponses.REQUIRED_USER_AUTH_TOKEN)
                }

                if (userId == "") {
                    throw new Error(messageConstants.apiResponses.USER_ID_REQUIRED_CHECK)
                }

                let observationSolutionData = await solutionHelper.solutionDocuments({
                    link: link,
                    type : messageConstants.common.OBSERVATION,
                    isReusable : false
                },[
                    "externalId",
                    "subType",
                    "programId",
                    "name",
                    "description",
                    "frameworkExternalId",
                    "frameworkId",
                    "entityTypeId",
                    "entityType",
                    "isAPrivateProgram",
                    "programExternalId",
                    "endDate",
                    "status"
                ]);

                if(!Array.isArray(observationSolutionData) || observationSolutionData.length < 1){
                    return resolve({
                        message: messageConstants.apiResponses.INVALID_LINK,
                        result: []
                    });  
                }

                if(observationSolutionData[0].status != messageConstants.common.ACTIVE_STATUS) {
                    return resolve({
                        message: messageConstants.apiResponses.LINK_IS_EXPIRED,
                        result: []
                    });   
                }

                if (new Date() > new Date(observationSolutionData[0].endDate)) {
                    if (observationSolutionData[0].status == messageConstants.common.ACTIVE_STATUS) {
                        await solutionHelper.updateSolutionDocument
                        (
                            { link : link },
                            { $set : { status: messageConstants.common.INACTIVE_STATUS } }
                        )
                    }
                    
                    return resolve({
                        message: messageConstants.apiResponses.LINK_IS_EXPIRED,
                        result: []
                    });
                }
                
                let observationData = await this.observationDocuments({
                    solutionExternalId : observationSolutionData[0].externalId,
                    createdBy :userId
                });

                if(observationData && observationData.length > 0){
                    return resolve({
                        message: messageConstants.apiResponses.OBSERVATION_LINK_VERIFIED,
                        result: observationData[0]
                    });
                }

                let entities = new Array;

                let userEntities = await userExtensionHelper.getUserEntities(userId);
                
                if(userEntities.length > 0){
                    let entityIdsWithSolutionSubType = await entitiesHelper.entityDocuments({
                        _id :  { $in : userEntities},
                        entityType : observationSolutionData[0].subType
                    }, [
                        "_id"
                    ]);

                    for(let pointerToUserExtension = 0; pointerToUserExtension < entityIdsWithSolutionSubType.length; 
                        pointerToUserExtension++) {
                        entities.push(entityIdsWithSolutionSubType[pointerToUserExtension]._id);
                    }
                }
                

                let solutionId = observationSolutionData[0]._id;
                let programId = observationSolutionData[0].programId;
                let today = new Date();
                let startDate= moment(today).format("YYYY-MM-DD");
                let endDate = moment(startDate, "YYYY-MM-DD").add('years', 1).format("YYYY-MM-DD");
                let dataObj = {
                    "name": observationSolutionData[0].name ,
                    "description": observationSolutionData[0].description,
                    "startDate": startDate,
                    "endDate": endDate,
                    "status": messageConstants.common.PUBLISHED,
                    "entities": entities,
                    "link" : link
                }

                
                let organisationAndRootOrganisation = 
                await shikshalokamHelper.getOrganisationsAndRootOrganisations(
                    requestingUserAuthToken,
                    userId
                );

                let solution = {
                    "_id":solutionId,
                    "externalId": observationSolutionData[0].externalId,
                    "frameworkExternalId": observationSolutionData[0].frameworkExternalId,
                    "frameworkId": observationSolutionData[0].frameworkId,
                    "programExternalId": observationSolutionData[0].programExternalId,
                    "programId": programId,
                    "entityTypeId": observationSolutionData[0].entityTypeId,
                    "entityType": observationSolutionData[0].entityType,
                    "isAPrivateProgram": observationSolutionData[0].isAPrivateProgram,
                    "entities": entities
                }

                let result = await this.createObservation(
                    dataObj,
                    userId,
                    solution,
                    organisationAndRootOrganisation
                );

                return resolve({
                    message: messageConstants.apiResponses.OBSERVATION_LINK_VERIFIED,
                    result: result
                });                  

            } catch (error) {
                return reject(error);
            }
        })
    }

};