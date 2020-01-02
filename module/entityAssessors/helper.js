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

                    throw { status: 400, message: 'wrong action' };

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
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
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
                if (!files || !files.assessors) throw { status: 400, message: "Bad request." };

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
                        status: error.status || 500,
                        message: error.message || "Oops! Something went wrong!",
                        errorObject: error
                    });
                });

                return resolve();

            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
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
                    throw new Error("Invalid user id.");
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
                        "appName": "samiksha"
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
                    throw new Error("Something went wrong, not all notifications were pushed.");
                }

                return resolve({
                    success: true,
                    message: "All notifications pushed to Kafka."
                });

            } catch (error) {
                return reject(error);
            }
        })
    }

      /**
   * Entity Assessors upload helper function.
   * @method
   * @name pendingOrCompletedAssessment
   * @param {Object} assessmentStatus - status of the assessments.
   * @param {String} assessmentStatus.pending - pending assessments.
   * @param {String} assessmentStatus.completed - completed assessments. 
   * @returns {Array} Array of pending or completed assessments.
   */

    static pendingOrCompletedAssessment(assessmentStatus) {
        return new Promise(async (resolve, reject) => {
            try {

                let entityAssessorsDocument = await database.models.entityAssessors.find({
                    role: { $in: ["ASSESSOR", "LEAD_ASSESSOR"] },
                }, { _id: 1 }).lean();

                if (!entityAssessorsDocument.length > 0) {
                    throw { message: "No LEAD_ASSESSOR or ASSESSOR Found" };
                }

                let entityAssessorChunkLength = 500;

                let chunkOfEntityAssessors = _.chunk(entityAssessorsDocument, entityAssessorChunkLength);

                let entityAssessorsDocuments;

                let entityAssessorsData = [];
                let entityAssessorsIds;
                let status;

                if (assessmentStatus.pending) {
                    status = {
                        $ne: "completed"
                    };
                }

                if (assessmentStatus.completed) {
                    status = "completed";
                }

                for (let pointerToAssessors = 0; pointerToAssessors < chunkOfEntityAssessors.length; pointerToAssessors++) {

                    entityAssessorsIds = chunkOfEntityAssessors[pointerToAssessors].map(eachAssessor => {
                        return eachAssessor._id
                    });

                    entityAssessorsDocuments = await database.models.entityAssessors.find({
                        _id: { $in: entityAssessorsIds }
                    }, { solutionId: 1, entityTypeId: 1, entities: 1, programId: 1, userId: 1, entityTypeId: 1 }).lean();

                    await Promise.all(entityAssessorsDocuments.map(async eachAssessor => {

                        let queryObj = {
                            programId: eachAssessor.programId,
                            solutionId: eachAssessor.solutionId,
                            status: status,
                            entityTypeId: eachAssessor.entityTypeId,
                            entityId: { $in: eachAssessor.entities }
                        };

                        let assessmentSubmissionsDoc = await database.models.submissions.find(queryObj, {
                            _id: 1, createdAt: 1, entityId: 1, "entityInformation.name": 1
                        }).lean();


                        if (assessmentSubmissionsDoc.length > 0) {

                            let userId = eachAssessor.userId;
                            let solutionId = eachAssessor.solutionId;
                            let programId = eachAssessor.programId;

                            assessmentSubmissionsDoc.forEach(eachAssessmentSubmissions => {

                                entityAssessorsData.push({
                                    _id: eachAssessmentSubmissions._id,
                                    userId: userId,
                                    solutionId: solutionId,
                                    createdAt: eachAssessmentSubmissions.createdAt,
                                    entityId: eachAssessmentSubmissions.entityId,
                                    programId: programId,
                                    entityName: eachAssessmentSubmissions.entityInformation.name
                                });

                            })

                        }

                    })
                    )
                }

                return resolve(entityAssessorsData);

            } catch (error) {
                return reject(error);
            }
        })
    }

};