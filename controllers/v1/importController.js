module.exports = class Import {

    constructor() {
    }

    static get name() {
        return "import";
    }

    program(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let programData = JSON.parse(req.files.program.data.toString());
                //need to implement JOI to validate json
                let queryObject = {
                    _id: ObjectId(programData._id)
                };

                let programDocument = await database.models.programs.findOne(queryObject,{_id:1})

                if(programDocument){
                    return resolve({
                        status: 400,
                        message: "Program already exist"
                    });
                }
    
                programDocument = await database.models.programs.create(programData)
                return resolve({
                    status: 200,
                    message: "Inserted successfully."
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
                let evaluationFrameworkData = JSON.parse(req.files.evaluationFramework.data.toString());
                //need to implement JOI to validate json
                let queryObject = {
                    _id: ObjectId(evaluationFrameworkData._id)
                };

                let evaluationFrameworkDocument = await database.models.evaluationFrameworks.findOne(queryObject,{_id:1})

                if(evaluationFrameworkDocument){
                    return resolve({
                        status: 400,
                        message: "Framework already exist"
                    });
                }
    
                evaluationFrameworkDocument = await database.models.evaluationFrameworks.create(evaluationFrameworkData)
                return resolve({
                    status: 200,
                    message: "Questions inserted successfully."
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

    criterias(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let criteriaData = JSON.parse(req.files.criteria.data.toString());
                //need to implement JOI to validate json
                await database.models.criterias.create(criteriaData);

                let responseMessage = `Criteria inserted successfully.`;
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

    questions(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let questionData = JSON.parse(req.files.question.data.toString());
                //need to implement JOI to validate json
                await database.models.questions.create(questionData);
                
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
