const csv = require("csvtojson");
const moment = require("moment");
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

    static uploadAssessorSchoolTracker(entityAssessor) {
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

                trackerObject.type = entityAssessor.type;

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

    static upload(files, programId, solutionId, userId) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!files || !files.assessors) throw { status: 400, message: "Bad request." };

                let assessorData = await csv().fromString(files.assessors.data.toString());

                let schoolQueryList = {};
                let programQueryList = {};
                let entityTypeQueryList = {};
                let solutionQueryList = {};
                let skippedDocumentCount = 0;

                assessorData.forEach(assessor => {
                    assessor.entities.split(",").forEach(entityAssessor => {
                        if (entityAssessor)
                            schoolQueryList[entityAssessor.trim()] = entityAssessor.trim()
                    })

                    programQueryList[assessor.externalId] = programId ? programId : assessor.programId

                    entityTypeQueryList[assessor.externalId] = assessor.entityType

                    solutionQueryList[assessor.externalId] = solutionId ? solutionId : assessor.solutionId

                });


                let entityFromDatabase = await database.models.entities.find({
                    "metaInformation.externalId": { $in: Object.values(schoolQueryList) }
                }, {
                        "metaInformation.externalId": 1
                    }).lean();


                let programsFromDatabase = await database.models.programs.find({
                    externalId: { $in: Object.values(programQueryList) }
                }).lean();

                let solutionsFromDatabase = await database.models.solutions.find({
                    externalId: { $in: Object.values(solutionQueryList) }
                }, { externalId: 1 }).lean();

                let entityTypeFromDatabase = await database.models.entityTypes.find({
                    name: { $in: Object.values(entityTypeQueryList) }
                }, { name: 1 }).lean();

                let userIds = assessorData.map(assessor => assessor.userId);

                let entityAssessorDocument = await database.models.entityAssessors.find({ userId: { $in: userIds } }, { entities: 1, userId: 1 }).lean();

                let entityAssessorByUserId = _.keyBy(entityAssessorDocument, 'userId');

                let entityData = entityFromDatabase.reduce(
                    (ac, entity) => ({ ...ac, [entity.metaInformation.externalId]: entity._id }), {})

                let programsData = programsFromDatabase.reduce(
                    (ac, program) => ({ ...ac, [program.externalId]: program }), {})

                let solutionData = solutionsFromDatabase.reduce(
                    (ac, solution) => ({ ...ac, [solution.externalId]: solution._id }), {})

                let entityTypeData = entityTypeFromDatabase.reduce(
                    (ac, entityType) => ({ ...ac, [entityType.name]: entityType._id }), {})

                let creatorId = userId;

                assessorData = await Promise.all(assessorData.map(async (assessor) => {
                    let assessorEntityArray = new Array
                    assessor.entities.split(",").forEach(assessorSchool => {
                        if (entityData[assessorSchool.trim()])
                            assessorEntityArray.push(entityData[assessorSchool.trim()])
                    })

                    assessor.entities = assessorEntityArray
                    if (programsData[assessor.programId]) {
                        assessor.programId = programsData[assessor.programId]._id;
                    } else {
                        assessor.programId = null;
                        skippedDocumentCount += 1;
                    }
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
                        "type": "ASSESSOR",
                        "assessorId": assessor.userId,
                        "programId": assessor.programId
                    }

                    await this.uploadAssessorSchoolTracker(entityAssessorDocument)
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
                    return database.models.entityAssessors.findOneAndUpdate({ userId: assessor.userId }, updateObject,
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

                return resolve(skippedDocumentCount);

            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
                    errorObject: error
                });
            }
        })
    }


};