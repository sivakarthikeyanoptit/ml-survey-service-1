const csv = require("csvtojson");

module.exports = class entitiesHelper {

    constructor() {
        this.roles = {
            ASSESSOR: "assessors",
            LEAD_ASSESSOR: "leadAssessors",
            PROJECT_MANAGER: "projectManagers",
            PROGRAM_MANAGER: "programManagers"
        };
    }

    static get name() {
        return "entitiesHelper";
    }

    async add(body, query, userDetails) {

        try {

            if (body.data) {


                let entityType = await database.models.entityTypes.findOne({ name: query.type }, { _id: 1 });

                if (!entityType) throw "No entity type found for given params"

                let arrayTypeFields = ["type", "questionGroup", "schoolTypes"];

                let entityDocuments = [];

                body.data.forEach(singleEntity => {

                    Object.keys(singleEntity).forEach(data => {
                        if (arrayTypeFields.includes(data)) {
                            singleEntity[data] = singleEntity[data].split(",")
                        }
                    })

                    let entityDocument = {
                        "entityTypeId": entityType._id,
                        "entityType": query.type,
                        "regsitryDetails": {},
                        "groups": {},
                        "metaInformation": singleEntity,
                        "updatedBy": userDetails.id,
                        "createdBy": userDetails.id
                    }

                    entityDocuments.push(entityDocument);

                })


                var entityData = await database.models.entity.create(
                    entityDocuments
                );

                //update entity id in parent entity

                await Promise.all(entityData.map(async (entity) => {

                    let entityDataToBeUpdated = await database.models.entity.findOne({ _id: ObjectId(entity.metaInformation.parentEntityId) });

                    if (!entityDataToBeUpdated.groups[query.type]) entityDataToBeUpdated.groups[query.type] = [];

                    let indexOfEntity = entityDataToBeUpdated.groups[query.type].find(groupEntity => {
                        return groupEntity.toString() == entity._id.toString();
                    })

                    if (!indexOfEntity) {

                        entityDataToBeUpdated.groups[query.type].push(entity._id);

                        await database.models.entity.findOneAndUpdate(
                            {
                                _id: ObjectId(entity.metaInformation.parentEntityId)
                            },
                            {
                                $set: {
                                    groups: entityDataToBeUpdated.groups
                                }
                            },
                            {
                                upsert: true,
                                new: true,
                                setDefaultsOnInsert: true,
                                returnNewDocument: true
                            });

                        console.log("updated parent entity.")
                    }

                }))

                if (entityData.length != body.data.length) {
                    throw "Some entity information was not inserted!"
                }

                let response = entityData;

                return response;
            }

        } catch (error) {
            throw error
        }
    }

    async list(query, params) {

        try {

            let result = {}

            let queryObject = { _id: ObjectId(params._id) }

            result = await database.models.entity.findOne(queryObject).lean();

            let entityIds = result.groups[query.type];

            let entityData = await database.models.entity.find({ _id: { $in: entityIds } }, {
                metaInformation: 1,
                entityType: 1,
                entityTypeId: 1
            }).lean();

            result = entityData.map(entity => {
                return {
                    entityId: entity._id,
                    ...entity.metaInformation
                }
            })

            return result;

        } catch (error) {
            throw error;
        }

    }

    async form(query) {

        try {
            let result;

            let entityType = await database.models.entityTypes.findOne({ name: query.type })

            result = entityType.profileForm.length ? entityType.profileForm : [];

            return result;

        } catch (error) {

            throw error;

        }

    }

    async fetch(query, params) {

        try {

            let entityType = await database.models.entityTypes.findOne({ name: query.type }).lean();

            let entityForm = entityType.profileForm;

            if (!entityForm.length) {
                let responseMessage = `No form data available for ${query.type} entity type.`;
                throw responseMessage;
            }

            let entityInformation;

            if (params._id) {
                entityInformation = await database.models.entity.findOne(
                    { _id: ObjectId(params._id), entityType: query.type }
                );

                if (!entityInformation) {
                    let responseMessage = `No ${query.type} information found for given params.`;
                    throw responseMessage;
                }

                entityInformation = entityInformation.metaInformation;
            }

            entityForm.forEach(eachField => {
                eachField.value = entityInformation[eachField.field]
            })

            return entityForm;

        } catch (error) {
            throw error;
        }

    }

    async update(params, query, body) {

        try {
            let entityInformation;

            if (query.type == "parent") {
                entityInformation = await this.parentRegistryUpdate(params, query, body);
            } else {
                entityInformation = await database.models.entity.findOneAndUpdate(
                    { _id: ObjectId(params._id), entityType: query.type },
                    { metaInformation: body },
                    { new: true }
                );
            }

            return entityInformation;

        } catch (error) {
            throw error;
        }
    }

    async parentRegistryUpdate(params, query, body) {

        try {

            const parentDocument = await database.models.entity.findOne(
                { _id: ObjectId(params._id), entityType: query.type }
            );

            if (!parentDocument) throw "No such parent found"

            let updateSubmissionDocument = false
            if (body.updateFromParentPortal === true) {
                if (body.callResponse && body.callResponse != "" && (!parentDocument.callResponse || (parentDocument.callResponse != body.callResponse))) {
                    body.callResponseUpdatedTime = new Date()
                }
                updateSubmissionDocument = true
            }

            if (typeof (body.createdByProgramId) == "string") body.createdByProgramId = ObjectId(body.createdByProgramId);

            let parentInformation = await database.models.entity.findOneAndUpdate(
                { _id: ObjectId(params._id) },
                { metaInformation: body },
                { new: true }
            );

            if (updateSubmissionDocument) {

                let queryObject = {
                    schoolId: ObjectId(parentInformation.schoolId)
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
                    parentInterviewResponse.parentInformation = parentInformation
                } else {
                    parentInterviewResponse = {
                        parentInformation: parentInformation,
                        status: "started",
                        startedAt: new Date()
                    }
                }

                updateObject.$set = {
                    ["parentInterviewResponses." + parentInformation._id.toString()]: parentInterviewResponse
                }

                let parentInterviewResponseStatus = _.omit(parentInterviewResponse, ["parentInformation", "answers"])
                parentInterviewResponseStatus.parentId = parentInformation._id
                parentInterviewResponseStatus.parentType = parentInformation.type

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

                const submissionDocumentUpdate = await database.models.submissions.findOneAndUpdate(
                    { _id: submissionDocument._id },
                    updateObject
                );
            }

            let responseMessage = "Parent information updated successfully."

            let response = { message: responseMessage, result: parentInformation };

            return response;

        } catch (error) {
            throw error;
        }

    }

    async upload(query, userDetails, files) {

        try {

            let entityCSVData = await csv().fromString(
                files.entities.data.toString()
            );
            const entitiesUploadCount = entityCSVData.length;

            let programDocument = await database.models.programs.find(
                {
                    externalId: { $in: entityCSVData.map(entity => entity.programId) }
                },
                {
                    _id: 1,
                    externalId: 1
                }
            );

            const programsData = programDocument.reduce((ac, program) => ({ ...ac, [program.externalId]: program._id }), {})

            let solutionsDocument = await database.models.solutions.find(
                {
                    externalId: { $in: entityCSVData.map(entity => entity.solutionId) }
                },
                {
                    externalId: 1,
                    subType: 1
                }
            );

            const solutionsData = solutionsDocument.reduce((ac, solution) => ({
                ...ac, [solution.externalId]: {
                    subType: solution.subType,
                    _id: solution._id
                }
            }), {})

            //to update entity id in parent entity
            let parentEntityDocument = await database.models.entity.find(
                {
                    "metaInformation.externalId": { $in: entityCSVData.map(entity => entity.parentEntityId) }
                },
                {
                    _id: 1,
                    groups: 1,
                    "metaInformation.externalId": 1
                }
            );

            const parentEntityData = parentEntityDocument.reduce((ac, entity) => ({
                ...ac, [entity.metaInformation.externalId]: {
                    _id: entity._id,
                    groups: entity.groups
                }
            }), {})

            let entityType = await database.models.entityTypes.findOne({ name: query.type }, { _id: 1 })

            let arrayTypeFields = ["type", "questionGroup", "schoolTypes"];

            let entityDocuments = [];

            entityCSVData.forEach(singleEntity => {

                Object.keys(singleEntity).forEach(data => {
                    if (arrayTypeFields.includes(data)) {
                        singleEntity[data] = singleEntity[data].split(",")
                    }
                })

                let entityDocument = {
                    "entityTypeId": entityType._id,
                    "entityType": query.type,
                    "regsitryDetails": {},
                    "groups": {},
                    "metaInformation": singleEntity,
                    "updatedBy": userDetails.id,
                    "createdBy": userDetails.id
                }

                entityDocuments.push(entityDocument);

            })

            let entityData = await database.models.entity.create(
                entityDocuments
            );

            //update entity id in parent entity

            await Promise.all(entityData.map(async (entity) => {

                let entityDataToBeUpdated = parentEntityData[entity.metaInformation.parentEntityId];

                if (!entityDataToBeUpdated.groups[query.type]) entityDataToBeUpdated.groups[query.type] = [];

                let indexOfEntity = entityDataToBeUpdated.groups[query.type].find(groupEntity => {
                    return groupEntity.toString() == entity._id.toString();
                })

                if (!indexOfEntity) {

                    entityDataToBeUpdated.groups[query.type].push(entity._id);

                    await database.models.entity.findOneAndUpdate(
                        {
                            "metaInformation.externalId": entity.metaInformation.parentEntityId
                        },
                        {
                            $set: {
                                groups: entityDataToBeUpdated.groups
                            }
                        },
                        {
                            upsert: true,
                            new: true,
                            setDefaultsOnInsert: true,
                            returnNewDocument: true
                        });

                    if (solutionsData[entity.metaInformation.solutionId].subType == "individual") {

                        let entityAssessorsDocument = {}
                        entityAssessorsDocument.programId = programsData[entity.metaInformation.programId];
                        entityAssessorsDocument.assessmentStatus = "pending";
                        entityAssessorsDocument.parentId = "";
                        entityAssessorsDocument["entities"] = [entity._id];
                        entityAssessorsDocument.solutionId = solutionsData[entity.metaInformation.solutionId]["_id"];
                        entityAssessorsDocument.role = entity.metaInformation.role;
                        entityAssessorsDocument.userId = entity.metaInformation.userId;
                        entityAssessorsDocument.externalId = entity.metaInformation.externalId;
                        entityAssessorsDocument.name = entity.metaInformation.name;
                        entityAssessorsDocument.email = entity.metaInformation.email;
                        entityAssessorsDocument.createdBy = userDetails.id;
                        entityAssessorsDocument.updatedBy = userDetails.id;
                        await database.models.entityAssessors.findOneAndUpdate(
                            { userId: entityAssessorsDocument.userId },
                            entityAssessorsDocument,
                            {
                                upsert: true,
                                new: true,
                                setDefaultsOnInsert: true,
                                returnNewDocument: true
                            }
                        );

                    }

                }

            }))

            if (entitiesUploadCount != entityData.length) {
                throw "Some entity information was not inserted!"
            }

            return;

        } catch (error) {
            throw error;
        }
    }

    async uploadForPortal(query, userDetails, files) {
        return new Promise(async (resolve, reject) => {
            try {

                if (query.type != "school") throw "invalid type";

                if (!files || !files.schools) throw { status: 400, message: "Bad Request." };

                let schoolsData = await csv().fromString(
                    files.schools.data.toString()
                );

                const schoolsUploadCount = schoolsData.length;

                let programId = query.programId

                if (!programId) throw "Program Id is missing";

                let solutionId = query.solutionId

                if (!solutionId) throw "Component Id is missing.";

                // let programDocument = await database.models.programs.find({ _id: programId }).lean();

                // if (!programDocument) throw "Bad request"

                // let solutionDocument = await database.models.solutions.find({
                //     _id: { $in: solutionId }
                // }).lean();

                // if (!solutionDocument) throw "Bad request";

                // const programsData = programDocument.reduce(
                //     (ac, program) => ({ ...ac, [program._id]: program }),
                //     {}
                // );

                // const solutionsData = solutionDocument.reduce(
                //     (ac, solution) => ({
                //         ...ac,
                //         [solution._id]: solution
                //     }),
                //     {}
                // );

                let entityType = await database.models.entityTypes.find({ "entityType": "school" }, { _id: 1 }).lean();

                const schoolUploadedData = await Promise.all(
                    schoolsData.map(async school => {
                        school.schoolTypes = await school.schoolType.split(",");
                        const schoolCreateObject = await database.models.entity.findOneAndUpdate(
                            {
                                "metaInformation.externalId": school.externalId,
                                "entityType": "school"
                            },
                            {
                                "entityTypeId": entityType._id,
                                "entityType": "school",
                                "regsitryDetails": {},
                                "groups": {},
                                "metaInformation": school,
                                "updatedBy": userDetails.id,
                                "createdBy": userDetails.id
                            },
                            {
                                upsert: true,
                                new: true,
                                setDefaultsOnInsert: true,
                                returnNewDocument: true
                            }
                        );

                        return {
                            _id: schoolCreateObject._id,
                            externalId: school.externalId,
                            programId: programId,
                            solutionId: solutionId
                        };
                    })
                );

                // if (schoolsUploadCount === schoolUploadedData.length) {
                //     let schoolElement = new Object();
                //     let programFrameworkSchools = new Array();
                //     let schoolCsvDataProgramId;
                //     let schoolCsvDataSolutionId;

                //     for (
                //         let schoolIndexInData = 0;
                //         schoolIndexInData < schoolUploadedData.length;
                //         schoolIndexInData++
                //     ) {
                //         schoolElement = schoolUploadedData[schoolIndexInData];

                //         schoolCsvDataProgramId = programId;
                //         schoolCsvDataSolutionId =
                //             solutionId;
                //         programFrameworkSchools =
                //             solutionsData[solutionId].entities;
                //         if (
                //             programFrameworkSchools.findIndex(
                //                 school => school.toString() == schoolElement._id.toString()
                //             ) < 0
                //         ) {
                //             programFrameworkSchools.push(
                //                 ObjectId(schoolElement._id.toString())
                //             );
                //         }
                //     }

                // await Promise.all(
                //     Object.values(programsData).map(async program => {
                //         let queryObject = {
                //             _id: ObjectId(program._id.toString())
                //         };
                //         let updateObject = {};

                //         updateObject.$set = {
                //             ["components"]: program.components
                //         };

                //         await database.models.programs.findOneAndUpdate(
                //             queryObject,
                //             updateObject
                //         );

                //         return;
                //     })
                // );
                // } else {
                //     throw "Something went wrong, not all records were inserted/updated.";
                // }

                if (schoolsUploadCount != schoolUploadedData.length) throw "Something went wrong, not all records were inserted/updated.";

                let responseMessage = "School record created successfully.";

                let response = { message: responseMessage };

                return resolve(response);
            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || error || "Oops! Something went wrong!",
                    errorObject: error
                });
            }
        })
    }

};