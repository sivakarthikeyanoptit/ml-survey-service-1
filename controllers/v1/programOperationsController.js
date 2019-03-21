const moment = require("moment-timezone");
const FileStream = require(ROOT_PATH + "/generics/fileStream");
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

                let programQuery = {
                    $or: [
                        { "components.roles.assessors.users": req.userDetails.id },
                        { "components.roles.leadAssessors.users": req.userDetails.id },
                        { "components.roles.projectManagers.users": req.userDetails.id },
                        { "components.roles.programManagers.users": req.userDetails.id }
                    ]
                }

                let programProject = {
                    externalId: 1,
                    name: 1,
                    description: 1,
                };

                let programDocuments = await database.models.programs.find(programQuery, programProject).lean();
                let responseMessage;
                let response;

                if (!programDocuments.length) {

                    responseMessage = "No programs data found for given params.";
                    response = { status: 404, message: responseMessage };

                } else {

                    responseMessage = "Program information list fetched successfully.";
                    response = { message: responseMessage, result: programDocuments };

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

    /**
  * @api {get} /assessment/api/v1/programOperations/assessorReport 
  * @apiVersion 0.0.1
  * @apiName Fetch Assessor Report
  * @apiGroup programOperations
  * @apiUse successBody
  * @apiUse errorBody
  */

    async assessorReport(req) {
        return new Promise(async (resolve, reject) => {
            try {

                let programExternalId = req.params._id;

                if (!req.query.csv) {
                    return resolve({
                        status: 400,
                        message: 'Bad request.'
                    })
                }

                let programDocument = await database.models.programs.findOne({ externalId: programExternalId }, {
                    _id: 1,
                }).lean();

                if (!programDocument) {
                    return resolve({
                        status: 400,
                        message: 'Program not found for given params.'
                    })
                }

                let assessorDetails;
                let assessorQueryObject = {};
                
                assessorQueryObject["parentId"] = req.userDetails.id;
                if(req.query.assessorName) assessorQueryObject["name"] = new RegExp(req.query.assessorName, 'i');
                
                if (req.query.csv == "true") {
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
                    assessorDetails = await database.models.schoolAssessors.find(assessorQueryObject, { userId: 1, name: 1, schools: 1 }).lean();
                } else {
                    assessorDetails = await database.models.schoolAssessors.find(assessorQueryObject, { userId: 1, name: 1, schools: 1 }).limit(req.pageSize).skip(req.pageSize * (req.pageNo - 1)).lean();
                }

                let schoolQueryObject = {};

                if (req.query.type) schoolQueryObject["schoolTypes"] = req.query.type;
                if (req.query.administration) schoolQueryObject["administration"] = req.query.administration;
                if (req.query.schoolId) schoolQueryObject["externalId"] = req.query.schoolId;
                if (req.query.address) schoolQueryObject["$or"] = [{ addressLine1: new RegExp(req.query.address, 'i') }, { addressLine2: new RegExp(req.query.address, 'i') }];
                if (req.query.search) schoolQueryObject["name"] = new RegExp(req.query.search, 'i');

                let filteredSchools = await Promise.all(assessorDetails.map(assessor => {
                    schoolQueryObject._id = { $in: assessor.schools };
                    return database.models.schools.find(schoolQueryObject, { _id: 1 }).lean().exec();
                }))

                let submissionQueryObject = {};
                let submissionDataByAssessors = assessorDetails.map((assessor, index) => {
                    submissionQueryObject.schoolId = { $in: filteredSchools[index] };
                    return database.models.submissions.find(submissionQueryObject, { status: 1, createdAt: 1, completedDate: 1 }).lean().exec()
                })


                function getAverageTimeTaken(submissionData) {
                    let result = submissionData.filter(data => data.status == 'completed');
                    if (result.length) {
                        let dayDifference = []
                        result.forEach(singleResult => {
                            let startedDate = moment(singleResult.createdAt);
                            let completedDate = moment(singleResult.completedDate);
                            dayDifference.push(completedDate.diff(startedDate, 'days'))
                        })
                        return dayDifference.reduce((a, b) => a + b, 0) / dayDifference.length;
                    } else {
                        return 'N/A'
                    }
                }

                let result = {};

                await Promise.all(submissionDataByAssessors).then(async (submissionData) => {
                    let assessorsReports = [];
                    assessorDetails.forEach(async (assessor, index) => {
                        let schoolData = _.countBy(submissionData[index], 'status')
                        let schoolAssigned = submissionData[index].length;
                        let assessorResult = {
                            name: assessor.name || null,
                            schoolsAssigned: schoolAssigned || null,
                            schoolsCompleted: schoolData.completed || null,
                            schoolsCompletedPercent: (schoolData.completed / schoolAssigned) ? ((schoolData.completed / schoolAssigned) * 100).toFixed(2) + '%' || null : null,
                            averageTimeTaken: getAverageTimeTaken(submissionData[index])
                        }
                        assessorsReports.push(assessorResult)
                        if (req.query.csv == "true") {
                            input.push(assessorResult)

                            if (input.readableBuffer && input.readableBuffer.length) {
                                while (input.readableBuffer.length > 20000) {
                                    await this.sleep(2000)
                                }
                            }

                        }
                    })
                    if (req.query.csv == "true") {
                        input.push(null);
                    } else {
                        result.assessorsReport = assessorsReports;
                        return resolve({ result: result })
                    }
                })

            } catch (error) {
                return reject({
                    status: 500,
                    message: "Oops! Something went wrong!",
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
        return new Promise(async (resolve, reject) => {
            try {
                let programExternalId = req.params._id;

                let schoolObjectIds = await this.getSchools(req);

                if (!schoolObjectIds.length) {
                    return resolve({
                        status: 400,
                        message: 'No schools found for given program id.'
                    })
                }

                let schoolDocuments;
                let submissionQueryObject = {};
                submissionQueryObject.schoolId = { $in: schoolObjectIds };
                submissionQueryObject.programExternalId = programExternalId;

                if (req.query.csv == "true") {

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

                    schoolDocuments = await database.models.submissions.find(submissionQueryObject, { status: 1, "schoolInformation.name": 1, createdAt: 1, completedDate: 1, 'evidencesStatus.isSubmitted': 1 }).lean();

                } else {

                    schoolDocuments = await database.models.submissions.find(submissionQueryObject, { status: 1, "schoolInformation.name": 1, createdAt: 1, completedDate: 1, 'evidencesStatus.isSubmitted': 1 }).limit(req.pageSize).skip(req.pageSize * (req.pageNo - 1)).lean();

                }

                let result = {};

                let schoolStatusObject = {
                    inprogress: 'In Progress',
                    completed: 'Complete',
                    blocked: 'Blocked',
                    started: 'Started'
                }

                function getAssessmentCompletionPercentage(evidencesStatus) {
                    let isSubmittedArray = evidencesStatus.filter(singleEvidencesStatus => singleEvidencesStatus.isSubmitted == true);
                    return Math.ceil((isSubmittedArray.length / evidencesStatus.length) * 100).toString() + '%';
                }

                result.schoolsReport = [];
                schoolDocuments.forEach(async (singleSchoolDocument) => {
                    let resultObject = {};
                    resultObject.status = schoolStatusObject[singleSchoolDocument.status] || singleSchoolDocument.status;
                    resultObject.name = singleSchoolDocument.schoolInformation.name;
                    resultObject.daysElapsed = moment().diff(moment(singleSchoolDocument.createdAt), 'days');
                    resultObject.assessmentCompletionPercent = getAssessmentCompletionPercentage(singleSchoolDocument.evidencesStatus);

                    if (req.query.csv == "true") {
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

                if (req.query.csv == "true") {
                    input.push(null)
                } else {
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
    * @api {get} /assessment/api/v1/programOperations/schoolSummary 
    * @apiVersion 0.0.1
    * @apiName Fetch School Summary
    * @apiGroup programOperations
    * @apiUse successBody
    * @apiUse errorBody
    */

    async schoolSummary(req) {
        return new Promise(async (resolve, reject) => {
            try {

                let schoolObjectIds = await this.getSchools(req);

                if (!schoolObjectIds.length) {
                    return resolve({
                        status: 400,
                        message: 'No schools found for given program id.'
                    })
                }
                let result = {};

                result.managerName = (req.userDetails.firstName + " " + req.userDetails.lastName).trim();

                let schoolDocuments = await database.models.submissions.find({ schoolId: { $in: schoolObjectIds } }, { status: 1 }).lean();

                let schoolDocumentByStatus = _.countBy(schoolDocuments, 'status');
                result.schoolsAssigned = schoolObjectIds.length;
                result.createdDate = moment().format('DD-MM-YYYY');
                result.schoolsInporgress = schoolDocumentByStatus.inprogress || 0;
                result.schoolsCompleted = schoolDocumentByStatus.completed || 0;
                result.schoolsNotYetStarted = schoolObjectIds.length - (schoolDocumentByStatus.blocked + schoolDocumentByStatus.started + schoolDocumentByStatus.completed + schoolDocumentByStatus.inprogress);

                return resolve({
                    message: 'School details fetched successfully.',
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
    * @api {get} /assessment/api/v1/programOperations/reportFilters 
    * @apiVersion 0.0.1
    * @apiName Fetch Filters(Drop down contents) for Reports
    * @apiGroup programOperations
    * @apiUse successBody
    * @apiUse errorBody
    */

    async reportFilters(req) {
        return new Promise(async (resolve, reject) => {
            try {
                let programExternalId = req.params._id;

                let programDocument = await database.models.programs.findOne({ externalId: programExternalId }, {
                    "components.schools": 1
                }).lean();

                if (!programDocument) {
                    return resolve({
                        status: 400,
                        message: 'Program not found for given params.'
                    })
                }

                let schoolTypes = await database.models.schools.distinct('schoolTypes', { _id: { $in: programDocument.components[0].schools } }).lean().exec();
                let administrationTypes = await database.models.schools.distinct('administration', { _id: { $in: programDocument.components[0].schools } }).lean().exec();
                await Promise.all([schoolTypes, administrationTypes]).then(types => {

                    let result = {};
                    let schoolTypes = _.compact(types[0]);
                    let administrationTypes = _.compact(types[1]);

                    result.schoolTypes = schoolTypes.map(schoolType => {
                        return {
                            key: schoolType,
                            value: schoolType
                        }
                    })

                    result.administrationTypes = administrationTypes.map(administrationType => {
                        return {
                            key: administrationType,
                            value: administrationType
                        }
                    })

                    return resolve({
                        message: 'Reports filter fetched successfully.',
                        result: result
                    })
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
        return new Promise(async (resolve, reject) => {
            try {
                let programExternalId = req.params._id;

                let programDocument = await database.models.programs.findOne({ externalId: programExternalId }, {
                    "components.schools": 1
                }).lean();

                if (!programDocument) {
                    throw {status:400, message:'Program not found for given params.'}
                }

                let schoolIdAndName = await database.models.schools.find({
                    externalId: new RegExp(req.query.id, 'i')
                },{externalId:1,name:1}).limit(5).lean();//autocomplete needs only 5 dataset
                
                if(!schoolIdAndName.length){
                    throw {status:400, message:'No schools found for given params.'}
                }

                return resolve({
                    status:200,
                    result:schoolIdAndName
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
    async getSchools(req) {
        return new Promise(async (resolve, reject) => {
            try {

                let programDocument = await database.models.programs.findOne({ externalId: req.params._id }, {
                    _id: 1
                }).lean();

                if (!programDocument) {
                    throw { status: 400, message: 'Program not found for given params.' };
                }

                let queryObject = [
                    { $project: { userId: 1, parentId: 1, name: 1, schools: 1, programId: 1, updatedAt: 1 } },
                    { $match: { userId: req.userDetails.id } },
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
                        $project: { schools: 1, updatedAt: 1, "children.schools": 1, "children.updatedAt": 1 }
                    }
                ];

                let schoolsAssessorDocuments = await database.models.schoolAssessors.aggregate(queryObject);

                if (!schoolsAssessorDocuments.length) {
                    throw { status: 400, message: 'No documents found for given params.' };
                }

                let schoolIds = [];

                schoolsAssessorDocuments[0].schools.forEach(school => {
                    schoolIds.push(school.toString());
                })

                schoolsAssessorDocuments[0].children.forEach(child => {
                    child.schools.forEach(school => {
                        schoolIds.push(school.toString());
                    })
                })

                let schoolObjectIds = _.uniq(schoolIds).map(schoolId => ObjectId(schoolId));

                let schoolQueryObject = {};
                schoolQueryObject._id = { $in: schoolObjectIds };
                if (req.query.type) schoolQueryObject["schoolTypes"] = req.query.type;
                if (req.query.administration) schoolQueryObject["administration"] = req.query.administration;
                if (req.query.schoolId) schoolQueryObject["externalId"] = req.query.schoolId;
                if (req.query.address) schoolQueryObject["$or"] = [{ addressLine1: new RegExp(req.query.address, 'i') }, { addressLine2: new RegExp(req.query.address, 'i') }];
                if (req.query.search) schoolQueryObject["name"] = new RegExp(req.query.search, 'i');

                let filteredSchoolDocument = await database.models.schools.find(schoolQueryObject, { _id: 1 }).lean();

                let schoolDocumentFilteredObjectIds = filteredSchoolDocument.map(school => school._id);

                return resolve(schoolDocumentFilteredObjectIds);

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
};