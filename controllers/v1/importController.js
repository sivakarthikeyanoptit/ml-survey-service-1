module.exports = class Import {

    constructor() {
    }

    static get name() {
        return "import";
    }

    program(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let programDocument = JSON.parse(req.files.program.data.toString());
                //need to implement JOI to validate json
                let queryObject = {
                    _id: ObjectId(programDocument._id)
                };
                let updateObject = programDocument;
    
                await database.models.programs.findOneAndUpdate(
                    queryObject,
                    updateObject,
                    {
                        upsert: true,
                        returnNewDocument: true
                    },
                    function (error, result) {
                        if (error) {
                            return reject({
                                status: 500,
                                message: error,
                                errorObject: error
                            });
                        }
                        var responseMessage;
                        if (result) {
                            responseMessage = `Updated successfully.`;
                        } else {
                            responseMessage = `Inserted successfully.`;
                        }
                        return resolve({ status: 200, message: responseMessage })
                    }
                );
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
                let evaluationFrameworkDocument = JSON.parse(req.files.evaluationFramework.data.toString());
                //need to implement JOI to validate json
                delete evaluationFrameworkDocument.__v
                let queryObject = {
                    _id: ObjectId(evaluationFrameworkDocument._id)
                };
                let updateObject = evaluationFrameworkDocument;
    
                await database.models.evaluationFrameworks.findOneAndUpdate(
                    queryObject,
                    updateObject,
                    {
                        upsert: true,
                        returnNewDocument: true
                    },
                    function (error, result) {
                        if (error) {
                            return reject({
                                status: 500,
                                message: error,
                                errorObject: error
                            });
                        }
                        var responseMessage;
                        if (result) {
                            responseMessage = `Updated successfully.`;
                        } else {
                            responseMessage = `Inserted successfully.`;
                        }
                        return resolve({ status: 200, message: responseMessage })
                    }
                );
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
                let criteriaDocuments = JSON.parse(req.files.criteria.data.toString());
                //need to implement JOI to validate json
                let result = await Promise.all(criteriaDocuments.map(async (criteriaDocument) => {
                    delete criteriaDocument.__v;
                    delete criteriaDocument.createdAt;
                    let queryObject = {
                        _id: ObjectId(criteriaDocument._id)
                    };
                    let updateObject = criteriaDocument;
                    return database.models.criterias.findOneAndUpdate(
                        queryObject,
                        updateObject,
                        {
                            upsert: true,
                            new: true,
                            returnNewDocument: true
                        }
                    );
                }))
                let responseMessage = `Inserted successfully.`;
                return resolve({ status: 200, message: responseMessage })
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
                let questionDocuments = JSON.parse(req.files.question.data.toString());
                //need to implement JOI to validate json
                let result = await Promise.all(questionDocuments.map(async (questionDocument) => {
                    if (questionDocument) {
                        if (questionDocument.__v) delete questionDocument.__v;
                        if (questionDocument.createdAt) delete questionDocument.createdAt;
                        let queryObject = {
                            _id: ObjectId(questionDocument._id)
                        };
                        let updateObject = questionDocument;
                        return database.models.questions.findOneAndUpdate(
                            queryObject,
                            updateObject,
                            {
                                upsert: true,
                                new: true,
                                returnNewDocument: true
                            }
                        );
                    }
                }))
                let responseMessage = `Inserted successfully.`;
                return resolve({ status: 200, message: responseMessage })
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

};
