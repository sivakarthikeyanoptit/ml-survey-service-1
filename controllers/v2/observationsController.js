const userExtensionHelper = require(ROOT_PATH + "/module/userExtension/helper")
const entitiesHelper = require(ROOT_PATH + "/module/entities/helper")
const observationsHelper = require(ROOT_PATH + "/module/observations/helper")
const solutionsHelper = require(ROOT_PATH + "/module/solutions/helper")
const v1Observation = require(ROOT_PATH + "/controllers/v1/observationsController")
const assessmentsHelper = require(ROOT_PATH + "/module/assessments/helper")

module.exports = class Observations extends v1Observation {


    /**
     * @api {get} /assessment/api/v2/observations/searchEntities?solutionId=:solutionId&search=:searchText&limit=1&page=1 Search Entities based on observationId or solutionId
     * @apiVersion 0.0.2
     * @apiName Search Entities
     * @apiGroup Observations
     * @apiHeader {String} X-authenticated-user-token Authenticity token
     * @apiSampleRequest /assessment/api/v1/observations/searchEntities?observationId=5d4bdcab44277a08145d7258&search=a&limit=10&page=1
     * @apiUse successBody
     * @apiUse errorBody
     */

    async searchEntities(req) {

        return new Promise(async (resolve, reject) => {

            try {

                let response = {
                    result: {}
                };

                let userId = req.userDetails.userId
                let result

                let projection = []

                if (req.query.observationId) {
                    let findObject = {}
                    findObject["_id"] = req.query.observationId
                    findObject["createdBy"] = userId

                    projection.push("entityTypeId", "entities")

                    let observationDocument = await observationsHelper.observationDocument(findObject, projection)
                    result = observationDocument[0]
                }

                if (req.query.solutionId) {
                    let findQuery = []
                    findQuery.push(req.query.solutionId)
                    projection.push("entityTypeId","entityType")

                    let solutionDocument = await solutionsHelper.solutionDocument(findQuery, projection)
                    result = _.merge(solutionDocument[0])
                }

                let userAllowedEntities = new Array
                
                try {
                    userAllowedEntities = await userExtensionHelper.getUserEntitiyUniverseByEntityType(userId,result.entityType)
                } catch (error) {
                    userAllowedEntities = []
                }
                

                let entityDocuments = await entitiesHelper.search(result.entityTypeId, req.searchText, req.pageSize, req.pageNo, userAllowedEntities && userAllowedEntities.length > 0 ? userAllowedEntities : false);

                if (result.entities && result.entities.length > 0) {
                    let observationEntityIds = result.entities.map(entity => entity.toString());

                    entityDocuments[0].data.forEach(eachMetaData => {
                        eachMetaData.selected = (observationEntityIds.includes(eachMetaData._id.toString())) ? true : false;
                    })
                }

                let messageData = "Entities fetched successfully"
                if (!entityDocuments[0].count) {
                    entityDocuments[0].count = 0
                    messageData = "No entity found"
                }
                response.result = entityDocuments
                response["message"] = messageData

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
     * @api {get} /assessment/api/v2/observations/assessment/:observationId?entityId=:entityId&submissionNumber=submissionNumber Assessments
     * @apiVersion 0.0.2
     * @apiName Assessments
     * @apiGroup Observations
     * @apiHeader {String} X-authenticated-user-token Authenticity token
     * @apiParam {String} entityId Entity ID.
     * @apiParam {Int} submissionNumber Submission Number.
     * @apiSampleRequest /assessment/api/v2/observations/assessment/5d286eace3cee10152de9efa?entityId=5d286b05eb569501488516c4&submissionNumber=1
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

                const submissionNumber = req.query.submissionNumber && req.query.submissionNumber > 1 ? parseInt(req.query.submissionNumber) : 1;

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
                        entityTypeId: 1,
                        entityType: 1
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
                submissionDocument.submissionNumber = submissionNumber;

                let submissionDoc = await observationsHelper.findSubmission(
                    submissionDocument
                );

                assessment.submissionId = submissionDoc.result._id;

                const parsedAssessment = await assessmentsHelper.parseQuestionsV2(
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
}