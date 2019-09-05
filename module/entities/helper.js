const entityAssessorsHelper = require("../entityAssessors/helper")

module.exports = class entitiesHelper {

    static add(queryParams, data, userDetails) {
        return new Promise(async (resolve, reject) => {
            try {

                let entityTypeDocument = await database.models.entityTypes.findOne({ name: queryParams.type }, { _id: 1 }).lean();

                if (!entityTypeDocument) throw "No entity type found for given params"

                let entityDocuments = data.map(singleEntity => {
                    singleEntity.createdByProgramId = ObjectId(singleEntity.createdByProgramId)
                    singleEntity.createdBySolutionId = ObjectId(singleEntity.solutionId)
                    return {
                        "entityTypeId": entityTypeDocument._id,
                        "entityType": queryParams.type,
                        "regsitryDetails": {},
                        "groups": {},
                        "metaInformation": singleEntity,
                        "updatedBy": userDetails.id,
                        "createdBy": userDetails.id
                    }

                })

                let entityData = await database.models.entities.create(
                    entityDocuments
                );

                //update entity id in parent entity
                for (let eachEntityData = 0; eachEntityData < entityData.length; eachEntityData++) {
                    await this.addSubEntityToParent(queryParams.parentEntityId, entityData[eachEntityData]._id.toString(), queryParams.programId);
                }

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

    static form(entityType) {
        return new Promise(async (resolve, reject) => {
            try {

                let entityTypeDocument = await database.models.entityTypes.findOne({ name: entityType }, { profileForm: 1 }).lean();

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
                    entityInformation = await database.models.entities.findOne(
                        { _id: ObjectId(entityId) }, { metaInformation: 1 }
                    ).lean();

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
                    entityInformation = await this.parentRegistryUpdate(entityId, data);
                } else {
                    entityInformation = await database.models.entities.findOneAndUpdate(
                        { _id: ObjectId(entityId) },
                        { metaInformation: data },
                        { new: true }
                    ).lean();
                }

                return resolve(entityInformation);

            } catch (error) {
                return reject(error);
            }
        })
    }

    static parentRegistryUpdate(entityId, data) {
        return new Promise(async (resolve, reject) => {
            try {

                const parentDocument = await database.models.entities.findOne(
                    { _id: ObjectId(entityId) }, { "metaInformation.callResponse": 1 }
                ).lean();

                if (!parentDocument) throw "No such parent found"

                let updateSubmissionDocument = false
                if (data.updateFromParentPortal === true) {
                    if (data.callResponse && data.callResponse != "" && (!parentDocument.metaInformation.callResponse || (parentDocument.metaInformation.callResponse != data.callResponse))) {
                        data.callResponseUpdatedTime = new Date()
                    }
                    updateSubmissionDocument = true
                }

                if (typeof (data.createdByProgramId) == "string") data.createdByProgramId = ObjectId(data.createdByProgramId);

                let parentInformation = await database.models.entities.findOneAndUpdate(
                    { _id: ObjectId(entityId) },
                    { metaInformation: data },
                    { new: true }
                ).lean();

                if (updateSubmissionDocument) {

                    let queryObject = {
                        entityId: ObjectId(parentInformation._id)
                    }

                    let submissionDocument = await database.models.submissions.findOne(
                        queryObject,
                        { ["parentInterviewResponses." + parentInformation._id.toString()]: 1, parentInterviewResponsesStatus: 1 }
                    ).lean();

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
                    ).lean();
                }

                return resolve(parentInformation);

            } catch (error) {
                return reject(error);
            }
        })
    }

    static bulkCreate(entityType, programId, solutionId, userDetails, entityCSVData) {
        return new Promise(async (resolve, reject) => {
            try {

                let solutionsDocument = new Array
                if (programId && solutionId) {
                    solutionsDocument = await database.models.solutions.find(
                        {
                            externalId: solutionId,
                            programExternalId: programId
                        },
                        {
                            programId: 1,
                            externalId: 1,
                            subType: 1,
                            entityType: 1,
                            entityTypeId: 1
                        }
                    ).lean();
                } else {
                    solutionsDocument = await database.models.solutions.find(
                        {},
                        {
                            programId: 1,
                            externalId: 1,
                            subType: 1,
                            entityType: 1,
                            entityTypeId: 1
                        }
                    ).lean();
                }

                let solutionsData;

                if (solutionsDocument.length) {
                    solutionsData = solutionsDocument.reduce((ac, solution) => ({
                        ...ac, [solution.externalId]: {
                            subType: solution.subType,
                            solutionId: solution._id,
                            programId: solution.programId,
                            entityType: solution.entityType,
                            entityTypeId: solution.entityTypeId,
                            newEntities: new Array
                        }
                    }), {});
                }

                let entityTypeDocument = await database.models.entityTypes.findOne({ name: entityType }, { _id: 1 });

                if (!entityTypeDocument) throw "Invalid entity type id."

                const entityUploadedData = await Promise.all(
                    entityCSVData.map(async singleEntity => {

                        singleEntity._arrayFields.split(",").forEach(arrayTypeField => {
                            if(singleEntity[arrayTypeField]) {
                                singleEntity[arrayTypeField] = singleEntity[arrayTypeField].split(",")
                            }
                        })

                        if (solutionsData && singleEntity._solutionId && singleEntity._solutionId != "") singleEntity["createdByProgramId"] = solutionsData[singleEntity._solutionId]["programId"];

                        let newEntity = await database.models.entities.create(
                            {
                                "entityTypeId": entityTypeDocument._id,
                                "entityType": entityType,
                                "regsitryDetails": {},
                                "groups": {},
                                "metaInformation": _.omitBy(singleEntity, (value, key) => { return _.startsWith(key, "_") }),
                                "updatedBy": userDetails.id,
                                "createdBy": userDetails.id
                            }
                        );

                        if (!newEntity._id) return;

                        singleEntity["_systemId"] = newEntity._id.toString()

                        if (solutionsData && singleEntity._solutionId && singleEntity._solutionId != "" && newEntity.entityType == solutionsData[singleEntity._solutionId]["entityType"]) {
                            solutionsData[singleEntity._solutionId].newEntities.push(newEntity._id)
                        }

                        return singleEntity
                    })
                )

                if (entityUploadedData.findIndex(entity => entity === undefined) >= 0) {
                    throw "Something went wrong, not all records were inserted/updated."
                }

                solutionsData && await Promise.all(
                    Object.keys(solutionsData).map(async solutionExternalId => {
                        if (solutionsData[solutionExternalId].newEntities.length > 0) {
                            await database.models.solutions.updateOne({ _id: solutionsData[solutionExternalId].solutionId }, { $addToSet: { entities: { $each: solutionsData[solutionExternalId].newEntities } } })
                        }
                    })
                )

                return resolve(entityUploadedData);
            } catch (error) {
                return reject(error)
            }
        })

    }

    static addSubEntityToParent(parentEntityId, childEntityId, parentEntityProgramId = false) {
        return new Promise(async (resolve, reject) => {
            try {
                let childEntity = await database.models.entities.findOne({
                    _id: ObjectId(childEntityId)
                }, {
                        entityType: 1
                    }).lean()

                if (childEntity.entityType) {

                    let parentEntityQueryObject = {
                        _id: ObjectId(parentEntityId)
                    }
                    if (parentEntityProgramId) {
                        parentEntityQueryObject["metaInformation.createdByProgramId"] = ObjectId(parentEntityProgramId)
                    }
                    await database.models.entities.findOneAndUpdate(
                        parentEntityQueryObject,
                        {
                            $addToSet: {
                                [`groups.${childEntity.entityType}`]: childEntity._id
                            }
                        }, {
                            _id: 1
                        }
                    );

                }

                return resolve();
            } catch (error) {
                return reject(error)
            }
        })
    }

    static search(entityTypeId, searchText, pageSize, pageNo) {
        return new Promise(async (resolve, reject) => {
            try {

                let entityDocuments = await database.models.entities.aggregate([
                    {
                        $match: {
                            $or: [{ "metaInformation.name": new RegExp(searchText, 'i') }, { "metaInformation.addressLine1": new RegExp(searchText, 'i') }, { "metaInformation.addressLine2": new RegExp(searchText, 'i') }],
                            "entityTypeId": entityTypeId
                        }
                    },
                    {
                        $project: {
                            name: "$metaInformation.name",
                            addressLine1: "$metaInformation.addressLine1",
                            addressLine2: "$metaInformation.addressLine2"
                        }
                    },
                    {
                        $facet: {
                            "totalCount": [
                                { "$count": "count" }
                            ],
                            "data": [
                                { $skip: pageSize * (pageNo - 1) },
                                { $limit: pageSize }
                            ],
                        }
                    }, {
                        $project: {
                            "data": 1,
                            "count": {
                                $arrayElemAt: ["$totalCount.count", 0]
                            }
                        }
                    }
                ]);

                return resolve(entityDocuments)

            } catch (error) {
                return reject(error);
            }
        })
    }

};