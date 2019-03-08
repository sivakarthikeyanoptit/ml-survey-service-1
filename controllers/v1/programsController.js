const moment = require("moment-timezone");

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

        let programDocument = await database.models.programs.findOne({ externalId: programExternalId }, {
          name: 1,
          "components.schools": 1,
          "components.roles": 1
        }).lean();

        if (!programDocument) {
          return resolve({
            status: 400,
            message: 'Program not found for given params.'
          })
        }

        let userRole = 'leadAssessors' || gen.utils.getUserRole(req, true);

        let roleToBeChecked;

        if (userRole == 'leadAssessors') { roleToBeChecked = 'assessors' } 
        else if (userRole == 'programManagers') { roleToBeChecked = 'leadAssessors' } 
        else {
          return resolve({
            status: 400,
            message: "You are not authorized to take this report."
          });
        }

        let assessorIds = programDocument.components[0].roles[roleToBeChecked].users;

        let assessorDetails = await database.models.schoolAssessors.find({ userId: { $in: assessorIds } }, { schools: 1, name: 1 }).lean();

        let schoolDataByAssessors = assessorDetails.map(assessor => {
          return database.models.submissions.find({ schoolId: { $in: assessor.schools } }, { status: 1 }).lean().exec()
        })

        let result = {};

        await Promise.all(schoolDataByAssessors).then(data => {
          let assessorsReports = [];
          assessorDetails.forEach((assessor, index) => {
            let schoolData = _.countBy(data[index], 'status')
            assessorsReports.push({
              name: assessor.name || null,
              schoolsInporgress: schoolData.inprogress || null,
              schoolsCompleted: schoolData.completed || null
            })
          })
          result.assessorsReport = assessorsReports;
          return resolve({ result: result })
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

        let programDocument = await database.models.programs.findOne({ externalId: programExternalId }, {
          name: 1,
          "components.schools": 1,
          "components.roles": 1
        }).lean();

        if (!programDocument) {
          return resolve({
            status: 400,
            message: 'Program not found for given params.'
          })
        }

        let schoolIds = programDocument.components[0].schools;

        if (!schoolIds.length) {
          return resolve({
            status: 400,
            message: 'No schools found for given program id.'
          })
        }

        let schoolDocuments = await database.models.submissions.find({ schoolId: { $in: schoolIds } }, { status: 1, "schoolInformation.name": 1 }).lean();

        let result = {};

        let schoolStatusObject = {
          inprogress: 'In Progress',
          completed: 'Complete',
          blocked: 'Blocked',
          started: 'Started'
        }

        schoolDocuments.forEach(singleSchoolDocument => {
          singleSchoolDocument.status = schoolStatusObject[singleSchoolDocument.status] || singleSchoolDocument.status;
          singleSchoolDocument.name = singleSchoolDocument.schoolInformation.name;
          delete singleSchoolDocument.schoolInformation;
        })

        result.schoolsReport = schoolDocuments;

        return resolve({ result: result })

      } catch (error) {

        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });

      }
    })
  }

  async schoolDetails(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let programExternalId = req.params._id;

        let programDocument = await database.models.programs.findOne({ externalId: programExternalId }, {
          name: 1,
          "components.schools": 1,
          "components.roles": 1
        }).lean();

        if (!programDocument) {
          return resolve({
            status: 400,
            message: 'Program not found for given params.'
          })
        }

        let schoolIds = programDocument.components[0].schools;

        if (!schoolIds.length) {
          return resolve({
            status: 400,
            message: 'No schools found for given program id.'
          })
        }

        let result = {};

        let schoolDocuments = await database.models.submissions.find({ schoolId: { $in: schoolIds } }, { status: 1 }).lean();

        let schoolDocumentByStatus = _.countBy(schoolDocuments, 'status');

        result.schoolsAssigned = schoolIds.length;
        result.managerName = "";
        result.createdDate = moment().format('DD-MM-YYYY');
        result.schoolsInporgress = schoolDocumentByStatus.inprogress || 0;
        result.schoolsCompleted = schoolDocumentByStatus.completed || 0;
        result.schoolsNotYetStarted = schoolIds.length - (schoolDocumentByStatus.blocked || 0 + schoolDocumentByStatus.started || 0 + schoolDocumentByStatus.completed || 0 + schoolDocumentByStatus.inprogress || 0);

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

};