const moment = require("moment-timezone");
const FileStream = require(ROOT_PATH + "/generics/fileStream");
const opsHelper = require(ROOT_PATH + "/module/programOperations/helper");
module.exports = class ProgramOperations {

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


    /**
    * @api {get} /assessment/api/v1/programOperations/listByUser List all the programs which is part of the current user
    * @apiVersion 0.0.1
    * @apiName Fetch Program List By User
    * @apiGroup programOperations
    * @apiUse successBody
    * @apiUse errorBody
    */

    async listByUser(req) {
        return new Promise(async (resolve, reject) => {
            try {

                let userRole = gen.utils.getUserRole(req.userDetails, false);

                let entityAssessorDocumentByUser = await database.models.entityAssessors.find({ userId: req.userDetails.id, role: userRole }, { solutionId: 1 }).lean();

                let solutionsDocuments = await database.models.solutions.aggregate([
                    { "$match": { "_id": { $in: entityAssessorDocumentByUser.map(solution => solution.solutionId) } } },
                    {
                        $project: {
                            "externalId": "$programExternalId",
                            "_id": "$programId",
                            "name": "$programName",
                            "description": "$programDescription",
                            "assessmentId": "$_id",
                            "assessmentExternalId": "$externalId",
                            "assessmentName": "$name",
                            "assessmentDescription": "$description"
                        }
                    },
                    {
                        $group: {
                            _id: "$_id",
                            name: { $first: "$name" },
                            description: { $first: "$description" },
                            externalId: { $first: "$externalId" },
                            assessments: {
                                $push: {
                                    "_id": "$assessmentId",
                                    "externalId": "$assessmentExternalId",
                                    "name": "$assessmentName",
                                    "description": "$assessmentDescription"
                                }
                            },
                        }
                    },
                ]
                )

                let responseMessage;
                let response;

                if (!solutionsDocuments.length) {

                    responseMessage = "No programs data found for given params.";
                    response = { status: 404, message: responseMessage };

                } else {

                    responseMessage = "Program information list fetched successfully.";
                    response = { message: responseMessage, result: solutionsDocuments };

                }

                return resolve(response);

            } catch (error) {

                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! something went wrong",
                    errorObject: error
                });

            }
        });
    }

    /**
    * @api {get} /assessment/api/v1/programOperations/reportFilters/:programExternalId 
    * @apiVersion 0.0.1
    * @apiName Fetch Filters(Drop down contents) for Reports
    * @apiGroup programOperations
    * @apiUse successBody
    * @apiUse errorBody
    */

    async reportFilters(req) {
        opsHelper.checkUserAuthorization(req.userDetails, req.params._id);
        return new Promise(async (resolve, reject) => {
            try {

                let programDocument = await opsHelper.getProgram(req.params._id);

                let schoolTypes = database.models.entities.distinct('metaInformation.types', { _id: { $in: programDocument.entities } }).lean().exec();
                let administrationTypes = database.models.entities.distinct('metaInformation.administration', { _id: { $in: programDocument.entities } }).lean().exec();
                let types = await Promise.all([schoolTypes, administrationTypes]);

                schoolTypes = _.compact(types[0]);
                administrationTypes = _.compact(types[1]);


                schoolTypes = schoolTypes.sort().map(schoolType => {
                    return {
                        label: schoolType,
                        value: schoolType
                    }
                })

                administrationTypes = administrationTypes.sort().map(administrationType => {
                    return {
                        label: administrationType,
                        value: administrationType
                    }
                })

                let result = [
                    {
                        field: "fromDate",
                        label: "start date",
                        value: "",
                        visible: true,//there is no date calculation right now
                        editable: true,
                        input: "date",
                        validation: {
                            required: true
                        },
                        min: new Date(0),
                        max: new Date()
                    },
                    {
                        field: "toDate",
                        label: "end date",
                        value: "",
                        visible: true,//there is no date calculation right now
                        editable: true,
                        input: "date",
                        validation: {
                            required: true
                        },
                        min: new Date(0),
                        max: new Date()
                    },
                    {
                        field: "schoolTypes",
                        label: "school type",
                        value: "",
                        visible: true,
                        editable: true,
                        input: "select",
                        options: schoolTypes,
                        validation: {
                            required: false
                        },
                        autocomplete: false,
                        min: "",
                        max: ""
                    },
                    {
                        field: "area",
                        label: "school area",
                        value: "",
                        visible: true,
                        editable: true,
                        input: "text",
                        validation: {
                            required: false
                        },
                        autocomplete: false,
                        min: "",
                        max: ""
                    },
                    {
                        field: "administration",
                        label: "school administration",
                        value: "",
                        visible: true,
                        editable: true,
                        input: "select",
                        showRemarks: true,
                        options: administrationTypes,
                        validation: {
                            required: false
                        },
                        autocomplete: false,
                        min: "",
                        max: ""
                    },
                    {
                        field: "externalId",
                        label: "school Id",
                        value: "",
                        visible: true,
                        editable: true,
                        input: "text",
                        validation: {
                            required: false
                        },
                        autocomplete: true,
                        url: `programOperations/searchSchool/`,
                        min: "",
                        max: ""
                    }
                ];
                return resolve({
                    message: 'Reports filter fetched successfully.',
                    result: result
                })

            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
                    errorObject: error
                });
            }
        })
    }

    /**
    * @api {get} /assessment/api/v1/programOperations/managerProfile/:programExternalId
    * @apiVersion 0.0.1
    * @apiName Manager profile
    * @apiGroup programOperations
    * @apiUse successBody
    * @apiUse errorBody
    */

    async managerProfile(req) {

        opsHelper.checkUserAuthorization(req.userDetails, req.params._id);

        return new Promise(async (resolve, reject) => {
            try {

                let userRole = gen.utils.getUserRole(req.userDetails, true);

                let managerName = (req.userDetails.firstName + " " + req.userDetails.lastName).trim();

                let roles = {
                    assessors: "Assessors",
                    leadAssessors: "Lead Assessors",
                    projectManagers: "Project Managers",
                    programManagers: "Program Managers"
                };

                let programDocument = await opsHelper.getProgram(req.params._id, false);

                let result = [
                    {
                        label: "dateOfReportGeneration",
                        value: moment().format('DD-MM-YYYY'),
                    },
                    {
                        label: "nameOfTheManager",
                        value: managerName
                    },
                    {
                        label: "role",
                        value: roles[userRole] || "",
                    },
                    {
                        label: "nameOfTheProgram",
                        value: programDocument.name,
                    },
                    {
                        label: "userName",
                        value: req.userDetails.userName || "",
                    },
                    {
                        label: "email",
                        value: req.userDetails.email || "",
                    }
                ]

                return resolve({
                    message: 'Manager profile fetched successfully.',
                    result: result
                })

            } catch (error) {

                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
                    errorObject: error
                });

            }
        })
    }

    /**
    * @api {get} /assessment/api/v1/programOperations/schoolSummary 
    * @apiVersion 0.0.1
    * @apiName Fetch School Summary
    * @apiGroup programOperations
    * @apiUse successBody
    * @apiUse errorBody
    */

    async schoolSummary(req) {

        opsHelper.checkUserAuthorization(req.userDetails, req.params._id);

        return new Promise(async (resolve, reject) => {
            try {

                let resultArray = [
                    {
                        label: "schoolsAssigned",
                        value: "",
                    },
                    {
                        label: "schoolsCompleted",
                        value: "",
                    },
                    {
                        label: "schoolsInporgress",
                        value: "",
                    },
                    {
                        label: "averageTimeTakenInDays",
                        value: "",
                    }
                ];

                let schoolObjects = await opsHelper.getSchools(req, false, []);


                if (!schoolObjects || !schoolObjects.result || !schoolObjects.result.length)
                    return resolve({
                        result: resultArray
                    })

                let schoolDocuments = schoolObjects.result;

                let schoolIds = schoolDocuments.map(school => school.id);

                let schoolsCompletedCount = database.models.submissions.countDocuments({ schoolId: { $in: schoolIds }, status: 'completed' }).lean().exec();

                let schoolsInprogressCount = database.models.submissions.countDocuments({ schoolId: { $in: schoolIds }, status: 'inprogress' }).lean().exec();

                [schoolsCompletedCount, schoolsInprogressCount] = await Promise.all([schoolsCompletedCount, schoolsInprogressCount]);

                let averageTimeTaken = (schoolDocuments.length / schoolsCompletedCount);

                resultArray[0]["value"] = schoolDocuments.length;
                resultArray[1]["value"] = schoolsCompletedCount || "";
                resultArray[2]["value"] = schoolsInprogressCount || "";
                resultArray[3]["value"] = averageTimeTaken ? (parseFloat(averageTimeTaken.toFixed(2)) || "") : "";

                return resolve({
                    message: 'School details fetched successfully.',
                    result: resultArray
                })

            } catch (error) {

                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
                    errorObject: error
                });

            }
        })
    }

    /**
    * @api {get} /assessment/api/v1/programOperations/assessorReport 
    * @apiVersion 0.0.1
    * @apiName Fetch Assessor Report
    * @apiGroup programOperations
    * @apiUse successBody
    * @apiUse errorBody
    */

    async assessorReport(req) {
        opsHelper.checkUserAuthorization(req.userDetails, req.params._id);
        return new Promise(async (resolve, reject) => {
            try {

                let programDocument = await opsHelper.getProgram(req.params._id);

                let assessorDetails;
                let assessorQueryObject = {};
                assessorQueryObject["$or"] = [
                    {
                        "parentId": req.userDetails.id
                    },
                    {
                        "userId": req.userDetails.id
                    }
                ];

                assessorQueryObject["programId"] = programDocument._id;

                if (req.query.assessorName) assessorQueryObject["name"] = new RegExp(req.query.assessorName, 'i');

                if (req.query.csv && req.query.csv == "true") {
                    const fileName = `assessorReport`;
                    var fileStream = new FileStream(fileName);
                    var input = fileStream.initStream();

                    (async function () {
                        await fileStream.getProcessorPromise();
                        return resolve({
                            isResponseAStream: true,
                            fileNameWithPath: fileStream.fileNameWithPath()
                        });
                    }());
                }

                let limitValue = (req.query.csv && req.query.csv == "true") ? "" : req.pageSize;
                let skipValue = (req.query.csv && req.query.csv == "true") ? "" : (req.pageSize * (req.pageNo - 1));

                assessorDetails = await database.models.entityAssessors.find(assessorQueryObject, { userId: 1, name: 1, entities: 1 }).limit(limitValue).skip(skipValue).lean().exec();

                let totalCount = database.models.entityAssessors.countDocuments(assessorQueryObject).exec();

                [assessorDetails, totalCount] = await Promise.all([assessorDetails, totalCount])

                let assessorEntityIds = _.flattenDeep(assessorDetails.map(entity => entity.entities));

                //get only uniq schoolIds
                if (assessorEntityIds.length) {
                    let uniqAssessorEntityIds = _.uniq(assessorEntityIds.map(school => school.toString()));
                    assessorEntityIds = uniqAssessorEntityIds.map(school => ObjectId(school));
                }

                let userIds = assessorDetails.map(assessor => assessor.userId);

                let assessorSchoolMap = _.keyBy(assessorDetails, 'userId');

                assessorEntityIds = await opsHelper.getSchools(req, false, userIds);

                assessorEntityIds = assessorEntityIds.result.map(school => school.id);

                let submissionDocuments = await database.models.submissions.find({ schoolId: { $in: assessorEntityIds } }, { status: 1, createdAt: 1, completedDate: 1, schoolId: 1 }).lean();
                let schoolSubmissionMap = _.keyBy(submissionDocuments, 'schoolId');


                function getAverageTimeTaken(submissionData) {
                    let result = submissionData.filter(data => data.status == 'completed');
                    if (result.length) {
                        let dayDifference = []
                        result.forEach(singleResult => {
                            let startedDate = moment(singleResult.createdAt);
                            let completedDate = moment(singleResult.completedDate);
                            dayDifference.push(completedDate.diff(startedDate, 'days'))
                        })
                        let averageTimeTaken = dayDifference.reduce((a, b) => a + b, 0) / dayDifference.length;
                        return parseFloat(averageTimeTaken.toFixed(2))
                    } else {
                        return ''
                    }
                }

                function getSubmissionByAssessor(assessorId) {
                    let assessorEntity = assessorSchoolMap[assessorId].entities;
                    let schoolSubmissions = [];
                    assessorEntity.forEach(schoolId => {
                        schoolSubmissions.push(schoolSubmissionMap[schoolId.toString()])
                    });
                    return _.compact(schoolSubmissions);
                }

                let assessorsReports = [];
                assessorDetails.forEach(async (assessor, index) => {
                    let schoolsByAssessor = getSubmissionByAssessor(assessor.userId);
                    let schoolData = _.countBy(schoolsByAssessor, 'status')
                    let schoolAssigned = schoolsByAssessor.length;
                    let assessorResult = {
                        name: assessor.name || "",
                        schoolsAssigned: schoolAssigned || "",
                        schoolsCompleted: schoolData.completed || "",
                        schoolsCompletedPercent: parseFloat(((schoolData.completed / schoolAssigned) * 100).toFixed(2)) || "",
                        averageTimeTaken: getAverageTimeTaken(schoolsByAssessor)
                    }
                    assessorsReports.push(assessorResult)
                    if (req.query.csv && req.query.csv == "true") {
                        input.push(assessorResult)

                        if (input.readableBuffer && input.readableBuffer.length) {
                            while (input.readableBuffer.length > 20000) {
                                await opsHelper.sleep(2000)
                            }
                        }

                    }
                })
                if (req.query.csv && req.query.csv == "true") {
                    input.push(null);
                } else {
                    let result = await opsHelper.constructResultObject('programOperationAssessorReports', assessorsReports, totalCount, req.userDetails, programDocument.name, req.query);
                    return resolve({ result: result })
                }

            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
                    errorObject: error
                });
            }
        })
    }

    /**
    * @api {get} /assessment/api/v1/programOperations/schoolReport 
    * @apiVersion 0.0.1
    * @apiName Fetch School Report
    * @apiGroup programOperations
    * @apiUse successBody
    * @apiUse errorBody
    */

    async schoolReport(req) {
        opsHelper.checkUserAuthorization(req.userDetails, req.params._id);
        return new Promise(async (resolve, reject) => {
            try {
                const self = new ProgramOperations;

                let programExternalId = req.params._id;

                let isCSV = req.query.csv;
                let schoolDocuments = await opsHelper.getSchools(req, (!isCSV || isCSV == "false") ? true : false, []);
                let programDocument = await opsHelper.getProgram(req.params._id);

                if (!schoolDocuments)
                    return resolve(noDataFound())

                let schoolObjects = schoolDocuments.result;
                let totalCount = schoolDocuments.totalCount;

                if (!schoolObjects || !schoolObjects.length) {
                    return resolve(noDataFound())
                }

                async function noDataFound() {
                    let result = await opsHelper.constructResultObject('programOperationSchoolReports', [], totalCount, req.userDetails, programDocument.name, req.query);
                    return { result: result }
                }

                let submissionQueryObject = {};
                let entityObjectIds = schoolObjects.map(school => school.id)
                submissionQueryObject.schoolId = { $in: entityObjectIds };
                submissionQueryObject.programExternalId = programExternalId;

                if (isCSV && isCSV == "true") {

                    const fileName = `schoolReport`;
                    var fileStream = new FileStream(fileName);
                    var input = fileStream.initStream();

                    (async function () {
                        await fileStream.getProcessorPromise();
                        return resolve({
                            isResponseAStream: true,
                            fileNameWithPath: fileStream.fileNameWithPath()
                        });
                    }());
                }

                let submissionDocuments = await database.models.submissions.find(submissionQueryObject, { status: 1, "schoolInformation.name": 1, createdAt: 1, completedDate: 1, 'evidencesStatus.isSubmitted': 1, schoolExternalId: 1 }).lean();

                submissionDocuments = _.keyBy(submissionDocuments, 'schoolExternalId')

                let result = {};

                let schoolStatusObject = {
                    inprogress: 'In Progress',
                    completed: 'Complete',
                    blocked: 'Blocked',
                    started: 'Started'
                }

                function getAssessmentCompletionPercentage(evidencesStatus) {
                    let isSubmittedArray = evidencesStatus.filter(singleEvidencesStatus => singleEvidencesStatus.isSubmitted == true);
                    return parseFloat(((isSubmittedArray.length / evidencesStatus.length) * 100).toFixed(2));
                }

                result.schoolsReport = [];
                schoolObjects.forEach(async (singleSchoolDocument) => {
                    let submissionDetails = submissionDocuments[singleSchoolDocument.externalId];
                    let resultObject = {};
                    resultObject.status = submissionDetails ? (schoolStatusObject[submissionDetails.status] || submissionDetails.status) : "";
                    resultObject.name = singleSchoolDocument.name || "";
                    resultObject.daysElapsed = submissionDetails ? moment().diff(moment(submissionDetails.createdAt), 'days') : "";
                    resultObject.assessmentCompletionPercent = submissionDetails ? getAssessmentCompletionPercentage(submissionDetails.evidencesStatus) : "";

                    if (isCSV == "true") {
                        input.push(resultObject)

                        if (input.readableBuffer && input.readableBuffer.length) {
                            while (input.readableBuffer.length > 20000) {
                                await opsHelper.sleep(2000)
                            }
                        }
                    } else {
                        result.schoolsReport.push(resultObject)
                    }

                })

                if (isCSV == "true") {
                    input.push(null)
                } else {
                    result = await opsHelper.constructResultObject('programOperationSchoolReports', result.schoolsReport, totalCount, req.userDetails, programDocument.name, req.query)
                    return resolve({ result: result })
                }

            } catch (error) {

                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
                    errorObject: error
                });

            }
        })
    }

    /**
    * @api {get} /assessment/api/v1/programOperations/searchSchool/:programExternalId?id=schoolId 
    * @apiVersion 0.0.1
    * @apiName Fetch Filters(Autocomplete contents) for Reports
    * @apiGroup programOperations
    * @apiUse successBody
    * @apiUse errorBody
    */

    //program operation search school autocomplete API
    async searchSchool(req) {
        opsHelper.checkUserAuthorization(req.userDetails, req.params._id);
        return new Promise(async (resolve, reject) => {
            try {

                let programDocument = await opsHelper.getProgram(req.params._id);

                if (!req.query.id) {
                    throw { status: 400, message: 'Entity id required.' }
                }

                let entityIdAndName = await database.models.entities.find(
                    {
                        _id: { $in: programDocument.entities },
                        "entityType": "school",
                        "metaInformation.externalId": new RegExp(req.query.id, 'i')
                    },
                    {
                        "metaInformation.externalId": 1,
                        "metaInformation.name": 1
                    }
                ).limit(5).lean();//autocomplete needs only 5 dataset

                entityIdAndName = entityIdAndName.map(entityIdAndName => {
                    entityIdAndName.metaInformation._id = entityIdAndName._id;
                    return entityIdAndName.metaInformation;
                })

                return resolve({
                    status: 200,
                    result: entityIdAndName
                })

            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
                    errorObject: error
                });
            }
        })
    }


};