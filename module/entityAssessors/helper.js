/**
 * name : entityAssessors/helper.js
 * author : Akash
 * created-date : 22-Nov-2018
 * Description : All Entity Assessors helper functionality.
 */

//Dependencies
const csv = require("csvtojson");
const moment = require("moment");
let shikshalokam = require(ROOT_PATH + "/generics/helpers/shikshalokam");
const slackClient = require(ROOT_PATH + "/generics/helpers/slackCommunications");
const kafkaClient = require(ROOT_PATH + "/generics/helpers/kafkaCommunications");
const chunkOfSubmissionsLength = 500;

/**
    * EntityAssessorHelper
    * @class
*/
module.exports = class EntityAssessorHelper {

    /**
     * Get track of entity assessor.
     * @method
     * @name createInidvidualEntityAssessor
     * @param {Object} entityAssessor - entityAssessor data.
     * @param {String} programId - program id.
     * @param {String} solutionId - solution id.
     * @param {String} entityId - entity id.
     * @param {Object} userEntityDetails
     * @param {Object} userDetails - logged in user details. 
     * @param {Object} userDetails.id - logged in user id. 
     * @returns {Object} Entity assessor data.
     */

    static createInidvidualEntityAssessor(programId, solutionId, entityId, userEntityDetails, userDetails) {
        return new Promise(async (resolve, reject) => {
            try {
                userEntityDetails.programId = programId;
                userEntityDetails.assessmentStatus = "pending";
                userEntityDetails.parentId = "";
                userEntityDetails["entities"] = entityId;
                userEntityDetails.solutionId = solutionId;
                userEntityDetails.createdBy = userDetails.id;
                userEntityDetails.updatedBy = userDetails.id;
                let entityAssessor = await database.models.entityAssessors.create(
                    userEntityDetails
                );
                return resolve(entityAssessor);
            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
     * Get track of entity assessor.
     * @method
     * @name uploadEntityAssessorTracker
     * @param {Object} entityAssessor - entityAssessor data.
     * @returns {Object} Uploaded entity assessor tracker data.
     */

    static uploadEntityAssessorTracker(entityAssessor) {
        return new Promise(async (resolve, reject) => {
            try {

                let entityAssessorsTrackersDocument = await database.models.entityAssessorsTrackers.find({ "assessorUserId": entityAssessor.assessorId, "programId": entityAssessor.programId }).sort({ "dateOfOperation": -1 }).limit(1).lean();

                if (!entityAssessorsTrackersDocument.length) {
                    return resolve();
                }

                let actions = ["APPEND", "OVERRIDE", "REMOVE"];

                if (entityAssessor.entities.length) {
                    entityAssessor.entities = entityAssessor.entities.map(entity => entity.toString());
                }

                let trackerObject = {};

                entityAssessorsTrackersDocument = entityAssessorsTrackersDocument[0];

                let updatedData = entityAssessorsTrackersDocument.updatedData;

                if (actions.includes(entityAssessor.action)) {

                    trackerObject.action = entityAssessor.action;

                    if (entityAssessor.action == "APPEND") {

                        entityAssessor.entities.forEach(entity => {
                            if (!updatedData.includes(entity)) {
                                updatedData.push(entity);
                            }
                        })

                    } else if (entityAssessor.action == "OVERRIDE") {

                        updatedData = entityAssessor.entities;

                    } else if (entityAssessor.action == "REMOVE") {

                        _.pullAll(updatedData, entityAssessor.entities);

                    }

                } else {

                    throw { 
                        status: httpStatusCode.bad_request.status, 
                        message: messageConstants.apiResponses.WRONG_ACTION
                    };

                }

                trackerObject.updatedData = updatedData;

                trackerObject.actionObject = entityAssessor.entities;

                trackerObject.assessorId = entityAssessorsTrackersDocument.assessorId;

                trackerObject.programId = entityAssessor.programId;

                trackerObject.solutionId = entityAssessor.solutionId;

                trackerObject.entityType = entityAssessor.entityType;

                trackerObject.entityTypeId = entityAssessor.entityTypeId;

                trackerObject.dateOfOperation = new Date;

                trackerObject.validFrom = moment().startOf('day');

                //hard coded long range value to reduce query

                let date = new Date();

                trackerObject.validTo = date.setFullYear(2100);

                trackerObject.createdBy = entityAssessor.assessorId;

                let queryObject = {};

                queryObject.assessorId = entityAssessorsTrackersDocument.assessorId;

                queryObject.programId = entityAssessor.programId;

                queryObject.dateOfOperation = {};

                queryObject.dateOfOperation["$gte"] = moment().startOf('day');

                queryObject.dateOfOperation["$lte"] = moment().endOf('day');

                let trackerDocument = await database.models.entityAssessorsTrackers.findOneAndUpdate(queryObject, trackerObject, {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                    returnNewDocument: true
                });

                let lastDataDate = moment(entityAssessorsTrackersDocument.dateOfOperation).format("DD-MM-YYYY");
                let todayDate = moment().format("DD-MM-YYYY");

                if (lastDataDate != todayDate) {

                    let queryObject = {
                        assessorId: entityAssessorsTrackersDocument.assessorId,
                        programId: entityAssessorsTrackersDocument.programId,
                        dateOfOperation: entityAssessorsTrackersDocument.dateOfOperation
                    };

                    entityAssessorsTrackersDocument.validTo = moment().endOf('day').subtract(1, 'days');

                    delete entityAssessorsTrackersDocument.createdAt;
                    delete entityAssessorsTrackersDocument._id;

                    await database.models.entityAssessorsTrackers.findOneAndUpdate(queryObject, entityAssessorsTrackersDocument, {
                        upsert: true,
                        new: true,
                        setDefaultsOnInsert: true,
                        returnNewDocument: true
                    });

                }

                return resolve({ result: trackerDocument });

            } catch (error) {
                return reject({
                    status: error.status || httpStatusCode.internal_server_error.status,
                    message: error.message || httpStatusCode.internal_server_error.message,
                    errorObject: error
                });
            }
        })
    }

    /**
     * Entity Assessors upload helper function.
     * @method
     * @name upload
     * @param {Object} files -uploaded files.
     * @param {String} programId - program id.
     * @param {String} solutionId - solution id. 
     * @param {String} userId - Logged in user id.
     * @param {String} token - Logged in user token.
     */

    static upload(files, programId, solutionId, userId, token) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!files || !files.assessors) {
                    throw { 
                        status: httpStatusCode.bad_request.status, 
                        message: httpStatusCode.bad_request.message
                    };
                }

                let assessorData = await csv().fromString(files.assessors.data.toString());

                let entityIds = [];
                let programIds = [];
                let solutionIds = [];
                let userExternalIds = [];

                assessorData.forEach(assessor => {
                    assessor.entities.split(",").forEach(entityAssessor => {
                        if (entityAssessor)
                            entityIds.push(entityAssessor.trim())
                    })

                    programIds.push(programId ? programId : assessor.programId);

                    solutionIds.push(solutionId ? solutionId : assessor.solutionId);

                    if (!assessor["keycloak-userId"]) {
                        if (!userExternalIds.includes(assessor.externalId)) {
                            userExternalIds.push(assessor.externalId);
                        }
                    }

                    if (!assessor["keycloak-parentId"]) {
                        if (assessor.parentId && assessor.parentId !== "" && !userExternalIds.includes(assessor.parentId)) {
                            userExternalIds.push(assessor.parentId);
                        }
                    }

                });

                let programsFromDatabase = await database.models.programs.find({
                    externalId: { $in: programIds }
                }, { externalId: 1, name: 1 }).lean();

                let solutionsFromDatabase = await database.models.solutions.find({
                    externalId: { $in: solutionIds }
                }, { externalId: 1, entityType: 1, entityTypeId: 1, entities: 1, name: 1, type: 1, subType: 1 }).lean();

                let entitiesBySolution = _.flattenDeep(solutionsFromDatabase.map(solution => solution.entities));

                let entityFromDatabase = await database.models.entities.aggregate([
                    {
                        $match: { _id: { $in: entitiesBySolution } }
                    },
                    {
                        $project: {
                            externalId: "$metaInformation.externalId",
                            name: "$metaInformation.name"
                        }
                    }
                ]);

                let entityDataByExternalId = _.keyBy(entityFromDatabase, "externalId");

                let userIdByExternalId;

                if (userExternalIds.length > 0) {
                    userIdByExternalId = await this.getInternalUserIdByExternalId(token, userExternalIds);
                }

                let programsData = programsFromDatabase.reduce(
                    (ac, program) => ({
                        ...ac, [program.externalId]: {
                            programId: program._id,
                            name: program.name
                        }
                    }), {});

                let solutionData = solutionsFromDatabase.reduce(
                    (ac, solution) => ({
                        ...ac, [solution.externalId]: {
                            solutionId: solution._id,
                            entityType: solution.entityType,
                            entityTypeId: solution.entityTypeId,
                            name: solution.name,
                            type: solution.type,
                            subType: solution.subType,
                        }
                    }), {});

                assessorData = await Promise.all(assessorData.map(async (assessor) => {

                    if (assessor["keycloak-userId"] && assessor["keycloak-userId"] !== "") {
                        assessor["userId"] = assessor["keycloak-userId"];
                    } else {

                        if (userIdByExternalId[assessor.externalId] === "") {
                            throw { status: 400, message: "Keycloak id for user is not present" };
                        }

                        assessor["userId"] = userIdByExternalId[assessor.externalId];
                    }


                    if (assessor["keycloak-parentId"] && assessor["keycloak-parentId"] !== "") {
                        assessor["parentId"] = assessor["keycloak-parentId"];
                    } else {
                        if (assessor.parentId && assessor.parentId !== "") {

                            if (userIdByExternalId[assessor.parentId] === "") {
                                throw { status: 400, message: "Keycloak id for parent is not present" };
                            }

                            assessor["parentId"] = userIdByExternalId[assessor.parentId];
                        }
                    }


                    let assessorEntityArray = new Array;
                    let assessorPushNotificationArray = new Array;

                    assessor.programName = programsData[assessor.programId].name;
                    assessor.programId = programsData[assessor.programId].programId;
                    assessor.createdBy = assessor.updatedBy = userId;
                    assessor.entityType = solutionData[assessor.solutionId].entityType;
                    assessor.entityTypeId = solutionData[assessor.solutionId].entityTypeId;
                    assessor.solutionName = solutionData[assessor.solutionId].name;
                    assessor.solutionType = solutionData[assessor.solutionId].type;
                    assessor.solutionSubType = solutionData[assessor.solutionId].subType;
                    assessor.solutionId = solutionData[assessor.solutionId].solutionId;

                    assessor.entities.split(",").forEach(assessorEntity => {
                        assessorEntity = entityDataByExternalId[assessorEntity.trim()];
                        if (assessorEntity && assessorEntity._id) {
                            assessorEntityArray.push(assessorEntity._id);
                            assessorPushNotificationArray.push({
                                entityId: assessorEntity._id,
                                entityType: assessor.entityType,
                                entityName: assessorEntity.name,
                                programId: assessor.programId,
                                programName: assessor.programName,
                                solutionId: assessor.solutionId,
                                solutionType: assessor.solutionType,
                                solutionSubType: assessor.solutionSubType,
                                solutionName: assessor.solutionName
                            });
                        }
                    })

                    assessor.entities = assessorEntityArray;

                    let fieldsWithOutEntity = {};

                    Object.keys(database.models.entityAssessors.schema.paths).forEach(fieldName => {
                        if (fieldName != 'entities' && assessor[fieldName]) {
                            fieldsWithOutEntity[fieldName] = assessor[fieldName];
                        }
                    })

                    let updateObject;
                    let sendPushNotificationToAssessor = false;

                    if (assessor.entityOperation == "OVERRIDE") {
                        updateObject = { $set: { entities: assessor.entities, ...fieldsWithOutEntity } };
                        sendPushNotificationToAssessor = true;
                    }

                    else if (assessor.entityOperation == "APPEND") {
                        updateObject = { $addToSet: { entities: assessor.entities }, $set: fieldsWithOutEntity };
                        sendPushNotificationToAssessor = true;
                    }

                    else if (assessor.entityOperation == "REMOVE") {
                        updateObject = { $pull: { entities: { $in: assessor.entities } }, $set: fieldsWithOutEntity };
                    }

                    let updatedEntityAssessorDocument = await database.models.entityAssessors.findOneAndUpdate({ userId: assessor.userId, programId: assessor.programId, solutionId: fieldsWithOutEntity["solutionId"] }, updateObject,
                        {
                            upsert: true,
                            new: true,
                            setDefaultsOnInsert: true,
                            returnNewDocument: true
                        });

                    //entity assessor tracker
                    let entityAssessorDocument = {
                        "action": assessor.entityOperation,
                        "entities": updatedEntityAssessorDocument.entities,
                        "assessorId": assessor.userId,
                        "programId": assessor.programId,
                        "solutionId": assessor.solutionId,
                        "entityType": assessor.entityType,
                        "entityTypeId": assessor.entityTypeId,
                    };

                    await this.uploadEntityAssessorTracker(entityAssessorDocument);

                    if (sendPushNotificationToAssessor && assessorPushNotificationArray.length > 0) {
                        await this.sendUserNotifications(assessor.userId, assessorPushNotificationArray);
                    }

                })).catch(error => {
                    return reject({
                        status: error.status || httpStatusCode.internal_server_error.status,
                        message: error.message || httpStatusCode.internal_server_error.message,
                        errorObject: error
                    });
                });

                return resolve();

            } catch (error) {
                return reject({
                    status: error.status || httpStatusCode.internal_server_error.status,
                    message: error.message || httpStatusCode.internal_server_error.message,
                    errorObject: error
                });
            }
        })
    }

     /**
     * Get user id from external id.
     * @method
     * @name getInternalUserIdByExternalId
     * @param {Array} userExternalIds - Array of externalIds.
     * @param {String} token - user logged in token.
     * @returns {Array} Array of userId for external ids.
     */

    static getInternalUserIdByExternalId(token, userExternalIds) {

        return new Promise(async (resolve, reject) => {

            try {

                userExternalIds = _.compact(userExternalIds);

                let externalIdToUserIdMap = {};

                let result = await Promise.all(userExternalIds.map(userExternalId => {
                    return shikshalokam.getKeycloakUserIdByLoginId(token, userExternalId);
                }))

                userExternalIds.forEach((loginId, index) => {
                    if (result[index] && result[index][0]) {
                        externalIdToUserIdMap[loginId] = result[index][0]["userLoginId"];
                    } else {
                        externalIdToUserIdMap[loginId] = "";
                    }
                })

                return resolve(externalIdToUserIdMap);

            } catch (error) {

                return reject(error);

            }

        })

    }

      /**
     * Send notifications to user.
     * @method
     * @name sendUserNotifications
     * @param {String} [userId = ""] - Logged in userId.
     * @param {Array} [entities = []] - Array of entities. 
     * @returns {Object} Consisting of success and message. 
     */

    static sendUserNotifications(userId = "", entities = []) {
        return new Promise(async (resolve, reject) => {
            try {

                if (userId == "") {
                    throw new Error(messageConstants.apiResponses.INVALID_USER_ID);
                }

                const kafakResponses = await Promise.all(entities.map(async entity => {

                    const kafkaMessage = await kafkaClient.pushEntityAssessorNotificationToKafka({
                        user_id: userId,
                        internal: false,
                        text: `New ${entity.entityType} - ${entity.entityName} added for you in program ${entity.programName}`,
                        type: "information",
                        action: "mapping",
                        payload: {
                            type: entity.solutionSubType,
                            solution_id: entity.solutionId,
                            program_id: entity.programId,
                            entity_id: entity.entityId
                        },
                        title: "New Assessment",
                        created_at: new Date(),
                        appType: process.env.MOBILE_APPLICATION_APP_TYPE
                    });

                    if (kafkaMessage.status != "success") {
                        let errorObject = {
                            formData: {
                                userId: userId,
                                message: `Failed to push entity notification for entity ${entity.entityName} in program ${entity.programName} and solution ${entity.solutionName}`
                            }
                        };
                        slackClient.kafkaErrorAlert(errorObject);
                        return;
                    }

                    return kafkaMessage;

                }));

                if (kafakResponses.findIndex(response => response === undefined || response === null) >= 0) {
                    throw new Error(messageConstants.apiResponses.SOMETHING_WENT_WRONG +"not all notifications were pushed.");
                }

                return resolve({
                    success: true,
                    message: messageConstants.apiResponses.NOTIFICATIONS_PUSHED_TO_KAFKA
                });

            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
     * Pending Assessments.
     * @method
     * @name pendingAssessment
     * @returns {Array} List of pending assessments.
     */

    static pendingAssessment() {

        return new Promise(async (resolve, reject) => {
            try {

                let queryData = {
                    status : {
                        $ne : messageConstants.apiResponses.STATUS_COMPLETED
                    }
                }

                let submissions = await database.models.submissions.find(
                    queryData, 
                    {
                    _id: 1
                }).lean();

                if( submissions.length < 1 ) {
                    throw {
                        message : 
                        messageConstants.apiResponses.SUBMISSION_NOT_FOUND
                    }
                }

                let chunkOfSubmissionDocuments = 
                _.chunk(submissions,chunkOfSubmissionsLength);

                let submissionDocuments;

                let pendingAssessmentsData = [];
                let submissionsIds;

                for (let pointerToSubmissions = 0; 
                    pointerToSubmissions < chunkOfSubmissionDocuments.length; 
                    pointerToSubmissions++
                ) {

                    submissionsIds = 
                    chunkOfSubmissionDocuments[pointerToSubmissions].map(submission => {
                        return submission._id
                    });

                    submissionDocuments = 
                    await database.models.submissions.find({
                        _id: { $in: submissionsIds }
                    },{
                        _id: 1, 
                        createdAt: 1,
                        entityId: 1, 
                        "entityInformation.name": 1, 
                        "entityInformation.externalId": 1,
                        "assessors.userId" : 1,
                        "assessors.role" : 1,
                        solutionId : 1,
                        programId : 1
                    }).lean();

                    await Promise.all(submissionDocuments.map(async submissionDocument=>{

                        if( 
                            submissionDocument.assessors &&
                            submissionDocument.assessors.length > 0 
                        ) {
                            
                            let entityName = "";
                            
                            if(
                                submissionDocument.entityInformation && 
                                submissionDocument.entityInformation.name
                            ) {
                                entityName = 
                                submissionDocument.entityInformation.name;
                            } else if (
                                submissionDocument.entityInformation && 
                                submissionDocument.entityInformation.externalId
                            ) {
                                entityName = 
                                submissionDocument.entityInformation.externalId;
                            }
                            
                            let result = {
                                _id : submissionDocument._id,
                                solutionId : submissionDocument.solutionId,
                                createdAt : submissionDocument.createdAt,
                                completedDate : submissionDocument.completedDate,
                                entityId : submissionDocument.entityId,
                                programId : submissionDocument.programId,
                                entityName: entityName
                            }
                            
                            submissionDocument.assessors.forEach(assessor=>{
                                if(assessor.role && 
                                    gen.utils.fetchAssessorsLeadAssessorRole().includes(assessor.role)
                                ) {
                                    result["userId"] = assessor.userId;
                                    pendingAssessmentsData.push(result);
                                }
                                
                            })
                        }
                    }))
                }

                return resolve(pendingAssessmentsData);

            } catch (error) {
                return reject(error);
            }
        })
    }

      /**
     * Entity Assessors upload helper function.
     * @method
     * @name completedAssessment
     * @param {String} fromDate - from Date.
     * @param {String} toDate - to date. 
     * @returns {Array} List of completed assessments.
     */

    static completedAssessment( 
        fromDate,
        toDate 
    ) {
        return new Promise(async (resolve, reject) => {
            try {

                let queryData = {
                    status : messageConstants.apiResponses.STATUS_COMPLETED,
                    completedDate : {
                        $exists : true,
                        $gte : fromDate,
                        $lte : toDate
                    }
                }

                let submissions = await database.models.submissions.find(
                    queryData, 
                    {
                    _id: 1
                }).lean();

                if( submissions.length < 1 ) {
                    throw {
                        message : messageConstants.apiResponses.SUBMISSION_NOT_FOUND
                    }
                }
                let chunkOfSubmissionDocuments = 
                _.chunk(submissions,chunkOfSubmissionsLength);

                let submissionDocuments;

                let completedAssessmentsData = [];
                let submissionsIds;

                for (let pointerToSubmissions = 0; 
                    pointerToSubmissions < chunkOfSubmissionDocuments.length; 
                    pointerToSubmissions++
                ) {

                    submissionsIds = 
                    chunkOfSubmissionDocuments[pointerToSubmissions].map(submission => {
                        return submission._id
                    });

                    submissionDocuments = 
                    await database.models.submissions.find({
                        _id: { $in: submissionsIds }
                    },{
                        _id: 1, 
                        completedDate : 1, 
                        entityId: 1, 
                        "entityInformation.name": 1, 
                        "entityInformation.externalId": 1,
                        "assessors.userId" : 1,
                        "assessors.role" : 1,
                        solutionId : 1,
                        programId : 1
                    }).lean();

                    await Promise.all(
                        submissionDocuments.map(async submissionDocument=>{

                        if( 
                            submissionDocument.assessors && 
                            submissionDocument.assessors.length > 0 
                        ) {
                            
                            let entityName = "";
                            
                            if(
                                submissionDocument.entityInformation && 
                                submissionDocument.entityInformation.name
                            ) {
                                entityName = 
                                submissionDocument.entityInformation.name;
                            } else if (
                                submissionDocument.entityInformation && 
                                submissionDocument.entityInformation.externalId
                            ) {
                                entityName = 
                                submissionDocument.entityInformation.externalId;
                            }
                            
                            let result = {
                                _id : submissionDocument._id,
                                solutionId : submissionDocument.solutionId,
                                completedDate : submissionDocument.completedDate,
                                entityId : submissionDocument.entityId,
                                programId : submissionDocument.programId,
                                entityName: entityName
                            }
                            
                            submissionDocument.assessors.forEach(assessor=>{

                                if(assessor.role && 
                                    gen.utils.fetchAssessorsLeadAssessorRole().includes(assessor.role)
                                ) {
                                    result["userId"] = assessor.userId;
                                    completedAssessmentsData.push(result);
                                }
                            })
                        }
                    }))
                }

                return resolve(completedAssessmentsData);

            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
     * Details of users - consisting of programs,solutions and entities.
     * @method
     * @name entities
     * @param {String} requestedData - Requested data.
     * @param {String} userId - Logged in user Id.
     * @returns {Object} message and result.
     */

    static entities( requestedData,userId,apiVersion = "v1" ) {
        return new Promise(async (resolve, reject) => {
            try {
        
                let assessorEntitiesQueryObject = [
                  {
                    $match: {
                      userId: userId
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
                      "entities": 1,
                      "solutionId": 1,
                      "programId": 1,
                      "entityDocuments._id": 1,
                      "entityDocuments.metaInformation.externalId": 1,
                      "entityDocuments.metaInformation.name": 1,
                      "entityDocuments.metaInformation.addressLine1": 1,
                      "entityDocuments.metaInformation.addressLine2": 1,
                      "entityDocuments.metaInformation.city": 1,
                      "entityDocuments.metaInformation.state": 1
                    }
                  }
                ];
        
                if (requestedData.programId) {
                  assessorEntitiesQueryObject[0]["$match"]["programId"] = 
                  ObjectId(requestedData.programId);
                }
                if (requestedData.solutionId) {
                  assessorEntitiesQueryObject[0]["$match"]["solutionId"] = 
                  ObjectId(requestedData.solutionId);
                }
        
                const assessorsDocument = 
                await database.models.entityAssessors.aggregate(
                    assessorEntitiesQueryObject
                );

                if( !assessorsDocument.length > 0 ) {
                    throw {
                        status : httpStatusCode.bad_request.status,
                        message : messageConstants.apiResponses.USER_NOT_FOUND
                    }
                }

                let programIds = [];
                let solutionIds = [];

                assessorsDocument.forEach(assessor=>{
                    programIds.push(assessor.programId);
                    solutionIds.push(assessor.solutionId);
                })

                let solutionDocuments = await database.models.solutions.find(
                    { 
                        _id : { $in : solutionIds },
                        type : requestedData.type,
                        subType : requestedData.subType,
                        status : "active",
                        "isDeleted" : false
                    },
                    {
                      name: 1,
                      description: 1,
                      externalId: 1,
                      type: 1,
                      subType: 1
                    }
                ).lean();

                if( !solutionDocuments.length > 0 ) {
                    throw {
                        status : httpStatusCode.bad_request.status,
                        message : messageConstants.apiResponses.SOLUTION_NOT_FOUND
                    }
                }

                let solutionsData = solutionDocuments.reduce(
                    (ac, solutionDoc) => ({
                        ...ac,
                        [solutionDoc._id.toString()]: solutionDoc
                }), {});

                let programsDocument = await database.models.programs.find(
                    {
                        _id : { $in : programIds },
                        status : "active",
                        "isDeleted" : false
                    },
                    {
                      name: 1,
                      description: 1,
                      externalId: 1,
                      startDate: 1,
                      endDate: 1
                    }
                  ).lean();

                  if( !programsDocument.length > 0 ) {
                    throw {
                        status : httpStatusCode.bad_request.status,
                        message : messageConstants.apiResponses.PROGRAM_NOT_FOUND
                    }
                }

                  let programsData = programsDocument.reduce(
                    (ac, programDoc) => ({
                        ...ac,
                        [ programDoc._id.toString() ] : programDoc
                }), {});
                
                let result = [];
                let entityPAISubmission = {};
        
                for (
                    let pointerToAssessorDocumentArray = 0; 
                    pointerToAssessorDocumentArray < assessorsDocument.length; 
                    pointerToAssessorDocumentArray++
                ) {

                    let assessor = assessorsDocument[pointerToAssessorDocumentArray];

                    let solution = solutionsData[assessor.solutionId.toString()];
                    let program = programsData[assessor.programId.toString()];
                    
                    
                    if (solution && program) {
                        
                        let submissions = await database.models.submissions.find(
                            {
                                entityId: {
                                    $in: assessor.entities
                                },
                                solutionId: assessor.solutionId
                            },
                            {
                                "entityId": 1,
                                "status": 1,
                                "evidences.PAI.isSubmitted": 1
                            }
                        );
                        
                        entityPAISubmission = submissions.reduce(
                            (ac, entitySubmission) => ({
                                ...ac,
                                [entitySubmission.entityId.toString()]: {
                                    PAIStatus : 
                                    (
                                        entitySubmission.entityId && 
                                        entitySubmission.entityId.evidences && 
                                        entitySubmission.entityId.evidences.PAI && 
                                        entitySubmission.entityId.evidences.PAI.isSubmitted === true
                                    ) ? entity.entityId.evidences.PAI.isSubmitted : false,

                                    submissionId : entitySubmission._id,
                                    submissionStatus : (
                                        entitySubmission.entityId && 
                                        entitySubmission.status
                                    ) ? entitySubmission.status : "pending"
                                }
                        }), {});

                        if( apiVersion === "v2" ) {
                            result = _entitiesV2(
                                assessor,
                                result,
                                program,
                                solution,
                                entityPAISubmission
                            )
                        } else {
                            result = _entitiesV1(
                                assessor,
                                result,
                                program,
                                solution,
                                entityPAISubmission
                            )
                        }
                    }
                }
        
                return resolve({
                  message : messageConstants.apiResponses.ENTITY_FETCHED,
                  result : result
                });

            } catch (error) {
                return reject(error);
            }
        })
    }

};

/**
 * List of programs. Each programs consists of entities and each entities consists of
 * list of solutions. 
 * @method
 * @name _entitiesV2
 * @param {String} assessor - entity assessor data.
 * @param {Array} result - resulting data.
 * @param {Object} program - program document.
 * @param {Object} solution - solution document.
 * @param {Object} entityPAISubmission - entityPAISubmission data.
 * @returns {Array} result.
 */

function _entitiesV2( assessor,result,program,solution,entityPAISubmission ) {
    
    let programIndex = result.findIndex(
        program => program._id.toString() === assessor.programId.toString()
    );

    if( programIndex < 0 ) {
        program["entities"] = [];
        result.push(program);
        programIndex = result.length - 1;
    }

    if( assessor.entityDocuments.length > 0 ) {

        assessor.entityDocuments.forEach(entities=>{

            let entityId = entities._id.toString();
            
            let entityIndex = 
            result[programIndex].entities.findIndex(
                entity => entity._id.toString() === entityId
            );
    
            if( entityIndex < 0 ) {
                
                entities["solutions"] = [];
    
                result[programIndex].entities.push({
                    
                    _id : entities._id,
    
                    ...entities.metaInformation,
    
                    isParentInterviewCompleted : 
                    (entityPAISubmission[entityId]) ? 
                    entityPAISubmission[entityId].PAIStatus : 
                    false,
                    
                    submissionStatus : 
                    (entityPAISubmission[entityId]) ? 
                    entityPAISubmission[entityId].submissionStatus : "pending",
    
                    submissionId : 
                    (entityPAISubmission[entityId]) ? 
                    entityPAISubmission[entityId].submissionId : "",
    
                    solutions : [],
                });
                entityIndex = result[programIndex].entities.length - 1;
            }
    
            let solutionIndex = 
            result[programIndex].entities[entityIndex].solutions.findIndex(
                singleSolution => singleSolution._id.toString() === solution._id.toString()
            )
    
            if( solutionIndex < 0 ) {
                
                result[programIndex].entities[entityIndex].solutions.push(
                    solution
                );
    
            }
    
        })
    }

    return result;
}

/**
 * List of programs. Each programs consists of solutions and each solutions consists of
 * list of entities. 
 * @method
 * @name _entitiesV1
 * @param {String} assessor - entity assessor data.
 * @param {Array} result - resulting data.
 * @param {Object} program - program document.
 * @param {Object} solution - solution document.
 * @param {Object} entityPAISubmission - entityPAISubmission data.
 * @returns {Array} result.
 */

function _entitiesV1( assessor,result,program,solution,entityPAISubmission ) {
    let programDocument = program;
    programDocument.solutions = new Array;
    solution.entities = new Array;
    
    assessor.entityDocuments.forEach(assessorEntity => {
        solution.entities.push({
            
            _id: assessorEntity._id,
            
            isParentInterviewCompleted: (
                entityPAISubmission[assessorEntity._id.toString()]
            ) ? entityPAISubmission[assessorEntity._id.toString()]["PAIStatus"] : 
            false,

            submissionId: (
                entityPAISubmission[assessorEntity._id.toString()]
            ) ? entityPAISubmission[assessorEntity._id.toString()]["submissionId"] : 
            "",

            submissionStatus: (
                entityPAISubmission[assessorEntity._id.toString()]
            ) ? entityPAISubmission[assessorEntity._id.toString()]["submissionStatus"] : 
            "pending",

            ...assessorEntity.metaInformation
        });
    });

    programDocument.solutions.push(solution);
    result.push(programDocument);
    return result;
}