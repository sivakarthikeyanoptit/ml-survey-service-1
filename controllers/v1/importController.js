module.exports = class Import {

    constructor() {
    }

    static get name() {
        return "import";
    }

    /**
    * @api {post} /assessment/api/v1/import/program Upload Program Document JSON
    * @apiVersion 1.0.0
    * @apiName Upload Program Document JSON
    * @apiGroup Import
    * @apiParam {File} program Mandatory program file of type JSON.
    * @apiUse successBody
    * @apiUse errorBody
    */

    program(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let programData = JSON.parse(req.files.program.data.toString());
                //need to implement JOI to validate json
                let queryObject = {
                    _id: ObjectId(programData._id)
                };

                let programDocument = await database.models.programs.findOne(queryObject, { _id: 1 })

                if (programDocument) {
                    return resolve({
                        status: 400,
                        message: "Program already exist"
                    });
                }

                programDocument = await database.models.programs.create(programData)
                return resolve({
                    status: 200,
                    message: "Program imported successfully."
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

    /**
    * @api {post} /assessment/api/v1/import/solution Upload Solution Document JSON
    * @apiVersion 1.0.0
    * @apiName Upload Solution Document JSON
    * @apiGroup Import
    * @apiParam {File} solution     Mandatory solution file of type JSON.
    * @apiUse successBody
    * @apiUse errorBody
    */

    solution(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let solutionData = JSON.parse(req.files.solution.data.toString());
                //need to implement JOI to validate json
                let queryObject = {
                    _id: ObjectId(solutionData._id)
                };

                let solutionDocument = await database.models.solutions.findOne(queryObject, { _id: 1 })

                if (solutionDocument) {
                    return resolve({
                        status: 400,
                        message: "Solution already exist"
                    });
                }

                solutionDocument = await database.models.solutions.create(evaluationFrameworkData)

                return resolve({
                    status: 200,
                    message: "Solution imported successfully."
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

    /**
    * @api {post} /assessment/api/v1/import/framework Upload Framework Document JSON
    * @apiVersion 1.0.0
    * @apiName Upload Framework Document JSON
    * @apiGroup Import
    * @apiParam {File} framework     Mandatory framework file of type JSON.
    * @apiUse successBody
    * @apiUse errorBody
    */

    framework(req) {
        return new Promise(async (resolve, reject) => {
            try {

                let frameworkData = JSON.parse(req.files.framework.data.toString());
                //need to implement JOI to validate json
                let queryObject = {
                    _id: ObjectId(frameworkData._id)
                };

                let frameworkDocument = await database.models.frameworks.findOne(queryObject, { _id: 1 })

                if (frameworkDocument) {
                    return resolve({
                        status: 400,
                        message: "Framework already exist"
                    });
                }

                frameworkDocument = await database.models.frameworks.create(frameworkData)

                return resolve({
                    status: 200,
                    message: "Framework inserted successfully."
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

    /**
    * @api {post} /assessment/api/v1/import/criteria Upload Criteria Document JSON
    * @apiVersion 1.0.0
    * @apiName Upload Criteria Document JSON
    * @apiGroup Import
    * @apiParam {File} criteria     Mandatory criteria file of type JSON.
    * @apiUse successBody
    * @apiUse errorBody
    */

    criteria(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let criteriaData = JSON.parse(req.files.criteria.data.toString());
                //need to implement JOI to validate json
                await database.models.criteria.create(criteriaData);

                let responseMessage = `Criterias inserted successfully.`;
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


    /**
    * @api {post} /assessment/api/v1/import/questions Upload Questions Document JSON
    * @apiVersion 1.0.0
    * @apiName Upload Questions Document JSON
    * @apiGroup Import
    * @apiParam {File} questions     Mandatory questions file of type JSON.
    * @apiUse successBody
    * @apiUse errorBody
    */

    questions(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let questionData = JSON.parse(req.files.questions.data.toString());
                //need to implement JOI to validate json
                await database.models.questions.create(questionData);

                let responseMessage = `Questions inserted successfully.`;
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
