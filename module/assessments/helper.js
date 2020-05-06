/**
 * name : assessments/helper.js
 * author : Akash
 * created-date : 22-Nov-2018
 * Description : Assessment related helper functionality.
 */

// Dependencies. 
const questionHelper = require(MODULES_BASE_PATH + "/questions/helper");

/**
    * AssessmentsHelper
    * @class
*/
module.exports = class AssessmentsHelper {

    /**
      * getUserRole.
      * @method
      * @name getUserRole
      * @param {Array} roles - array of entityAssessor roles 
      * @returns {Promise} returns a promise.
     */

    static getUserRole(roles) {
        return new Promise(async (resolve, reject) => {
            try {
                let assessmentRoles = gen.utils.assessmentRoles();
                let role = _.intersection(roles, Object.keys(assessmentRoles))[0];
                return resolve(assessmentRoles[role]);

            } catch (error) {
                return reject(error);
            }
        })

    }

    /**
      * parseQuestions.
      * @method
      * @name parseQuestions
      * @param {Array} evidences - array of evidencesMethod.
      * @param {Array} questionGroup - array of questionGroup for particulat entity.
      * @param {Object} submissionDocEvidences - all the evidences of the submission.
      * @param {Boolean} [questionSequenceByEcm = false] 
      * - if true questions should be sequenced in an order format provided.
      * @param {Object} entityMetaInformation -  entity metaInformation
      * @returns {Promise} returns a promise.
     */

    static parseQuestions(
        evidences, 
        questionGroup, 
        submissionDocEvidences, 
        questionSequenceByEcm = false,
        entityMetaInformation
    ) {
        return new Promise(async (resolve, reject) => {
            try {

                let entityFilterQuestionArray = {};
                let sectionQuestionArray = {};
                let generalQuestions = [];
                let questionArray = {};
                let submissionsObjects = {};
                let pageQuestionsEnabled = {}

                let checkEcmSequenceExists = evidences.every(ecm => {
                    return ecm["sequenceNo"] != undefined;
                })

                if (checkEcmSequenceExists) {
                    evidences = _.sortBy(evidences, "sequenceNo");
                } else {
                    evidences.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));
                }

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
                        let sectionCode = section.code;

                        section.questions.forEach((question, index, section) => {

                            question.evidenceMethod = evidence.externalId;

                            if (_.difference(question.questionGroup, questionGroup).length < question.questionGroup.length) {

                                sectionQuestionArray[question._id] = section;

                                if( question.prefillFromEntityProfile ) {
    
                                    question["value"] = 
                                    entityMetaInformation[question.entityFieldName] ?
                                    entityMetaInformation[question.entityFieldName] : 
                                    ""
                                }

                                questionArray[question._id] = question;

                                if (question.page && question.page != "") {

                                    if (!pageQuestionsEnabled[evidence.externalId]) {
                                        pageQuestionsEnabled[evidence.externalId] = {};
                                    }

                                    pageQuestionsEnabled[evidence.externalId][sectionCode] = true;

                                }
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
                    };
                    questionArrayElm[1]["startTime"] = "";
                    questionArrayElm[1]["endTime"] = "";
                    questionArrayElm[1]["gpsLocation"] = "";
                    if(!Object.keys(questionArrayElm[1].file).length) questionArrayElm[1]["file"] = "";
                    delete questionArrayElm[1]["criteriaId"];

                    // Remove weightage of each question from being sent to client.
                    if(questionArrayElm[1].weightage) {
                        delete questionArrayElm[1]["weightage"];
                    }

                    if (questionArrayElm[1].responseType === "matrix") {
                        let instanceQuestionArray = new Array();
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

                    // Remove score from each option from being sent to client.
                    if (questionArrayElm[1].options && questionArrayElm[1].options.length > 0) {
                        questionArrayElm[1].options.forEach(option => {
                            if (option.score) {
                                delete option.score;
                            }
                        });
                    }

                    if (questionArrayElm[1]["isAGeneralQuestion"] === true) {
                        questionArrayElm[1]["payload"].isAGeneralQuestion = true;
                        generalQuestions.push(questionArrayElm[1]);
                    }

                });

                if (questionSequenceByEcm) {

                    evidences.forEach(evidence => {
                        if (questionSequenceByEcm[evidence.externalId]) {

                            evidence.sections.forEach(section => {

                                if (questionSequenceByEcm[evidence.externalId][section.code] && questionSequenceByEcm[evidence.externalId][section.code].length > 0) {
                                    let questionSequenceByEcmSection = questionSequenceByEcm[evidence.externalId][section.code];
                                    let sectionQuestionByEcm = _.keyBy(section.questions, 'externalId');
                                    let sortedQuestionArray = new Array;

                                    questionSequenceByEcmSection.forEach(questionId => {
                                        if (sectionQuestionByEcm[questionId]) {
                                            sortedQuestionArray.push(sectionQuestionByEcm[questionId]);
                                            delete sectionQuestionByEcm[questionId];
                                        }
                                    })

                                    sortedQuestionArray = _.concat(sortedQuestionArray, Object.values(sectionQuestionByEcm));

                                    section.questions = sortedQuestionArray;
                                }

                            })
                        }
                    })
                }

                return resolve({
                    evidences: evidences,
                    submissions: submissionsObjects,
                    generalQuestions: generalQuestions,
                    pageQuestionsEnabled: pageQuestionsEnabled
                });


            } catch (error) {
                return reject(error);
            }

        })

    }

    /**
      * Latest question parser helper function which includes pageQuestions features
      *  which was not required for old samiksha app. 
      * @method
      * @name parseQuestionsV2
      * @param {Array} evidences - array of evidencesMethod.
      * @param {Array} questionGroup - array of questionGroup for particulat entity.
      * @param {Object} submissionDocEvidences - all the evidences of the submission.
      * @param {Boolean} [questionSequenceByEcm = false] 
      * - if true questions should be sequenced in an order format provided.
      * @param {Object} entityMetaInformation - entity metaInformation 
      * @returns {Promise} returns a promise.
     */

    static parseQuestionsV2(
        evidences, 
        questionGroup, 
        submissionDocEvidences, 
        questionSequenceByEcm = false,
        entityMetaInformation
    ) {
        return new Promise(async (resolve, reject) => {
            try {

                let parseQuestionV1 = await this.parseQuestions(
                    evidences, 
                    questionGroup, 
                    submissionDocEvidences, 
                    questionSequenceByEcm,
                    entityMetaInformation
                );


                let defaultQuestion = {};

                parseQuestionV1.evidences.forEach(eachEvidence => {

                    if (parseQuestionV1.pageQuestionsEnabled[eachEvidence.externalId]) {

                        eachEvidence.sections.forEach(eachSection => {

                            if (parseQuestionV1.pageQuestionsEnabled[eachEvidence.externalId][eachSection.code]) {
                                let pageQuestionsObj = {};

                                for (let pointerToEachSectionQuestion = 0; pointerToEachSectionQuestion < eachSection.questions.length; pointerToEachSectionQuestion++) {

                                    let eachQuestion = eachSection.questions[pointerToEachSectionQuestion];

                                    if (eachQuestion.page && eachQuestion.page !== "") {

                                        let pageName = eachQuestion.page.toLowerCase();

                                        if (!pageQuestionsObj[pageName]) {

                                            if (!(Object.keys(defaultQuestion).length > 0)) {
                                                Object.keys(eachQuestion).forEach(questionModelKey => {
                                                    if (questionModelKey === "updatedAt" || questionModelKey === "createdAt" || questionModelKey === "_id") {
                                                        defaultQuestion[questionModelKey] = "";
                                                    } else if (Array.isArray(defaultQuestion[questionModelKey])) {
                                                        defaultQuestion[questionModelKey] = [];
                                                    } else if (typeof defaultQuestion[questionModelKey] === 'boolean') {
                                                        defaultQuestion[questionModelKey] = false;
                                                    } else if (typeof defaultQuestion[questionModelKey] === 'object') {
                                                        defaultQuestion[questionModelKey] = {};
                                                    } else {
                                                        defaultQuestion[questionModelKey] = "";
                                                    }
                                                })
                                            }
                                            pageQuestionsObj[pageName] = {};
                                            pageQuestionsObj[pageName] = _.merge(pageQuestionsObj[pageName], defaultQuestion);

                                            pageQuestionsObj[pageName]["responseType"] = "pageQuestions";
                                            pageQuestionsObj[pageName]["page"] = pageName;
                                            pageQuestionsObj[pageName]["pageQuestions"] = [];
                                        }

                                        pageQuestionsObj[pageName].pageQuestions.push(eachQuestion);

                                        delete eachSection.questions[pointerToEachSectionQuestion];
                                    }

                                }

                                if (!_.isEmpty(pageQuestionsObj)) {

                                    let filteredQuestion = eachSection.questions.filter(eachQuestion => {
                                        return eachQuestion != null;
                                    })

                                    eachSection.questions = _.concat(filteredQuestion, Object.values(pageQuestionsObj));
                                }

                            }

                        })
                    }

                })

                return resolve({
                    evidences: parseQuestionV1.evidences,
                    submissions: parseQuestionV1.submissions,
                    generalQuestions: parseQuestionV1.generalQuestions
                });


            } catch (error) {
                return reject(error);
            }

        })

    }


     /**
      *  Helper function for list of fields to be selected from solution document.
      * @method
      * @name solutionDocumentProjectionFieldsForDetailsAPI
      * @returns {Promise} Returns a Promise.
     */

    static solutionDocumentProjectionFieldsForDetailsAPI() {
        
        return new Promise(async (resolve, reject) => {
            return resolve({
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
                entityType: 1,
                captureGpsLocationAtQuestionLevel : 1,
                enableQuestionReadOut : 1
            });
        })
    }

     /**
      *  Helper function for list of solution fields to be sent in response.
      * @method
      * @name solutionDocumentFieldListInResponse
      * @returns {Promise} Returns a Promise.
     */

    static solutionDocumentFieldListInResponse() {

        return new Promise(async (resolve, reject) => {
            return resolve([
                "_id",
                "externalId",
                "name",
                "description",
                "registry",
                "captureGpsLocationAtQuestionLevel",
                "enableQuestionReadOut"
            ]);
        })
    }


     /**
      *  Helper function for list of program fields to be sent in response.
      * @method
      * @name programDocumentFieldListInResponse
      * @returns {Promise} Returns a Promise.
     */

    static programDocumentFieldListInResponse() {

        return new Promise(async (resolve, reject) => {
            return resolve([
                "_id",
                "externalId",
                "name",
                "description",
                "imageCompression"
            ]);
        })
    }

}