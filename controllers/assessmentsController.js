const Boom = require('boom')
module.exports = class Assessments {

    async list(req) {

        return new Promise(async (resolve, reject) => {

            try {
                if (!req.query.type || !req.query.subType)
                    return reject(Boom.badRequest('Bad Request.'))

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
                            'externalId': 1
                        }
                    }
                ]);

                return resolve({
                    result: programDocument
                })

            }
            catch (error) {
                return reject(Boom.badImplementation(error));
            }

        })

    }

    async details(req) {

        return new Promise(async (resolve, reject) => {

            let programExternalId = req.params._id;
            let assessmentId = req.query.assessmentId;
            let detailedAssessment = {};

            let programDocument = await database.models.programs.findOne(
                { externalId: programExternalId },
            );

            detailedAssessment.program = _.pick(programDocument, ['_id', 'externalId', 'name', 'description', 'owner', 'createdBy', 'updatedBy', 'status', 'resourceType', 'language', 'keywords', 'concepts', 'createdFor', 'imageCompression'])
            detailedAssessment.entityProfile = await database.models.entityAssessors.findOne({}, {
                "assessmentStatus": 0,
                "deleted": 0,
                "createdAt": 0,
                "updatedAt": 0,
            });

            let frameWorkDocument = await database.models['evaluation-frameworks'].findOne({ _id: assessmentId });

            if (!frameWorkDocument)
                return reject(Boom.badRequest('No assessments found.'))

            let assessment = {};

            assessment.name = frameWorkDocument.name;
            assessment.description = frameWorkDocument.description;
            assessment.externalId = frameWorkDocument.externalId;

            let criteriasIdArray = new Array
            frameWorkDocument.themes.forEach(eachTheme => {

                let themeCriterias = new Array

                if (eachTheme.children) {
                    themeCriterias = controllers.schoolsController.getCriteriaIds(eachTheme.children)
                } else {
                    themeCriterias = eachTheme.criteria
                }

                themeCriterias.forEach(themeCriteriaId => {
                    criteriasIdArray.push(themeCriteriaId)
                })
            })

            let submissionDocument = {};

            let criteriaQuestionDocument = await database.models["criteria-questions"].find({ _id: { $in: criteriasIdArray } })

            let evidenceMethodArray = {};
            let submissionDocumentEvidences = {};
            let submissionDocumentCriterias = [];

            criteriaQuestionDocument.forEach(criteria => {
                submissionDocumentCriterias.push(
                    _.omit(criteria._doc, [
                        "resourceType",
                        "language",
                        "keywords",
                        "concepts",
                        "createdFor",
                        "evidences"
                    ])
                );

                criteria.evidences.forEach(evidenceMethod => {
                    evidenceMethod.notApplicable = false;
                    evidenceMethod.canBeNotAllowed = true;
                    evidenceMethod.remarks = "";
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
                                    sectionExisitsInEvidenceMethod = 1;//why
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

            let submissionDoc = await controllers.submissionsController.findSubmissionBySchoolProgram(//why
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

    async parseQuestionsByIndividual(evidences, submissionDocEvidences) {
        let sectionQuestionArray = {};
        let generalQuestions = [];
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