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

                    let addTeachersQuery = await database.models["teacher-registry"].insertMany(
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


    async upload(req) {

        return new Promise(async (resolve, reject) => {

            try {
                let schoolWiseTeachersData = await csv().fromString(req.files.teachers.data.toString());

                let schoolQueryList = {}
                let programQueryList = {}

                schoolWiseTeachersData.forEach(schoolWiseTeachers => {
                    schoolQueryList[schoolWiseTeachers.schoolId] = schoolWiseTeachers.schoolId
                    programQueryList[schoolWiseTeachers.schoolId] = schoolWiseTeachers.programId
                });

                let schoolsFromDatabase = await database.models.schools.find({
                    externalId: { $in: Object.values(schoolQueryList) }
                }, {
                        externalId: 1,
                        name: 1
                    });

                let programsFromDatabase = await database.models.programs.find({
                    externalId: { $in: Object.values(programQueryList) }
                });

                const schoolsData = schoolsFromDatabase.reduce(
                    (ac, school) => ({ ...ac, [school.externalId]: { _id: school._id, name: school.name } }), {})

                const programsData = programsFromDatabase.reduce(
                    (ac, program) => ({ ...ac, [program.externalId]: program }), {})


                schoolWiseTeachersData = await Promise.all(schoolWiseTeachersData.map(async (schoolWiseTeachers) => {

                    let teacherInformation = new Array
                    let nameOfTeacherNameField
                    let nameOfTeacherQualificationField
                    let nameOfTeacherExperienceField
                    let yearsInCurrentSchool
                    let validTeacherCount = 0

                    for (let teacherCounter = 1; teacherCounter < 50; teacherCounter++) {
                        nameOfTeacherNameField = "teacher" + teacherCounter + "Name";
                        nameOfTeacherQualificationField = "teacher" + teacherCounter + "Qualification";
                        nameOfTeacherExperienceField = "teacher" + teacherCounter + "Experience";
                        yearsInCurrentSchool = "teacher" + teacherCounter + "Number of Years In Current School";

                        if (schoolWiseTeachers[nameOfTeacherNameField] && schoolWiseTeachers[nameOfTeacherQualificationField] && schoolsData[schoolWiseTeachers.schoolId] && schoolWiseTeachers[nameOfTeacherNameField] != "") {
                            teacherInformation.push({
                                name: schoolWiseTeachers[nameOfTeacherNameField],
                                qualifications: schoolWiseTeachers[nameOfTeacherQualificationField],
                                yearOfExperience: schoolWiseTeachers[yearOfExperience],
                                yearsInCurrentSchool: schoolWiseTeachers[yearsInCurrentSchool],
                                nameOfTeacherExperienceField: schoolWiseTeachers[nameOfTeacherExperienceField],
                                programId: programsData[schoolWiseTeachers.programId]._id.toString(),
                                schoolId: schoolsData[schoolWiseTeachers.schoolId]._id.toString(),
                                schoolName: schoolsData[schoolWiseTeachers.schoolId].name,
                            })
                            validTeacherCount += 1
                        }
                    }
                    teacherInformation = await Promise.all(teacherInformation.map(async (teacher) => {

                        teacher = await database.models["teacher-registry"].findOneAndUpdate(
                            {
                                programId: teacher.programId,
                                schoolId: teacher.schoolId
                            },
                            teacher,
                            {
                                upsert: true,
                                new: true,
                                setDefaultsOnInsert: true,
                                returnNewDocument: true
                            }
                        );
                        return teacher

                    }));

                    if (validTeacherCount > 0 && validTeacherCount == parentInformation.length) {
                        return parentInformation
                    } else {
                        return;
                    }

                }));

                if (schoolWiseTeachersData.findIndex(school => school === undefined) >= 0) {
                    throw "Something went wrong, not all records were inserted/updated."
                }

                let responseMessage = "Parents record created successfully."

                let response = { message: responseMessage };

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
                    field: "yearOfExperience",
                    label: "Years Of Experience",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
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
                    input: "text",
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
                    field: "yearOfExperience",
                    label: "Years Of Experience",
                    value: (teacherInformation.yearOfExperience) ? teacherInformation.yearOfExperience : "",
                    visible: true,
                    editable: true,
                    input: "text",
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
                    input: "text",
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
