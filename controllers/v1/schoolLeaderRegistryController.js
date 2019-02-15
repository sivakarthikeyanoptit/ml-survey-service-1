const csv = require("csvtojson");

module.exports = class SchoolLeaderRegistry extends Abstract {
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
        super(schoolLeaderRegistrySchema);
    }

    static get name() {
        return "schoolLeaderRegistry";
    }

    /**
    * @api {post} /assessment/api/v1/schoolLeaderRegistry/add School Leaders Registry add
    * @apiVersion 0.0.1
    * @apiName School Leaders Registry add
    * @apiGroup schoolLeaderRegistry
    * @apiParamExample {json} Request-Body:
    *{
    *	"schoolLeaders": [
    *        {
    *        "name": "",
    *        "age": "",
    *        "gender": "",
    *        "description": "",
    *        "experienceInEducationSector": "",
    *        "experienceInCurrentSchool": "",
    *        "experienceAsSchoolLeaders": "",
    *        "dutiesOrResponsibility": "",
    *        "timeOfDiscussion": "",
    *        "nonTeachingHours": "",
    *        "bestPart": "",
    *        "challenges": "",
    *        "schoolId": "",
    *        "schoolName": "",
    *        "programId": ""
    *        }
    *	]
    *}
    * @apiUse successBody
    * @apiUse errorBody
    */

    add(req) {

        return new Promise(async (resolve, reject) => {

            try {

                if (req.body.schoolLeaders) {

                    let addTeachersQuery = await database.models.schoolLeaderRegistry.create(
                        req.body.schoolLeaders
                    );

                    if (addTeachersQuery.length != req.body.schoolLeaders.length) {
                        throw "School Leaders information was not inserted!"
                    }

                } else {
                    throw "Bad Request"
                }

                let responseMessage = "School Leaders information added successfully."

                let response = { message: responseMessage };

                return resolve(response);
            } catch (error) {
                return reject({ message: error });
            }

        })
    }

    /**
* @api {get} /assessment/api/v1/schoolLeaderRegistry/list/:schoolId School Leaders Registry list
* @apiVersion 0.0.1
* @apiName School Leaders Registry list
* @apiGroup schoolLeaderRegistry
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/schoolLeaderRegistry/list/5c62c2118b2b6f1fb4033f52
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

                    result = await database.models.schoolLeaderRegistry.find(
                        queryObject
                    );

                    result = result.map(function (leader) {
                        return leader;
                    })

                } else {
                    throw "Bad Request"
                }

                let responseMessage = "School leader information fetched successfully."

                let response = { message: responseMessage, result: result };

                return resolve(response);
            } catch (error) {
                return reject({ message: error });
            }

        })
    }

    /**
* @api {get} /assessment/api/v1/schoolLeaderRegistry/form School Leaders Registry form
* @apiVersion 0.0.1
* @apiName School Leaders Registry form
* @apiGroup schoolLeaderRegistry
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiSampleRequest /assessment/api/v1/schoolLeaderRegistry/form
* @apiUse successBody
* @apiUse errorBody
*/

    async form(req) {
        return new Promise(async function (resolve, reject) {

            let result = [
                {
                    field: "name",
                    label: "Name",
                    tip: "",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "age",
                    label: "Age",
                    tip: "Need not ask. Write an approximation",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "gender",
                    label: "Gender",
                    tip: "",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "radio",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "bio",
                    label: "Can you tell me a little about yourself?",
                    tip: "",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "experienceInEducationSector",
                    label: "No. of years in education sector",
                    tip: "Enter number in terms of years",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "experienceInCurrentSchool",
                    label: "No. of years in this school",
                    tip: "Enter number in terms of years",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "experienceAsSchoolLeader",
                    label: "No. of years as school leader here",
                    tip: "Enter number in terms of years",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "dutiesOrResponsibility",
                    label: "Roles and responsibilities",
                    tip: "Also find out how often they come to school",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "timeOfAvailability",
                    label: "Time for planning during school hours",
                    tip: "",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "nonTeachingHours",
                    label: "Number of non-teaching hours in a day:",
                    tip: "",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "bestPart",
                    label: "Best thing about the profession",
                    tip: "",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "challenges",
                    label: "Challenges in the profession",
                    tip: "",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "schoolId",
                    label: "School ID",
                    tip: "",
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
                    tip: "",
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
                    tip: "",
                    value: "",
                    visible: false,
                    editable: false,
                    input: "text",
                    validation: {
                        required: true
                    }
                }
            ]

            let responseMessage = "School leaders registry from fetched successfully."

            let response = { message: responseMessage, result: result };
            return resolve(response);

        }).catch(error => {
            reject(error);
        });
    }

    /**
    * @api {get} /assessment/api/v1/schoolLeaderRegistry/fetch/:schoolId School Leader Registry profile
    * @apiVersion 0.0.1
    * @apiName School Leader Registry Profile
    * @apiGroup schoolLeaderRegistry
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/schoolLeaderRegistry/fetch/5c62c2118b2b6f1fb4033f52
    * @apiUse successBody
    * @apiUse errorBody
    */

    async fetch(req) {
        return new Promise(async function (resolve, reject) {

            let schoolLeadersInformation = await database.models.schoolLeaderRegistry.findOne(
                { _id: ObjectId(req.params._id) }
            );

            let result = [
                {
                    field: "name",
                    label: "Name",
                    tip: "",
                    value: (schoolLeadersInformation.name) ? schoolLeadersInformation.name : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "age",
                    label: "Age",
                    tip: "Need not ask. Write an approximation",
                    value: (schoolLeadersInformation.age) ? schoolLeadersInformation.age : "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "gender",
                    label: "Gender",
                    tip: "",
                    value: (schoolLeadersInformation.gender) ? schoolLeadersInformation.gender : "",
                    visible: true,
                    editable: true,
                    input: "radio",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "bio",
                    label: "Can you tell me a little about yourself?",
                    tip: "",
                    value: (schoolLeadersInformation.bio) ? schoolLeadersInformation.bio : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "experienceInEducationSector",
                    label: "How long have you been in the education sector?",
                    tip: "Enter number in terms of years",
                    value: (schoolLeadersInformation.experienceInEducationSector) ? schoolLeadersInformation.experienceInEducationSector : "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "experienceInCurrentSchool",
                    label: "How long have you been in this school?",
                    tip: "Enter number in terms of years",
                    value: (schoolLeadersInformation.experienceInCurrentSchool) ? schoolLeadersInformation.experienceInCurrentSchool : "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "experienceAsSchoolLeader",
                    label: "How long have you been a school leader here?",
                    tip: "Enter number in terms of years",
                    value: (schoolLeadersInformation.experienceAsSchoolLeaders) ? schoolLeadersInformation.experienceAsSchoolLeaders : "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "dutiesOrResponsibility",
                    label: "What does your day look like? Apart from performing the duties of a principal/coordinator, do you also have to teach?",
                    tip: "Also find out how often they come to school",
                    value: (schoolLeadersInformation.dutiesOrResponsibility) ? schoolLeadersInformation.dutiesOrResponsibility : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "timeOfAvailability",
                    label: "When would you be able to get time during the day when we can update you or discuss our plans with you?",
                    tip: "",
                    value: (schoolLeadersInformation.timeOfDiscussion) ? schoolLeadersInformation.timeOfDiscussion : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "nonTeachingHours",
                    label: "Number of non-teaching hours in a day:",
                    tip: "",
                    value: (schoolLeadersInformation.nonTeachingHours) ? schoolLeadersInformation.nonTeachingHours : "",
                    visible: true,
                    editable: true,
                    input: "number",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "bestPart",
                    label: "What do you like the best about the profession?",
                    tip: "",
                    value: (schoolLeadersInformation.bestPart) ? schoolLeadersInformation.bestPart : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "challenges",
                    label: "What do you find challenging in your profession?",
                    tip: "",
                    value: (schoolLeadersInformation.challenges) ? schoolLeadersInformation.challenges : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "schoolName",
                    label: "School Name",
                    tip: "",
                    value: (schoolLeadersInformation.schoolName) ? schoolLeadersInformation.schoolName : "",
                    visible: false,
                    editable: false,
                    input: "text",
                    validation: {
                        required: true
                    }
                }
            ]

            let responseMessage = "School Leaders interview from fetched successfully."

            let response = { message: responseMessage, result: result };
            return resolve(response);

        }).catch(error => {
            reject(error);
        });
    }

    /**
    * @api {post} /assessment/api/v1/schoolLeaderRegistry/update/:schoolLeaderRegistryId Update School Leader Information
    * @apiVersion 0.0.1
    * @apiName Update School Leader Information
    * @apiGroup schoolLeaderRegistry
    * @apiParamExample {json} Request-Body:
    * 	{
    *	        "name" : "",
    *	        "gender" : "",
    *   }
    * @apiUse successBody
    * @apiUse errorBody
    */

    async update(req) {
        return new Promise(async function (resolve, reject) {

            try {
                let schoolLeadersInformation = await database.models.schoolLeaderRegistry.findOneAndUpdate(
                    { _id: ObjectId(req.params._id) },
                    req.body,
                    { new: true }
                );

                let responseMessage = "School Leader information updated successfully."

                let response = { message: responseMessage, result: schoolLeadersInformation };

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
