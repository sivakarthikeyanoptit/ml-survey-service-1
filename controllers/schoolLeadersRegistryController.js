const csv = require("csvtojson");

module.exports = class SchoolLeadersRegistry extends Abstract {

    constructor(schema) {
        super(schema);
    }

    static get name() {
        return "schoolLeadersRegistry";
    }


    add(req) {

        return new Promise(async (resolve, reject) => {

            try {

                if (req.body.schoolLeaders) {

                    let addTeachersQuery = await database.models["school-leaders-registry"].create(
                        req.body.schoolLeaders
                    );

                    if (addTeachersQuery.length != req.body.schoolLeaders.length) {
                        throw "Some schoolLeaders information was not inserted!"
                    }

                } else {
                    throw "Bad Request"
                }

                let responseMessage = "School schoolLeaders information added successfully."

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

                    result = await database.models["school-leaders-registry"].find(
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


    async upload(req) {

        return new Promise(async (resolve, reject) => {

            try {
                let schoolWiseLeadersData = await csv().fromString(req.files.leaders.data.toString());

                let schoolQueryList = {}
                let programQueryList = {}

                schoolWiseLeadersData.forEach(schoolWiseLeaders => {
                    schoolQueryList[schoolWiseLeaders.schoolId] = schoolWiseLeaders.schoolId
                    programQueryList[schoolWiseLeaders.schoolId] = schoolWiseLeaders.programId
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


                schoolWiseLeadersData = await Promise.all(schoolWiseLeadersData.map(async (schoolWiseLeaders) => {

                    let leaderInformation = new Array
                    let nameOfLeaderNameField
                    let ageField
                    let genderField
                    let descriptionField
                    let numberOfExperienceInEducationSector
                    let numberOfExperienceInCurrentSchool
                    let experienceAsSchoolLeaders
                    let dutiesOrResponsibility
                    let timeOfDiscussion
                    let nonTeachingHours
                    let bestPart
                    let challenges
                    let validLeaderCount = 0

                    for (let schoolLeaderCounter = 1; schoolLeaderCounter < 50; schoolLeaderCounter++) {
                        nameOfLeaderNameField = "leader" + teacherCounter + "Name";
                        ageField = "leader" + schoolLeaderCounter + "Age";
                        genderField = "leader" + schoolLeaderCounter + "Gender";
                        descriptionField = "leader" + schoolLeaderCounter + "Number of Years In Current School";
                        numberOfExperienceInEducationSector = "leader" + schoolLeaderCounter + "Number of Experience in education sector";
                        numberOfExperienceInCurrentSchool = "leader" + schoolLeaderCounter + "Number of Experience in current school";
                        experienceAsSchoolLeaders = "leader" + schoolLeaderCounter + "Experience as a school leaders";
                        dutiesOrResponsibility = "leader" + schoolLeaderCounter + "Duties and Responsibility";
                        timeOfDiscussion = "leader" + schoolLeaderCounter + "Discussion Time";
                        nonTeachingHours = "leader" + schoolLeaderCounter + "Non teaching hours";
                        bestPart = "leader" + schoolLeaderCounter + "Best Part";
                        challenges = "leader" + schoolLeaderCounter + "Challenges";

                        if (schoolWiseLeaders[nameOfLeaderNameField] && schoolWiseLeaders[ageField] && schoolsData[schoolWiseLeaders.schoolId] && schoolWiseLeaders[nameOfLeaderNameField] != "") {
                            leaderInformation.push({
                                name: schoolWiseLeaders[nameOfLeaderNameField],
                                qualifications: schoolWiseLeaders[ageField],
                                yearOfExperience: schoolWiseLeaders[yearOfExperience],
                                descriptionField: schoolWiseLeaders[descriptionField],
                                numberOfExperienceInEducationSector: schoolWiseLeaders[numberOfExperienceInEducationSector],
                                numberOfExperienceInCurrentSchool: schoolWiseLeaders[numberOfExperienceInCurrentSchool],
                                experienceAsSchoolLeaders: schoolWiseLeaders[experienceAsSchoolLeaders],
                                dutiesOrResponsibility: schoolWiseLeaders[dutiesOrResponsibility],
                                timeOfDiscussion: schoolWiseLeaders[timeOfDiscussion],
                                nonTeachingHours: schoolWiseLeaders[nonTeachingHours],
                                bestPart: schoolWiseLeaders[bestPart],
                                challenges: schoolWiseLeaders[challenges],
                                genderField: schoolWiseLeaders[genderField],
                                programId: programsData[schoolWiseLeaders.programId]._id.toString(),
                                schoolId: schoolsData[schoolWiseLeaders.schoolId]._id.toString(),
                                schoolName: schoolsData[schoolWiseLeaders.schoolId].name,
                            })
                            validLeaderCount += 1
                        }
                    }
                    leaderInformation = await Promise.all(leaderInformation.map(async (teacher) => {

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

                    if (validLeaderCount > 0 && validLeaderCount == leaderInformation.length) {
                        return leaderInformation
                    } else {
                        return;
                    }

                }));

                if (schoolWiseLeadersData.findIndex(school => school === undefined) >= 0) {
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
                    label: "School leader Name",
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
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "gender",
                    label: "Gender",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "description",
                    label: "Description",
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
                    label: "Years of experience in education sector",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "experienceInCurrentSchool",
                    label: "Years of experience in current school?",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "experienceAsSchoolLeaders",
                    label: "Years of experience as a school leader?",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "dutiesOrResponsibility",
                    label: "Roles and responsibility?",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "timeOfDiscussion",
                    label: "Time of discussion?",
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
                    label: "Number of non-teaching hours?",
                    value: "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "bestPart",
                    label: "Best part about the profession?",
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
                    label: "Challenges in the profession?",
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

            let responseMessage = "School leaders registry from fetched successfully."

            let response = { message: responseMessage, result: result };
            return resolve(response);

        }).catch(error => {
            reject(error);
        });
    }


    async fetch(req) {
        return new Promise(async function (resolve, reject) {

            let schoolLeadersInformation = await database.models["school-leaders-registry"].findOne(
                { _id: ObjectId(req.params._id) }
            );

            let result = [
                {
                    field: "name",
                    label: "School leader Name",
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
                    value: (schoolLeadersInformation.age) ? schoolLeadersInformation.age : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "gender",
                    label: "Gender",
                    value: (schoolLeadersInformation.gender) ? schoolLeadersInformation.gender : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "description",
                    label: "Description",
                    value: (schoolLeadersInformation.description) ? schoolLeadersInformation.description : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "experienceInEducationSector",
                    label: "Years of experience in education sector",
                    value: (schoolLeadersInformation.experienceInEducationSector) ? schoolLeadersInformation.experienceInEducationSector : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "experienceInCurrentSchool",
                    label: "Years of experience in current school?",
                    value: (schoolLeadersInformation.experienceInCurrentSchool) ? schoolLeadersInformation.experienceInCurrentSchool : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "experienceAsSchoolLeaders",
                    label: "Years of experience as a school leader?",
                    value: (schoolLeadersInformation.experienceAsSchoolLeaders) ? schoolLeadersInformation.experienceAsSchoolLeaders : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "dutiesOrResponsibility",
                    label: "Roles and responsibility?",
                    value: (schoolLeadersInformation.dutiesOrResponsibility) ? schoolLeadersInformation.dutiesOrResponsibility : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "timeOfDiscussion",
                    label: "Time of discussion?",
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
                    label: "Number of non-teaching hours?",
                    value: (schoolLeadersInformation.nonTeachingHours) ? schoolLeadersInformation.nonTeachingHours : "",
                    visible: true,
                    editable: true,
                    input: "text",
                    validation: {
                        required: true
                    }
                },
                {
                    field: "bestPart",
                    label: "Best part about the profession?",
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
                    label: "Challenges in the profession?",
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


    async update(req) {
        return new Promise(async function (resolve, reject) {

            try {
                let schoolLeadersInformation = await database.models["school-leaders-registry"].findOneAndUpdate(
                    { _id: ObjectId(req.params._id) },
                    req.body,
                    { new: true }
                );

                let responseMessage = "Teacher information updated successfully."

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
