const csv = require("csvtojson");

module.exports = class entityHelper {

    constructor() {
        this.roles = {
            ASSESSOR: "assessors",
            LEAD_ASSESSOR: "leadAssessors",
            PROJECT_MANAGER: "projectManagers",
            PROGRAM_MANAGER: "programManagers"
        };
    }

    static get name() {
        return "entityHelper";
    }

    add(req) {

        return new Promise(async (resolve, reject) => {

            try {

                if (req.body.entities) {

                    var entityDocuments = await database.models.entities.create(
                        req.body.entities
                    );

                    if (entityDocuments.length != req.body.entities.length) {
                        throw "Some entity information was not inserted!"
                    }

                } else {
                    throw "Bad Request"
                }

                let responseMessage = "Entity information added successfully."

                let response = { message: responseMessage, result: entityDocuments };

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
                        _id: ObjectId(req.params._id),
                        entityType: req.query.type
                    }

                    result = await database.models.entities.find(
                        queryObject
                    ).lean();

                    if (req.query.type == "parent") {
                        result = await this.getParentRegistrySubmissionStatus(req.params, result)
                    }

                } else {
                    throw "Bad Request"
                }

                let responseMessage = "Information fetched successfully."

                let response = { message: responseMessage, result: result };

                return resolve(response);
            } catch (error) {
                return reject({ message: error });
            }

        })
    }

    async getParentRegistrySubmissionStatus(params, parents) {
        let submissionParentInterviewResponses = await database.models.submissions.findOne(
            {
                schoolId: params._id
            },
            {
                parentInterviewResponses: 1
            }
        ).lean();

        submissionParentInterviewResponses = (submissionParentInterviewResponses && submissionParentInterviewResponses.parentInterviewResponses && Object.values(submissionParentInterviewResponses.parentInterviewResponses).length > 0) ? submissionParentInterviewResponses.parentInterviewResponses : {}
        let result = parents.map(function (parent) {

            if (parent.metaInformation.type.length > 0) {

                let parentTypeLabelArray = new Array

                parent.metaInformation.type.forEach(parentType => {
                    let parentTypeLabel
                    switch (parentType) {
                        case "P1":
                            parentTypeLabel = "Parent only"
                            break;
                        case "P2":
                            parentTypeLabel = "SMC Parent Member"
                            break;
                        case "P3":
                            parentTypeLabel = "Safety Committee Member"
                            break;
                        case "P4":
                            parentTypeLabel = "EWS-DG Parent"
                            break;
                        case "P5":
                            parentTypeLabel = "Social Worker"
                            break;
                        case "P6":
                            parentTypeLabel = "Elected Representative Nominee"
                            break;
                        default:
                            break;
                    }

                    if (parentTypeLabel != "") {
                        parentTypeLabelArray.push(parentTypeLabel)
                    }

                })

                parent.metaInformation.typeLabel = parentTypeLabelArray

            }

            if (parent.metaInformation.callResponse != "") {
                let parentCallResponseLabel
                switch (parent.metaInformation.callResponse) {
                    case "R1":
                        parentCallResponseLabel = "Call not initiated"
                        break;
                    case "R2":
                        parentCallResponseLabel = "Did not pick up"
                        break;
                    case "R3":
                        parentCallResponseLabel = "Not reachable"
                        break;
                    case "R4":
                        parentCallResponseLabel = "Call back later"
                        break;
                    case "R5":
                        parentCallResponseLabel = "Wrong number"
                        break;
                    case "R6":
                        parentCallResponseLabel = "Call disconnected mid way"
                        break;
                    case "R7":
                        parentCallResponseLabel = "Completed"
                        break;
                    case "R00":
                        parentCallResponseLabel = "Call Response Completed But Survey Not Completed."
                        break;
                    default:
                        break;
                }

                parent.metaInformation.callResponse = parentCallResponseLabel
            }

            parent.metaInformation.submissionStatus = (submissionParentInterviewResponses[parent._id.toString()]) ? submissionParentInterviewResponses[parent._id.toString()].status : ""
            return parent;
        })

        return result;
    }

    form(req) {
        return new Promise(async (resolve, reject) => {

            try {
                let result;
                switch (req.query.type) {
                    case "parent":
                        result = await this.getParentForm();
                        break;
                    case "teacher":
                        result = await this.getTeacherForm();
                        break;
                    case "schoolLeader":
                        result = await this.getSchoolLeaderRegistryForm();
                        break;
                    default:
                        throw "invalid type";
                }

                let responseMessage = "Information fetched successfully."

                let response = { message: responseMessage, result: result };

                return resolve(response);
            } catch (error) {
                return reject({ message: error });
            }

        })
    }

    fetch(req) {
        return new Promise(async (resolve, reject) => {

            try {
                let result;
                switch (req.query.type) {
                    case "parent":
                        result = await this.getParentForm(req.params._id);
                        break;
                    case "teacher":
                        result = await this.getTeacherForm(req.params._id);
                        break;
                    case "schoolLeader":
                        result = await this.getSchoolLeaderRegistryForm(req.params._id);
                        break;
                    default:
                        throw "invalid type";
                }

                let responseMessage = "Information fetched successfully."

                let response = { message: responseMessage, result: result };

                return resolve(response);
            } catch (error) {
                return reject({ message: error });
            }

        })
    }

    async getParentForm(id = null) {

        let parentInformation = {};

        if (id) {
            parentInformation = await database.models.entities.findOne(
                { _id: ObjectId(id) }
            );

            if (!parentInformation) {
                let responseMessage = `No parent information found for given params.`;
                throw responseMessage;
            }

            parentInformation = parentInformation.metaInformation;
        }

        let result = [
            {
                field: "name",
                label: "Parent Name",
                value: (parentInformation.name) ? parentInformation.name : "",
                visible: true,
                editable: true,
                input: "text",
                validation: {
                    required: true
                }
            },
            {
                field: "gender",
                label: "Parent Gender",
                value: (parentInformation.gender) ? parentInformation.gender : "",
                visible: true,
                editable: true,
                input: "radio",
                options: [
                    {
                        value: "M",
                        label: "Male"
                    },
                    {
                        value: "F",
                        label: "Female"
                    }
                ],
                validation: {
                    required: true
                }
            },
            {
                field: "phone1",
                label: "Phone Number",
                value: (parentInformation.phone1) ? parentInformation.phone1 : "",
                visible: true,
                editable: false,
                input: "number",
                validation: {
                    required: true,
                    regex: "^[0-9]{10}+$"
                }
            },
            {
                field: "phone2",
                label: "Additional Phone Number",
                value: (parentInformation.phone2) ? parentInformation.phone2 : "",
                visible: true,
                editable: true,
                input: "number",
                validation: {
                    required: false,
                    regex: "^[0-9]{10}+$"
                }
            },
            {
                field: "studentName",
                label: "Student Name",
                value: (parentInformation.studentName) ? parentInformation.studentName : "",
                visible: true,
                editable: true,
                input: "text",
                validation: {
                    required: true
                }
            },
            {
                field: "grade",
                label: "Grade",
                value: (parentInformation.grade) ? parentInformation.grade : "",
                visible: true,
                editable: true,
                input: "radio",
                options: [
                    {
                        value: "nursery",
                        label: "Nursery"
                    },
                    {
                        value: "lowerKG",
                        label: "Lower KG"
                    },
                    {
                        value: "upperKG",
                        label: "Upper KG"
                    },
                    {
                        value: "kindergarten",
                        label: "Kindergarten"
                    },
                    {
                        value: "1",
                        label: 1
                    },
                    {
                        value: "2",
                        label: 2
                    },
                    {
                        value: "3",
                        label: 3
                    },
                    {
                        value: "4",
                        label: 4
                    },
                    {
                        value: "5",
                        label: 5
                    },
                    {
                        value: "6",
                        label: 6
                    },
                    {
                        value: "7",
                        label: 7
                    },
                    {
                        value: "8",
                        label: 8
                    },
                    {
                        value: "9",
                        label: 9
                    },
                    {
                        value: "10",
                        label: 10
                    },
                    {
                        value: "11",
                        label: 11
                    },
                    {
                        value: "12",
                        label: 12
                    }
                ],
                validation: {
                    required: true
                }
            },
            {
                field: "schoolName",
                label: "School Name",
                value: (parentInformation.schoolName) ? parentInformation.schoolName : "",
                visible: true,
                editable: false,
                input: "text",
                validation: {
                    required: true
                }
            },
            {
                field: "type",
                label: "Parent Type",
                value: (parentInformation.type) ? parentInformation.type : "",
                visible: true,
                editable: true,
                input: "multiselect",
                options: [
                    {
                        value: "P1",
                        label: "Parent only"
                    },
                    {
                        value: "P2",
                        label: "SMC Parent Member"
                    },
                    {
                        value: "P3",
                        label: "Safety Committee Member"
                    },
                    {
                        value: "P4",
                        label: "EWS-DG Parent"
                    },
                    {
                        value: "P5",
                        label: "Social Worker"
                    },
                    {
                        value: "P6",
                        label: "Elected Representative Nominee"
                    }
                ],
                validation: {
                    required: false
                }
            },
            {
                field: "callResponse",
                label: "Call Response",
                value: (parentInformation.callResponse) ? parentInformation.callResponse : "",
                visible: true,
                editable: true,
                input: "radio",
                options: [
                    {
                        value: "R1",
                        label: "Call not initiated"
                    },
                    {
                        value: "R2",
                        label: "Did not pick up"
                    },
                    {
                        value: "R3",
                        label: "Not reachable"
                    },
                    {
                        value: "R4",
                        label: "Call back later"
                    },
                    {
                        value: "R5",
                        label: "Wrong number"
                    },
                    {
                        value: "R6",
                        label: "Call disconnected mid way"
                    }
                ],
                validation: {
                    required: true
                }
            }
        ]

        return result;
    }

    async getTeacherForm(id = null) {

        let teacherInformation = {};

        if (id) {
            teacherInformation = await database.models.entities.findOne(
                { _id: ObjectId(id) }
            );

            if (!teacherInformation) {
                let responseMessage = `No teacher information found for given params.`;
                throw responseMessage;
            }

            teacherInformation = teacherInformation.metaInformation
        }

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

        return result;
    }

    async getSchoolLeaderRegistryForm(id = null) {

        let schoolLeadersInformation = {};

        if (id) {

            schoolLeadersInformation = await database.models.entities.findOne(
                { _id: ObjectId(id) }
            );

            if (!schoolLeadersInformation) {
                let responseMessage = `No school leader information found for given params.`;
                throw responseMessage;
            }

            schoolLeadersInformation = schoolLeadersInformation.metaInformation
        }


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

        return result;
    }

    update(req) {
        return new Promise(async (resolve, reject) => {

            try {
                let response;

                if (req.query.type == "parent") {
                    response = await this.parentRegistryUpdate(req);
                } else {
                    let entityInformation = await database.models.entities.findOneAndUpdate(
                        { _id: ObjectId(req.params._id), entityType: req.query.type },
                        { metaInformation: req.body },
                        { new: true }
                    );

                    let responseMessage = "Information updated successfully."

                    response = { message: responseMessage, result: entityInformation };
                }

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

    async parentRegistryUpdate(req) {

        try {

            const parentDocument = await database.models.entities.findOne(
                { _id: ObjectId(req.params._id), entityType: req.query.type }
            );

            if (!parentDocument) throw "No such parent found"

            let updateSubmissionDocument = false
            if (req.body.updateFromParentPortal === true) {
                if (req.body.callResponse && req.body.callResponse != "" && (!parentDocument.callResponse || (parentDocument.callResponse != req.body.callResponse))) {
                    req.body.callResponseUpdatedTime = new Date()
                }
                updateSubmissionDocument = true
            }

            if (typeof (req.body.createdByProgramId) == "string") req.body.createdByProgramId = ObjectId(req.body.createdByProgramId);

            let parentInformation = await database.models.entities.findOneAndUpdate(
                { _id: ObjectId(req.params._id) },
                { metaInformation: req.body },
                { new: true }
            );

            if (updateSubmissionDocument) {

                let queryObject = {
                    schoolId: ObjectId(parentInformation.schoolId)
                }

                let submissionDocument = await database.models.submissions.findOne(
                    queryObject,
                    { ["parentInterviewResponses." + parentInformation._id.toString()]: 1, parentInterviewResponsesStatus: 1 }
                );

                let updateObject = {}
                updateObject.$set = {}
                let parentInterviewResponse = {}
                if (submissionDocument.parentInterviewResponses && submissionDocument.parentInterviewResponses[parentInformation._id.toString()]) {
                    parentInterviewResponse = submissionDocument.parentInterviewResponses[parentInformation._id.toString()]
                    parentInterviewResponse.parentInformation = parentInformation
                } else {
                    parentInterviewResponse = {
                        parentInformation: parentInformation,
                        status: "started",
                        startedAt: new Date()
                    }
                }

                updateObject.$set = {
                    ["parentInterviewResponses." + parentInformation._id.toString()]: parentInterviewResponse
                }

                let parentInterviewResponseStatus = _.omit(parentInterviewResponse, ["parentInformation", "answers"])
                parentInterviewResponseStatus.parentId = parentInformation._id
                parentInterviewResponseStatus.parentType = parentInformation.type

                if (submissionDocument.parentInterviewResponsesStatus) {
                    let parentInterviewReponseStatusElementIndex = submissionDocument.parentInterviewResponsesStatus.findIndex(parentInterviewStatus => parentInterviewStatus.parentId.toString() === parentInterviewResponseStatus.parentId.toString())
                    if (parentInterviewReponseStatusElementIndex >= 0) {
                        submissionDocument.parentInterviewResponsesStatus[parentInterviewReponseStatusElementIndex] = parentInterviewResponseStatus
                    } else {
                        submissionDocument.parentInterviewResponsesStatus.push(parentInterviewResponseStatus)
                    }
                } else {
                    submissionDocument.parentInterviewResponsesStatus = new Array
                    submissionDocument.parentInterviewResponsesStatus.push(parentInterviewResponseStatus)
                }

                updateObject.$set.parentInterviewResponsesStatus = submissionDocument.parentInterviewResponsesStatus

                const submissionDocumentUpdate = await database.models.submissions.findOneAndUpdate(
                    { _id: submissionDocument._id },
                    updateObject
                );
            }

            let responseMessage = "Parent information updated successfully."

            let response = { message: responseMessage, result: parentInformation };

            return response;

        } catch (error) {
            return reject({
                status: 500,
                message: error,
                errorObject: error
            });
        }

    }

    upload(req) {
        return new Promise(async (resolve, reject) => {

            try {
                let response;

                if (req.query.type == "parent") {
                    response = await this.uploadParentInformations(req)
                } else if (req.query.type == "school") {
                    response = await this.uploadSchoolInformations(req)
                } else {
                    throw "invalid type"
                }

                return resolve(response)

            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }

        });
    }

    async uploadSchoolInformations(req) {
        try {
            let schoolsData = await csv().fromString(
                req.files.schools.data.toString()
            );
            const schoolsUploadCount = schoolsData.length;

            let programQueryList = {};
            let solutionsQueryList = {};

            schoolsData.forEach(school => {
                programQueryList[school.externalId] = school.programId;
                solutionsQueryList[school.externalId] = school.solutionId;
            });

            let programsFromDatabase = await database.models.programs.find({
                externalId: { $in: Object.values(programQueryList) }
            });

            let solutionsFromDatabase = await database.models.solutions.find(
                {
                    externalId: { $in: Object.values(solutionsQueryList) }
                }
            );

            const programsData = programsFromDatabase.reduce(
                (ac, program) => ({ ...ac, [program.externalId]: program }),
                {}
            );

            const solutionsData = solutionsFromDatabase.reduce(
                (ac, solution) => ({
                    ...ac,
                    [solution.externalId]: solution
                }),
                {}
            );
            let entityType = await database.models.entityTypes.findOne({ name: 'school' });


            const schoolUploadedData = await Promise.all(
                schoolsData.map(async school => {
                    school.schoolTypes = await school.schoolType.split(",");
                    school.createdBy = school.updatedBy = req.userDetails.id;
                    school.gpsLocation = "";
                    const schoolCreateObject = await database.models.entities.findOneAndUpdate(
                        {
                            "metaInformation.externalId": school.externalId,
                            "entityType": "school"
                        },
                        {
                            metaInformation: school,
                            createdBy: req.userDetails.id,
                            updatedBy: req.userDetails.id
                        },
                        {
                            upsert: true,
                            new: true,
                            setDefaultsOnInsert: true,
                            returnNewDocument: true
                        }
                    );

                    return {
                        _id: schoolCreateObject._id,
                        externalId: school.externalId,
                        programId: school.programId,
                        solutionId: school.solutionId
                    };
                })
            );

            if (schoolsUploadCount === schoolUploadedData.length) {
                let schoolElement = new Object();
                let programFrameworkSchools = new Array();
                let schoolCsvDataProgramId;
                let schoolCsvDataEvaluationFrameworkId;

                for (
                    let schoolIndexInData = 0;
                    schoolIndexInData < schoolUploadedData.length;
                    schoolIndexInData++
                ) {
                    schoolElement = schoolUploadedData[schoolIndexInData];

                    schoolCsvDataProgramId = programQueryList[schoolElement.externalId];
                    schoolCsvDataEvaluationFrameworkId =
                        solutionsQueryList[schoolElement.externalId];
                    programFrameworkSchools = solutionsData[schoolElement.solutionId].entities;
                    if (
                        programFrameworkSchools.findIndex(
                            school => school.toString() == schoolElement._id.toString()
                        ) < 0
                    ) {
                        programFrameworkSchools.push(
                            ObjectId(schoolElement._id.toString())
                        );
                    }
                }

                await Promise.all(
                    Object.values(programsData).map(async program => {
                        let queryObject = {
                            _id: ObjectId(program._id.toString())
                        };
                        let updateObject = {};

                        updateObject.$set = {
                            ["components"]: program.components
                        };

                        await database.models.programs.findOneAndUpdate(
                            queryObject,
                            updateObject
                        );

                        return;
                    })
                );
            } else {
                throw "Something went wrong, not all records were inserted/updated.";
            }

            let responseMessage = "School record created successfully.";

            let response = { message: responseMessage };

            return response;
        } catch (error) {
            throw {
                status: error.status || 500,
                message: error.message || error || "Oops! something went wrong",
                errorObject: error
            };
        }
    }

    async uploadParentInformations(req) {

        try {
            let schoolWiseParentsData = await csv().fromString(req.files.parents.data.toString());

            let schoolQueryList = {}
            let programQueryList = {}

            schoolWiseParentsData.forEach(schoolWiseParents => {
                schoolQueryList[schoolWiseParents.schoolId] = schoolWiseParents.schoolId
                programQueryList[schoolWiseParents.schoolId] = schoolWiseParents.programId
            });

            let schoolsFromDatabase = await database.models.entities.find({
                "entityType": "school",
                "metaInformation.externalId": { $in: Object.values(schoolQueryList) }
            }, {
                    name: 1,
                    "metaInformation.externalId": 1
                });

            let entityType = await database.models.entityTypes.findOne({ name: 'parent' });

            let programsFromDatabase = await database.models.programs.find({
                externalId: { $in: Object.values(programQueryList) }
            });

            const schoolsData = schoolsFromDatabase.reduce(
                (ac, school) => ({ ...ac, [school.metaInformation.externalId]: { _id: school._id, name: school.name } }), {})

            const programsData = programsFromDatabase.reduce(
                (ac, program) => ({ ...ac, [program.externalId]: program }), {})


            let totalParentCount = schoolWiseParentsData.length;
            schoolWiseParentsData = await Promise.all(schoolWiseParentsData.map(async (schoolWiseParents) => {


                if (schoolWiseParents.parentName && schoolWiseParents.parentPhone && schoolsData[schoolWiseParents.schoolId] && schoolWiseParents.parentName != "" && schoolWiseParents.parentPhone.length > 5) {
                    let parent = await database.models.entities.findOneAndUpdate(
                        {
                            "entityType": "parent",
                            "metaInformation.createdByProgramId": programsData[schoolWiseParents.programId]
                        },
                        {
                            metaInformation: schoolWiseParents,
                            entityTypeId: entityType._id,
                            createdBy: req.userDetails.id,
                            updatedBy: req.userDetails.id,
                            regsitryDetails: {},
                            groups: {}
                        },
                        {
                            upsert: true,
                            new: true,
                            setDefaultsOnInsert: true,
                            returnNewDocument: true
                        }
                    );

                    return parent
                }


            }));

            if (totalParentCount == schoolWiseParentsData.length) {
                if (schoolWiseParentsData.findIndex(school => school === undefined) >= 0) {
                    throw "Something went wrong, not all records were inserted/updated."
                }

                let responseMessage = "Parents record created successfully."

                let response = { message: responseMessage };

                return response;
            }


        } catch (error) {
            throw error;
        }

    }

    async uploadForPortal(req) {
        return new Promise(async (resolve, reject) => {
            try {

                if (req.query.type != "school") throw "invalid type";

                if (!req.files || !req.files.schools) throw { status: 400, message: "Bad Request." };

                let schoolsData = await csv().fromString(
                    req.files.schools.data.toString()
                );

                const schoolsUploadCount = schoolsData.length;

                let programId = req.query.programId

                if (!programId) {
                    throw "Program Id is missing"
                }

                let solutionId = req.query.solutionId

                if (!solutionId) {
                    throw "Component Id is missing."
                }

                let programDocument = await database.models.programs.find({ _id: programId }).lean();

                if (!programDocument) throw "Bad request"

                let solutionDocument = await database.models.solutions.find({
                    _id: { $in: solutionId }
                }).lean();

                if (!solutionDocument) throw "Bad request";

                const programsData = programDocument.reduce(
                    (ac, program) => ({ ...ac, [program._id]: program }),
                    {}
                );

                const solutionsData = solutionDocument.reduce(
                    (ac, solution) => ({
                        ...ac,
                        [solution._id]: solution
                    }),
                    {}
                );

                let entityType = await database.models.entityTypes.find({ "entityType": "school" }, { _id: 1 }).lean();

                const schoolUploadedData = await Promise.all(
                    schoolsData.map(async school => {
                        school.schoolTypes = await school.schoolType.split(",");
                        const schoolCreateObject = await database.models.entities.findOneAndUpdate(
                            {
                                "metaInformation.externalId": school.externalId,
                                "entityType": "school"
                            },
                            {
                                "entityTypeId": entityType._id,
                                "entityType": "school",
                                "regsitryDetails": {},
                                "groups": {},
                                "metaInformation": school,
                                "updatedBy": req.userDetails.id,
                                "createdBy": req.userDetails.id
                            },
                            {
                                upsert: true,
                                new: true,
                                setDefaultsOnInsert: true,
                                returnNewDocument: true
                            }
                        );

                        return {
                            _id: schoolCreateObject._id,
                            externalId: school.externalId,
                            programId: programId,
                            solutionId: solutionId
                        };
                    })
                );

                if (schoolsUploadCount === schoolUploadedData.length) {
                    let schoolElement = new Object();
                    let programFrameworkSchools = new Array();
                    let schoolCsvDataProgramId;
                    let schoolCsvDataEvaluationFrameworkId;

                    for (
                        let schoolIndexInData = 0;
                        schoolIndexInData < schoolUploadedData.length;
                        schoolIndexInData++
                    ) {
                        schoolElement = schoolUploadedData[schoolIndexInData];

                        schoolCsvDataProgramId = programId;
                        schoolCsvDataEvaluationFrameworkId =
                            solutionId;
                        programFrameworkSchools =
                            solutionsData[solutionId].entities;
                        if (
                            programFrameworkSchools.findIndex(
                                school => school.toString() == schoolElement._id.toString()
                            ) < 0
                        ) {
                            programFrameworkSchools.push(
                                ObjectId(schoolElement._id.toString())
                            );
                        }
                    }

                    await Promise.all(
                        Object.values(programsData).map(async program => {
                            let queryObject = {
                                _id: ObjectId(program._id.toString())
                            };
                            let updateObject = {};

                            updateObject.$set = {
                                ["components"]: program.components
                            };

                            await database.models.programs.findOneAndUpdate(
                                queryObject,
                                updateObject
                            );

                            return;
                        })
                    );
                } else {
                    throw "Something went wrong, not all records were inserted/updated.";
                }

                let responseMessage = "School record created successfully.";

                let response = { message: responseMessage };

                return resolve(response);
            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || error || "Oops! Something went wrong!",
                    errorObject: error
                });
            }
        })
    }

    async getRoll(roles) {
        let role = _.intersection(roles, Object.keys(this.roles))[0];
        return this.roles[role];
    }

    async assessments(req) {
        try {
            if (req.query.type != "school") throw "invalid type";

            req.body = req.body || {};
            let response = {
                message: "Assessment fetched successfully",
                result: {}
            };
            const isRequestForOncallOrOnField =
                req.query.oncall && req.query.oncall == 1 ? "oncall" : "onfield";

            let schoolQueryObject = { _id: ObjectId(req.params._id) };
            let schoolDocument = await database.models.entities.findOne(
                schoolQueryObject
            );

            if (!schoolDocument) {
                let responseMessage = 'No schools found.';
                throw { status: 400, message: responseMessage }
            }

            schoolDocument = await schoolDocument.toObject();
            let solutionsQueryObject = {
                status: "active",
                "entities": { $in: [ObjectId(req.params._id)] },
                $or: [
                    {
                        "roles.assessors.users": { $in: [req.userDetails.id] }
                    },
                    {
                        "roles.leadAssessors.users": {
                            $in: [req.userDetails.id]
                        }
                    },
                    {
                        "roles.projectManagers.users": {
                            $in: [req.userDetails.id]
                        }
                    },
                    {
                        "roles.programManagers.users": {
                            $in: [req.userDetails.id]
                        }
                    }
                ]
            };
            let solutionDocument = await database.models.solutions.find(
                solutionsQueryObject
            );


            if (!solutionDocument.length) {
                let responseMessage = 'No program found.';
                throw { status: 400, message: responseMessage }
            }

            let accessability =
                solutionDocument[0].roles[
                    await this.getRoll(req.userDetails.allRoles)
                ].acl;

            let form = [];
            let schoolTypes = schoolDocument.metaInformation.schoolTypes;
            let schoolProfileFieldsPerSchoolTypes = solutionDocument[0]['entityProfileFieldsPerSchoolTypes'];
            let filteredFieldsToBeShown = [];
            schoolTypes.forEach(schoolType => {
                if (schoolProfileFieldsPerSchoolTypes[schoolType]) {
                    filteredFieldsToBeShown.push(...schoolProfileFieldsPerSchoolTypes[schoolType])
                }
            })

            let entityType = await database.models.entityTypes.findOne({ name: "school" })

            await _.forEach(entityType.profileForm, key => {
                filteredFieldsToBeShown.includes(key.field) && form.push({
                    field: key.field,
                    label: key.label,
                    value: Array.isArray(schoolDocument[key.name])
                        ? schoolDocument[key.name].join(", ")
                        : schoolDocument[key.name] || '',
                    visible:
                        accessability.schoolProfile.visible.indexOf("all") > -1 ||
                        accessability.schoolProfile.visible.indexOf(key.name) > -1,
                    editable:
                        accessability.schoolProfile.editable.indexOf("all") > -1 ||
                        accessability.schoolProfile.editable.indexOf(key.name) > -1,
                    input: key.input
                });
            });
            response.result.schoolProfile = {
                _id: schoolDocument._id,
                // isEditable: accessability.schoolProfile.editable.length > 0,
                form: form
            };

            let programDocument = await database.models.programs.findOne({ _id: solutionDocument[0].programId }).lean();

            response.result.program = await _.pick(programDocument, [
                "_id",
                "externalId",
                "name",
                "description",
                "imageCompression"
            ]);


            let submissionDocument = {
                schoolId: schoolDocument._id,
                schoolInformation: schoolDocument.metaInformation,
                programId: programDocument._id,
                programExternalId: programDocument.externalId,
                schoolExternalId: schoolDocument.metaInformation.externalId,
                programInformation: {
                    name: programDocument.name,
                    externalId: programDocument.externalId,
                    description: programDocument.description,
                    owner: programDocument.owner,
                    createdBy: programDocument.createdBy,
                    updatedBy: programDocument.updatedBy,
                    resourceType: programDocument.resourceType,
                    language: programDocument.language,
                    keywords: programDocument.keywords,
                    concepts: programDocument.concepts,
                    createdFor: programDocument.createdFor,
                    imageCompression: programDocument.imageCompression
                },
                evidenceSubmissions: [],
                schoolProfile: {},
                status: "started"
            };
            let assessments = [];
            for (
                let counter = 0;
                counter < solutionDocument.length;
                counter++
            ) {
                let component = solutionDocument[counter];
                let assessment = {};

                assessment.name = component.name;
                assessment.description = component.description;
                assessment.externalId = component.externalId;


                submissionDocument.evaluationFrameworkId = component._id
                submissionDocument.evaluationFrameworkExternalId = component.externalId

                let criteriasId = new Array
                let criteriaObject = {}
                let criteriasIdArray = gen.utils.getCriteriaIdsAndWeightage(component.themes);

                criteriasIdArray.forEach(eachCriteriaId => {
                    criteriasId.push(eachCriteriaId.criteriaId)
                    criteriaObject[eachCriteriaId.criteriaId.toString()] = {
                        weightage: eachCriteriaId.weightage
                    }
                })
                let criteriaQuestionDocument = await database.models.criteriaQuestions.find(
                    { _id: { $in: criteriasId } },
                    {
                        resourceType: 0,
                        language: 0,
                        keywords: 0,
                        concepts: 0,
                        createdFor: 0
                    }
                ).lean();

                let evidenceMethodArray = {};
                let submissionDocumentEvidences = {};
                let submissionDocumentCriterias = [];

                criteriaQuestionDocument.forEach(criteria => {

                    criteria.weightage = criteriaObject[criteria._id.toString()].weightage
                    submissionDocumentCriterias.push(
                        _.omit(criteria, [
                            "evidences"
                        ])
                    );

                    criteria.evidences.forEach(evidenceMethod => {
                        evidenceMethod.notApplicable = false;
                        evidenceMethod.canBeNotAllowed = true;
                        evidenceMethod.remarks = "";
                        evidenceMethod.submissions = new Array
                        submissionDocumentEvidences[evidenceMethod.externalId] = _.omit(
                            evidenceMethod,
                            ["sections"]
                        );
                        if (
                            evidenceMethod.modeOfCollection === isRequestForOncallOrOnField
                        ) {
                            if (!evidenceMethodArray[evidenceMethod.externalId]) {
                                evidenceMethodArray[
                                    evidenceMethod.externalId
                                ] = evidenceMethod;
                            } else {
                                // Evidence method already exists
                                // Loop through all sections reading evidence method
                                evidenceMethod.sections.forEach(evidenceMethodSection => {
                                    let sectionExisitsInEvidenceMethod = 0;
                                    let existingSectionQuestionsArrayInEvidenceMethod = [];
                                    evidenceMethodArray[
                                        evidenceMethod.externalId
                                    ].sections.forEach(exisitingSectionInEvidenceMethod => {
                                        if (
                                            exisitingSectionInEvidenceMethod.name ==
                                            evidenceMethodSection.name
                                        ) {
                                            sectionExisitsInEvidenceMethod = 1;
                                            existingSectionQuestionsArrayInEvidenceMethod =
                                                exisitingSectionInEvidenceMethod.questions;
                                        }
                                    });
                                    if (!sectionExisitsInEvidenceMethod) {
                                        evidenceMethodArray[
                                            evidenceMethod.externalId
                                        ].sections.push(evidenceMethodSection);
                                    } else {
                                        evidenceMethodSection.questions.forEach(
                                            questionInEvidenceMethodSection => {
                                                existingSectionQuestionsArrayInEvidenceMethod.push(
                                                    questionInEvidenceMethodSection
                                                );
                                            }
                                        );
                                    }
                                });
                            }
                        }
                    });
                });

                submissionDocument.evidences = submissionDocumentEvidences;
                submissionDocument.evidencesStatus = Object.values(submissionDocumentEvidences);
                submissionDocument.criterias = submissionDocumentCriterias;
                let submissionsController = new submissionsBaseController();
                let submissionDoc = await submissionsController.findSubmissionBySchoolProgram(
                    submissionDocument,
                    req
                );
                assessment.submissionId = submissionDoc.result._id;

                if (
                    submissionDoc.result.parentInterviewResponses &&
                    submissionDoc.result.parentInterviewResponses.length > 0
                ) {
                    assessment.parentInterviewResponses =
                        submissionDoc.result.parentInterviewResponses;
                }

                const parsedAssessment = await this.parseQuestions(
                    Object.values(evidenceMethodArray),
                    schoolDocument.schoolTypes,
                    submissionDoc.result.evidences,
                    (component.length && component.questionSequenceByEcm) ? component.questionSequenceByEcm : false
                );

                assessment.evidences = parsedAssessment.evidences;
                assessment.submissions = parsedAssessment.submissions;
                if (
                    parsedAssessment.generalQuestions &&
                    parsedAssessment.generalQuestions.length > 0
                ) {
                    assessment.generalQuestions = parsedAssessment.generalQuestions;
                }
                assessments.push(assessment);
            }

            response.result.assessments = assessments;

            return response;
        } catch (error) {
            throw {
                status: error.status || 500,
                message: error.message || "Oops! Something went wrong!",
                errorObject: error
            };
        }
    }

    async parseQuestions(evidences, schoolTypes, submissionDocEvidences, questionSequenceByEcm = false) {
        let schoolFilterQuestionArray = {};
        let sectionQuestionArray = {};
        let generalQuestions = [];
        let questionArray = {};
        let submissionsObjects = {};
        evidences.sort((a, b) => (a.name > b.name ? 1 : b.name > a.name ? -1 : 0));

        evidences.forEach(evidence => {
            if (submissionDocEvidences[evidence.externalId]) {
                evidence.startTime =
                    submissionDocEvidences[evidence.externalId].startTime;
                evidence.endTime = submissionDocEvidences[evidence.externalId].endTime;
                evidence.isSubmitted =
                    submissionDocEvidences[evidence.externalId].isSubmitted;
                if (submissionDocEvidences[evidence.externalId].submissions) {
                    submissionDocEvidences[evidence.externalId].submissions.forEach(
                        submission => {
                            if (submission.isValid) {
                                submissionsObjects[evidence.externalId] = submission;
                            }
                        }
                    );
                }
            }

            evidence.sections.forEach(section => {
                section.questions.forEach((question, index, section) => {
                    question.evidenceMethod = evidence.externalId
                    if (_.difference(question.questionGroup, schoolTypes).length < question.questionGroup.length) {
                        sectionQuestionArray[question._id] = section
                        questionArray[question._id] = question
                    } else {
                        schoolFilterQuestionArray[question._id] = section;
                    }
                });
            });
        });

        Object.entries(schoolFilterQuestionArray).forEach(
            schoolFilteredQuestion => {
                schoolFilteredQuestion[1].forEach(
                    (questionElm, questionIndexInSection) => {
                        if (questionElm._id.toString() === schoolFilteredQuestion[0]) {
                            schoolFilteredQuestion[1].splice(questionIndexInSection, 1);
                        }
                    }
                );
            }
        );

        Object.entries(questionArray).forEach(questionArrayElm => {
            questionArrayElm[1]["payload"] = {
                criteriaId: questionArrayElm[1]["criteriaId"],
                responseType: questionArrayElm[1]["responseType"],
                evidenceMethod: questionArrayElm[1].evidenceMethod
            }
            questionArrayElm[1]["startTime"] = ""
            questionArrayElm[1]["endTime"] = ""
            delete questionArrayElm[1]["criteriaId"]

            if (questionArrayElm[1].responseType === "matrix") {
                let instanceQuestionArray = new Array()
                questionArrayElm[1].instanceQuestions.forEach(instanceQuestionId => {
                    if (sectionQuestionArray[instanceQuestionId.toString()]) {
                        let instanceQuestion = questionArray[instanceQuestionId.toString()];
                        instanceQuestionArray.push(instanceQuestion);
                        let sectionReferenceOfInstanceQuestion =
                            sectionQuestionArray[instanceQuestionId.toString()];
                        sectionReferenceOfInstanceQuestion.forEach(
                            (questionInSection, index) => {
                                if (
                                    questionInSection._id.toString() ===
                                    instanceQuestionId.toString()
                                ) {
                                    sectionReferenceOfInstanceQuestion.splice(index, 1);
                                }
                            }
                        );
                    }
                });
                questionArrayElm[1]["instanceQuestions"] = instanceQuestionArray;
            }

            if (questionArrayElm[1]["isAGeneralQuestion"] === true) {
                questionArrayElm[1]["payload"].isAGeneralQuestion = true;
                generalQuestions.push(questionArrayElm[1]);
            }
        });

        // Sort questions by sequence
        if (questionSequenceByEcm) {
            evidences.forEach(evidence => {
                if (questionSequenceByEcm[evidence.externalId]) {
                    evidence.sections.forEach(section => {

                        if (questionSequenceByEcm[evidence.externalId][section.name] && questionSequenceByEcm[evidence.externalId][section.name].length > 0) {
                            let questionSequenceByEcmSection = questionSequenceByEcm[evidence.externalId][section.name]
                            let sectionQuestionByEcm = _.keyBy(section.questions, 'externalId');
                            let sortedQuestionArray = new Array

                            questionSequenceByEcmSection.forEach(questionId => {
                                if (sectionQuestionByEcm[questionId]) {
                                    sortedQuestionArray.push(sectionQuestionByEcm[questionId])
                                    delete sectionQuestionByEcm[questionId]
                                }
                            })

                            sortedQuestionArray = _.concat(sortedQuestionArray, Object.values(sectionQuestionByEcm));

                            section.questions = sortedQuestionArray
                        }
                    })
                }
            })
        }

        return {
            evidences: evidences,
            submissions: submissionsObjects,
            generalQuestions: generalQuestions
        };
    }

};