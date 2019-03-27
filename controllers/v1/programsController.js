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
  * @api {get} /assessment/api/v1/programs/userSchoolList/ Fetch School List
  * @apiVersion 0.0.1
  * @apiName Fetch School List 
  * @apiGroup Program
  * @apiParam {String} ProgramId Program ID.
  * @apiParam {String} Page Page.
  * @apiParam {String} Limit Limit.
  * @apiUse successBody
  * @apiUse errorBody
  */

  async userSchoolList(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let programId = req.query.programId;

        if (!programId || !req.userDetails.userId || req.userDetails.userId == "" ) {
          throw "Invalid parameters."
        }


        let programDocument = await database.models.programs.findOne({ externalId: programId }, {
          _id: 1
        }).lean();

        let assessorSchoolsQueryObject = [
          {
            $match: {
              userId: req.userDetails.userId,
              programId: programDocument._id
            }
          },
          {
            $lookup: {
              from: "schools",
              localField: "schools",
              foreignField: "_id",
              as: "schoolDocuments"
            }
          },
          {
            $project: {
              "schools": 1,
              "schoolDocuments._id": 1,
              "schoolDocuments.externalId": 1,
              "schoolDocuments.name": 1,
              "schoolDocuments.addressLine1": 1,
              "schoolDocuments.addressLine2": 1,
              "schoolDocuments.city": 1,
              "schoolDocuments.state": 1
            }
          }
        ];

        const assessorsDocument = await database.models.schoolAssessors.aggregate(assessorSchoolsQueryObject)

        return resolve({
          message: "School list fetched successfully",
          result: {
            schools : assessorsDocument[0].schoolDocuments
          }
        });

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
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


  /**
  * @api {get} /assessment/api/v1/programs/schoolBlocks/ Fetch User List
  * @apiVersion 0.0.1
  * @apiName Fetch User List 
  * @apiGroup Program
  * @apiParam {String} ProgramId Program ID.
  * @apiParam {String} Page Page.
  * @apiParam {String} Limit Limit.
  * @apiUse successBody
  * @apiUse errorBody
  */

  async schoolBlocks(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let programId = req.query.programId

        if (!programId) {
          throw "Program id is missing"
        }

        let programDocument = await database.models.programs.findOne({ externalId: programId }, {
          _id: 1, name: 1, "components.schools": 1
        }).lean();

        if (!programDocument) {
          throw "Bad request"
        }

        let distinctSchoolBlocks = await database.models.schools.distinct('blockId', { _id: { $in: programDocument.components[0].schools } }).lean().exec();

        let result = {};

        result["zones"] = distinctSchoolBlocks.map((zoneId) => { 
          return {
            id : zoneId,
            label : 'Zone - ' + zoneId
          }
        })

        return resolve({
          message: "List of zones fetched successfully",
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


  /**
  * @api {get} /assessment/api/v1/programs/blockSchools/ Fetch User List
  * @apiVersion 0.0.1
  * @apiName Fetch User List 
  * @apiGroup Program
  * @apiParam {String} ProgramId Program ID.
  * @apiParam {String} Page Page.
  * @apiParam {String} Limit Limit.
  * @apiUse successBody
  * @apiUse errorBody
  */

  async blockSchools(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let programId = req.query.programId
        let blockId = req.query.blockId

        if (!programId || !blockId) {
          throw "Invalid paramters."
        }

        let programDocument = await database.models.programs.findOne({ externalId: programId }, {
          _id: 1, name: 1, "components.schools": 1
        }).lean();

        if (!programDocument) {
          throw "Bad request"
        }

        let schoolsInBlock = await database.models.schools.find(
          { 
            _id: { $in: programDocument.components[0].schools},
            blockId: blockId
          },
          {name :1, externalId :1, addressLine1 : 1, addressLine2 : 1, city: 1}
        ).lean().exec();

        let result = {};

        result["schools"] = schoolsInBlock

        return resolve({
          message: "List of schools fetched successfully",
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

};