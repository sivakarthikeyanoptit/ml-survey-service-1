/**
 * name : entitiesController.js
 * author : Akash
 * created-date : 22-Nov-2018
 * Description : All Entities related information.
 */

// Dependencies
const entityTypesHelper = require(MODULES_BASE_PATH + "/entityTypes/helper");
const elasticSearch = require(ROOT_PATH + "/generics/helpers/elasticSearch");
const userRolesHelper = require(MODULES_BASE_PATH + "/userRoles/helper");
const FileStream = require(ROOT_PATH + "/generics/fileStream");


 /**
    * EntitiesHelper
    * @class
*/
module.exports = class EntitiesHelper {

    /**
   * Add entities.
   * @method
   * @name add
   * @param {Object} queryParams - requested query data.
   * @param {Object} data - requested entity data.
   * @param {Object} userDetails - Logged in user information. 
   * @param {String} userDetails.id - Logged in user id.
   * @returns {JSON} - Created entity information.
   */

    static add(queryParams, data, userDetails) {
        return new Promise(async (resolve, reject) => {
            try {

                let entityTypeDocument = await database.models.entityTypes.findOne({ name: queryParams.type }, { _id: 1 }).lean();

                if (!entityTypeDocument){
                    throw messageConstants.apiResponses.ENTITY_NOT_FOUND;
                }

                let entityDocuments = [];

                for (let pointer = 0;pointer < data.length ; pointer ++ ) {
                    
                    let singleEntity = data[pointer];
                    
                    if( singleEntity.createdByProgramId ) {
                        singleEntity.createdByProgramId = ObjectId(singleEntity.createdByProgramId);
                    }

                    if( singleEntity.createdBySolutionId ) {
                        singleEntity.createdBySolutionId = ObjectId(singleEntity.solutionId);
                    }
                    
                    let registryDetails = {};
                    if (singleEntity.locationId) {
                        registryDetails["_id"] = singleEntity.locationId;
                    }

                    let entityDoc = {
                        "entityTypeId": entityTypeDocument._id,
                        "entityType": queryParams.type,
                        "registryDetails": registryDetails,
                        "groups": {},
                        "metaInformation": _.omit(singleEntity,"locationId"),
                        "updatedBy": userDetails.id,
                        "createdBy": userDetails.id,
                        "userId" : userDetails.id
                    }

                    if( singleEntity.allowedRoles && singleEntity.allowedRoles.length > 0 ) {
                        entityDoc['allowedRoles'] = 
                        await allowedRoles(singleEntity.allowedRoles);
                        delete entityDoc.metaInformation.allowedRoles;
                    }

                    entityDocuments.push(entityDoc);

                }

                let entityData = await database.models.entities.create(
                    entityDocuments
                );
                
                let entities = [];

                //update entity id in parent entity
                
                for (
                    let eachEntityData = 0; 
                    eachEntityData < entityData.length; 
                    eachEntityData++
                ) {

                    if( queryParams.parentEntityId && queryParams.programId ) {

                        await this.addSubEntityToParent(
                            queryParams.parentEntityId, 
                            entityData[eachEntityData]._id.toString(), 
                            queryParams.programId
                        );
                    }
                    
                    entities.push(entityData[eachEntityData]._id);
                }

                if (entityData.length != data.length) {
                    throw messageConstants.apiResponses.ENTITY_INFORMATION_NOT_INSERTED;
                }
               
                await this.pushEntitiesToElasticSearch(entities);

                return resolve(entityData);

            } catch (error) {
                return reject(error);
            }
        })

    }

    /**
   * List entities.
   * @method
   * @name list
   * @param {String} entityType - entity type.
   * @param {String} entityId - requested entity id.
   * @param {String} [limitingValue = ""] - Limiting value if required. 
   * @param {String} [skippingValue = ""] - Skipping value if required.
   * @returns {JSON} - Details of entity.
   */

    static list(
        entityType, 
        entityId, 
        limitingValue = "", 
        skippingValue = "",
        schoolTypes = "",
        administrationTypes = ""
    ) {
        return new Promise(async (resolve, reject) => {
            try {

                let queryObject = { _id: ObjectId(entityId) };
                let projectObject = { [`groups.${entityType}`]: 1 };

                let result = 
                await database.models.entities.findOne(
                    queryObject, 
                    projectObject
                ).lean();

                if( !result ) {
                    
                    return resolve({
                        status : httpStatusCode.bad_request.status,
                        message : messageConstants.apiResponses.ENTITY_NOT_FOUND
                    })
                }

                if( !result.groups || !result.groups[entityType] ) {
                    return resolve({
                        status : httpStatusCode.bad_request.status,
                        message : messageConstants.apiResponses.ENTITY_GROUPS_NOT_FOUND
                    })
                }

                let entityIds = result.groups[entityType];

                const entityTypesArray = await entityTypesHelper.list({}, {
                    name: 1,
                    immediateChildrenEntityType: 1
                });

                let enityTypeToImmediateChildrenEntityMap = {};

                if (entityTypesArray.length > 0) {
                    entityTypesArray.forEach(entityType => {
                        enityTypeToImmediateChildrenEntityMap[entityType.name] = (entityType.immediateChildrenEntityType && entityType.immediateChildrenEntityType.length > 0) ? entityType.immediateChildrenEntityType : [];
                    })
                }

                let filteredQuery = {
                    $match : { _id : { $in: entityIds }}
                }

                let schoolOrAdministrationTypes = [];
                
                if( schoolTypes !== "" ) {

                    schoolOrAdministrationTypes = 
                    schoolOrAdministrationTypes.concat(schoolTypes.split(","));
                }
                
                if( administrationTypes !== "" ) {

                    schoolOrAdministrationTypes = 
                    schoolOrAdministrationTypes.concat(administrationTypes.split(","));
                }

                if( schoolOrAdministrationTypes.length > 0 ) {

                    schoolOrAdministrationTypes = schoolOrAdministrationTypes.map(
                        schoolOrAdministrationType=>schoolOrAdministrationType.toLowerCase()
                    );

                    filteredQuery["$match"]["metaInformation.tags"] = 
                    { $in : schoolOrAdministrationTypes };
                }
                
                let entityData = await database.models.entities.aggregate([
                    filteredQuery,
                    {
                        $project: {
                            metaInformation : 1,
                            groups : 1,
                            entityType : 1,
                            entityTypeId : 1
                        }
                    },
                    {
                        $facet: {
                            "totalCount": [
                                { "$count": "count" }
                            ],
                            "data": [
                                { $skip: skippingValue },
                                { $limit: limitingValue }
                            ],
                        }
                    },{
                        $project: {
                            "data": 1,
                            "count": {
                                $arrayElemAt: ["$totalCount.count", 0]
                            }
                        }
                    }
                ]);

                let count = 0;
                result = [];

                if( entityData[0].data.length > 0 ) {

                    result = entityData[0].data.map(entity => {
                        entity.metaInformation.childrenCount = 0;
                        entity.metaInformation.entityType = entity.entityType;
                        entity.metaInformation.entityTypeId = entity.entityTypeId;
                        entity.metaInformation.subEntityGroups = new Array;
    
                        entity.groups && Array.isArray(enityTypeToImmediateChildrenEntityMap[entity.entityType]) && enityTypeToImmediateChildrenEntityMap[entity.entityType].forEach(immediateChildrenEntityType => {
                            if (entity.groups[immediateChildrenEntityType]) {
                                entity.metaInformation.immediateSubEntityType = immediateChildrenEntityType;
                                entity.metaInformation.childrenCount = entity.groups[immediateChildrenEntityType].length;
                            }
                        })
    
                        entity.groups && Array.isArray(Object.keys(entity.groups)) && Object.keys(entity.groups).forEach(subEntityType => {
                            entity.metaInformation.subEntityGroups.push(subEntityType);
                        })
                        return {
                            _id: entity._id,
                            entityId: entity._id,
                            ...entity.metaInformation
                        }
                    })
                    count = entityData[0].count;
                }

                return resolve({
                    message: messageConstants.apiResponses.ENTITY_INFORMATION_FETCHED,
                    result: result,
                    count: count
                });

            } catch (error) {
                return reject(error);
            }
        })


    }

    /**
   * Entities form for samiksha.
   * @method
   * @name form
   * @param {String} entityType - type of entity requested.
   * @returns {JSON} - Listed entity form.
   */

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

     /**
   * Fetch entity details.
   * @method
   * @name fetch
   * @param {String} entityType - type of entity requested.
   * @param {String} entityId - entity id. 
   * @returns {JSON} - fetch entity details.
   */

    static fetch(entityType, entityId) {
        return new Promise(async (resolve, reject) => {

            try {

                let entityTypeDocument = 
                await database.models.entityTypes.findOne({ 
                    name: entityType 
                }, { profileForm: 1 }).lean();

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
                    eachField.value = entityInformation[eachField.field];
                })

                return resolve(entityForm);

            } catch (error) {
                return reject(error);
            }

        })

    }

    /**
   * Update entity information.
   * @method
   * @name update
   * @param {String} entityType - entity type.
   * @param {String} entityId - entity id.
   * @param {Object} data - entity information that need to be updated.       
   * @returns {JSON} - Updated entity information.
   */

    static update(entityType, entityId, data) {
        return new Promise(async (resolve, reject) => {
            try {
                let entityInformation;
                let registryDetails = {};

                if (data.locationId) {
                    registryDetails["_id"] =  data.locationId
                    delete data.locationId;
                }

                if (entityType == "parent") {
                    entityInformation = await this.parentRegistryUpdate(entityId, data);
                } else {
                    entityInformation = await database.models.entities.findOneAndUpdate(
                        { _id: ObjectId(entityId) },
                        { metaInformation: data, registryDetails : registryDetails },
                        { new: true }
                    ).lean();
                }

                return resolve(entityInformation);

            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
   * Update parent registry information.
   * @method
   * @name parentRegistryUpdate
   * @param {String} entityId - entity id.
   * @param {Object} data - parent entity information that need to be updated.       
   * @returns {JSON} - Updated entity information.
   */

    static parentRegistryUpdate(entityId, data) {
        return new Promise(async (resolve, reject) => {
            try {

                const parentDocument = await database.models.entities.findOne(
                    { _id: ObjectId(entityId) }, { "metaInformation.callResponse": 1 }
                ).lean();

                if (!parentDocument) {
                    throw messageConstants.apiResponses.PARENT_NOT_FOUND;
                }

                let updateSubmissionDocument = false;
                if (data.updateFromParentPortal === true) {
                    if (data.callResponse && data.callResponse != "" && (!parentDocument.metaInformation.callResponse || (parentDocument.metaInformation.callResponse != data.callResponse))) {
                        data.callResponseUpdatedTime = new Date();
                    }
                    updateSubmissionDocument = true;
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
                    };

                    let submissionDocument = await database.models.submissions.findOne(
                        queryObject,
                        { ["parentInterviewResponses." + parentInformation._id.toString()]: 1, parentInterviewResponsesStatus: 1 }
                    ).lean();

                    let updateObject = {};
                    updateObject.$set = {};
                    let parentInterviewResponse = {};
                    if (submissionDocument.parentInterviewResponses && submissionDocument.parentInterviewResponses[parentInformation._id.toString()]) {
                        parentInterviewResponse = submissionDocument.parentInterviewResponses[parentInformation._id.toString()];
                        parentInterviewResponse.parentInformation = parentInformation.metaInformation;
                    } else {
                        parentInterviewResponse = {
                            parentInformation: parentInformation.metaInformation,
                            status: "started",
                            startedAt: new Date()
                        };
                    }

                    updateObject.$set = {
                        ["parentInterviewResponses." + parentInformation._id.toString()]: parentInterviewResponse
                    };

                    let parentInterviewResponseStatus = _.omit(parentInterviewResponse, ["parentInformation", "answers"]);
                    parentInterviewResponseStatus.parentId = parentInformation._id;
                    parentInterviewResponseStatus.parentType = parentInformation.metaInformation.type;

                    if (submissionDocument.parentInterviewResponsesStatus) {
                        let parentInterviewReponseStatusElementIndex = submissionDocument.parentInterviewResponsesStatus.findIndex(parentInterviewStatus => parentInterviewStatus.parentId.toString() === parentInterviewResponseStatus.parentId.toString());
                        if (parentInterviewReponseStatusElementIndex >= 0) {
                            submissionDocument.parentInterviewResponsesStatus[parentInterviewReponseStatusElementIndex] = parentInterviewResponseStatus;
                        } else {
                            submissionDocument.parentInterviewResponsesStatus.push(parentInterviewResponseStatus);
                        }
                    } else {
                        submissionDocument.parentInterviewResponsesStatus = new Array;
                        submissionDocument.parentInterviewResponsesStatus.push(parentInterviewResponseStatus);
                    }

                    updateObject.$set.parentInterviewResponsesStatus = submissionDocument.parentInterviewResponsesStatus;

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

    /**
   * Bulk create entities.
   * @method
   * @name bulkCreate
   * @param {String} entityType - entity type.
   * @param {String} programId - program external id.
   * @param {String} solutionId - solution external id.
   * @param {Object} userDetails - logged in user details.
   * @param {String} userDetails.id - logged in user id.
   * @param {Array}  entityCSVData - Array of entity data.         
   * @returns {JSON} - uploaded entity information.
   */

    static bulkCreate(entityType, programId, solutionId, userDetails, entityCSVData) {
        return new Promise(async (resolve, reject) => {
            try {

                let solutionsDocument = new Array;
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

                let entityTypeDocument = 
                await database.models.entityTypes.findOne({ 
                    name: entityType 
                }, { _id: 1 });

                if (!entityTypeDocument) {
                    throw messageConstants.apiResponses.INVALID_ENTITY_TYPE;
                }

                const entityUploadedData = await Promise.all(
                    entityCSVData.map(async singleEntity => {

                        singleEntity = gen.utils.valueParser(singleEntity);
                        addTagsInEntities(singleEntity);

                        let entityCreation = {
                            "entityTypeId": entityTypeDocument._id,
                            "entityType": entityType,
                            "registryDetails": {},
                            "groups": {},
                            "updatedBy": userDetails.id,
                            "createdBy": userDetails.id
                        }

                        if (singleEntity.locationId) {
                            entityCreation.registryDetails["_id"] =  singleEntity.locationId;
                            delete singleEntity.locationId;
                        }

                        if( singleEntity.allowedRoles && singleEntity.allowedRoles.length > 0 ) {
                            entityCreation['allowedRoles'] = 
                            await allowedRoles(singleEntity.allowedRoles);
                            delete singleEntity.allowedRoles;
                        }

                        entityCreation["metaInformation"] =
                         _.omitBy(singleEntity, (value, key) => { return _.startsWith(key, "_") });

                        if (solutionsData && singleEntity._solutionId && singleEntity._solutionId != "") singleEntity["createdByProgramId"] = solutionsData[singleEntity._solutionId]["programId"];

                        let newEntity = await database.models.entities.create(
                            entityCreation
                        );

                        if (!newEntity._id) {
                            return;
                        }

                        singleEntity["_SYSTEM_ID"] = newEntity._id.toString();

                        if (solutionsData && singleEntity._solutionId && singleEntity._solutionId != "" && newEntity.entityType == solutionsData[singleEntity._solutionId]["entityType"]) {
                            solutionsData[singleEntity._solutionId].newEntities.push(newEntity._id);
                        }
                        
                        await this.pushEntitiesToElasticSearch([singleEntity["_SYSTEM_ID"]]);


                        return singleEntity;
                    })
                )

                if (entityUploadedData.findIndex(entity => entity === undefined) >= 0) {
                    throw messageConstants.apiResponses.SOMETHING_WRONG_INSERTED_UPDATED;
                }

                solutionsData && await Promise.all(
                    Object.keys(solutionsData).map(async solutionExternalId => {
                        if (solutionsData[solutionExternalId].newEntities.length > 0) {
                            await database.models.solutions.updateOne({ _id: solutionsData[solutionExternalId].solutionId }, { $addToSet: { entities: { $each: solutionsData[solutionExternalId].newEntities } } });
                        }
                    })
                )

                return resolve(entityUploadedData);
            } catch (error) {
                return reject(error);
            }
        })

    }

     /**
   * Bulk update entities.
   * @method
   * @name bulkUpdate
   * @param {Object} userDetails - logged in user details.
   * @param {Array} entityCSVData - Array of entity csv data to be updated.        
   * @returns {Array} - Array of updated entity data.
   */

    static bulkUpdate(userDetails, entityCSVData) {
        return new Promise(async (resolve, reject) => {
            try {

                const entityUploadedData = 
                await Promise.all(entityCSVData.map(async singleEntity => {

                    singleEntity = gen.utils.valueParser(singleEntity);
                    addTagsInEntities(singleEntity);

                    if(!singleEntity["_SYSTEM_ID"] || singleEntity["_SYSTEM_ID"] == "") {
                        singleEntity["UPDATE_STATUS"] = "Invalid or missing _SYSTEM_ID";
                        return singleEntity;
                    }

                    let updateData = {};

                    if( singleEntity.hasOwnProperty("locationId") ) {
                       updateData["registryDetails._id"] = singleEntity.locationId;

                       delete singleEntity.locationId;
                    }

                    if( singleEntity.hasOwnProperty("allowedRoles") ) {

                        updateData["allowedRoles"] = [];
                        if( singleEntity.allowedRoles.length > 0 ) {
                            updateData['allowedRoles'] = 
                            await allowedRoles(singleEntity.allowedRoles);
                        }
                        
                        delete singleEntity.allowedRoles;
                    }
                    
                    let columnsToUpdate = 
                    _.omitBy(singleEntity, (value, key) => { 
                        return _.startsWith(key, "_") 
                    });

                    Object.keys(columnsToUpdate).forEach(key => {
                        updateData[`metaInformation.${key}`] = columnsToUpdate[key];
                    })

                    if(Object.keys(updateData).length > 0) {

                        let updateEntity = await database.models.entities.findOneAndUpdate(
                            { _id: singleEntity["_SYSTEM_ID"] },
                            { $set: updateData},
                            { _id: 1 }
                        );
                
                        if (!updateEntity || !updateEntity._id) {
                            singleEntity["UPDATE_STATUS"] = "Entity Not Updated";
                        } else {
                            singleEntity["UPDATE_STATUS"] = "Success";
                        }

                    } else {
                        singleEntity["UPDATE_STATUS"] = "No information to update.";
                    }
                    
                    await this.pushEntitiesToElasticSearch([singleEntity["_SYSTEM_ID"]]);

                    return singleEntity;

                }))

                if (entityUploadedData.findIndex(entity => entity === undefined) >= 0) {
                    throw messageConstants.apiResponses.SOMETHING_WRONG_INSERTED_UPDATED;
                }

                return resolve(entityUploadedData);

            } catch (error) {
                return reject(error);
            }
        })

    }

     /**
   * Mapping upload
   * @method
   * @name processEntityMappingUploadData
   * @param {Array} [mappingData = []] - Array of entityMap data.         
   * @returns {JSON} - Success and message .
   */

    static processEntityMappingUploadData(mappingData = []) {
        return new Promise(async (resolve, reject) => {
            try {
                let entities = [];

                if(mappingData.length < 1) {
                    throw new Error(messageConstants.apiResponses.INVALID_MAPPING_DATA);
                }

                this.entityMapProcessData = {
                    entityTypeMap : {},
                    relatedEntities : {},
                    entityToUpdate : {}
                }

                for (let indexToEntityMapData = 0; indexToEntityMapData < mappingData.length; indexToEntityMapData++) {
                  if (mappingData[indexToEntityMapData].parentEntiyId != "" && mappingData[indexToEntityMapData].childEntityId != "") {
                    await this.addSubEntityToParent(mappingData[indexToEntityMapData].parentEntiyId, mappingData[indexToEntityMapData].childEntityId);
                    entities.push(mappingData[indexToEntityMapData].childEntityId);
                  }
                }

                if(Object.keys(this.entityMapProcessData.entityToUpdate).length > 0) {
                    await Promise.all(Object.keys(this.entityMapProcessData.entityToUpdate).map(async entityIdToUpdate => {
                        
                        let updateQuery = {"$addToSet" : {}};

                        Object.keys(this.entityMapProcessData.entityToUpdate[entityIdToUpdate]).forEach(groupToUpdate => {
                            updateQuery["$addToSet"][groupToUpdate] = {
                                $each: this.entityMapProcessData.entityToUpdate[entityIdToUpdate][groupToUpdate]
                            };
                        })

                        await database.models.entities.updateMany(
                            { _id: ObjectId(entityIdToUpdate) },
                            updateQuery
                        );

                    }))
                }

                await this.pushEntitiesToElasticSearch(entities);

                this.entityMapProcessData = {};
                
                return resolve({
                    success : true,
                    message: messageConstants.apiResponses.ENTITY_INFORMATION_UPDATE
                });

            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
   * Add child entity inside parent entity groups. 
   * @method
   * @name addSubEntityToParent
   * @param {String} parentEntityId - parent entity id.
   * @param {String} childEntityId - child entity id.
   * @param {Boolean} [parentEntityProgramId = false] - Program id of parent entity.         
   * @returns {JSON} - Success and message .
   */

    static addSubEntityToParent(parentEntityId, childEntityId, parentEntityProgramId = false) {
        return new Promise(async (resolve, reject) => {
            try {

                let childEntity = await database.models.entities.findOne({
                    _id: ObjectId(childEntityId)
                }, {
                    entityType: 1,
                    groups: 1,
                    childHierarchyPath : 1
                }).lean();


                if (childEntity.entityType) {

                    let parentEntityQueryObject = {
                        _id: ObjectId(parentEntityId)
                    }
                    if (parentEntityProgramId) {
                        parentEntityQueryObject["metaInformation.createdByProgramId"] = ObjectId(parentEntityProgramId);
                    }

                    let updateQuery = {};
                    updateQuery["$addToSet"] = {};
                    updateQuery["$addToSet"][`groups.${childEntity.entityType}`] = childEntity._id;

                    if (!_.isEmpty(childEntity.groups)) {
                        Object.keys(childEntity.groups).forEach(eachChildEntity => {

                            if (childEntity.groups[eachChildEntity].length > 0) {
                                updateQuery["$addToSet"][`groups.${eachChildEntity}`] = {};
                                updateQuery["$addToSet"][`groups.${eachChildEntity}`]["$each"] = childEntity.groups[eachChildEntity];
                            }

                        })
                    }

                    let childHierarchyPathToUpdate = [
                        childEntity.entityType
                    ]
                    if(childEntity.childHierarchyPath && childEntity.childHierarchyPath.length > 0) {
                        childHierarchyPathToUpdate = childHierarchyPathToUpdate.concat(childEntity.childHierarchyPath);
                    }
                    updateQuery["$addToSet"][`childHierarchyPath`] = {
                        "$each" : childHierarchyPathToUpdate
                    }

                    let projectedData = {
                        _id: 1,
                        "entityType": 1,
                        "entityTypeId": 1,
                        "childHierarchyPath": 1
                    }

                    let updatedParentEntity = await database.models.entities.findOneAndUpdate(
                        parentEntityQueryObject,
                        updateQuery,
                        {
                            projection: projectedData,
                            new: true
                        }
                        
                    );

                    await this.mappedParentEntities(updatedParentEntity, childEntity);
                }

                return resolve();
            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
   * Search entity.
   * @method 
   * @name search
   * @param {String} entityTypeId - Entity type id.
   * @param {String} searchText - Text to be search.
   * @param {Number} pageSize - total page size.
   * @param {Number} pageNo - Page no.
   * @param {Array} [entityIds = false] - Array of entity ids.
   * @param {Array} aclData - access control list for the logged in user.
   * @returns {Array} searched entities
   */

    static search(
        entityTypeId, 
        searchText,
        pageSize, 
        pageNo, 
        entityIds = false,
        aclData = []
    ) {
        return new Promise(async (resolve, reject) => {
            try {

                let queryObject = {};

                queryObject["$match"] = {};

                if (entityIds && entityIds.length > 0) {
                    queryObject["$match"]["_id"] = {};
                    queryObject["$match"]["_id"]["$in"] = entityIds;
                }

                if( aclData.length > 0 ) {
                    queryObject["$match"]["metaInformation.tags"] = 
                    { $in : aclData };
                }

                queryObject["$match"]["entityTypeId"] = entityTypeId;

                queryObject["$match"]["$or"] = [
                    { "metaInformation.name": new RegExp(searchText, 'i') },
                    { "metaInformation.externalId": new RegExp("^" + searchText, 'm') },
                    { "metaInformation.addressLine1": new RegExp(searchText, 'i') },
                    { "metaInformation.addressLine2": new RegExp(searchText, 'i') }
                ];

                let entityDocuments = await database.models.entities.aggregate([
                    queryObject,
                    {
                        $project: {
                            name: "$metaInformation.name",
                            externalId: "$metaInformation.externalId",
                            addressLine1: "$metaInformation.addressLine1",
                            addressLine2: "$metaInformation.addressLine2",
                            districtName: "$metaInformation.districtName"
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

                return resolve(entityDocuments);

            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
   * validate entities.
   * @method 
   * @name validateEntities
   * @param {String} entityTypeId - Entity type id.
   * @param {Array} entityIds - Array of entity ids.
   */

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
                    ids = entitiesDocuments.map(entityId => entityId._id);
                }

                return resolve({
                    entityIds: ids
                });


            } catch (error) {
                return reject(error);
            }
        })
    }

    /**
   * Implement find query for entity
   * @method
   * @name entityDocuments
   * @param {Object} [findQuery = "all"] - filter query object if not provide 
   * it will load all the document.
   * @param {Array} [fields = "all"] - All the projected field. If not provided
   * returns all the field
   * @param {Number} [limitingValue = ""] - total data to limit.
   * @param {Number} [skippingValue = ""] - total data to skip.
   * @returns {Array} - returns an array of entities data.
   */

    static entityDocuments(findQuery = "all", fields = "all", limitingValue = "", skippingValue = "",sortedData = "") {
        return new Promise(async (resolve, reject) => {
            try {
                let queryObject = {};

                if (findQuery != "all") {
                    queryObject = findQuery;
                }

                let projectionObject = {};

                if (fields != "all") {
                    fields.forEach(element => {
                        projectionObject[element] = 1;
                    });
                }

                let entitiesDocuments;

                if( sortedData !== "" ) {
                entitiesDocuments = await database.models.entities
                    .find(queryObject, projectionObject)
                    .sort(sortedData)
                    .limit(limitingValue)
                    .skip(skippingValue)
                    .lean();
                } else {
                    entitiesDocuments = await database.models.entities
                    .find(queryObject, projectionObject)
                    .limit(limitingValue)
                    .skip(skippingValue)
                    .lean();
                }
                
                return resolve(entitiesDocuments);
            } catch (error) {
                return reject({
                    status: error.status || httpStatusCode.internal_server_error.status,
                    message: error.message || httpStatusCode.internal_server_error.message,
                    errorObject: error
                });
            }
        });
    }

    /**
   * All the related entities for the given entities.
   * @method
   * @name relatedEntities
   * @param {String} entityId - entity id.
   * @param {String} entityTypeId - entity type id.
   * @param {String} entityType - entity type.
   * @param {Array} [projection = "all"] - total fields to be projected.
   * @returns {Array} - returns an array of related entities data.
   */

    static relatedEntities(entityId, entityTypeId, entityType, projection = "all") {
        return new Promise(async (resolve, reject) => {
            try {

                if(this.entityMapProcessData && this.entityMapProcessData.relatedEntities && this.entityMapProcessData.relatedEntities[entityId.toString()]) {
                    return resolve(this.entityMapProcessData.relatedEntities[entityId.toString()]);
                }

                let relatedEntitiesQuery = {};

                if (entityTypeId && entityId && entityType) {
                    relatedEntitiesQuery[`groups.${entityType}`] = entityId;
                    relatedEntitiesQuery["entityTypeId"] = {};
                    relatedEntitiesQuery["entityTypeId"]["$ne"] = entityTypeId;
                } else {
                    throw { 
                        status: httpStatusCode.bad_request.status, 
                        message: messageConstants.apiResponses.MISSING_ENTITYID_ENTITYTYPE_ENTITYTYPEID 
                    };
                }

                let relatedEntitiesDocument = await this.entityDocuments(relatedEntitiesQuery, projection);
                relatedEntitiesDocument = relatedEntitiesDocument ? relatedEntitiesDocument : [];

                if(this.entityMapProcessData && this.entityMapProcessData.relatedEntities) {
                    this.entityMapProcessData.relatedEntities[entityId.toString()] = relatedEntitiesDocument;
                }

                return resolve(relatedEntitiesDocument);


            } catch (error) {
                return reject({
                    status: error.status || httpStatusCode.internal_server_error.status,
                    message: error.message || httpStatusCode.internal_server_error.message
                });
            }
        })
    }

      /**
   * Map parent entities
   * @method
   * @name mappedParentEntities
   * @param {Object} parentEntity
   * @param {String} parentEntity.entityType - entity type of the parent.
   * @param {String} parentEntity._id - parentEntity id.
   * @param {Object} childEntity 
   * @param {String} childEntity.entityType - entity type of the child.
   * @param {String} childEntity._id - childEntity id.
   */

    static mappedParentEntities(parentEntity, childEntity) {
        return new Promise(async (resolve, reject) => {
            try {

                let updateParentHierarchy = false;

                if(this.entityMapProcessData) {
                    
                    if(this.entityMapProcessData.entityTypeMap && this.entityMapProcessData.entityTypeMap[parentEntity.entityType]) {
                        if(this.entityMapProcessData.entityTypeMap[parentEntity.entityType].updateParentHierarchy) {
                            updateParentHierarchy = true;
                        }
                    } else {

                        let checkParentEntitiesMappedValue = await database.models.entityTypes.findOne({
                            name: parentEntity.entityType
                        }, {
                            toBeMappedToParentEntities: 1
                        }).lean();
                        
                        if(checkParentEntitiesMappedValue.toBeMappedToParentEntities) {
                            updateParentHierarchy = true;
                        }
                        
                        if(this.entityMapProcessData.entityTypeMap) {
                            this.entityMapProcessData.entityTypeMap[parentEntity.entityType] = {
                                updateParentHierarchy : (checkParentEntitiesMappedValue.toBeMappedToParentEntities) ? true : false
                            };
                        }

                    }

                } else {

                    let checkParentEntitiesMappedValue = await database.models.entityTypes.findOne({
                        name: parentEntity.entityType
                    }, {
                        toBeMappedToParentEntities: 1
                    }).lean();
                    
                    if(checkParentEntitiesMappedValue.toBeMappedToParentEntities) {
                        updateParentHierarchy = true;
                    }
                }



                if (updateParentHierarchy) {
                    let relatedEntities = await this.relatedEntities(parentEntity._id, parentEntity.entityTypeId, parentEntity.entityType, ["_id"]);

                    let childHierarchyPathToUpdate = [
                        parentEntity.entityType
                    ]
                    if(parentEntity.childHierarchyPath && parentEntity.childHierarchyPath.length > 0) {
                        childHierarchyPathToUpdate = childHierarchyPathToUpdate.concat(parentEntity.childHierarchyPath);
                    }

                    if (relatedEntities.length > 0) {
                        if(this.entityMapProcessData && this.entityMapProcessData.entityToUpdate) {
                            relatedEntities.forEach(eachRelatedEntities => {
                                if(!this.entityMapProcessData.entityToUpdate[eachRelatedEntities._id.toString()]) {
                                    this.entityMapProcessData.entityToUpdate[eachRelatedEntities._id.toString()] = {};
                                }
                                if(!this.entityMapProcessData.entityToUpdate[eachRelatedEntities._id.toString()][`groups.${childEntity.entityType}`]) {
                                    this.entityMapProcessData.entityToUpdate[eachRelatedEntities._id.toString()][`groups.${childEntity.entityType}`] = new Array;
                                }
                                this.entityMapProcessData.entityToUpdate[eachRelatedEntities._id.toString()][`groups.${childEntity.entityType}`].push(childEntity._id);
                                this.entityMapProcessData.entityToUpdate[eachRelatedEntities._id.toString()][`childHierarchyPath`] = childHierarchyPathToUpdate;
                            })
                        } else {
                            let updateQuery = {};
                            updateQuery["$addToSet"] = {};
                            updateQuery["$addToSet"][`groups.${childEntity.entityType}`] = childEntity._id;
    
                            let allEntities = [];
    
                            relatedEntities.forEach(eachRelatedEntities => {
                                allEntities.push(eachRelatedEntities._id);
                            })
    
                            updateQuery["$addToSet"][`childHierarchyPath`] = {
                                "$each" : childHierarchyPathToUpdate
                            }

                            await database.models.entities.updateMany(
                                { _id: { $in: allEntities } },
                                updateQuery
                            );
                        }
                    }
                }

                return resolve();
            } catch (error) {
                return reject({
                    status: error.status || httpStatusCode.internal_server_error.status,
                    message: error.message || httpStatusCode.internal_server_error.message
                });
            }
        })
    }

     /**
   * Create index for entityType in entities collection.
   * @method 
   * @name createGroupEntityTypeIndex
   * @param {String} entityType - create index for the given entity type.
   * @returns {String} message of index created successfully. 
   */

    static createGroupEntityTypeIndex(entityType) {
        return new Promise(async (resolve, reject) => {
            try {

                const entityIndexes = await database.models.entities.listIndexes();

                if (_.findIndex(entityIndexes, { name: 'groups.' + entityType + "_1" }) >= 0) {
                    return resolve(messageConstants.apiResponses.CREATE_INDEX);
                }

                const newIndexCreation = await database.models.entities.db.collection('entities').createIndex(
                    { ["groups." + entityType]: 1 },
                    { partialFilterExpression: { ["groups." + entityType]: { $exists: true } }, background: 1 }
                );

                if (newIndexCreation == "groups." + entityType + "_1") {
                    return resolve(messageConstants.apiResponses.CREATE_INDEX);
                } else {
                    throw messageConstants.apiResponses.INDEX_NOT_CREATED;
                }

            } catch (error) {
                return reject(error);
            }
        })

    }

    /**
   * Default entities schema value.
   * @method 
   * @name entitiesSchemaData
   * @returns {JSON} List of entities schema. 
   */

    static entitiesSchemaData() {
        return {
            "SCHEMA_ENTITY_OBJECT_ID" : "_id",
            "SCHEMA_ENTITY_TYPE_ID" : "entityTypeId",
            "SCHEMA_ENTITIES" : "entities",
            "SCHEMA_ENTITY_TYPE" : "entityType",
            "SCHEMA_ENTITY_GROUP" : "groups",
            "SCHEMA_METAINFORMATION" : "metaInformation",
            "SCHEMA_ENTITY_CREATED_BY" : "createdBy"
        }
    }

     /**
   * Push entities to elastic search
   * @method
   * @name pushEntitiesToElasticSearch
   * @name entities - array of entity Id.
   * @returns {Object} 
   */

    static pushEntitiesToElasticSearch(entities = []) {
        return new Promise(async (resolve, reject) => {
            try {

                if (entities.length > 0) {

                    let entityDocuments = await this.entityDocuments({
                        _id: {
                            $in: entities
                        }
                    }, [
                            "_id",
                            "metaInformation",
                            "entityType",
                            "entityTypeId",
                            "updatedAt",
                            "createdAt",
                            "allowedRoles",
                            "registryDetails"
                        ]);

                    for (let entity = 0; entity < entityDocuments.length; entity++) {

                        let entityDocument = entityDocuments[entity];

                        let telemetryEntities = [];

                        let entityObj = {
                            _id: entityDocument._id,
                            entityType: entityDocument.entityType,
                            entityTypeId: entityDocument.entityTypeId,
                            updatedAt: entityDocument.updatedAt,
                            createdAt: entityDocument.createdAt,
                            registryDetails: entityDocument.registryDetails
                        }

                        if( entityDocument.allowedRoles && entityDocument.allowedRoles.length > 0 ) {
                            entityObj["allowedRoles"] = entityDocument.allowedRoles;
                        }

                        for (let metaData in entityDocument.metaInformation) {
                            entityObj[metaData] = entityDocument.metaInformation[metaData];
                        }

                        let telemetryObj = {
                            [`${entityObj.entityType}_name`]: entityObj.name,
                            [`${entityObj.entityType}_id`]: entityObj._id,
                            [`${entityObj.entityType}_externalId`]: entityObj.externalId
                        };

                        let relatedEntities = await this.relatedEntities(
                            entityObj._id,
                            entityObj.entityTypeId,
                            entityObj.entityType,
                            [
                                "metaInformation.externalId",
                                "metaInformation.name",
                                "entityType",
                                "entityTypeId",
                                "_id"
                            ])

                        if (relatedEntities.length > 0) {

                            relatedEntities = relatedEntities.map(entity => {

                                telemetryObj[`${entity.entityType}_name`] =
                                    entity.metaInformation.name;

                                telemetryObj[`${entity.entityType}_id`] =
                                    entity._id;

                                telemetryObj[`${entity.entityType}_externalId`] =
                                    entity.metaInformation.externalId;

                                return {
                                    name: entity.metaInformation.name,
                                    externalId: entity.metaInformation.externalId,
                                    entityType: entity.entityType,
                                    entityTypeId: entity.entityTypeId,
                                    _id: entity._id
                                }
                            })

                            entityObj["relatedEntities"] = relatedEntities;
                        }

                        telemetryEntities.push(telemetryObj);

                        entityObj["telemetry_entities"] = telemetryEntities;

                        await elasticSearch.createOrUpdate(
                            entityObj._id,
                            process.env.ELASTICSEARCH_ENTITIES_INDEX,
                            {
                                data: entityObj
                            }
                        );

                    }

                }

                return resolve({
                    success: true
                });

            }
            catch (error) {
                return reject(error);
            }
        })
    }


    /**
 * Update user roles in entities elastic search 
 * @method
 * @name updateUserRolesInEntitiesElasticSearch
 * @name userRoles - array of userRoles.
 * @name userId - user id
 * @returns {Object} 
 */
    static updateUserRolesInEntitiesElasticSearch(userRoles = [], userId = "") {
        return new Promise(async (resolve, reject) => {
            try {
            
            await Promise.all(userRoles.map( async role => {
                await Promise.all(role.entities.map(async entity => {

                    let entityDocument = await elasticSearch.get
                    (
                        entity,
                        process.env.ELASTICSEARCH_ENTITIES_INDEX
                    )
                   
                    if (entityDocument.statusCode == httpStatusCode.ok.status) {

                        entityDocument = entityDocument.body["_source"].data;
                        
                        if (!entityDocument.roles) {
                            entityDocument.roles = {};
                        }
                        
                        if (entityDocument.roles[role.code]) {
                            if (!entityDocument.roles[role.code].includes(userId)) {
                                entityDocument.roles[role.code].push(userId);

                                await elasticSearch.createOrUpdate
                                (
                                    entity,
                                    process.env.ELASTICSEARCH_ENTITIES_INDEX,
                                    {
                                        data: entityDocument
                                    }
                                )
                            }
                        }
                        else {
                            entityDocument.roles[role.code] = [userId];

                            await elasticSearch.createOrUpdate
                            (
                                entity,
                                process.env.ELASTICSEARCH_ENTITIES_INDEX,
                                {
                                    data: entityDocument
                                }
                            )
                        }
                    }
                }))
            }))

            return resolve({
                success: true
            });

        }
        catch (error) {
            return reject(error);
        }
    })
}


 /**
 * Delete user role from entities elastic search 
 * @method
 * @name deleteUserRoleFromEntitiesElasticSearch
 * @name entityId - entity id
 * @name role - role of user
 * @returns {Object} 
 */
static deleteUserRoleFromEntitiesElasticSearch(entityId = "", role = "", userId = "") {
    return new Promise(async (resolve, reject) => {
        try {
       
        let entityDocument = await elasticSearch.get
        (
            entityId,
            process.env.ELASTICSEARCH_ENTITIES_INDEX
        )

        if (entityDocument.statusCode == httpStatusCode.ok.status) {

            entityDocument = entityDocument.body["_source"].data;

            if (entityDocument.roles && entityDocument.roles[role]) {

                let index = entityDocument.roles[role].indexOf(userId);
                if (index > -1) {
                    entityDocument.roles[role].splice(index, 1);

                    await elasticSearch.createOrUpdate
                    (
                        entityId,
                        process.env.ELASTICSEARCH_ENTITIES_INDEX,
                        {
                            data: entityDocument
                        }
                    )
                }
               
            }
        }
        
        return resolve({
            success: true
        });

    }
    catch (error) {
        return reject(error);
    }
  })
}

 /**
   * Upload registry via csv.
   * @method
   * @name registryMappingUpload
   * @param {Array} registryCSVData
   * @param {Object} userDetails -logged in user data.
   * @param {String} entityType - entity Type.   
   * @returns {Object} consists of SYSTEM_ID
   */

    static registryMappingUpload(registryCSVData,userDetails, entityType) {

        return new Promise(async (resolve, reject) => {
            try {

                const fileName = `Registry-Upload`;
                let fileStream = new FileStream(fileName);
                let input = fileStream.initStream();

                (async function () {
                    await fileStream.getProcessorPromise();
                    return resolve({
                      isResponseAStream: true,
                      fileNameWithPath: fileStream.fileNameWithPath()
                    });
                }());

                let pushToES = [],entityNames = [],parentLocationIds = [],entityDoc = [];
                let parentEntityInformation,entityDocument,locationQuery,parentLocationEntities;
                
                registryCSVData.forEach(entity=>{
                    entity = gen.utils.valueParser(entity);
                    entityNames.push(new RegExp(entity.entityName,"i"));
                    parentLocationIds.push(entity.parentLocationId);
                });

                let filteredQuery = {
                    "entityType": entityType,
                    "metaInformation.name": { $in : entityNames }
                }

                if(parentLocationIds && parentLocationIds.length > 0){

                    locationQuery = {
                        "registryDetails.locationId":{ $in : parentLocationIds }
                    }

                    parentLocationEntities = await this.entityDocuments(locationQuery,["registryDetails.locationId","groups"]);
                    parentEntityInformation = _.keyBy(parentLocationEntities,"registryDetails.locationId");

                } 

                let entities =  await this.entityDocuments(filteredQuery,["_id","metaInformation.name", "registryDetails.locationId"]);
                let entityInformation = _.keyBy(entities,"metaInformation.name");

                for(let pointerToCsv = 0 ; pointerToCsv < registryCSVData.length; pointerToCsv++){

                    let registry = gen.utils.valueParser(registryCSVData[pointerToCsv]);
                    let entityName = new RegExp(registry.entityName,"i");

                    let checkEntityExist = false;
                    let entityDetail;

                    for(let key in entityInformation){
                        if(entityName.test(key)){
                            checkEntityExist  = true;
                            entityDetail = entityInformation[key];
                        }
                    }

                    if(checkEntityExist){

                        let registryDetails = {
                            "locationId":registry.locationId
                        }

                        if(registry.parentLocationId){

                            if(parentLocationEntities &&  parentLocationEntities.length > 0){
                                if(registry.parentLocationId in parentEntityInformation){
                                    let entityGroup = parentEntityInformation[registry.parentLocationId]["groups"][entityType];
                                    let entityGroupIds = [];

                                    if(entityGroup && entityGroup.length > 0){

                                        entityGroup.forEach(groupId=>{
                                            entityGroupIds.push(groupId.toString());
                                        });
                      
                                        if(entityGroupIds.includes(entityDetail._id.toString())){
                                            entityDocument = await this.updateRegistry(filteredQuery,registryDetails,userDetails.userId);
                                        }
                                    }
                                } 
                            }
                        }else{

                            locationQuery = {
                                "entityType": entityType,
                                "metaInformation.name": new RegExp(entityName)
                            }

                            entityDocument = await this.updateRegistry(locationQuery,registryDetails,userDetails.userId);
                        }
                    }

                    if (entityDocument && entityDocument._id) {
                        registry["_SYSTEM_ID"] = entityDocument._id; 
                        registry.status = messageConstants.apiResponses.ENTITIES_REGISTRY_DETAILS_UPDATED;
                        pushToES.push(entityDocument._id);

                    } else {
                        registry["_SYSTEM_ID"] = "";
                        registry.status = messageConstants.apiResponses.ENTITY_NOT_FOUND;
                    }

                    input.push(registry);
                }

                if(pushToES && pushToES.length > 0){
                    await this.pushEntitiesToElasticSearch(pushToES);
                }

                input.push(null);

            } catch (error) {
                return reject(error);
            }
        })

    }

    /**
   * update registry in entities.
   * @method
   * @name updateRegistry
   * @param {Object} filteredQuery - filteredQuery
   * @param {String} userId - userId
   * @param {Object} registryDetails - registryDetails
   * @returns {Object} entity Document
   */

  static updateRegistry(filteredQuery, registryDetails, userId) {
    return new Promise(async (resolve, reject) => {
        try {

            let updateEntityDocument = 
                        await database.models.entities.findOneAndUpdate(filteredQuery, {
                            $set: {
                                registryDetails: registryDetails,
                                updatedBy: userId
                            }
                        });

            return resolve(updateEntityDocument);

        } catch(error) {
            return reject(error);
        }
    })
  }

  /**
   * update registry in entities.
   * @method
   * @name listByLocationIds
   * @param {Object} locationIds - locationIds
   * @returns {Object} entity Document
   */

  static listByLocationIds(locationIds) {
    return new Promise(async (resolve, reject) => {
        try {
            
            let entities = 
            await this.entityDocuments({
                "registryDetails.locationId" : { $in : locationIds }
            },["metaInformation", "entityType", "entityTypeId","registryDetails"]);

            if( !entities.length > 0 ) {
                throw {
                    message : messageConstants.apiResponses.ENTITIES_FETCHED
                }
            }

            return resolve({
                success : true,
                message : messageConstants.apiResponses.ENTITY_FETCHED,
                data : entities
            });

        } catch(error) {
            return resolve({
                success : false,
                message : error.message
            });
        }
    })
  }

};


  /**
   * Add tags in entity meta information.
   * @method
   * @name addTagsInEntities
   * @param {Object} entityMetaInformation - Meta information of the entity.
   * @returns {JSON} - entities metainformation consisting of scool types,administration types 
   * and tags.
   */

function addTagsInEntities(entityMetaInformation) {

    if( entityMetaInformation.schoolTypes ) {
        
        entityMetaInformation.schoolTypes =  
        entityMetaInformation.schoolTypes.map(
            schoolType=>schoolType.toLowerCase()
        );

        entityMetaInformation["tags"] = [...entityMetaInformation.schoolTypes];
    }

    if( entityMetaInformation.administrationTypes ) {

        entityMetaInformation.administrationTypes =  
        entityMetaInformation.administrationTypes.map(
            schoolType=>schoolType.toLowerCase()
        );

        if( entityMetaInformation.tags ) {
            entityMetaInformation.tags = entityMetaInformation.tags.concat(
                entityMetaInformation.administrationTypes
            )
        } else {
            entityMetaInformation.tags = 
            entityMetaInformation.administrationTypes;
        }
    }
    return entityMetaInformation;
}

  /**
   * Allowed roles in entities.
   * @method
   * @name allowedRoles
   * @param {Array} roles - Roles
   * @returns {Array} user roles
   */

  async function allowedRoles(roles) {
    return new Promise(async (resolve, reject) => {
        try {

            let userRoles = await userRolesHelper.list({
                code : { $in : roles }
            },{
                code : 1
            })

            if( userRoles.length > 0 ) {
                userRoles = userRoles.map(userRole => {
                    return userRole.code;
                });
            }

            return resolve(userRoles);

        } catch(error) {
            return reject(error);
        }
    })
  }



