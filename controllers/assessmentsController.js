module.exports = class Assessments {

    async list(req) {

        return new Promise(async (resolve, reject) => {


            let queryObject = {
                "components.type": "assessment",
                //subtype
                "components.entities": req.userDetails.userId
                //date and status
            };

            let programDocument = await database.models.programs.aggregate([
                {
                    $match: queryObject
                },
                {
                    $project: {
                        'components.roles': 0,
                        'components.entities': 0,
                        'components.schoolProfileFieldsPerSchoolTypes': 0,
                    }
                },
                {
                    $project: {
                        'evaluationFrameWorks': '$components',
                        'externalId': 1
                    }
                }

            ]);


            return resolve({
                result: programDocument
            })

        })

    }

    getCriteriaIds(arrayOfChildren) {
        let allCriteriaIds = new Array
        arrayOfChildren.forEach(eachChildren => {
            let criteriaIdArray = new Array
            if (eachChildren.children) {
                criteriaIdArray = this.getCriteriaIds(eachChildren.children)
            } else {
                criteriaIdArray = eachChildren.criteria
            }
            criteriaIdArray.forEach(eachCriteriaId => {
                allCriteriaIds.push(eachCriteriaId)
            })
        })
        return allCriteriaIds
    }

    async details(req) {

        return new Promise(async (resolve, reject) => {

            let programExternalId = req.params._id;
            let frameWorkId = req.query.frameWorkId;
            let detailedAssessment = {};

            let programDocument = await database.models.programs.findOne(
                { externalId: programExternalId }, 
                { 
                    'externalId': 1,
                    'name': 1, '_id': 1, 
                    'description': 1, 
                    'imageCompression': 1, 
                    'components': 1 
                });

            detailedAssessment.program = _.pick(programDocument,['_id','externalId','name','description','imageCompression']) 
            detailedAssessment.entityProfile = await database.models.entityAssessors.findOne({}, {
                "userId": 1,
                "name": 1,
                "email": 1,
                "role": 1,
                "programId": 1,
                "parentId": 1,
                "entities": 1,
                "createdBy": 1,
                "updatedBy": 1
            });

            let frameWorkDocument = await database.models['evaluation-frameworks'].find({ _id: frameWorkId });
            detailedAssessment.assessments = [];
            for (
                let counter = 0;
                counter < programDocument.components.length;
                counter++
            ) {
                let assessment = {};

                assessment.name = frameWorkDocument[0].name;
                assessment.description = frameWorkDocument[0].description;
                assessment.externalId = frameWorkDocument[0].externalId;

                let criteriasIdArray = new Array
                frameWorkDocument.forEach(eachEvaluation => {
                    eachEvaluation.themes.forEach(eachTheme => {

                        let themeCriterias = new Array

                        if (eachTheme.children) {
                            themeCriterias = this.getCriteriaIds(eachTheme.children)
                        } else {
                            themeCriterias = eachTheme.criteria
                        }

                        themeCriterias.forEach(themeCriteriaId => {
                            criteriasIdArray.push(themeCriteriaId)
                        })
                    })
                });

                let submissionDocument = {};

                let criteriaQuestionDocument = await database.models["criteria-questions"].find({ _id: { $in: criteriasIdArray}})

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

                        if (!evidenceMethodArray[evidenceMethod.externalId]) {//why
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

                // if (
                //     submissionDoc.result.parentInterviewResponses &&
                //     submissionDoc.result.parentInterviewResponses.length > 0
                // ) {
                //     assessment.parentInterviewResponses =
                //         submissionDoc.result.parentInterviewResponses;
                // }

                const parsedAssessment = await this.parseQuestionsByIndividual(
                    Object.values(evidenceMethodArray),
                    submissionDoc.result.evidences
                );

                assessment.evidences = parsedAssessment.evidences;
                assessment.submissions = parsedAssessment.submissions;
                // if (
                //     parsedAssessment.generalQuestions &&
                //     parsedAssessment.generalQuestions.length > 0
                // ) {
                //     assessment.generalQuestions = parsedAssessment.generalQuestions;
                // }
                detailedAssessment.assessments.push(assessment)
            }


            return resolve({
                result: detailedAssessment
            })

        })

    }

    async parseQuestionsByIndividual(evidences, submissionDocEvidences) {
        // let schoolFilterQuestionArray = {};
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
            //   if (_.difference(question.questionGroup, schoolTypes).length < question.questionGroup.length) {
                sectionQuestionArray[question._id] = section
                questionArray[question._id] = question
            //   } else {
            //     schoolFilterQuestionArray[question._id] = section;
            //   }
            });
          });
        });
    
        // Object.entries(schoolFilterQuestionArray).forEach(
        //   schoolFilteredQuestion => {
        //     schoolFilteredQuestion[1].forEach(
        //       (questionElm, questionIndexInSection) => {
        //         if (questionElm._id.toString() === schoolFilteredQuestion[0]) {
        //           schoolFilteredQuestion[1].splice(questionIndexInSection, 1);
        //         }
        //       }
        //     );
        //   }
        // );
    
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
    
        //   if (questionArrayElm[1]["isAGeneralQuestion"] === true) {//remove ?
        //     questionArrayElm[1]["payload"].isAGeneralQuestion = true;
        //     generalQuestions.push(questionArrayElm[1]);
        //   }
        });
        return {
          evidences: evidences,
          submissions: submissionsObjects,
        //   generalQuestions: generalQuestions
        };
      }

}