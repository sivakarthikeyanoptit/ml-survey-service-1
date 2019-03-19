const moment = require("moment-timezone");
const FileStream = require(ROOT_PATH + "/generics/fileStream");
module.exports = class Programs extends Abstract {
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
    super(programsSchema);
  }

  static get name() {
    return "programs";
  }

  find(req) {
    return super.find(req);
  }


  /**
* @api {get} /assessment/api/v1/programs/listByUser List all the programs which is part of the current user
* @apiVersion 0.0.1
* @apiName Fetch Program List By User
* @apiGroup Program
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
* @api {get} /assessment/api/v1/programs/list/ List all the programs
* @apiVersion 0.0.1
* @apiName Fetch Program List
* @apiGroup Program
* @apiUse successBody
* @apiUse errorBody
*/

  async list(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let programDocument = await database.models.programs.aggregate([
          // { "$addFields": { "assessmentObjectId": "$components.id" } },
          {
            $lookup: {
              from: "evaluationFrameworks",
              localField: "components.id",
              foreignField: "_id",
              as: "assessments"
            }
          },
          {
            $project: {
              externalId: 1,
              name: 1,
              description: 1,
              "assessments._id": 1,
              "assessments.externalId": 1,
              "assessments.name": 1,
              "assessments.description": 1
            }
          }
        ])

        if (!programDocument) {
          return reject({
            status: 404,
            message: "No programs data"
          })
        }

        let responseMessage = "Program information list fetched successfully."

        let response = { message: responseMessage, result: programDocument };

        return resolve(response);

      }
      catch (error) {
        return reject({ message: error });
      }
    })

  }

  async programDocument(programIds = "all", fields = "all", pageIndex = "all", pageSize = "all") {
    let queryObject = {}

    if (programIds != "all") {
      queryObject = {
        _id: {
          $in: programIds
        }
      }
    }

    let projectionObject = {}

    if (fields != "all") {
      fields.forEach(element => {
        projectionObject[element] = 1
      });
    }

    let pageIndexValue = 0;
    let limitingValue = 0;

    if (pageIndex != "all" && pageSize !== "all") {
      pageIndexValue = (pageIndex - 1) * pageSize;
      limitingValue = pageSize;
    }

    let programDocuments = await database.models.programs.find(queryObject, projectionObject).skip(pageIndexValue).limit(limitingValue)
    return programDocuments
  }

  /**
* @api {get} /assessment/api/v1/programs/schoolList/ Fetch School List
* @apiVersion 0.0.1
* @apiName Fetch School List 
* @apiGroup Program
* @apiParam {String} ProgramId Program ID.
* @apiParam {String} Page Page.
* @apiParam {String} Limit Limit.
* @apiUse successBody
* @apiUse errorBody
*/

  async schoolList(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let programId = req.query.programId;
        let componentId = req.query.componentId;

        if (!programId) {
          throw "Program id is missing"
        }

        if (!componentId) {
          throw "Component Id is missing"
        }

        let schoolName = {};
        let schoolExternalId = {};

        if (req.searchText != "") {
          schoolName['schoolInformation.name'] = new RegExp((req.searchText), "i");
          schoolExternalId['schoolInformation.externalId'] = new RegExp((req.searchText), "i");
        }

        let programDocument = await database.models.programs.aggregate([
          {
            $match: {
              _id: ObjectId(programId)
            }
          },
          {
            $unwind: "$components"
          }, {
            $match: {
              "components.id": ObjectId(componentId)
            }
          }, { "$addFields": { "schoolIdInObjectIdForm": "$components.schools" } },
          {
            $lookup: {
              from: "schools",
              localField: "schoolIdInObjectIdForm",
              foreignField: "_id",
              as: "schoolInformation"
            }
          },
          {
            $project: {
              "schoolInformation._id": 1,
              "schoolInformation.externalId": 1,
              "schoolInformation.name": 1,
              "_id": 0
            }
          },
          { $unwind: "$schoolInformation" },
          { $match: { $or: [schoolName, schoolExternalId] } },
          {
            $facet: {
              "totalCount": [
                { "$count": "count" }
              ],
              "schoolInformationData": [
                { $skip: req.pageSize * (req.pageNo - 1) },
                { $limit: req.pageSize }
              ],
            }
          }
        ])

        if (!programDocument) {
          throw "Bad request"
        }

        let result = {};
        let schoolInformation = [];

        result["totalCount"] = programDocument[0].totalCount[0].count;

        programDocument[0].schoolInformationData.forEach(eachSchoolData => {
          schoolInformation.push(eachSchoolData.schoolInformation)
        })

        result["schoolInformation"] = schoolInformation;

        return resolve({ message: "List of schools fetched successfully", result: result })
      }
      catch (error) {
        return reject({
          status: 400,
          message: error
        })
      }
    })
  }

  /**
* @api {get} /assessment/api/v1/programs/userList/ Fetch User List
* @apiVersion 0.0.1
* @apiName Fetch User List 
* @apiGroup Program
* @apiParam {String} ProgramId Program ID.
* @apiParam {String} Page Page.
* @apiParam {String} Limit Limit.
* @apiUse successBody
* @apiUse errorBody
*/

  async userList(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let programId = req.query.programId

        if (!programId) {
          throw "Program id is missing"
        }

        let componentId = req.query.componentId

        if (!componentId) {
          throw "Component id is missing"
        }

        let assessorName = {};
        let assessorExternalId = {};

        if (req.searchText != "") {
          assessorName["assessorInformation.name"] = new RegExp((req.searchText), "i");
          assessorExternalId["assessorInformation.externalId"] = new RegExp((req.searchText), "i");
        }

        let programDocument = await database.models.programs.aggregate([
          {
            $match: {
              _id: ObjectId(programId)
            }
          }, {
            $unwind: "$components"
          }, {
            $match: {
              "components.id": ObjectId(componentId)
            }
          }, {
            "$addFields": { "schoolIdInObjectIdForm": "$components.schools" }
          },
          {
            $lookup: {
              from: "schoolAssessors",
              localField: "schoolIdInObjectIdForm",
              foreignField: "schools",
              as: "assessorInformation"
            }
          },
          {
            $project: {
              "assessorInformation.schools": 0,
              "assessorInformation.deleted": 0
            }
          },
          { $unwind: "$assessorInformation" },
          { $match: { $or: [assessorName, assessorExternalId] } },
          {
            $facet: {
              "totalCount": [
                { "$count": "count" }
              ],
              "assessorInformationData": [
                { $skip: req.pageSize * (req.pageNo - 1) },
                { $limit: req.pageSize }
              ],
            }
          },
        ])

        if (!programDocument) {
          throw "Bad request"
        }

        let result = {};
        let assessorInformation = [];

        result["totalCount"] = programDocument[0].totalCount[0].count;

        programDocument[0].assessorInformationData.forEach(eachAssessor => {
          assessorInformation.push(eachAssessor.assessorInformation)
        })

        result["assessorInformation"] = assessorInformation;

        return resolve({
          message: "List of assessors fetched successfully",
          result: result
        })

      }
      catch (error) {
        return reject({
          status: 400,
          message: error
        })
      }
    })
  }

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

        let userRole = gen.utils.getUserRole(req, false);

        let roleToBeChecked;

        if (userRole == 'LEAD_ASSESSOR') { roleToBeChecked = 'ASSESSOR' }
        else if (userRole == 'PROGRAM_MANAGER') { roleToBeChecked = 'LEAD_ASSESSOR' }
        else {
          return resolve({
            status: 400,
            message: "You are not authorized to take this report."
          });
        }

        let queryObject = [
          {$project:{userId:1,parentId:1,name: 1,schools: 1,role:1,programId:1}},
          { $match: { userId:req.userDetails.id, programId: programDocument._id } },
          {
            $graphLookup: {
              from: 'schoolAssessors',
              startWith: '$userId',
              connectFromField: 'userId',
              connectToField: 'parentId',
              maxDepth: 2,
              as: 'children'
            }
          },
          { $unwind: "$children" },
          { $match: { "children.role": roleToBeChecked } },
          { $project: { "userId": "$children.userId", name: "$children.name", schools: "$children.schools" } }
        ];
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
        } else {
          queryObject.push({ $skip: req.pageSize * (req.pageNo - 1) })
          queryObject.push({ $limit: req.pageSize })
        }

        let assessorDetails = await database.models.schoolAssessors.aggregate(queryObject);

        let submissionQueryObject = {};
        if (req.query.fromDate) {
          submissionQueryObject.completedDate = {};
          submissionQueryObject.completedDate["$gte"] = req.query.fromDate;
          submissionQueryObject.completedDate["$lte"] = req.query.toDate;
        }
        let submissionDataByAssessors = assessorDetails.map(assessor => {
          submissionQueryObject.schoolId = { $in: assessor.schools };
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
            if (req.query.csv == "true"){
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

  async schoolReport(req) {
    return new Promise(async (resolve, reject) => {
      try {
        let programExternalId = req.params._id;

        let schoolObjectIds = await this.getSchoolIdsByProgramId(req);

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
        if (req.query.fromDate) {
          submissionQueryObject.completedDate = {};
          submissionQueryObject.completedDate["$gte"] = req.query.fromDate;
          submissionQueryObject.completedDate["$lte"] = req.query.toDate;
        }

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

        result.schoolsReport=[];
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
          }else{
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
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });

      }
    })
  }

  async schoolSummary(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let schoolObjectIds = await this.getSchoolIdsByProgramId(req);

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
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });

      }
    })
  }

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

          result.schoolTypes = schoolTypes.map(schoolType=>{
            return {
              key:schoolType,
              value:schoolType
            }
          })
          
          result.administrationTypes = administrationTypes.map(administrationType=>{
            return {
              key:administrationType,
              value:administrationType
            }
          })

          return resolve({
            message: 'Reports filter fetched successfully.',
            result: result
          })
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

  async getSchoolIdsByProgramId(req){
    return new Promise(async (resolve,reject)=>{
      try {

        let programDocument = await database.models.programs.findOne({ externalId: req.params._id }, {
          _id: 1
        }).lean();

        if (!programDocument) {
          return resolve({
            status: 400,
            message: 'Program not found for given params.'
          })
        }

        if (gen.utils.getUserRole(req, true) == 'assessors') {
          return resolve({
            status: 400,
            message: "You are not authorized to take this report."
          });
        }

        let queryObject = [
          { $project: { userId: 1, parentId: 1, name: 1, schools: 1,programId: 1 } },
          { $match: { userId: req.userDetails.id, programId: programDocument._id } },
          {
            $graphLookup: {
              from: 'schoolAssessors',
              startWith: '$userId',
              connectFromField: 'userId',
              connectToField: 'parentId',
              maxDepth: 2,
              as: 'children'
            }
          },
          {
            $project: { schools: 1, "children.schools": 1 }
          }
        ];

        let schoolsAssessorDocuments = await database.models.schoolAssessors.aggregate(queryObject);

        if (!schoolsAssessorDocuments.length) {
          return resolve({
            status: 400,
            message: 'No documents found for given params.'
          })
        }

        let schoolIds = [];

        schoolsAssessorDocuments[0].schools.forEach(school => {
          let schoolId = school.toString();
          if (!schoolIds.includes(schoolId)) {
            schoolIds.push(schoolId);
          }
        })
        schoolsAssessorDocuments[0].children.forEach(child => {
          child.schools.forEach(school => {
            let schoolId = school.toString();
            if (!schoolIds.includes(schoolId)) {
              schoolIds.push(schoolId);
            }
          })
        })

        let schoolObjectIds = schoolIds.map(schoolId => ObjectId(schoolId));

        return resolve(schoolObjectIds);
        
      } catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
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