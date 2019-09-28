const assessmentsHelper = require(ROOT_PATH + "/module/assessments/helper")
const submissionsHelper = require(ROOT_PATH + "/module/submissions/helper")

module.exports = class Assessments {

    constructor() {
    }

    /**
    * @api {get} /assessment/api/v1/assessments/details/{programID}?solutionId={solutionId}&entityId={entityId} Detailed assessments
    * @apiVersion 1.0.0
    * @apiName Assessment details
    * @apiGroup Assessments
    * @apiParam {String} solutionId Solution ID.
    * @apiParam {String} entityId Entity ID.
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/assessments/details/5c56942d28466d82967b9479?solutionId=5c5693fd28466d82967b9429&entityId=5c5694be52600a1ce8d24dc7
    * @apiUse successBody
    * @apiUse errorBody
    */
    async details(req) {
        return new Promise(async (resolve, reject) => {
            try {
                req.body = req.body || {};

                let response = {
                    message: "Assessment fetched successfully",
                    result: {}
                };


                let programQueryObject = {
                    _id: req.params._id,
                    status: "active",
                    components: { $in: [ObjectId(req.query.solutionId)] }
                };
                let programDocument = await database.models.programs.findOne(programQueryObject).lean();


                if (!programDocument) {
                    let responseMessage = 'No program found.';
                    return resolve({ status: 400, message: responseMessage })
                }

                let entityAssessorObject = {
                    userId: req.userDetails.userId,
                    programId: req.params._id,
                    solutionId: req.query.solutionId,
                    entities: { $in: [ObjectId(req.query.entityId)] }
                };
                let entityAssessorDocument = await database.models.entityAssessors.findOne(
                    entityAssessorObject
                ).lean();

                if (!entityAssessorDocument) {
                    let responseMessage = 'Unauthorized.';
                    return resolve({ status: 400, message: responseMessage })
                }

                const isRequestForOncallOrOnField = req.query.oncall && req.query.oncall == 1 ? "oncall" : "onfield";

                let entityQueryObject = { _id: ObjectId(req.query.entityId) };
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
                    _id: req.query.solutionId,
                    programId: req.params._id,
                    status: "active",
                    entities: { $in: [ObjectId(req.query.entityId)] }
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

                let currentUserAssessmentRole = await assessmentsHelper.getUserRole([entityAssessorDocument.role])
                let profileFieldAccessibility = (solutionDocument.roles[currentUserAssessmentRole] && solutionDocument.roles[currentUserAssessmentRole].acl && solutionDocument.roles[currentUserAssessmentRole].acl.entityProfile) ? solutionDocument.roles[currentUserAssessmentRole].acl.entityProfile : {};

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
                        profileFormField.visible = profileFieldAccessibility.visible.indexOf("all") > -1 || profileFieldAccessibility.visible.indexOf(profileFormField.field) > -1
                        profileFormField.editable = profileFieldAccessibility.editable.indexOf("all") > -1 || profileFieldAccessibility.editable.indexOf(profileFormField.field) > -1
                        form.push(profileFormField)
                    }
                })

                response.result.entityProfile = {
                    _id: entityDocument._id,
                    entityTypeId: entityDocument.entityTypeId,
                    entityType: entityDocument.entityType,
                    form: form
                };

                response.result.program = await _.pick(programDocument, [
                    "_id",
                    "externalId",
                    "name",
                    "description",
                    "imageCompression"
                ]);

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
                    programId: programDocument._id,
                    programExternalId: programDocument.externalId,
                    programInformation: {
                        ..._.omit(programDocument, ["_id", "components"])
                    },
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

                        if (submissionDocumentEvidences[evidenceMethod.code].modeOfCollection === isRequestForOncallOrOnField) {

                            if (!evidenceMethodArray[evidenceMethod.code]) {

                                evidenceMethod.sections.forEach(ecmSection => {
                                    ecmSection.name = solutionDocument.sections[ecmSection.code]
                                })
                                _.merge(evidenceMethod, submissionDocumentEvidences[evidenceMethod.code])
                                evidenceMethodArray[evidenceMethod.code] = evidenceMethod;

                            } else {

                                // Evidence method already exists
                                // Loop through all sections reading evidence method

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

                let submissionDoc = await submissionsHelper.findSubmissionByEntityProgram(
                    submissionDocument,
                    req
                );
                assessment.submissionId = submissionDoc.result._id;

                if (isRequestForOncallOrOnField == "oncall" && submissionDoc.result.parentInterviewResponses && submissionDoc.result.parentInterviewResponses.length > 0) {
                    assessment.parentInterviewResponses = submissionDoc.result.parentInterviewResponses;
                }

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
                    status: 500,
                    message: "Oops! Something went wrong!",
                    errorObject: error
                });
            }
        });
    }

}
