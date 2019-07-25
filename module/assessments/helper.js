
module.exports = class assessmentsHelper {

    static getUserRole(roles) {
        return new Promise(async (resolve, reject) => {
            try {
                let assessmentRoles = gen.utils.assessmentRoles()
                let role = _.intersection(roles, Object.keys(assessmentRoles))[0];
                return resolve(assessmentRoles[role])

            } catch (error) {
                return reject(error);
            }
        })

    }

    static parseQuestions(evidences, questionGroup, submissionDocEvidences, questionSequenceByEcm = false) {
        return new Promise(async (resolve, reject) => {
            try {

                let entityFilterQuestionArray = {};
                let sectionQuestionArray = {};
                let generalQuestions = [];
                let questionArray = {};
                let submissionsObjects = {};
                evidences.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));
        
                evidences.forEach(evidence => {

                    if (submissionDocEvidences[evidence.externalId]) {
                        evidence.startTime = submissionDocEvidences[evidence.externalId].startTime;
                        evidence.endTime = submissionDocEvidences[evidence.externalId].endTime;
                        evidence.isSubmitted = submissionDocEvidences[evidence.externalId].isSubmitted;

                        if (submissionDocEvidences[evidence.externalId].submissions) {
                            submissionDocEvidences[evidence.externalId].submissions.forEach(submission => {
                                if (submission.isValid) {
                                    submissionsObjects[evidence.externalId] = submission;
                                }
                            });
                        }
                    }
        
                    evidence.sections.forEach(section => {
                        section.questions.forEach((question, index, section) => {
                            question.evidenceMethod = evidence.externalId
                            if (_.difference(question.questionGroup, questionGroup).length < question.questionGroup.length) {
                                sectionQuestionArray[question._id] = section
                                questionArray[question._id] = question
                            } else {
                                entityFilterQuestionArray[question._id] = section;
                            }
                        });
                    });

                });
        
                Object.entries(entityFilterQuestionArray).forEach(entityFilteredQuestion => {
                    entityFilteredQuestion[1].forEach((questionElm, questionIndexInSection) => {
                        if (questionElm._id.toString() === entityFilteredQuestion[0]) {
                            entityFilteredQuestion[1].splice(questionIndexInSection, 1);
                        }
                    });
                });
        
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
                                sectionReferenceOfInstanceQuestion.forEach((questionInSection, index) => {
                                    if (questionInSection._id.toString() === instanceQuestionId.toString()) {
                                        sectionReferenceOfInstanceQuestion.splice(index, 1);
                                    }
                                });
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
                
                                if (questionSequenceByEcm[evidence.externalId][section.code] && questionSequenceByEcm[evidence.externalId][section.code].length > 0) {
                                    let questionSequenceByEcmSection = questionSequenceByEcm[evidence.externalId][section.code]
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
        
                  
                return resolve({
                    evidences: evidences,
                    submissions: submissionsObjects,
                    generalQuestions: generalQuestions
                })


            } catch (error) {
                return reject(error);
            }

        })

    }

};