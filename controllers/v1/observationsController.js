const observationsHelper = require(ROOT_PATH + "/module/observations/helper")
const entitiesHelper = require(ROOT_PATH + "/module/entities/helper")
const assessmentsHelper = require(ROOT_PATH + "/module/assessments/helper")
const submissionsHelper = require(ROOT_PATH + "/module/submissions/helper")

module.exports = class Observations extends Abstract {

    /**
     * @apiDefine errorBody
     * @apiError {String} status 4XX,5XX
     * @apiError {String} message Error
     */

    /**
       * @apiDefine successBody
       *  @apiSuccess {String} status 200
       * @apiSuccess {String} result Data
       */

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

                if (!req.params._id) {
                    let responseMessage = "Bad request.";
                    return resolve({ status: 400, message: responseMessage })
                }


                let solutionsData = await database.models.solutions.find({
                    entityTypeId: ObjectId(req.params._id),
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

                if (!req.params._id) {
                    let responseMessage = "Bad request.";
                    return resolve({ status: 400, message: responseMessage })
                }


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

                if (!req.query.solutionId || req.query.solutionId == "") {
                    let responseMessage = "Bad request.";
                    return resolve({ status: 400, message: responseMessage })
                }

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
                            createdBy: req.userDetails.userId
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

                for (let pointerToAssessorObservationArray = 0; pointerToAssessorObservationArray < userObservations.length; pointerToAssessorObservationArray++) {

                    observation = userObservations[pointerToAssessorObservationArray];
                    observation.entities = new Array
                    observation.entityDocuments.forEach(observationEntity => {
                        observation.entities.push({
                            _id: observationEntity._id,
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
                        _id: req.params._id
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
                        _id: ObjectId(req.params._id)
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
     * @api {get} /assessment/api/v1/observations/search/:observationId Search Entities
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
                        _id: req.params._id
                    },
                    {
                        entityTypeId: 1
                    }
                ).lean();

                if (!observationDocument) throw { status: 400, message: "Observation not found for given params." }

                let entityDocuments = await entitiesHelper.search(observationDocument.entityTypeId, req.searchText, req.pageSize, req.pageNo);

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
     * @api {get} /assessment/api/v1/observations/assessment/:observationId Entities Assessments
     * @apiVersion 0.0.1
     * @apiName Entities Assessments
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

                let observationDocument = await database.models.observations.findOne({ _id: req.params._id }).lean();

                if (!observationDocument) return resolve({ status: 400, message: 'No observation found.' })

                const isRequestForOncallOrOnField = req.query.oncall && req.query.oncall == 1 ? "oncall" : "onfield";

                let entityQueryObject = { _id: req.query.entityId };
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
                    // entities: { $in: [ObjectId(req.query.entityId)] }
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
                        ..._.omit(observationDocument, ["_id", "entities"])
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

                let submissionDoc = await observationsHelper.findSubmissionByEntityObservation(
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
                    status: error.status || 500,
                    message: error.message || error,
                    errorObject: error
                });
            }

        });

    }

    /**
* @api {post} /assessment/api/v1/observations/make/{{submissionId}} 
* @apiVersion 0.0.1
* @apiName observations added successfully
* @apiGroup Observations
* @apiParamExample {json} Request-Body:
* {
* 	"evidence": {
*                   "externalId" : "",
*                   "answers" : {
*                       "5be442149a14ba4b5038dce4" : {
*                           "qid" : "",
*                           "responseType":"",
*                           "value" : [ 
*                               {
*                                   "5be442dd9a14ba4b5038dce5" : {
*                                       "qid" : "",
*                                       "value" : "",
*                                       "remarks" : "",
*                                       "fileName" : [],
*                                       "payload" : {
*                                           "question" : [ 
*                                               "", 
*                                               ""
*                                           ],
*                                           "labels" : [ 
*                                               ""
*                                           ],
*                                           "responseType" : ""
*                                       },
*                                       "criteriaId" : ""
*                                   },
*                                   "5be52f5d9a14ba4b5038dd0c" : {
*                                       "qid" : "",
*                                       "value" : [ 
*                                           "String", 
*                                           "String"
*                                       ],
*                                       "remarks" : "",
*                                       "fileName" : [],
*                                       "payload" : {
*                                           "question" : [ 
*                                               "", 
*                                               ""
*                                           ],
*                                           "labels" : [ 
*                                              "String", 
*                                           "String"
*                                           ],
*                                           "responseType" : """
*                                       },
*                                       "criteriaId" : ""
*                                   }
*                               }
*                           ],
*                           "remarks" : "",
*                           "fileName" : [],
*                           "payload" : {
*                               "question" : [ 
*                                   "String"", 
*                                   "Stgring"
*                               ],
*                              "labels" : [ 
*                                   [ 
*                                       [ 
*                                           {
*                                               "_id" : "",
*                                               "question" : [ 
*                                                   "String", 
*                                                   "String"
*                                               ],
*                                               "options" : [ 
*                                                   {
*                                                       "value" : "",
*                                                       "label" : ""
*                                                   }
*                                               ],
*                                               "children" : [],
*                                               "questionGroup" : [ 
*                                                   ""
*                                               ],
*                                               "fileName" : [],
*                                               "instanceQuestions" : [],
*                                               "deleted" : Boolean,
*                                               "tip" : "",
*                                               "externalId" : "",
*                                               "visibleIf" : "",
*                                               "file" : "",
*                                               "responseType" : "",
*                                               "validation" : {
*                                                   "required" : Boolean
*                                               },
*                                               "showRemarks" : Boolean,
*                                               "isCompleted" : Boolean,
*                                               "remarks" : "",
*                                               "value" : "",
*                                               "canBeNotApplicable" : "Boolean",
*                                               "usedForScoring" : "",
*                                               "modeOfCollection" : "",
*                                               "questionType" : "",
*                                               "accessibility" : "",
*                                               "updatedAt" : "Date",
*                                               "createdAt" : "Date",
*                                               "__v" : 0,
*                                               "payload" : {
*                                                   "criteriaId" : ""
*                                               }
*                                           }, 
*                                           {
*                                               "_id" : "",
*                                               "question" : [ 
*                                                   "String", 
*                                                   "String"
*                                               ],
*                                               "options" : [ 
*                                                   {
*                                                       "value" : "",
*                                                       "label" : ""
*                                                   }
*                                               ],
*                                               "children" : [],
*                                               "questionGroup" : [ 
*                                                   "String"
*                                               ],
*                                               "fileName" : [],
*                                               "instanceQuestions" : [],
*                                               "deleted" : Boolean,
*                                               "tip" : "",
*                                               "externalId" : "",
*                                               "visibleIf" : "",
*                                               "file" : "",
*                                               "responseType" : "",
*                                               "validation" : {
*                                                   "required" : Boolean
*                                               },
*                                               "showRemarks" : Boolean,
*                                               "isCompleted" : Boolean,
*                                               "remarks" : "",
*                                               "value" : "",
*                                               "canBeNotApplicable" : "Boolean",
*                                               "usedForScoring" : "",
*                                               "modeOfCollection" : "",
*                                               "questionType" : "",
*                                               "accessibility" : "",
*                                               "updatedAt" : "Date",
*                                               "createdAt" : "Date",
*                                               "__v" : 0,
*                                               "payload" : {
*                                                   "criteriaId" : ""
*                                               }
*                                           }
*                                       ], 
*                                   ]
*                               ],
*                               "responseType" : ""
*                           },
*                           "criteriaId" : ""
*                       }
*                   },
*                   "startTime" : Date,
*                   "endTime" : Date,
*                   "gpsLocation" : "String,String",
*                   "submittedBy" : """,
*                   "isValid" : Boolean
*               }
* }
* @apiUse successBody
* @apiUse errorBody
*/

    async make(req) {
        return new Promise(async (resolve, reject) => {

            try {

                let response = await submissionsHelper.createEvidencesInSubmission(req, "observationSubmissions", false);

                return resolve(response);

            } catch (error) {

                return reject({
                    status: 500,
                    message: "Oops! Something went wrong!",
                    errorObject: error
                });

            }

        })
    }

}
