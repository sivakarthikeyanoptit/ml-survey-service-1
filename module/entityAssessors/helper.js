const csv = require("csvtojson");
const moment = require("moment");
let shikshalokam = require(ROOT_PATH + "/generics/helpers/shikshalokam");

module.exports = class entityAssessorHelper {

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

                    if(!userExternalIds.includes(assessor.externalId))userExternalIds.push(assessor.externalId);
                    if (assessor.parentId && !userExternalIds.includes(assessor.parentId)) userExternalIds.push(assessor.parentId);

                });

                let programsFromDatabase = await database.models.programs.find({
                    externalId: { $in: programIds }
                }, { externalId: 1 }).lean();

                let solutionsFromDatabase = await database.models.solutions.find({
                    externalId: { $in: solutionIds }
                }, { externalId: 1, entityType: 1, entityTypeId: 1, entities: 1 }).lean();

                let entitiesBySolution = _.flattenDeep(solutionsFromDatabase.map(solution => solution.entities));

                let entityFromDatabase = await database.models.entities.aggregate([
                    {
                        $match: { _id: { $in: entitiesBySolution } }
                    },
                    {
                        $project: {
                            externalId: "$metaInformation.externalId"
                        }
                    }
                ])

                let entityDataByExternalId = _.keyBy(entityFromDatabase, "externalId")

                let userIdByExternalId = await this.getInternalUserIdByExternalId(token, userExternalIds);

                let programsData = programsFromDatabase.reduce(
                    (ac, program) => ({ ...ac, [program.externalId]: program._id }), {})

                let solutionData = solutionsFromDatabase.reduce(
                    (ac, solution) => ({
                        ...ac, [solution.externalId]: {
                            solutionId: solution._id,
                            entityType: solution.entityType,
                            entityTypeId: solution.entityTypeId,
                        }
                    }), {})

                assessorData = await Promise.all(assessorData.map(async (assessor) => {
                    assessor["userId"] = userIdByExternalId[assessor.externalId];
                    if (assessor.parentId) assessor["parentId"] = userIdByExternalId[assessor.parentId];
                    let assessorEntityArray = new Array

                    assessor.programId = programsData[assessor.programId];
                    assessor.createdBy = assessor.updatedBy = userId;
                    assessor.entityType = solutionData[assessor.solutionId].entityType;
                    assessor.entityTypeId = solutionData[assessor.solutionId].entityTypeId;
                    assessor.solutionId = solutionData[assessor.solutionId].solutionId;

                    assessor.entities.split(",").forEach(assessorEntity => {
                        assessorEntity = entityDataByExternalId[assessorEntity.trim()];
                        if (assessorEntity) {
                            if (assessorEntity._id) assessorEntityArray.push(assessorEntity._id)
                        }
                    })

                    assessor.entities = assessorEntityArray;

                    let fieldsWithOutEntity = {};

                    Object.keys(database.models.entityAssessors.schema.paths).forEach(fieldName => {
                        if (fieldName != 'entities' && assessor[fieldName]) fieldsWithOutEntity[fieldName] = assessor[fieldName];
                    })

                    let updateObject;
                    if (assessor.entityOperation == "OVERRIDE") {
                        updateObject = { $set: { entities: assessor.entities, ...fieldsWithOutEntity } }
                    }

                    else if (assessor.entityOperation == "APPEND") {
                        updateObject = { $addToSet: { entities: assessor.entities }, $set: fieldsWithOutEntity };
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
                    }

                    await this.uploadEntityAssessorTracker(entityAssessorDocument);

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