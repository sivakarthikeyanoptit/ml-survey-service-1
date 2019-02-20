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
    
                let filePath = this.getFileName('Program');
    
                fs.writeFile(filePath, JSON.stringify(programDocument), 'utf8', function (error) {
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
    
                let filePath = this.getFileName('EvaluationFramework');
    
                fs.writeFile(filePath, JSON.stringify(evaluationFrameworkIdDocument), 'utf8', function (error) {
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
            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }
        })
    }

    criteriaByEvaluationFrameworkId(req) {
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
                let schoolsController = new schoolsBaseController;
                let filePath = this.getFileName('Criteria');
                let criteriaIds = schoolsController.getCriteriaIds(evaluationFrameworkDocument.themes);
                let allCriteriaDocument = await Promise.all(criteriaIds.map(async (singleCriteria) => {
                    return database.models.criterias.findOne({ _id: singleCriteria }).exec();
                }))
    
                fs.writeFile(filePath, JSON.stringify(allCriteriaDocument), 'utf8', function (error) {
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
            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }
        })
    }
    
    questionsByEvaluationFrameworkId(req) {
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
                
                let schoolsController = new schoolsBaseController;
                let filePath = this.getFileName('Question');
                let criteriaIds = schoolsController.getCriteriaIds(evaluationFrameworkDocument.themes);
    
                let allCriteriaDocument = await Promise.all(criteriaIds.map(async (singleCriteria) => {
                    return database.models.criterias.findOne({ _id: singleCriteria }).exec();
                }))
    
                let questionIds = [];
                allCriteriaDocument.forEach(singleCriteria=>{
                    singleCriteria.evidences.forEach(singleEvidence=>{
                        singleEvidence.sections.forEach(section=>{
                            questionIds.push(section.questions)
                        })
                    })
                })
                let allQuestionsDocument = await Promise.all(questionIds.map(async (questionId) => {
                    return database.models.questions.findOne({ _id: questionId }).exec();
                }))
    
                fs.writeFile(filePath, JSON.stringify(allQuestionsDocument), 'utf8', function (error) {
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
        return ROOT_PATH + '/public/reports/' + name + '_' + fileExtensionWithTime;
    }


};
