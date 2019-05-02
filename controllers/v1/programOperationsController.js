const moment = require("moment-timezone");
const FileStream = require(ROOT_PATH + "/generics/fileStream");
module.exports = class ProgramOperations {

    constructor() {
        this.entityAssessorsTrackers = new entityAssessorsTrackersBaseController;
    }

    checkUserAuthorization(userDetails, programExternalId) {
        let userRole = gen.utils.getUserRole(userDetails, true);
        if (userRole == "assessors") throw { status: 400, message: "You are not authorized to take this report." };
        if (userDetails.accessiblePrograms.length) {
            let userProgramExternalIds = userDetails.accessiblePrograms.map(program => program.programExternalId);
            if (!userProgramExternalIds.includes(programExternalId)) throw { status: 400, message: "You are not part of this program." };
        }
        return
    }

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

                let userRole = gen.utils.getUserRole(req.userDetails, true);

                let solutionsDocuments = await database.models.solutions.aggregate([
                    { "$match": { [`roles.${userRole}.users`]: req.userDetails.id } },
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
                        $group : {
                            _id : "$_id",
                            name : {$first : "$name"},
                            description : {$first : "$description"},
                            externalId : {$first : "$externalId"},
                            assessments : { $push :{
                                "_id": "$assessmentId",
                                "externalId": "$assessmentExternalId",
                                "name": "$assessmentName",
                                "description": "$assessmentDescription" 
                            }},
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
  * @api {get} /assessment/api/v1/programOperations/assessorReport 
  * @apiVersion 0.0.1
  * @apiName Fetch Assessor Report
  * @apiGroup programOperations
  * @apiUse successBody
  * @apiUse errorBody
  */

    async assessorReport(req) {
        this.checkUserAuthorization(req.userDetails, req.params._id);
        return new Promise(async (resolve, reject) => {
            try {

                let programDocument = await this.getProgram(req.params._id);

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

                assessorDetails = await database.models.schoolAssessors.find(assessorQueryObject, { userId: 1, name: 1, schools: 1 }).limit(limitValue).skip(skipValue).lean().exec();

                let totalCount = database.models.schoolAssessors.countDocuments(assessorQueryObject).exec();

                [assessorDetails, totalCount] = await Promise.all([assessorDetails, totalCount])

                let assessorSchoolIds = _.flattenDeep(assessorDetails.map(school => school.schools));

                //get only uniq schoolIds
                if (assessorSchoolIds.length) {
                    let uniqAssessorSchoolIds = _.uniq(assessorSchoolIds.map(school => school.toString()));
                    assessorSchoolIds = uniqAssessorSchoolIds.map(school => ObjectId(school));
                }

                let userIds = assessorDetails.map(assessor => assessor.userId);

                let assessorSchoolMap = _.keyBy(assessorDetails, 'userId');

                assessorSchoolIds = await this.getSchools(req, false, userIds);

                assessorSchoolIds = assessorSchoolIds.result.map(school => school.id);

                let submissionDocuments = await database.models.submissions.find({ schoolId: { $in: assessorSchoolIds } }, { status: 1, createdAt: 1, completedDate: 1, schoolId: 1 }).lean();
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
                    let assessorSchools = assessorSchoolMap[assessorId].schools;
                    let schoolSubmissions = [];
                    assessorSchools.forEach(schoolId => {
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
                                await this.sleep(2000)
                            }
                        }

                    }
                })
                if (req.query.csv && req.query.csv == "true") {
                    input.push(null);
                } else {
                    let result = await this.constructResultObject('programOperationAssessorReports', assessorsReports, totalCount, req.userDetails, programDocument.name, req.query);
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
        this.checkUserAuthorization(req.userDetails, req.params._id);
        return new Promise(async (resolve, reject) => {
            try {
                const self = new ProgramOperations;

                let programExternalId = req.params._id;

                let isCSV = req.query.csv;
                let schoolDocuments = await this.getSchools(req, (!isCSV || isCSV == "false") ? true : false, []);
                let programDocument = await this.getProgram(req.params._id);

                if (!schoolDocuments)
                    return resolve(noDataFound())

                let schoolObjects = schoolDocuments.result;
                let totalCount = schoolDocuments.totalCount;

                if (!schoolObjects || !schoolObjects.length) {
                    return resolve(noDataFound())
                }

                async function noDataFound() {
                    let result = await self.constructResultObject('programOperationSchoolReports', [], totalCount, req.userDetails, programDocument.name, req.query);
                    return { result: result }
                }

                let submissionQueryObject = {};
                let schoolObjectIds = schoolObjects.map(school => school.id)
                submissionQueryObject.schoolId = { $in: schoolObjectIds };
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
                                await this.sleep(2000)
                            }
                        }
                    } else {
                        result.schoolsReport.push(resultObject)
                    }

                })

                if (isCSV == "true") {
                    input.push(null)
                } else {
                    result = await this.constructResultObject('programOperationSchoolReports', result.schoolsReport, totalCount, req.userDetails, programDocument.name, req.query)
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

    constructResultObject(graphName, value, totalCount, userDetails, programName, queryParams) {
        return new Promise(async (resolve, reject) => {
            let reportOptions = await database.models.reportOptions.findOne({ name: graphName }).lean();
            let headers = reportOptions.results.sections[0].tabularData.headers.map(header => header.name)
            let data = value.map(singleValue => {
                let resultObject = {}
                headers.forEach(singleHeader => {
                    resultObject[singleHeader] = singleValue[singleHeader];
                })
                return resultObject;
            })
            reportOptions.results.sections[0].data = data;
            reportOptions.results.sections[0].totalCount = totalCount;
            reportOptions.results.isShareable = (queryParams && queryParams.linkId) ? false : true;
            reportOptions.results.title = `Program Operations Report for ${programName}`;
            return resolve(reportOptions.results);
        })

    }

    /**
    * @api {get} /assessment/api/v1/programOperations/managerProfile 
    * @apiVersion 0.0.1
    * @apiName Manager profile
    * @apiGroup programOperations
    * @apiUse successBody
    * @apiUse errorBody
    */

    async managerProfile(req) {

        this.checkUserAuthorization(req.userDetails, req.params._id);

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

                let programDocument = await this.getProgram(req.params._id);

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

        this.checkUserAuthorization(req.userDetails, req.params._id);

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

                let schoolObjects = await this.getSchools(req, false, []);


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
    * @api {get} /assessment/api/v1/programOperations/reportFilters 
    * @apiVersion 0.0.1
    * @apiName Fetch Filters(Drop down contents) for Reports
    * @apiGroup programOperations
    * @apiUse successBody
    * @apiUse errorBody
    */

    async reportFilters(req) {
        this.checkUserAuthorization(req.userDetails, req.params._id);
        return new Promise(async (resolve, reject) => {
            try {

                let programDocument = await this.getProgram(req.params._id);

                let schoolTypes = await database.models.schools.distinct('schoolTypes', { _id: { $in: programDocument.entities } }).lean().exec();
                let administrationTypes = await database.models.schools.distinct('administration', { _id: { $in: programDocument.entities } }).lean().exec();
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
    * @api {get} /assessment/api/v1/programOperations/searchSchool 
    * @apiVersion 0.0.1
    * @apiName Fetch Filters(Autocomplete contents) for Reports
    * @apiGroup programOperations
    * @apiUse successBody
    * @apiUse errorBody
    */

    //searchSchool is for program operation search school autocomplete
    async searchSchool(req) {
        this.checkUserAuthorization(req.userDetails, req.params._id);
        return new Promise(async (resolve, reject) => {
            try {

                let programDocument = await this.getProgram(req.params._id);

                if (!req.query.id) {
                    throw { status: 400, message: 'School id required.' }
                }

                let schoolIdAndName = await database.models.schools.find(
                    {
                        _id: { $in: programDocument.entities },
                        externalId: new RegExp(req.query.id, 'i')
                    },
                    {
                        externalId: 1, name: 1
                    }
                ).limit(5).lean();//autocomplete needs only 5 dataset

                return resolve({
                    status: 200,
                    result: schoolIdAndName
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

    //sub function to get schools based on program and current user role
    async getSchools(req, pagination = false, assessorIds) {
        return new Promise(async (resolve, reject) => {
            try {

                let programDocument = await this.getProgram(req.params._id);

                let queryObject = [
                    { $project: { userId: 1, parentId: 1, name: 1, schools: 1, programId: 1, updatedAt: 1 } },
                    { $match: { userId: req.userDetails.id, programId: programDocument._id } },
                    {
                        $graphLookup: {
                            from: 'schoolAssessors',
                            startWith: '$userId',
                            connectFromField: 'userId',
                            connectToField: 'parentId',
                            maxDepth: 20,
                            as: 'children'
                        }
                    },
                    {
                        $project: { schools: 1, userId: 1, "children.schools": 1, "children.userId": 1 }
                    }
                ];

                let schoolsAssessorDocuments = await database.models.schoolAssessors.aggregate(queryObject);

                if (schoolsAssessorDocuments.length < 1) {
                    return resolve([]);
                }

                let userIds = [];

                if (assessorIds.length) {
                    userIds = assessorIds;
                } else {
                    userIds.push(schoolsAssessorDocuments[0].userId);

                    schoolsAssessorDocuments[0].children.forEach(child => {
                        userIds.push(child.userId)
                    })

                    userIds = _.uniq(userIds);
                }


                let schoolIds = await this.entityAssessorsTrackers.filterByDate(req.query, userIds, programDocument._id);

                let schoolObjectIds = _.uniq(schoolIds).map(schoolId => ObjectId(schoolId));

                let schoolQueryObject = {};
                schoolQueryObject._id = { $in: schoolObjectIds };

                _.merge(schoolQueryObject, this.getQueryObject(req.query))
                let totalCount = database.models.schools.countDocuments(schoolQueryObject).exec();
                let filteredSchoolDocument;

                let limitValue = (pagination == false) ? "" : req.pageSize;
                let skipValue = (pagination == false) ? "" : (req.pageSize * (req.pageNo - 1));

                filteredSchoolDocument = database.models.schools.find(schoolQueryObject, { _id: 1, name: 1, externalId: 1 }).limit(limitValue).skip(skipValue).lean().exec();

                [filteredSchoolDocument, totalCount] = await Promise.all([filteredSchoolDocument, totalCount])

                let schoolDocumentFilteredObject = filteredSchoolDocument.map(school => {
                    return {
                        id: school._id,
                        name: school.name,
                        externalId: school.externalId
                    }
                });

                return resolve({ result: schoolDocumentFilteredObject, totalCount: totalCount });

            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
                    errorObject: error
                });
            }
        })
    }

    async getProgram(programExternalId) {
        return new Promise(async (resolve, reject) => {
            try {

                if (!programExternalId)
                    throw { status: 400, message: 'Program id required.' }

                let programDocument = await database.models.programs.findOne({ externalId: programExternalId }, {
                    _id: 1, name: 1, "solutions": 1
                }).lean();

                if (!programDocument) {
                    throw { status: 400, message: 'Program not found for given params.' }
                }

                let solutionDocument = await database.models.solutions.findOne({ _id: programDocument.solutions[0] }, {
                    "entities": 1
                }).lean();

                programDocument["entities"] = solutionDocument.entities

                return resolve(programDocument);

            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
                    errorObject: error
                });
            }

        })
    }

    async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms)
        })
    }

    getQueryObject(requestQuery) {
        let queryObject = {};
        let queries = Object.keys(requestQuery);
        let filteredQueries = _.pullAll(queries, ['csv', 'fromDate', 'toDate', 'assessorName', 'linkId', 'ProgramId']);

        filteredQueries.forEach(query => {
            if (query == "area") {
                queryObject["$or"] = [{ zoneId: new RegExp(requestQuery.area, 'i') }, { districtName: new RegExp(requestQuery.area, 'i') }];
            } else if (query == "schoolName") {
                queryObject["name"] = new RegExp(requestQuery.schoolName, 'i')
            } else {
                if (requestQuery[query]) queryObject[query] = requestQuery[query];
            }
        })
        return queryObject;
    }
};