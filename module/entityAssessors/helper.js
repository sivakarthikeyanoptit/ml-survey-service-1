const csv = require("csvtojson");
const moment = require("moment");
let shikshalokam = require(ROOT_PATH + "/generics/helpers/shikshalokam");

module.exports = class entityAssessorHelper {

    static createEntityAssessor(programId, solutionId, entityId, userEntityDetails, userDetails) {
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
                return reject(error)
            }
        })
    }

    static uploadEntityAssessorTracker(entityAssessor) {
        return new Promise(async (resolve, reject) => {
            try {

                let entityAssessorsTrackersDocument = await database.models.entityAssessorsTrackers.find({ "assessorUserId": entityAssessor.assessorId, "programId": entityAssessor.programId }).sort({ "dateOfOperation": -1 }).limit(1).lean();

                if (!entityAssessorsTrackersDocument.length) return resolve();

                let actions = ["APPEND", "OVERRIDE", "REMOVE"];

                if (entityAssessor.entities.length) entityAssessor.entities = entityAssessor.entities.map(entity => entity.toString());

                let trackerObject = {};

                entityAssessorsTrackersDocument = entityAssessorsTrackersDocument[0];

                let updatedData = entityAssessorsTrackersDocument.updatedData;

                if (actions.includes(entityAssessor.action)) {

                    trackerObject.action = entityAssessor.action;

                    if (entityAssessor.action == "APPEND") {

                        entityAssessor.entities.forEach(entity => {
                            if (!updatedData.includes(entity)) {
                                updatedData.push(entity)
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
                let todayDate = moment().format("DD-MM-YYYY")

                if (lastDataDate != todayDate) {

                    let queryObject = {
                        assessorId: entityAssessorsTrackersDocument.assessorId,
                        programId: entityAssessorsTrackersDocument.programId,
                        dateOfOperation: entityAssessorsTrackersDocument.dateOfOperation
                    };

                    entityAssessorsTrackersDocument.validTo = moment().endOf('day').subtract(1, 'days');

                    delete entityAssessorsTrackersDocument.createdAt
                    delete entityAssessorsTrackersDocument._id

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

    static upload(files, programId, solutionId, userId, token) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!files || !files.assessors) throw { status: 400, message: "Bad request." };

                let assessorData = await csv().fromString(files.assessors.data.toString());

                let entityQueryList = {};
                let programQueryList = {};
                let entityTypeQueryList = {};
                let solutionQueryList = {};
                let userExternalIds = [];

                assessorData.forEach(assessor => {
                    assessor.entities.split(",").forEach(entityAssessor => {
                        if (entityAssessor)
                            entityQueryList[entityAssessor.trim()] = ObjectId(entityAssessor.trim())
                    })

                    programQueryList[assessor.externalId] = programId ? programId : assessor.programId

                    entityTypeQueryList[assessor.externalId] = assessor.entityType

                    solutionQueryList[assessor.externalId] = solutionId ? solutionId : assessor.solutionId
                    userExternalIds.push(assessor.userId);
                    if (assessor.parentId) userExternalIds.push(assessor.parentId);

                });


                let entityFromDatabase = await database.models.entities.find({
                    "_id": { $in: Object.values(entityQueryList) }
                }, {
                        "metaInformation.externalId": 1
                    }).lean();


                let programsFromDatabase = await database.models.programs.find({
                    externalId: { $in: Object.values(programQueryList) }
                }, { externalId: 1 }).lean();

                let solutionsFromDatabase = await database.models.solutions.find({
                    externalId: { $in: Object.values(solutionQueryList) }
                }, { externalId: 1 }).lean();

                let entityTypeFromDatabase = await database.models.entityTypes.find({
                    name: { $in: Object.values(entityTypeQueryList) }
                }, { name: 1 }).lean();

                let userIdByExternalId = await this.getInternalUserIdByExternalId(token, userExternalIds);

                let entityAssessorDocument = await database.models.entityAssessors.find({ userId: { $in: Object.values(userIdByExternalId) } }, { entities: 1, userId: 1 }).lean();

                let entityAssessorByUserId = _.keyBy(entityAssessorDocument, 'userId');

                let entityData = entityFromDatabase.reduce(
                    (ac, entity) => ({ ...ac, [entity._id]: entity._id }), {})

                let programsData = programsFromDatabase.reduce(
                    (ac, program) => ({ ...ac, [program.externalId]: program._id }), {})

                let solutionData = solutionsFromDatabase.reduce(
                    (ac, solution) => ({ ...ac, [solution.externalId]: solution._id }), {})

                let entityTypeData = entityTypeFromDatabase.reduce(
                    (ac, entityType) => ({ ...ac, [entityType.name]: entityType._id }), {})

                let creatorId = userId;

                assessorData = await Promise.all(assessorData.map(async (assessor) => {
                    assessor["userId"] = userIdByExternalId[assessor.externalId];
                    if (assessor.parentId) assessor["parentId"] = userIdByExternalId[assessor.parentId];
                    let assessorEntityArray = new Array
                    assessor.entities.split(",").forEach(assessorEntity => {
                        if (entityData[assessorEntity.trim()])
                            assessorEntityArray.push(entityData[assessorEntity.trim()])
                    })

                    assessor.entities = assessorEntityArray
                    assessor.programId = programsData[assessor.programId];
                    assessor.createdBy = assessor.updatedBy = creatorId;

                    let entities = (!entityAssessorByUserId || !entityAssessorByUserId[assessor.userId] || !entityAssessorByUserId[assessor.userId].entities.length) ? [] : entityAssessorByUserId[assessor.userId].entities;

                    if (assessor.entityOperation == "OVERRIDE") {
                        entities = assessor.entities
                    }

                    else if (assessor.entityOperation == "APPEND") {
                        entities.push(...assessor.entities)
                    }

                    else if (assessor.entityOperation == "REMOVE") {
                        entities = entities.map(entity => entity.toString);
                        assessor.entities = assessor.entities.map(entity => entity.toString);
                        _.pullAll(entities, assessor.entities);
                        entities = entities.map(entity => ObjectId(entity));
                    }

                    //entity assessor tracker
                    let entityAssessorDocument = {
                        "action": assessor.entityOperation,
                        "entities": assessor.entities,
                        "assessorId": assessor.userId,
                        "programId": assessor.programId
                    }

                    await this.uploadEntityAssessorTracker(entityAssessorDocument);

                    delete assessor.entityOperation;
                    assessor.solutionId = solutionData[assessor.solutionId];
                    let updateObject = {
                        $set:
                        {
                            entities: entities,
                            entityType: assessor.entityType,
                            entityTypeId: entityTypeData[assessor.entityType],
                            ...assessor
                        }
                    }
                    return database.models.entityAssessors.findOneAndUpdate({ userId: assessor.userId, programId: assessor.programId, solutionId: assessor.solutionId }, updateObject,
                        {
                            upsert: true,
                            new: true,
                            setDefaultsOnInsert: true,
                            returnNewDocument: true
                        });

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

    static getInternalUserIdByExternalId(token, userExternalIds) {

        return new Promise(async (resolve, reject) => {

            try {

                userExternalIds = _.compact(userExternalIds);

                let externalIdToUserIdMap = {};

                let result = await Promise.all(userExternalIds.map(userExternalId => {
                    return shikshalokam.getKeycloakUserIdByLoginId(token, userExternalId)
                }))

                userExternalIds.forEach((loginId, index) => {
                    externalIdToUserIdMap[loginId] = result[index][0]["userLoginId"]
                })

                return resolve(externalIdToUserIdMap);

            } catch (error) {

                return reject(error);

            }

        })

    }

};