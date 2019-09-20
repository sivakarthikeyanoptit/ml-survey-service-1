const entityTypesHelper = require(ROOT_PATH + "/module/entityTypes/helper");

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

    static list(entityType, entityId, limitingValue = "", skippingValue = "") {
        return new Promise(async (resolve, reject) => {
            try {

                let queryObject = { _id: ObjectId(entityId) };
                let projectObject = { [`groups.${entityType}`]: 1 };

                let result = await database.models.entities.findOne(queryObject, projectObject).lean();

                let entityIds = result.groups[entityType];

                const entityTypesArray = await entityTypesHelper.list({}, {
                    name: 1,
                    immediateChildrenEntityType: 1
                });

                let enityTypeToImmediateChildrenEntityMap = {}

                if (entityTypesArray.length > 0) {
                    entityTypesArray.forEach(entityType => {
                        enityTypeToImmediateChildrenEntityMap[entityType.name] = (entityType.immediateChildrenEntityType && entityType.immediateChildrenEntityType.length > 0) ? entityType.immediateChildrenEntityType : []
                    })
                }

                let entityData = await database.models.entities.find({ _id: { $in: entityIds } }, {
                    metaInformation: 1,
                    groups: 1,
                    entityType: 1,
                    entityTypeId: 1
                })
                    .limit(limitingValue)
                    .skip(skippingValue)
                    .lean();

                result = entityData.map(entity => {
                    entity.metaInformation.childrenCount = 0
                    entity.metaInformation.entityType = entity.entityType
                    entity.metaInformation.entityTypeId = entity.entityTypeId
                    entity.metaInformation.subEntityGroups = new Array

                    Array.isArray(enityTypeToImmediateChildrenEntityMap[entity.entityType]) && enityTypeToImmediateChildrenEntityMap[entity.entityType].forEach(immediateChildrenEntityType => {
                        if (entity.groups[immediateChildrenEntityType]) {
                            entity.metaInformation.immediateSubEntityType = immediateChildrenEntityType
                            entity.metaInformation.childrenCount = entity.groups[immediateChildrenEntityType].length
                        }
                    })

                    entity.groups && Array.isArray(Object.keys(entity.groups)) && Object.keys(entity.groups).forEach(subEntityType => {
                        entity.metaInformation.subEntityGroups.push(subEntityType)
                    })
                    return {
                        _id: entity._id,
                        entityId: entity._id,
                        ...entity.metaInformation
                    }
                })

                return resolve({
                    entityData: result,
                    count: entityIds.length
                });

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
                            if (singleEntity[arrayTypeField]) {
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

                    let updateQuery = {}
                    updateQuery["$addToSet"] = {}
                    updateQuery["$addToSet"][`groups.${childEntity.entityType}`] = childEntity._id

                    let projectedData = {
                        _id: 1,
                        "entityType": 1,
                        "entityTypeId": 1,
                    }

                    let updatedParentEntity = await database.models.entities.findOneAndUpdate(
                        parentEntityQueryObject,
                        updateQuery,
                        projectedData
                    );

                    await this.mappedParentEntities(updatedParentEntity, childEntity)
                }

                return resolve();
            } catch (error) {
                return reject(error)
            }
        })
    }

    static search(entityTypeId, searchText, pageSize, pageNo, entityIds = false) {
        return new Promise(async (resolve, reject) => {
            try {

                let queryObject = {}

                queryObject["$match"] = {}
                
                if (entityIds && entityIds.length > 0) {
                    queryObject["$match"]["_id"] = {}
                    queryObject["$match"]["_id"]["$in"] = entityIds
                }
                
                queryObject["$match"]["entityTypeId"] = entityTypeId

                queryObject["$match"]["$or"] = [
                    { "metaInformation.name": new RegExp(searchText, 'i') },
                    { "metaInformation.externalId": new RegExp("^"+searchText, 'm') },
                    { "metaInformation.addressLine1": new RegExp(searchText, 'i') },
                    { "metaInformation.addressLine2": new RegExp(searchText, 'i') }
                ]


                let entityDocuments = await database.models.entities.aggregate([
                    queryObject,
                    {
                        $project: {
                            name: "$metaInformation.name",
                            externalId: "$metaInformation.externalId",
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

    static validateEntities(entityIds, entityTypeId) {
        return new Promise(async (resolve, reject) => {
            try {
                let ids = []

                let entitiesDocuments = await database.models.entities.find(
                    {
                        _id: { $in: gen.utils.arrayIdsTobjectIds(entityIds) },
                        entityTypeId: entityTypeId
                    },
                    {
                        _id: 1
                    }
                ).lean();

                if (entitiesDocuments.length > 0) {
                    ids = entitiesDocuments.map(entityId => entityId._id)
                }

                return resolve({
                    entityIds: ids
                })


            } catch (error) {
                return reject(error);
            }
        })
    }

    static entities(findQuery = "all", fields = "all", limitingValue = "", skippingValue = "") {
        return new Promise(async (resolve, reject) => {
            try {
                let queryObject = {};

                if (findQuery != "all") {
                    queryObject = findQuery
                }

                let projectionObject = {};

                if (fields != "all") {
                    fields.forEach(element => {
                        projectionObject[element] = 1;
                    });
                }

                let entitiesDocuments = await database.models.entities
                    .find(queryObject, projectionObject)
                    .limit(limitingValue)
                    .skip(skippingValue)
                    .lean();

                return resolve(entitiesDocuments);
            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
                    errorObject: error
                });
            }
        });
    }

    static relatedEntities(entityId, entityTypeId, entityType, projection = "all") {
        return new Promise(async (resolve, reject) => {
            try {

                let relatedEntitiesQuery = {}

                if (entityTypeId && entityId && entityType) {
                    relatedEntitiesQuery[`groups.${entityType}`] = entityId
                    relatedEntitiesQuery["entityTypeId"] = {}
                    relatedEntitiesQuery["entityTypeId"]["$ne"] = entityTypeId
                } else {
                    throw { status: 400, message: "EntityTypeId or entityType or entityId is not found" };
                }

                let relatedEntitiesDocument = await this.entities(relatedEntitiesQuery, projection)
                relatedEntitiesDocument = relatedEntitiesDocument ? relatedEntitiesDocument : []

                return resolve(relatedEntitiesDocument)


            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
                });
            }
        })
    }

    static mappedParentEntities(parentEntity, childEntity) {
        return new Promise(async (resolve, reject) => {
            try {
                let checkParentEntitiesMappedValue = await database.models.entityTypes.findOne({
                    name: parentEntity.entityType
                }, {
                        toBeMappedToParentEntities: 1
                    }).lean()



                if (checkParentEntitiesMappedValue.toBeMappedToParentEntities) {
                    let relatedEntities = await this.relatedEntities(parentEntity._id, parentEntity.entityTypeId, parentEntity.entityType, ["_id"])

                    if (relatedEntities.length > 0) {

                        let updateQuery = {}
                        updateQuery["$addToSet"] = {}
                        updateQuery["$addToSet"][`groups.${childEntity.entityType}`] = childEntity._id

                        let allEntities = []

                        relatedEntities.forEach(eachRelatedEntities => {
                            allEntities.push(eachRelatedEntities._id)
                        })

                        await database.models.entities.updateMany(
                            { _id: { $in: allEntities } },
                            updateQuery
                        );
                    }
                }

                return resolve()
            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
                });
            }
        })
    }

    static createGroupEntityTypeIndex(entityType) {
        return new Promise(async (resolve, reject) => {
            try {

                const entityIndexes = await database.models.entities.listIndexes()

                if (_.findIndex(entityIndexes, { name: 'groups.' + entityType + "_1" }) >= 0) {
                    return resolve("Index successfully created.");
                }

                const newIndexCreation = await database.models.entities.db.collection('entities').createIndex(
                    { ["groups." + entityType]: 1 },
                    { partialFilterExpression: { ["groups." + entityType]: { $exists: true } }, background: 1 }
                )

                if (newIndexCreation == "groups." + entityType + "_1") {
                    return resolve("Index successfully created.");
                } else {
                    throw "Something went wrong! Couldn't create the index."
                }

            } catch (error) {
                return reject(error);
            }
        })

    }

};