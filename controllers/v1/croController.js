module.exports = class Cro {

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
        this.roles = {
            ASSESSOR: "assessors",
            LEAD_ASSESSOR: "leadAssessors",
            PROJECT_MANAGER: "projectManagers",
            PROGRAM_MANAGER: "programManagers"
        };
    }

    async getRoll(roles) {
        let role = _.intersection(roles, Object.keys(this.roles))[0];
        return this.roles[role];
    }

    /**
    * @api {get} /assessment/api/v1/cro/list?type={assessment}&subType={cro}&status={active} CRO assessment list
    * @apiVersion 0.0.1
    * @apiName CRO assessment list
    * @apiGroup croAssessments
    * @apiParam {String} type Type.
    * @apiParam {String} subType SubType.
    * @apiParam {String} status Status.
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/cro/list
    * @apiUse successBody
    * @apiUse errorBody
    */

    async list(req) {

        return new Promise(async (resolve, reject) => {
            
            try {

                if (!req.query.type || !req.query.subType) {
                    let responseMessage = "Bad request.";
                    return resolve({ status: 400, message: responseMessage })
                }

                let programs = new Array
                let responseMessage = "Not authorized to fetch schools for this user"
        
                if (_.includes(req.userDetails.allRoles, "ASSESSOR") || _.includes(req.userDetails.allRoles, "LEAD_ASSESSOR")) {
        
                    let assessorSchoolsQueryObject = [
                    {
                        $match: {
                        userId: req.userDetails.userId
                        }
                    },
                    {
                        $lookup: {
                        from: "schools",
                        localField: "schools",
                        foreignField: "_id",
                        as: "schoolDocuments"
                        }
                    },
                    {
                        $project: {
                            "schools": 1,
                            "programId": 1,
                            "schoolDocuments._id": 1,
                            "schoolDocuments.externalId": 1,
                            "schoolDocuments.name": 1,
                            "schoolDocuments.addressLine1": 1,
                            "schoolDocuments.addressLine2": 1,
                            "schoolDocuments.city": 1,
                            "schoolDocuments.state": 1
                        }
                    }
                    ];
        
                    const assessorsDocument = await database.models.schoolAssessors.aggregate(assessorSchoolsQueryObject)
        
                    let assessor
                    
                    for (let pointerToAssessorDocumentArray = 0; pointerToAssessorDocumentArray < assessorsDocument.length; pointerToAssessorDocumentArray++) {
        
                    assessor = assessorsDocument[pointerToAssessorDocumentArray];


                        let programQueryObject = {};
                        programQueryObject["_id"] = assessor.programId;
                        programQueryObject["components.type"] = req.query.type;
                        programQueryObject["components.subType"] = req.query.subType;

                        let programDocument = await database.models.programs.aggregate([
                            {
                                $match: programQueryObject
                            },
                            {
                                $project: {
                                    'components.roles': 0,
                                    'components.schools': 0,
                                    'components.schoolProfileFieldsPerSchoolTypes': 0,
                                }
                            },
                            {
                                $project: {
                                    'assessments': '$components',
                                    'externalId': 1,
                                    'name': 1,
                                    'description': 1
                                }
                            }
                        ]);

                        if (programDocument && programDocument[0] && programDocument[0].assessments) {
                            programDocument[0].assessments[0].schools = new Array
                            assessor.schoolDocuments.forEach(assessorSchool => {
                                programDocument[0].assessments[0].schools.push(assessorSchool)
                            })
                            let evaluationFrameworkDocument = await database.models["evaluationFrameworks"].findOne(
                                { _id: programDocument[0].assessments[0].id },
                                { name: 1, description: 1}
                            ).lean();
                            programDocument[0].assessments[0].name = evaluationFrameworkDocument.name
                            programDocument[0].assessments[0].description = evaluationFrameworkDocument.description
                            programs.push(programDocument[0])
                        }
        
                    }
        
                    responseMessage = "School list fetched successfully"
                }
        
                return resolve({
                    message: responseMessage,
                    result: programs
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
    * @api {get} /assessment/api/v1/cro/assessments/{programID}?assessmentId={assessmentID}&schoolId={schoolId} Detailed assessments
    * @apiVersion 0.0.1
    * @apiName CRO assessment details
    * @apiGroup croAssessments
    * @apiParam {String} assessmentId Assessment ID.
    * @apiParam {String} schoolId School ID.
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/cro/details/:programID
    * @apiUse successBody
    * @apiUse errorBody
    */

    async assessments(req) {
        return new Promise(async (resolve, reject) => {
        try {
            req.body = req.body || {};

            let response = {
                message: "Assessment fetched successfully",
                result: {}
            };

            const isRequestForOncallOrOnField =
            req.query.oncall && req.query.oncall == 1 ? "oncall" : "onfield";

            let schoolQueryObject = { _id: ObjectId(req.query.schoolId) };
            let schoolDocument = await database.models.schools.findOne(
                schoolQueryObject
            );

            if (!schoolDocument) {
                let responseMessage = 'No schools found.';
                return resolve({ status: 400, message: responseMessage })
            }

            schoolDocument = await schoolDocument.toObject();
            let programQueryObject = {
                _id:req.params._id,
                status: "active",
                "components.schools": { $in: [ObjectId(req.query.schoolId)] },
                "components.id": { $in: [ObjectId(req.query.assessmentId)] },
                $or: [
                    {
                    "components.roles.assessors.users": { $in: [req.userDetails.id] }
                    },
                    {
                    "components.roles.leadAssessors.users": {
                        $in: [req.userDetails.id]
                    }
                    },
                    {
                    "components.roles.projectManagers.users": {
                        $in: [req.userDetails.id]
                    }
                    },
                    {
                    "components.roles.programManagers.users": {
                        $in: [req.userDetails.id]
                    }
                    }
                ]
            };

            let programDocument = await database.models.programs.findOne(
                programQueryObject
            );


            if (!programDocument) {
                let responseMessage = 'No program found.';
                return resolve({ status: 400, message: responseMessage })
            }
            
            let accessability =
            programDocument.components[0].roles[
                await this.getRoll(req.userDetails.allRoles)
            ].acl;

            let form = [];
            let schoolTypes = schoolDocument.schoolTypes;
            let schoolProfileFieldsPerSchoolTypes = programDocument.components[0]['schoolProfileFieldsPerSchoolTypes'];
            let filteredFieldsToBeShown = [];
            schoolTypes.forEach(schoolType => {
            if (schoolProfileFieldsPerSchoolTypes[schoolType]) {
                filteredFieldsToBeShown.push(...schoolProfileFieldsPerSchoolTypes[schoolType])
            }
            })
            await _.forEach(Object.keys(database.models.schools.schema.paths), key => {
            if (
                ["deleted", "_id", "__v", "createdAt", "updatedAt"].indexOf(key) ==
                -1
            ) {
                filteredFieldsToBeShown.includes(key) && form.push({
                field: key,
                label: gen.utils.camelCaseToTitleCase(key),
                value: Array.isArray(schoolDocument[key])
                    ? schoolDocument[key].join(", ")
                    : schoolDocument[key] || '',
                visible:
                    accessability.schoolProfile.visible.indexOf("all") > -1 ||
                    accessability.schoolProfile.visible.indexOf(key) > -1,
                editable:
                    accessability.schoolProfile.editable.indexOf("all") > -1 ||
                    accessability.schoolProfile.editable.indexOf(key) > -1,
                input: "text"
                });
            }
            });
            response.result.schoolProfile = {
            _id: schoolDocument._id,
            // isEditable: accessability.schoolProfile.editable.length > 0,
            form: form
            };

            response.result.program = await _.pick(programDocument, [
            "_id",
            "externalId",
            "name",
            "description",
            "imageCompression"
            ]);

            let submissionDocument = {
            schoolId: schoolDocument._id,
            schoolInformation: schoolDocument,
            programId: programDocument._id,
            programExternalId: programDocument.externalId,
            schoolExternalId: schoolDocument.externalId,
            programInformation: {
                name: programDocument.name,
                externalId: programDocument.externalId,
                description: programDocument.description,
                owner: programDocument.owner,
                createdBy: programDocument.createdBy,
                updatedBy: programDocument.updatedBy,
                resourceType: programDocument.resourceType,
                language: programDocument.language,
                keywords: programDocument.keywords,
                concepts: programDocument.concepts,
                createdFor: programDocument.createdFor,
                imageCompression: programDocument.imageCompression
            },
            evidenceSubmissions: [],
            schoolProfile: {},
            status: "started"
            };
            let assessments = [];
            for (
            let counter = 0;
            counter < programDocument.components.length;
            counter++
            ) {
            let component = programDocument.components[counter];
            let assessment = {};

            if(component.id.toString() != req.query.assessmentId) { break; }

            let evaluationFrameworkDocument = await database.models["evaluationFrameworks"].findOne(
                { _id: ObjectId(component.id) },
                { themes: 1, name: 1, description: 1, externalId: 1, questionSequenceByEcm: 1 }
            ).lean();

            assessment.name = evaluationFrameworkDocument.name;
            assessment.description = evaluationFrameworkDocument.description;
            assessment.externalId = evaluationFrameworkDocument.externalId;


            submissionDocument.evaluationFrameworkId =  evaluationFrameworkDocument._id
            submissionDocument.evaluationFrameworkExternalId =  evaluationFrameworkDocument.externalId

            let criteriasId = new Array
            let criteriaObject = {}
            let criteriasIdArray = gen.utils.getCriteriaIdsAndWeightage(evaluationFrameworkDocument.themes);

            criteriasIdArray.forEach(eachCriteriaId=>{
                criteriasId.push(eachCriteriaId.criteriaId)
                criteriaObject[eachCriteriaId.criteriaId.toString()]={
                weightage:eachCriteriaId.weightage
                }
            })
            let criteriaQuestionDocument = await database.models.criteriaQuestions.find(
                { _id: { $in: criteriasId } },
                {
                resourceType:0,
                language:0,
                keywords:0,
                concepts:0,
                createdFor:0
                }
            ).lean();

            let evidenceMethodArray = {};
            let submissionDocumentEvidences = {};
            let submissionDocumentCriterias = [];

            criteriaQuestionDocument.forEach(criteria => {

                criteria.weightage = criteriaObject[criteria._id.toString()].weightage
                submissionDocumentCriterias.push(
                _.omit(criteria, [
                    "evidences"
                ])
                );

                criteria.evidences.forEach(evidenceMethod => {
                evidenceMethod.notApplicable = false;
                evidenceMethod.canBeNotAllowed = true;
                evidenceMethod.remarks = "";
                evidenceMethod.submissions = new Array
                submissionDocumentEvidences[evidenceMethod.externalId] = _.omit(
                    evidenceMethod,
                    ["sections"]
                );
                if (
                    evidenceMethod.modeOfCollection === isRequestForOncallOrOnField
                ) {
                    if (!evidenceMethodArray[evidenceMethod.externalId]) {
                    evidenceMethodArray[
                        evidenceMethod.externalId
                    ] = evidenceMethod;
                    } else {
                    // Evidence method already exists
                    // Loop through all sections reading evidence method
                    evidenceMethod.sections.forEach(evidenceMethodSection => {
                        let sectionExisitsInEvidenceMethod = 0;
                        let existingSectionQuestionsArrayInEvidenceMethod = [];
                        evidenceMethodArray[
                        evidenceMethod.externalId
                        ].sections.forEach(exisitingSectionInEvidenceMethod => {
                        if (
                            exisitingSectionInEvidenceMethod.name ==
                            evidenceMethodSection.name
                        ) {
                            sectionExisitsInEvidenceMethod = 1;
                            existingSectionQuestionsArrayInEvidenceMethod =
                            exisitingSectionInEvidenceMethod.questions;
                        }
                        });
                        if (!sectionExisitsInEvidenceMethod) {
                        evidenceMethodArray[
                            evidenceMethod.externalId
                        ].sections.push(evidenceMethodSection);
                        } else {
                        evidenceMethodSection.questions.forEach(
                            questionInEvidenceMethodSection => {
                            existingSectionQuestionsArrayInEvidenceMethod.push(
                                questionInEvidenceMethodSection
                            );
                            }
                        );
                        }
                    });
                    }
                }
                });
            });

            submissionDocument.evidences = submissionDocumentEvidences;
            submissionDocument.evidencesStatus = Object.values(submissionDocumentEvidences);
            submissionDocument.criterias = submissionDocumentCriterias;
            let submissionsController = new submissionsBaseController();
            let submissionDoc = await submissionsController.findSubmissionBySchoolProgram(
                submissionDocument,
                req
            );
            assessment.submissionId = submissionDoc.result._id;

            if (
                submissionDoc.result.parentInterviewResponses &&
                submissionDoc.result.parentInterviewResponses.length > 0
            ) {
                assessment.parentInterviewResponses =
                submissionDoc.result.parentInterviewResponses;
            }

            const parsedAssessment = await this.parseQuestions(
                Object.values(evidenceMethodArray),
                schoolDocument.schoolTypes,
                submissionDoc.result.evidences,
                (evaluationFrameworkDocument.length && evaluationFrameworkDocument.questionSequenceByEcm) ? evaluationFrameworkDocument.questionSequenceByEcm : false
            );

            assessment.evidences = parsedAssessment.evidences;
            assessment.submissions = parsedAssessment.submissions;
            if (
                parsedAssessment.generalQuestions &&
                parsedAssessment.generalQuestions.length > 0
            ) {
                assessment.generalQuestions = parsedAssessment.generalQuestions;
            }
            assessments.push(assessment);
            }

            response.result.assessments = assessments;

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

    async parseQuestions(evidences, schoolTypes, submissionDocEvidences, questionSequenceByEcm = false) {
        let schoolFilterQuestionArray = {};
        let sectionQuestionArray = {};
        let generalQuestions = [];
        let questionArray = {};
        let submissionsObjects = {};
        evidences.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));

        evidences.forEach(evidence => {
        if (submissionDocEvidences[evidence.externalId]) {
            evidence.startTime =
            submissionDocEvidences[evidence.externalId].startTime;
            evidence.endTime = submissionDocEvidences[evidence.externalId].endTime;
            evidence.isSubmitted =
            submissionDocEvidences[evidence.externalId].isSubmitted;
            if (submissionDocEvidences[evidence.externalId].submissions) {
            submissionDocEvidences[evidence.externalId].submissions.forEach(
                submission => {
                if (submission.isValid) {
                    submissionsObjects[evidence.externalId] = submission;
                }
                }
            );
            }
        }

        evidence.sections.forEach(section => {
            section.questions.forEach((question, index, section) => {
            question.evidenceMethod = evidence.externalId
            if (_.difference(question.questionGroup, schoolTypes).length < question.questionGroup.length) {
                sectionQuestionArray[question._id] = section
                questionArray[question._id] = question
            } else {
                schoolFilterQuestionArray[question._id] = section;
            }
            });
        });
        });

        Object.entries(schoolFilterQuestionArray).forEach(
        schoolFilteredQuestion => {
            schoolFilteredQuestion[1].forEach(
            (questionElm, questionIndexInSection) => {
                if (questionElm._id.toString() === schoolFilteredQuestion[0]) {
                schoolFilteredQuestion[1].splice(questionIndexInSection, 1);
                }
            }
            );
        }
        );

        Object.entries(questionArray).forEach(questionArrayElm => {
        questionArrayElm[1]["payload"] = {
            criteriaId: questionArrayElm[1]["criteriaId"],
            responseType: questionArrayElm[1]["responseType"],
            evidenceMethod: questionArrayElm[1].evidenceMethod,
            rubricLevel: (questionArrayElm[1]["rubricLevel"]) ? questionArrayElm[1]["rubricLevel"] : ""
        }
        questionArrayElm[1]["startTime"] = ""
        questionArrayElm[1]["endTime"] = ""
        delete questionArrayElm[1]["criteriaId"]

        if (questionArrayElm[1].responseType === "matrix") {
            let instanceQuestionArray = new Array()
            questionArrayElm[1].instanceQuestions.forEach(instanceQuestionId => {
            if (sectionQuestionArray[instanceQuestionId.toString()]) {
                let instanceQuestion = questionArray[instanceQuestionId.toString()];
                instanceQuestionArray.push(instanceQuestion);
                let sectionReferenceOfInstanceQuestion =
                sectionQuestionArray[instanceQuestionId.toString()];
                sectionReferenceOfInstanceQuestion.forEach(
                (questionInSection, index) => {
                    if (
                    questionInSection._id.toString() ===
                    instanceQuestionId.toString()
                    ) {
                    sectionReferenceOfInstanceQuestion.splice(index, 1);
                    }
                }
                );
            }
            });
            questionArrayElm[1]["instanceQuestions"] = instanceQuestionArray;
        }

        if (questionArrayElm[1]["isAGeneralQuestion"] === true) {
            questionArrayElm[1]["payload"].isAGeneralQuestion = true;
            generalQuestions.push(questionArrayElm[1]);
        }
        });

        // Sort questions by sequence
        if (questionSequenceByEcm) {
        evidences.forEach(evidence => {
            if (questionSequenceByEcm[evidence.externalId]) {
            evidence.sections.forEach(section => {

                if (questionSequenceByEcm[evidence.externalId][section.name] && questionSequenceByEcm[evidence.externalId][section.name].length > 0) {
                let questionSequenceByEcmSection = questionSequenceByEcm[evidence.externalId][section.name]
                let sectionQuestionByEcm = _.keyBy(section.questions, 'externalId');
                let sortedQuestionArray = new Array

                questionSequenceByEcmSection.forEach(questionId => {
                    if (sectionQuestionByEcm[questionId]) {
                    sortedQuestionArray.push(sectionQuestionByEcm[questionId])
                    delete sectionQuestionByEcm[questionId]
                    }
                })

                sortedQuestionArray = _.concat(sortedQuestionArray, Object.values(sectionQuestionByEcm));

                section.questions = sortedQuestionArray
                }
            })
            }
        })
        }

        return {
        evidences: evidences,
        submissions: submissionsObjects,
        generalQuestions: generalQuestions
        };
    }

}
