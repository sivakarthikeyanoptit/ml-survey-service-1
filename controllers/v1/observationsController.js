const observationsHelper = require(ROOT_PATH + "/module/observations/helper")
const entitiesHelper = require(ROOT_PATH + "/module/entities/helper")
const assessmentsHelper = require(ROOT_PATH + "/module/assessments/helper")
const submissionsHelper = require(ROOT_PATH + "/module/submissions/helper")

module.exports = class Observations extends Abstract {

    constructor() {
        super(observationsSchema);
    }

    /**
    * @api {get} /assessment/api/v1/observations/solutions/:entityTypeId Observation Solution
    * @apiVersion 0.0.1
    * @apiName Observation Solution
    * @apiGroup Observations
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/observations/solutions
    * @apiUse successBody
    * @apiUse errorBody
    */

    async solutions(req) {

        return new Promise(async (resolve, reject) => {

            try {

                let solutionsData = await database.models.solutions.find({
                    entityTypeId: req.params._id,
                    type: "observation",
                    isReusable: true
                }, {
                        name: 1,
                        description: 1,
                        externalId: 1,
                        programId: 1,
                        entityTypeId: 1
                    }).lean();

                return resolve({
                    message: "Solution list fetched successfully.",
                    result: solutionsData
                });

            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }

        });

    }


    /**
    * @api {get} /assessment/api/v1/observations/metaForm/:solutionId Observation Creation Meta Form
    * @apiVersion 0.0.1
    * @apiName Observation Creation Meta Form
    * @apiGroup Observations
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/observations/metaForm
    * @apiUse successBody
    * @apiUse errorBody
    */

    async metaForm(req) {

        return new Promise(async (resolve, reject) => {

            try {

                let solutionsData = await database.models.solutions.findOne({
                    _id: ObjectId(req.params._id),
                    isReusable: true
                }, {
                        observationMetaFormKey: 1
                    }).lean();


                if (!solutionsData._id) {
                    let responseMessage = "Bad request.";
                    return resolve({ status: 400, message: responseMessage })
                }

                let observationsMetaForm = await database.models.forms.findOne({ "name": (solutionsData.observationMetaFormKey && solutionsData.observationMetaFormKey != "") ? solutionsData.observationMetaFormKey : "defaultObservationMetaForm" }, { value: 1 }).lean();

                return resolve({
                    message: "Observation meta fetched successfully.",
                    result: observationsMetaForm.value
                });

            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }

        });

    }


    /**
     * @api {post} /assessment/api/v1/observations/create?solutionId=:solutionInternalId Create Observation
     * @apiVersion 0.0.1
     * @apiName Create Observation
     * @apiGroup Observations
     * @apiParamExample {json} Request-Body:
     * {
     *	    "data": {
     *          "name": String,
     *          "description": String,
     *          "startDate": String,
     *          "endDate": String,
     *          "status": String
     *      }
     * }
     * @apiUse successBody
     * @apiUse errorBody
     */

    create(req) {
        return new Promise(async (resolve, reject) => {

            try {

                let result = await observationsHelper.create(req.query.solutionId, req.body.data, req.userDetails);

                return resolve({
                    message: "Observation created successfully.",
                    result: result
                });

            } catch (error) {

                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! something went wrong.",
                    errorObject: error
                })

            }


        })
    }


    /**
     * @api {get} /assessment/api/v1/observations/list Observations list
     * @apiVersion 0.0.1
     * @apiName Observations list
     * @apiGroup Observations
     * @apiHeader {String} X-authenticated-user-token Authenticity token
     * @apiSampleRequest /assessment/api/v1/observations/list
     * @apiUse successBody
     * @apiUse errorBody
     */

    async list(req) {

        return new Promise(async (resolve, reject) => {

            try {

                let observations = new Array;

                let assessorObservationsQueryObject = [
                    {
                        $match: {
                            createdBy: req.userDetails.userId,
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
                            "name": 1,
                            "description": 1,
                            "entities": 1,
                            "startDate": 1,
                            "endDate": 1,
                            "status": 1,
                            "solutionId": 1,
                            "entityDocuments._id": 1,
                            "entityDocuments.metaInformation.externalId": 1,
                            "entityDocuments.metaInformation.name": 1
                        }
                    }
                ];

                const userObservations = await database.models.observations.aggregate(assessorObservationsQueryObject)

                let observation
                let submissions
                let entityObservationSubmissionStatus

                for (let pointerToAssessorObservationArray = 0; pointerToAssessorObservationArray < userObservations.length; pointerToAssessorObservationArray++) {

                    observation = userObservations[pointerToAssessorObservationArray];


                    submissions = await database.models.observationSubmissions.find(
                        {
                          entityId: {
                            $in: observation.entities
                          },
                          observationId:observation._id
                        },
                        {
                          "entityId": 1,
                          "status": 1
                        }
                    )


                    entityObservationSubmissionStatus = submissions.reduce(
                        (ac, entitySubmission) => ({ ...ac, [entitySubmission.entityId.toString()]: {submissionStatus:(entitySubmission.entityId && entitySubmission.status) ? entitySubmission.status : "pending",} }), {})


                    observation.entities = new Array
                    observation.entityDocuments.forEach(observationEntity => {
                        observation.entities.push({
                            _id: observationEntity._id,
                            submissionStatus: (entityObservationSubmissionStatus[observationEntity._id.toString()]) ? entityObservationSubmissionStatus[observationEntity._id.toString()].submissionStatus : "pending",
                            ...observationEntity.metaInformation
                        })
                    })
                    observations.push(_.omit(observation, ["entityDocuments"]))
                }

                let responseMessage = "Observation list fetched successfully"

                return resolve({
                    message: responseMessage,
                    result: observations
                });

            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }

        });

    }

    /**
     * @api {post} /assessment/api/v1/observations/addEntityToObservation/:observationId Map entities to observations
     * @apiVersion 0.0.1
     * @apiName Map entities to observations
     * @apiGroup Observations
    * @apiParamExample {json} Request-Body:
     * {
     *	    "data": ["5beaa888af0065f0e0a10515","5beaa888af0065f0e0a10516"]
     * }
     * @apiUse successBody
     * @apiUse errorBody
     */


    async addEntityToObservation(req) {

        return new Promise(async (resolve, reject) => {

            try {

                let responseMessage = "Updated successfully."

                let observationDocument = await database.models.observations.findOne(
                    {
                        _id: req.params._id,
                        createdBy: req.userDetails.userId
                    },
                    {
                        entityTypeId: 1,
                        status: 1
                    }
                ).lean()

                if (observationDocument.status != "published") {
                    return resolve({
                        status: 400,
                        message: "Observation already completed or not published."
                    })
                }

                let entitiesDocuments = await database.models.entities.find(
                    {
                        _id: { $in: gen.utils.arrayIdsTobjectIds(req.body.data) },
                        entityTypeId: observationDocument.entityTypeId
                    },
                    {
                        _id: 1
                    }
                );

                let entityIds = entitiesDocuments.map(entityId => entityId._id);

                await database.models.observations.updateOne(
                    {
                        _id: observationDocument._id
                    },
                    {
                        $addToSet: { entities: entityIds }
                    }
                );

                if (entityIds.length != req.body.data.length) {
                    responseMessage = "Not all entities are updated."
                }

                return resolve({
                    message: responseMessage
                })


            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }

        });

    }

    /**
     * @api {post} /assessment/api/v1/observations/removeEntityFromObservation/:observationId Un Map entities to observations
     * @apiVersion 0.0.1
     * @apiName Un Map entities to observations
     * @apiGroup Observations
    * @apiParamExample {json} Request-Body:
     * {
     *	    "data": ["5beaa888af0065f0e0a10515","5beaa888af0065f0e0a10516"]
     * }
     * @apiUse successBody
     * @apiUse errorBody
     */


    async removeEntityFromObservation(req) {

        return new Promise(async (resolve, reject) => {

            try {

                await database.models.observations.updateOne(
                    {
                        _id: ObjectId(req.params._id),
                        status: { $ne: "completed" },
                        createdBy: req.userDetails.id
                    },
                    {
                        $pull: {
                            entities: { $in: gen.utils.arrayIdsTobjectIds(req.body.data) }
                        }
                    }
                );

                return resolve({
                    message: "Entity Removed successfully."
                })


            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }

        });

    }

    /**
     * @api {get} /assessment/api/v1/observations/search/:observationId?search=:searchText&&limit=1&&page=1 Search Entities
     * @apiVersion 0.0.1
     * @apiName Search Entities
     * @apiGroup Observations
     * @apiHeader {String} X-authenticated-user-token Authenticity token
     * @apiSampleRequest /assessment/api/v1/observations/search/:observationId
     * @apiUse successBody
     * @apiUse errorBody
     */


    async search(req) {

        return new Promise(async (resolve, reject) => {

            try {

                let response = {
                    message: "Entities fetched successfully",
                    result: {}
                };


                let observationDocument = await database.models.observations.findOne(
                    {
                        _id: req.params._id,
                        createdBy: req.userDetails.userId,

                    },
                    {
                        entityTypeId: 1,
                        entities: 1
                    }
                ).lean();

                if (!observationDocument) throw { status: 400, message: "Observation not found for given params." }

                let entityDocuments = await entitiesHelper.search(observationDocument.entityTypeId, req.searchText, req.pageSize, req.pageNo);

                let observationEntityIds = observationDocument.entities.map(entity => entity.toString());

                entityDocuments[0].metaInformation.forEach(metaInformation => {
                    metaInformation.selected = (observationEntityIds.includes(metaInformation._id.toString())) ? true : false;
                })

                response.result = entityDocuments

                return resolve(response);


            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || error,
                    errorObject: error
                });
            }

        });

    }


    /**
     * @api {get} /assessment/api/v1/observations/assessment/:observationId?entityId=:entityId Assessments
     * @apiVersion 0.0.1
     * @apiName Assessments
     * @apiGroup Observations
     * @apiHeader {String} X-authenticated-user-token Authenticity token
     * @apiSampleRequest /assessment/api/v1/observations/assessment/:observationId
     * @apiUse successBody
     * @apiUse errorBody
     */
    async assessment(req) {

        return new Promise(async (resolve, reject) => {

            try {

                let response = {
                    message: "Assessment fetched successfully",
                    result: {}
                };

                let observationDocument = await database.models.observations.findOne({ _id: req.params._id, createdBy: req.userDetails.userId, entities: ObjectId(req.query.entityId) }).lean();

                if (!observationDocument) return resolve({ status: 400, message: 'No observation found.' })


                let entityQueryObject = { _id: req.query.entityId, entityType: observationDocument.entityType };
                let entityDocument = await database.models.entities.findOne(
                    entityQueryObject,
                    {
                        metaInformation: 1,
                        entityTypeId: 1,
                        entityType: 1
                    }
                ).lean();

                if (!entityDocument) {
                    let responseMessage = 'No entity found.';
                    return resolve({ status: 400, message: responseMessage })
                }

                let solutionQueryObject = {
                    _id: observationDocument.solutionId,
                    status: "active",
                };

                let solutionDocument = await database.models.solutions.findOne(
                    solutionQueryObject,
                    {
                        name: 1,
                        externalId: 1,
                        description: 1,
                        themes: 1,
                        entityProfileFieldsPerEntityTypes: 1,
                        registry: 1,
                        questionSequenceByEcm: 1,
                        frameworkId: 1,
                        frameworkExternalId: 1,
                        roles: 1,
                        evidenceMethods: 1,
                        sections: 1,
                        entityTypeId: 1
                    }
                ).lean();

                if (!solutionDocument) {
                    let responseMessage = 'No solution found.';
                    return resolve({ status: 400, message: responseMessage })
                }

                let currentUserAssessmentRole = await assessmentsHelper.getUserRole(req.userDetails.allRoles)
                let profileFieldAccessibility = (solutionDocument.roles && solutionDocument.roles[currentUserAssessmentRole] && solutionDocument.roles[currentUserAssessmentRole].acl && solutionDocument.roles[currentUserAssessmentRole].acl.entityProfile) ? solutionDocument.roles[currentUserAssessmentRole].acl.entityProfile : "";

                let entityProfileForm = await database.models.entityTypes.findOne(
                    solutionDocument.entityTypeId,
                    {
                        profileForm: 1
                    }
                ).lean();

                if (!entityProfileForm) {
                    let responseMessage = 'No entity profile form found.';
                    return resolve({ status: 400, message: responseMessage })
                }

                let form = [];
                let entityDocumentTypes = (entityDocument.metaInformation.types) ? entityDocument.metaInformation.types : ["A1"];
                let entityDocumentQuestionGroup = (entityDocument.metaInformation.questionGroup) ? entityDocument.metaInformation.questionGroup : ["A1"];
                let entityProfileFieldsPerEntityTypes = solutionDocument.entityProfileFieldsPerEntityTypes
                let filteredFieldsToBeShown = [];

                if (entityProfileFieldsPerEntityTypes) {
                    entityDocumentTypes.forEach(entityType => {
                        if (entityProfileFieldsPerEntityTypes[entityType]) {
                            filteredFieldsToBeShown.push(...entityProfileFieldsPerEntityTypes[entityType])
                        }
                    })
                }

                entityProfileForm.profileForm.forEach(profileFormField => {
                    if (filteredFieldsToBeShown.includes(profileFormField.field)) {
                        profileFormField.value = (entityDocument.metaInformation[profileFormField.field]) ? entityDocument.metaInformation[profileFormField.field] : ""
                        profileFormField.visible = profileFieldAccessibility ? (profileFieldAccessibility.visible.indexOf("all") > -1 || profileFieldAccessibility.visible.indexOf(profileFormField.field) > -1) : true;
                        profileFormField.editable = profileFieldAccessibility ? (profileFieldAccessibility.editable.indexOf("all") > -1 || profileFieldAccessibility.editable.indexOf(profileFormField.field) > -1) : true;
                        form.push(profileFormField)
                    }
                })

                response.result.entityProfile = {
                    _id: entityDocument._id,
                    entityTypeId: entityDocument.entityTypeId,
                    entityType: entityDocument.entityType,
                    form: form
                };

                response.result.solution = await _.pick(solutionDocument, [
                    "_id",
                    "externalId",
                    "name",
                    "description",
                    "registry"
                ]);

                let submissionDocument = {
                    entityId: entityDocument._id,
                    entityExternalId: (entityDocument.metaInformation.externalId) ? entityDocument.metaInformation.externalId : "",
                    entityInformation: entityDocument.metaInformation,
                    solutionId: solutionDocument._id,
                    solutionExternalId: solutionDocument.externalId,
                    frameworkId: solutionDocument.frameworkId,
                    frameworkExternalId: solutionDocument.frameworkExternalId,
                    entityTypeId: solutionDocument.entityTypeId,
                    entityType: solutionDocument.entityType,
                    observationId: observationDocument._id,
                    observationInformation: {
                        ..._.omit(observationDocument, ["_id", "entities", "deleted", "__v"])
                    },
                    createdBy: observationDocument.createdBy,
                    evidenceSubmissions: [],
                    entityProfile: {},
                    status: "started"
                };

                let assessment = {};

                assessment.name = solutionDocument.name;
                assessment.description = solutionDocument.description;
                assessment.externalId = solutionDocument.externalId;

                let criteriaId = new Array
                let criteriaObject = {}
                let criteriaIdArray = gen.utils.getCriteriaIdsAndWeightage(solutionDocument.themes);

                criteriaIdArray.forEach(eachCriteriaId => {
                    criteriaId.push(eachCriteriaId.criteriaId)
                    criteriaObject[eachCriteriaId.criteriaId.toString()] = {
                        weightage: eachCriteriaId.weightage
                    }
                })

                let criteriaQuestionDocument = await database.models.criteriaQuestions.find(
                    { _id: { $in: criteriaId } },
                    {
                        resourceType: 0,
                        language: 0,
                        keywords: 0,
                        concepts: 0,
                        createdFor: 0
                    }
                ).lean();

                let evidenceMethodArray = {};
                let submissionDocumentEvidences = {};
                let submissionDocumentCriterias = [];
                Object.keys(solutionDocument.evidenceMethods).forEach(solutionEcm => {
                    solutionDocument.evidenceMethods[solutionEcm].startTime = ""
                    solutionDocument.evidenceMethods[solutionEcm].endTime = ""
                    solutionDocument.evidenceMethods[solutionEcm].isSubmitted = false
                    solutionDocument.evidenceMethods[solutionEcm].submissions = new Array
                })
                submissionDocumentEvidences = solutionDocument.evidenceMethods

                criteriaQuestionDocument.forEach(criteria => {

                    criteria.weightage = criteriaObject[criteria._id.toString()].weightage

                    submissionDocumentCriterias.push(
                        _.omit(criteria, [
                            "evidences"
                        ])
                    );

                    criteria.evidences.forEach(evidenceMethod => {

                        if (evidenceMethod.code) {

                            if (!evidenceMethodArray[evidenceMethod.code]) {

                                evidenceMethod.sections.forEach(ecmSection => {
                                    ecmSection.name = solutionDocument.sections[ecmSection.code]
                                })
                                _.merge(evidenceMethod, submissionDocumentEvidences[evidenceMethod.code])
                                evidenceMethodArray[evidenceMethod.code] = evidenceMethod;

                            } else {

                                evidenceMethod.sections.forEach(evidenceMethodSection => {

                                    let sectionExisitsInEvidenceMethod = 0;
                                    let existingSectionQuestionsArrayInEvidenceMethod = [];

                                    evidenceMethodArray[evidenceMethod.code].sections.forEach(exisitingSectionInEvidenceMethod => {

                                        if (exisitingSectionInEvidenceMethod.code == evidenceMethodSection.code) {
                                            sectionExisitsInEvidenceMethod = 1;
                                            existingSectionQuestionsArrayInEvidenceMethod = exisitingSectionInEvidenceMethod.questions;
                                        }

                                    });

                                    if (!sectionExisitsInEvidenceMethod) {
                                        evidenceMethodSection.name = solutionDocument.sections[evidenceMethodSection.code]
                                        evidenceMethodArray[evidenceMethod.code].sections.push(evidenceMethodSection);
                                    } else {
                                        evidenceMethodSection.questions.forEach(questionInEvidenceMethodSection => {
                                            existingSectionQuestionsArrayInEvidenceMethod.push(
                                                questionInEvidenceMethodSection
                                            );
                                        });
                                    }

                                });

                            }

                        }

                    });

                });

                submissionDocument.evidences = submissionDocumentEvidences;
                submissionDocument.evidencesStatus = Object.values(submissionDocumentEvidences);
                submissionDocument.criteria = submissionDocumentCriterias;

                let submissionDoc = await observationsHelper.findSubmission(
                    submissionDocument
                );

                assessment.submissionId = submissionDoc.result._id;

                const parsedAssessment = await assessmentsHelper.parseQuestions(
                    Object.values(evidenceMethodArray),
                    entityDocumentQuestionGroup,
                    submissionDoc.result.evidences,
                    (solutionDocument && solutionDocument.questionSequenceByEcm) ? solutionDocument.questionSequenceByEcm : false
                );

                assessment.evidences = parsedAssessment.evidences;
                assessment.submissions = parsedAssessment.submissions;
                if (parsedAssessment.generalQuestions && parsedAssessment.generalQuestions.length > 0) {
                    assessment.generalQuestions = parsedAssessment.generalQuestions;
                }

                response.result.assessment = assessment;

                return resolve(response);


            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || error,
                    errorObject: error
                });
            }

        });

    }

    /**
   * @api {get} /assessment/api/v1/observations/complete/:observationId Mark As Completed
   * @apiVersion 0.0.1
   * @apiName Mark As Completed
   * @apiGroup Observations
   * @apiHeader {String} X-authenticated-user-token Authenticity token
   * @apiSampleRequest /assessment/api/v1/observations/complete/:observationId
   * @apiUse successBody
   * @apiUse errorBody
   */


    async complete(req) {

        return new Promise(async (resolve, reject) => {

            try {

                await database.models.observations.updateOne(
                    {
                        _id: ObjectId(req.params._id),
                        status: { $ne: "completed" },
                        createdBy: req.userDetails.id
                    },
                    {
                        $set: {
                            status: "completed"
                        }
                    }
                );

                return resolve({
                    message: "Observation marked as completed."
                })

            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || error,
                    errorObject: error
                });
            }

        });

    }

}
