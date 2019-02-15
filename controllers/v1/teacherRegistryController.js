const csv = require("csvtojson");

module.exports = class TeacherRegistry extends Abstract {
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

    constructor() {
        super(teacherRegistrySchema);
    }

    static get name() {
        return "teacherRegistry";
    }

    /**
    * @api {post} /assessment/api/v1/teacherRegistry/add Teacher registry add
    * @apiVersion 0.0.1
    * @apiName Teacher Registry add
    * @apiGroup TeacherRegistry
    * @apiParamExample {json} Request-Body:
    *{
    *	"teachers": [
    *       {
    *        	"name": "",
    *        	"qualifications": "",
    *        	"yearsOfExperience": "",
    *        	"yearsInCurrentSchool": "",
    *        	"schoolId": "",
    *        	"schoolName": "",
    *        	"programId": ""
    *        }
    *	]
    *}
    * @apiUse successBody
    * @apiUse errorBody
    */


    add(req) {

        return new Promise(async (resolve, reject) => {

            try {

                if (req.body.teachers) {

                    let addTeachersQuery = await database.models.teacherRegistry.create(
                        req.body.teachers
                    );

                    if (addTeachersQuery.length != req.body.teachers.length) {
                        throw "Some teachers information was not inserted!"
                    }

                } else {
                    throw "Bad Request"
                }

                let responseMessage = "Teachers information added successfully."

                let response = { message: responseMessage };

                return resolve(response);
            } catch (error) {
                return reject({ message: error });
            }

        })
    }

    /**
* @api {get} /assessment/api/v1/teacherRegistry/list/:schoolId Teacher Registry list
* @apiVersion 0.0.1
* @apiName Teacher Registry list
* @apiGroup TeacherRegistry
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/teacherRegistry/list/5c533ae82ffa8f30d7d7e55e
* @apiUse successBody
* @apiUse errorBody
*/

    list(req) {

        return new Promise(async (resolve, reject) => {

            try {

                req.body = req.body || {};
                let result = {}

                if (req.params._id) {

                    let queryObject = {
                        schoolId: req.params._id
                    }

                    result = await database.models.teacherRegistry.find(
                        queryObject
                    );

                    result = result.map(function (teacher) {
                        return teacher;
                    })

                } else {
                    throw "Bad Request"
                }

                let responseMessage = "Teacher information fetched successfully."

                let response = { message: responseMessage, result: result };

                return resolve(response);
            } catch (error) {
                return reject({ message: error });
            }

        })
    }


    /**
    * @api {get} /assessment/api/v1/teacherRegistry/form Teacher registry form
    * @apiVersion 0.0.1
    * @apiName Teacher Registry form
    * @apiGroup TeacherRegistry
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/teacherRegistry/form
    * @apiUse successBody
    * @apiUse errorBody
    */

    async form(req) {
        return new Promise(async function (resolve, reject) {

            let result = [
                {
                    field: "name",
                    label: "Name",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "qualifications",
                    label: "Qualifications",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "yearsOfExperience",
                    label: "Years Of Experience",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "yearsInCurrentSchool",
                    label: "Number of years in this school",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "schoolId",
                    label: "School ID",
                    value: "",
                    visible: false,
                    editable: false,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "schoolName",
                    label: "School Name",
                    value: "",
                    visible: false,
                    editable: false,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "programId",
                    label: "Program ID",
                    value: "",
                    visible: false,
                    editable: false,
                    input: "text",
                    validation: {
                        required: true
                    }
                }
            ]

            let responseMessage = "Teacher registry from fetched successfully."

            let response = { message: responseMessage, result: result };
            return resolve(response);

        }).catch(error => {
            reject(error);
        });
    }

    /**
 * @api {get} /assessment/api/v1/teacherRegistry/fetch/:schoolId Teacher profile
 * @apiVersion 0.0.1
 * @apiName Teacher Registry profile
 * @apiGroup TeacherRegistry
 * @apiHeader {String} X-authenticated-user-token Authenticity token
 * @apiSampleRequest /assessment/api/v1/teacherRegistry/fetch/5c533ae82ffa8f30d7d7e55e
 * @apiUse successBody
 * @apiUse errorBody 
 */

    async fetch(req) {
        return new Promise(async function (resolve, reject) {

            let teacherInformation = await database.models.teacherRegistry.findOne(
                { _id: ObjectId(req.params._id) }
            );


            let result = [
                {
                    field: "name",
                    label: "Name",
                    value: (teacherInformation.name) ? teacherInformation.name : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "qualifications",
                    label: "Qualifications",
                    value: (teacherInformation.qualifications) ? teacherInformation.qualifications : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "yearsOfExperience",
                    label: "Years Of Experience",
                    value: (teacherInformation.yearsOfExperience) ? teacherInformation.yearsOfExperience : "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "yearsInCurrentSchool",
                    label: "Number of years in this school",
                    value: (teacherInformation.yearsInCurrentSchool) ? teacherInformation.yearsInCurrentSchool : "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "schoolName",
                    label: "School Name",
                    value: (teacherInformation.schoolName) ? teacherInformation.schoolName : "",
                    visible: false,
                    editable: false,
                    input: "text",
                    validation: {
                        required: true
                    }
                }
            ]

            let responseMessage = "Parent interview from fetched successfully."

            let response = { message: responseMessage, result: result };
            return resolve(response);

        }).catch(error => {
            reject(error);
        });
    }

    /**
     * @api {post} /assessment/api/v1/teacherRegistry/update/:TeacherRegistryId Update Teacher Information
     * @apiVersion 0.0.1
     * @apiName Update teacher Information
     * @apiGroup TeacherRegistry
     * @apiParamExample {json} Request-Body:
     * 	{
     *	        "name" : "Name of the teacher",
     *	        "gender" : "F",
     *   }
     * @apiUse successBody
     * @apiUse errorBody
     */

    async update(req) {
        return new Promise(async function (resolve, reject) {

            try {
                let teacherInformation = await database.models.teacherRegistry.findOneAndUpdate(
                    { _id: ObjectId(req.params._id) },
                    req.body,
                    { new: true }
                );

                let responseMessage = "Teacher information updated successfully."

                let response = { message: responseMessage, result: teacherInformation };

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

};
