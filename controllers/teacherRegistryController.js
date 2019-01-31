const csv = require("csvtojson");

module.exports = class TeacherRegistry extends Abstract {

    constructor(schema) {
        super(schema);
    }

    static get name() {
        return "teacherRegistry";
    }


    add(req) {

        return new Promise(async (resolve, reject) => {

            try {

                if (req.body.teachers) {

                    let addTeachersQuery = await database.models["teacher-registry"].create(
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

    list(req) {

        return new Promise(async (resolve, reject) => {

            try {

                req.body = req.body || {};
                let result = {}

                if (req.params._id) {

                    let queryObject = {
                        schoolId: req.params._id
                    }

                    result = await database.models["teacher-registry"].find(
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

    async form(req) {
        return new Promise(async function (resolve, reject) {

            let result = [
                {
                    field: "name",
                    label: "Teacher Name",
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


    async fetch(req) {
        return new Promise(async function (resolve, reject) {

            let teacherInformation = await database.models["teacher-registry"].findOne(
                { _id: ObjectId(req.params._id) }
            );


            let result = [
                {
                    field: "name",
                    label: "Teacher Name",
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


    async update(req) {
        return new Promise(async function (resolve, reject) {

            try {
                let teacherInformation = await database.models["teacher-registry"].findOneAndUpdate(
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
