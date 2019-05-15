const csv = require("csvtojson");
const entityAssessorsHelper = require("../entityAssessor/helper")

module.exports = class entityHelper {

    static add(entityType, data, userDetails) {
        return new Promise(async (resolve, reject) => {
            try {

                let entityTypeDocument = await database.models.entityTypes.findOne({ name: entityType }, { _id: 1 });

                if (!entityTypeDocument) throw "No entity type found for given params"

                let entityDocuments = data.map(singleEntity => {

                    return {
                        "entityTypeId": entityTypeDocument._id,
                        "entityType": entityType,
                        "regsitryDetails": {},
                        "groups": {},
                        "metaInformation": singleEntity,
                        "updatedBy": userDetails.id,
                        "createdBy": userDetails.id
                    }

                })

                let entityData = await database.models.entity.create(
                    entityDocuments
                );

                //update entity id in parent entity
                await this.mapEntitiesToParentEntity(entityData, entityType);

                if (entityData.length != data.length) {
                    throw "Some entity information was not inserted!"
                }

                return resolve(entityData);

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

                let result = await database.models.entity.findOne(queryObject, projectObject).lean();

                let entityIds = result.groups[entityType];

                let entityData = await database.models.entity.find({ _id: { $in: entityIds } }, {
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

    static form(entityType) {
        return new Promise(async (resolve, reject) => {
            try {

                let entityTypeDocument = await database.models.entityTypes.findOne({ name: entityType }, { profileForm: 1 })

                let result = entityTypeDocument.profileForm.length ? entityTypeDocument.profileForm : [];

                return resolve(result);

            } catch (error) {

                return reject(error);

            }
        })


    }

    static fetch(entityType, entityId) {
        return new Promise(async (resolve, reject) => {

            try {

                let entityTypeDocument = await database.models.entityTypes.findOne({ name: entityType }, { profileForm: 1 }).lean();

                let entityForm = entityTypeDocument.profileForm;

                if (!entityForm.length) {
                    throw `No form data available for ${entityType} entity type.`;
                }

                let entityInformation;

                if (entityId) {
                    entityInformation = await database.models.entity.findOne(
                        { _id: ObjectId(entityId), entityType: entityType }, { metaInformation: 1 }
                    );

                    if (!entityInformation) {
                        throw `No ${entityType} information found for given params.`;
                    }

                    entityInformation = entityInformation.metaInformation;
                }

                entityForm.forEach(eachField => {
                    eachField.value = entityInformation[eachField.field]
                })

                return resolve(entityForm);

            } catch (error) {
                return reject(error);
            }

        })

    }

    static update(entityType, entityId, data) {
        return new Promise(async (resolve, reject) => {
            try {
                let entityInformation;

                if (entityType == "parent") {
                    entityInformation = await this.parentRegistryUpdate(entityType, entityId, data);
                } else {
                    entityInformation = await database.models.entity.findOneAndUpdate(
                        { _id: ObjectId(entityId), entityType: entityType },
                        { metaInformation: data },
                        { new: true }
                    );
                }

                return resolve(entityInformation);

            } catch (error) {
                return reject(error);
            }
        })
    }

    static parentRegistryUpdate(entityType, entityId, data) {
        return new Promise(async (resolve, reject) => {
            try {

                const parentDocument = await database.models.entity.findOne(
                    { _id: ObjectId(entityId), entityType: entityType }, { "metaInformation.callResponse": 1 }
                );

                if (!parentDocument) throw "No such parent found"

                let updateSubmissionDocument = false
                if (data.updateFromParentPortal === true) {
                    if (data.callResponse && data.callResponse != "" && (!parentDocument.metaInformation.callResponse || (parentDocument.metaInformation.callResponse != data.callResponse))) {
                        data.callResponseUpdatedTime = new Date()
                    }
                    updateSubmissionDocument = true
                }

                if (typeof (data.createdByProgramId) == "string") data.createdByProgramId = ObjectId(data.createdByProgramId);

                let parentInformation = await database.models.entity.findOneAndUpdate(
                    { _id: ObjectId(entityId) },
                    { metaInformation: data },
                    { new: true }
                );

                if (updateSubmissionDocument) {

                    let queryObject = {
                        entityId: ObjectId(parentInformation._id)
                    }

                    let submissionDocument = await database.models.submissions.findOne(
                        queryObject,
                        { ["parentInterviewResponses." + parentInformation._id.toString()]: 1, parentInterviewResponsesStatus: 1 }
                    );

                    let updateObject = {}
                    updateObject.$set = {}
                    let parentInterviewResponse = {}
                    if (submissionDocument.parentInterviewResponses && submissionDocument.parentInterviewResponses[parentInformation._id.toString()]) {
                        parentInterviewResponse = submissionDocument.parentInterviewResponses[parentInformation._id.toString()]
                        parentInterviewResponse.parentInformation = parentInformation.metaInformation
                    } else {
                        parentInterviewResponse = {
                            parentInformation: parentInformation.metaInformation,
                            status: "started",
                            startedAt: new Date()
                        }
                    }

                    updateObject.$set = {
                        ["parentInterviewResponses." + parentInformation._id.toString()]: parentInterviewResponse
                    }

                    let parentInterviewResponseStatus = _.omit(parentInterviewResponse, ["parentInformation", "answers"])
                    parentInterviewResponseStatus.parentId = parentInformation._id
                    parentInterviewResponseStatus.parentType = parentInformation.metaInformation.type

                    if (submissionDocument.parentInterviewResponsesStatus) {
                        let parentInterviewReponseStatusElementIndex = submissionDocument.parentInterviewResponsesStatus.findIndex(parentInterviewStatus => parentInterviewStatus.parentId.toString() === parentInterviewResponseStatus.parentId.toString())
                        if (parentInterviewReponseStatusElementIndex >= 0) {
                            submissionDocument.parentInterviewResponsesStatus[parentInterviewReponseStatusElementIndex] = parentInterviewResponseStatus
                        } else {
                            submissionDocument.parentInterviewResponsesStatus.push(parentInterviewResponseStatus)
                        }
                    } else {
                        submissionDocument.parentInterviewResponsesStatus = new Array
                        submissionDocument.parentInterviewResponsesStatus.push(parentInterviewResponseStatus)
                    }

                    updateObject.$set.parentInterviewResponsesStatus = submissionDocument.parentInterviewResponsesStatus

                    await database.models.submissions.findOneAndUpdate(
                        { _id: submissionDocument._id },
                        updateObject
                    );
                }

                return resolve(parentInformation);

            } catch (error) {
                return reject(error);
            }
        })
    }

    static upload(entityType, programId, solutionId, userDetails, file) {
        return new Promise(async (resolve, reject) => {
            let entityCSVData = await csv().fromString(
                file.entities.data.toString()
            );

            let programIds = programId ? [programId] : entityCSVData.map(entity => entity.programId);

            let programDocument = await database.models.programs.find(
                {
                    externalId: { $in: programIds }
                },
                {
                    _id: 1,
                    externalId: 1
                }
            ).lean();

            const programsData = programDocument.reduce((ac, program) => ({ ...ac, [program.externalId]: program._id }), {})

            let solutionIds = solutionId ? [solutionId] : entityCSVData.map(entity => entity.solutionId);

            let solutionsDocument = await database.models.solutions.find(
                {
                    externalId: { $in: solutionIds }
                },
                {
                    externalId: 1,
                    subType: 1
                }
            ).lean();

            const solutionsData = solutionsDocument.reduce((ac, solution) => ({
                ...ac, [solution.externalId]: {
                    subType: solution.subType,
                    _id: solution._id
                }
            }), {});

            let parentExternalIds = entityCSVData.map(entity => entity.parentEntityId);

            let parentEntityDocument = await database.models.entity.find(
                {
                    "metaInformation.externalId": { $in: parentExternalIds }
                },
                {
                    _id: 1,
                    "metaInformation.externalId": 1
                }
            ).lean();

            const parentEntityData = parentEntityDocument.reduce((ac, parentDocument) => ({ ...ac, [parentDocument.metaInformation.externalId]: parentDocument._id }), {})

            let entityTypeDocument = await database.models.entityTypes.findOne({ name: entityType }, { _id: 1 });

            let entityDocuments = [];

            entityCSVData.forEach(singleEntity => {

                let arrayTypeFields = singleEntity.arrayFields.split(",")

                Object.keys(singleEntity).forEach(data => {
                    if (arrayTypeFields.includes(data)) {
                        singleEntity[data] = singleEntity[data].split(",")
                    }
                })

                singleEntity["createdByProgramId"] = programsData[singleEntity.programId]["_id"];

                //parentEntityId needed to update parents entity
                singleEntity["parentEntityId"] = parentEntityData[singleEntity.parentEntityId];

                entityDocuments.push({
                    "entityTypeId": entityTypeDocument._id,
                    "entityType": entityType,
                    "regsitryDetails": {},
                    "groups": {},
                    "metaInformation": singleEntity,
                    "updatedBy": userDetails.id,
                    "createdBy": userDetails.id
                });

            })

            let entityData = await database.models.entity.create(
                entityDocuments
            );

            //update entity id in solutions

            let entityDataForSolutionsToBeMapped = entityData.filter(entity => entity.metaInformation.addEntityToSolution === "true")

            if (entityDataForSolutionsToBeMapped.length) {
                let groupedEntityDataBySolutionId = _.groupBy(entityDataForSolutionsToBeMapped, function (entityData) { return entityData.metaInformation.solutionId })

                Object.keys(groupedEntityDataBySolutionId).forEach(async (solutionId) => {

                    let entityIds = groupedEntityDataBySolutionId[solutionId].map(entity => entity._id);

                    await database.models.solutions.updateOne({ _id: ObjectId(solutionsData[solutionId]._id) }, { $addToSet: { entities: { $each: entityIds } } })
                })

            }

            //update entity id in parent entity

            await this.mapEntitiesToParentEntity(entityData);

            entityCSVData.forEach(async (entity) => {

                if (entity.createEntityAssessor && entity.createEntityAssessor === "true") {

                    let entityDocument = entityData.find(entityDocument => {
                        return (entityDocument.metaInformation.userId == entity.userId && entityDocument.metaInformation.solutionId == entity.solutionId)
                    })

                    if (entityDocument) {
                        // createEntityAssessor(programId, solutionId, entityId, entity, userDetails) - for understanding purpose.
                        await entityAssessorsHelper.createEntityAssessor(programsData[entity.programId], solutionsData[entity.solutionId]._id, entityDocument._id, entity, userDetails);
                    }

                }

            })
            return resolve();
        })

    }

    static mapEntitiesToParentEntity(entityData, entityType, programId) {
        return new Promise(async (resolve, reject) => {
            await Promise.all(entityData.map(async (entity) => {

                await database.models.entity.findOneAndUpdate(
                    {
                        _id: ObjectId(entity.metaInformation.parentEntityId),
                        "metaInformation.createdByProgramId": entity.metaInformation.createdByProgramId
                    },
                    {
                        $addToSet: {
                            [`groups.${entityType}`]: entity._id
                        }
                    });

            }))
            return resolve();
        })
    }

};