const csv = require("csvtojson");

module.exports = class Assessments {

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

    /**
    * @api {get} /assessment/api/v1/assessments/list?type={assessment}&subType={individual}&status={active} Individual assessment list
    * @apiVersion 0.0.1
    * @apiName Individual assessment list
    * @apiGroup IndividualAssessments
    * @apiParam {String} type Type.
    * @apiParam {String} subType SubType.
    * @apiParam {String} status Status.
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/assessments/list
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

                let queryObject = {};
                queryObject["components.type"] = req.query.type;
                queryObject["components.subType"] = req.query.subType;
                queryObject["components.entities"] = req.userDetails.userId;
                if (req.query.fromDate) queryObject["components.fromDate"] = { $gte: new Date(req.query.fromDate) };
                if (req.query.toDate) queryObject["components.toDate"] = { $lte: new Date(req.query.toDate) };
                if (req.query.status) queryObject["components.status"] = req.query.status;


                let programDocument = await database.models.programs.aggregate([
                    {
                        $match: queryObject
                    },
                    {
                        $project: {
                            'components.roles': 0,
                            'components.entities': 0,
                            'components.entityProfileFieldsPerSchoolTypes': 0,
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

                return resolve({
                    result: programDocument
                })

            }
            catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }

        })

    }

    /**
    * @api {get} /assessment/api/v1/assessments/details/{programID}?assessmentId={assessmentID} Detailed assessments
    * @apiVersion 0.0.1
    * @apiName Individual assessment details
    * @apiGroup IndividualAssessments
    * @apiParam {String} assessmentId Assessment ID.
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/assessments/details/:programID
    * @apiUse successBody
    * @apiUse errorBody
    */

    async details(req) {

        return new Promise(async (resolve, reject) => {

            let programExternalId = req.params._id;
            let assessmentId = req.query.assessmentId;
            let detailedAssessment = {};

            detailedAssessment.program = await database.models.programs.findOne(
                { externalId: programExternalId },
                { 'components': 0, 'isDeleted': 0, 'updatedAt': 0, 'createdAt': 0 }
            ).lean();

            detailedAssessment.entityProfile = await database.models.entities.findOne({ userId: req.userDetails.id }, {
                "deleted": 0,
                "createdAt": 0,
                "updatedAt": 0,
            });

            let frameWorkDocument = await database.models.evaluationFrameworks.findOne({ _id: assessmentId }).lean();

            if (!frameWorkDocument) {
                let responseMessage = 'No assessments found.';
                return resolve({ status: 400, message: responseMessage })
            }

            let assessment = {};

            assessment.name = frameWorkDocument.name;
            assessment.description = frameWorkDocument.description;
            assessment.externalId = frameWorkDocument.externalId;

            let criteriasIdArray = gen.utils.getCriteriaIds(frameWorkDocument.themes);

            let submissionDocument = {
                entityId: detailedAssessment.entityProfile._id,
                entityInformation: detailedAssessment.entityProfile,
                programId: detailedAssessment.program._id,
                programExternalId: detailedAssessment.program.externalId,
                entityExternalId: detailedAssessment.entityProfile.externalId,
                programInformation: {
                    name: detailedAssessment.program.name,
                    externalId: detailedAssessment.program.externalId,
                    description: detailedAssessment.program.description,
                    owner: detailedAssessment.program.owner,
                    createdBy: detailedAssessment.program.createdBy,
                    updatedBy: detailedAssessment.program.updatedBy,
                    resourceType: detailedAssessment.program.resourceType,
                    language: detailedAssessment.program.language,
                    keywords: detailedAssessment.program.keywords,
                    concepts: detailedAssessment.program.concepts,
                    createdFor: detailedAssessment.program.createdFor,
                    imageCompression: detailedAssessment.program.imageCompression
                },
                evidenceSubmissions: [],
                status: "started"
            };
            submissionDocument.evaluationFrameworkId = frameWorkDocument._id;
            submissionDocument.evaluationFrameworkExternalId = frameWorkDocument.externalId;

            let criteriaQuestionDocument = await database.models.criteriaQuestions.find(
                { _id: { $in: criteriasIdArray } },
                {
                    resourceType: 0,
                    language: 0,
                    keywords: 0,
                    concepts: 0,
                    createdFor: 0
                }
            ).lean()

            let evidenceMethodArray = {};
            let submissionDocumentEvidences = {};
            let submissionDocumentCriterias = [];

            criteriaQuestionDocument.forEach(criteria => {
                submissionDocumentCriterias.push(
                    _.omit(criteria, [
                        "evidences"
                    ])
                );

                criteria.evidences.forEach(evidenceMethod => {
                    evidenceMethod.notApplicable = false;
                    evidenceMethod.canBeNotAllowed = true;
                    evidenceMethod.remarks = "";
                    evidenceMethod.submissions = new Array;
                    submissionDocumentEvidences[evidenceMethod.externalId] = _.omit(
                        evidenceMethod,
                        ["sections"]
                    );

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

                });
            });

            submissionDocument.evidences = submissionDocumentEvidences;
            submissionDocument.evidencesStatus = Object.values(submissionDocumentEvidences);
            submissionDocument.criterias = submissionDocumentCriterias;
            let submissionDoc = await this.findSubmissionByEntityProgram(
                submissionDocument,
                req
            );
            assessment.submissionId = submissionDoc.result._id;

            const parsedAssessment = await this.parseQuestionsByIndividual(
                Object.values(evidenceMethodArray),
                submissionDoc.result.evidences
            );

            assessment.evidences = parsedAssessment.evidences;
            assessment.submissions = parsedAssessment.submissions;
            detailedAssessment['assessments'] = assessment

            return resolve({
                result: detailedAssessment
            })

        })

    }

    async upload(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let assessorUploadData = await csv().fromString(
                    req.files.assessments.data.toString()
                );

                let programQueryList = {};
                let evaluationFrameworkQueryList = {};

                assessorUploadData.forEach(assessor => {
                    programQueryList[assessor.externalId] = assessor.programId;
                    evaluationFrameworkQueryList[assessor.externalId] = assessor.frameworkId;
                });

                let evaluationFrameworksFromDatabase = await database.models[
                    "evaluationFrameworks"
                ].find(
                    {
                        externalId: { $in: Object.values(evaluationFrameworkQueryList) }
                    },
                    {
                        externalId: 1
                    }
                );

                let programsFromDatabase = await database.models.programs.find({
                    externalId: { $in: Object.values(programQueryList) }
                });

                const programsData = programsFromDatabase.reduce(
                    (ac, program) => ({ ...ac, [program.externalId]: program }),
                    {}
                );

                const evaluationFrameworksData = evaluationFrameworksFromDatabase.reduce(
                    (ac, evaluationFramework) => ({
                        ...ac,
                        [evaluationFramework.externalId]: evaluationFramework._id
                    }),
                    {}
                );

                const schoolUploadedData = await Promise.all(
                    assessorUploadData.map(async assessor => {
                        let entityAssessorsDocument = {}
                        entityAssessorsDocument.programId = programsData[assessor.programId];
                        entityAssessorsDocument.assessmentStatus = "pending";
                        entityAssessorsDocument.parentId = "";
                        entityAssessorsDocument["entities"] = [assessor.userId];
                        entityAssessorsDocument.frameworkId = assessor.frameworkId;
                        entityAssessorsDocument.role = assessor.role;
                        entityAssessorsDocument.userId = assessor.userId;
                        entityAssessorsDocument.externalId = assessor.externalId;
                        entityAssessorsDocument.name = assessor.name;
                        entityAssessorsDocument.email = assessor.email;
                        entityAssessorsDocument.createdBy = assessor.createdBy;
                        entityAssessorsDocument.createdBy = assessor.createdBy;
                        entityAssessorsDocument.updatedBy = assessor.updatedBy;
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

                        let componentsIndex = programsData[assessor.programId].components.findIndex(component => {
                            return component.id.toString() == evaluationFrameworksData[assessor.frameworkId].toString()
                        });

                        let entities = programsData[assessor.programId].components[componentsIndex]['entities'];

                        if (!entities.includes(assessor.userId)) {
                            entities.push(assessor.userId)
                        }

                        programsData[assessor.programId].components[componentsIndex]['entities'] = entities;

                        await database.models.programs.findOneAndUpdate(
                            { externalId: assessor.programId },
                            programsData[assessor.programId],
                            {
                                upsert: true,
                                new: true,
                                setDefaultsOnInsert: true,
                                returnNewDocument: true
                            }
                        )

                        await database.models.entities.findOneAndUpdate(
                            {
                                "userId": assessor.userId
                            },
                            {
                                "name": assessor.name,
                                "userId": assessor.userId,
                                "externalId": assessor.externalId
                            },
                            {
                                upsert: true,
                                new: true,
                                setDefaultsOnInsert: true,
                                returnNewDocument: true
                            }
                        )
                        return

                    })
                );

                let responseMessage = "Assessor record created successfully.";

                let response = { message: responseMessage };

                return resolve(response);
            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }
        });
    }

    async findSubmissionByEntityProgram(document, requestObject) {

        let queryObject = {
            entityId: document.entityId,
            programId: document.programId
        };

        let submissionDocument = await database.models.submissions.findOne(
            queryObject
        ).lean();

        if (!submissionDocument) {
            let entityAssessorsQueryObject = [
                {
                    $match: { userId: requestObject.userDetails.userId, programId: document.programId }
                }
            ];

            document.assessors = await database.models[
                "entityAssessors"
            ].aggregate(entityAssessorsQueryObject);

            let assessorElement = document.assessors.find(assessor => assessor.userId === requestObject.userDetails.userId)
            if (assessorElement && assessorElement.externalId != "") {
                assessorElement.assessmentStatus = "started"
                assessorElement.userAgent = requestObject.headers['user-agent']
            }

            submissionDocument = await database.models.submissions.create(
                document
            );
        } else {
            let assessorElement = submissionDocument.assessors.find(assessor => assessor.userId === requestObject.userDetails.userId)
            if (assessorElement && assessorElement.externalId != "") {
                assessorElement.assessmentStatus = "started"
                assessorElement.userAgent = requestObject.headers['user-agent']
                let updateObject = {}
                updateObject.$set = {
                    assessors: submissionDocument.assessors
                }
                submissionDocument = await database.models.submissions.findOneAndUpdate(
                    queryObject,
                    updateObject
                );
            }
        }

        return {
            message: "Submission found",
            result: submissionDocument
        };
    }

    async parseQuestionsByIndividual(evidences, submissionDocEvidences) {
        let sectionQuestionArray = {};
        let questionArray = {};
        let submissionsObjects = {};
        evidences.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));

        evidences.forEach(evidence => {
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

            evidence.sections.forEach(section => {
                section.questions.forEach((question, index, section) => {
                    question.evidenceMethod = evidence.externalId
                    sectionQuestionArray[question._id] = section
                    questionArray[question._id] = question
                });
            });
        });

        Object.entries(questionArray).forEach(questionArrayElm => {
            questionArrayElm[1]["payload"] = {
                criteriaId: questionArrayElm[1]["criteriaId"],
                responseType: questionArrayElm[1]["responseType"],
                evidenceMethod: questionArrayElm[1].evidenceMethod
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
        });
        return {
            evidences: evidences,
            submissions: submissionsObjects,
        };
    }

}
