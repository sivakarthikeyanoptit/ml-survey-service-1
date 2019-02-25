var fs = require('fs');
const moment = require("moment-timezone");
module.exports = class Export {
    constructor() {
    }

    static get name() {
        return "export";
    }

    program(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let programId = req.params._id
                let programDocument = await database.models.programs.findOne({ externalId: programId });
                if (!programDocument) {
                    return resolve({
                        status: 400,
                        message: "No programs found for given params."
                    });
                }
                programDocument.components.forEach(component => {
                    component.schools = [];
                    Object.keys(component.roles).forEach(role => {
                        component.roles[role]['users'] = [];
                    })
                })

                let filePath = this.getFileName(`Program_${programId}`);

                return resolve(this.returnFile(filePath,programDocument));
                
            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }
        })
    }

    evaluationFramework(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let evaluationFrameworkId = req.params._id
                let evaluationFrameworkIdDocument = await database.models.evaluationFrameworks.findOne({ _id: ObjectId(evaluationFrameworkId) });
                if (!evaluationFrameworkIdDocument) {
                    return resolve({
                        status: 400,
                        message: "No evaluationFramework found for given params."
                    });
                }

                let filePath = this.getFileName(`EvaluationFramework_${evaluationFrameworkId}`);
                
                return resolve(this.returnFile(filePath,evaluationFrameworkIdDocument));
                
            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }
        })
    }

    criterias(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let evaluationFrameworkId = req.params._id;
                let evaluationFrameworkDocument = await database.models.evaluationFrameworks.findOne({ _id: ObjectId(evaluationFrameworkId) });
                if (!evaluationFrameworkDocument) {
                    return resolve({
                        status: 400,
                        message: "No evaluationFramework found for given params."
                    });
                }
                let filePath = this.getFileName(`Criteria_${evaluationFrameworkId}`);
                let criteriaIds = gen.utils.getCriteriaIds(evaluationFrameworkDocument.themes);
                let allCriteriaDocument = await database.models.criterias.find({ _id: { $in: criteriaIds } });

                return resolve(this.returnFile(filePath,allCriteriaDocument));
                
            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }
        })
    }

    questions(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let evaluationFrameworkId = req.params._id;
                let evaluationFrameworkDocument = await database.models.evaluationFrameworks.findOne({ _id: ObjectId(evaluationFrameworkId) });
                if (!evaluationFrameworkDocument) {
                    return resolve({
                        status: 400,
                        message: "No evaluationFramework found for given params."
                    });
                }
                
                let filePath = this.getFileName(`Question_${evaluationFrameworkId}`);
                let criteriaIds = gen.utils.getCriteriaIds(evaluationFrameworkDocument.themes);
    
                let allCriteriaQuestionDocuments = await database.models.criteriaQuestions.find({ _id: {$in:criteriaIds} })

                let allQuestions = [];
                allCriteriaQuestionDocuments.forEach(singleCriteria=>{
                    singleCriteria.evidences.forEach(singleEvidence=>{
                        singleEvidence.sections.forEach(section=>{
                            section.questions.forEach(question=>{
                                allQuestions.push(question)
                            })
                        })
                    })
                })

                return resolve(this.returnFile(filePath,allQuestions));

            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }
        })
    }

    getFileName(name) {
        let currentDate = new Date();
        let fileExtensionWithTime = moment(currentDate).tz("Asia/Kolkata").format("YYYY_MM_DD_HH_mm") + ".json";
        return ROOT_PATH + '/public/exportDocuments/' + name + '_' + fileExtensionWithTime;
    }

    returnFile(filePath,document){
        return new Promise(async (resolve, reject) => {
            fs.writeFile(filePath, JSON.stringify(document), 'utf8', function (error) {
                if (error) {
                    return reject({
                        status: 500,
                        message: error,
                        errorObject: error
                    });
                }
                return resolve({
                    isResponseAStream: true,
                    fileNameWithPath: filePath
                });
            });
        })
    }


};
