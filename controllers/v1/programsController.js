const submissionsHelper = require(MODULES_BASE_PATH + "/submissions/helper");
const insightsHelper = require(MODULES_BASE_PATH + "/insights/helper");
const solutionsHelper = require(MODULES_BASE_PATH + "/solutions/helper");
module.exports = class Programs extends Abstract {

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
  * @api {get} /assessment/api/v1/programs/list List all the programs
  * @apiVersion 1.0.0
  * @apiName Fetch Program List
  * @apiGroup Program
  * @apiParamExample {json} Response:
    "result": [
      {
        "_id": "5b98d7b6d4f87f317ff615ee",
        "externalId": "PROGID01",
        "name": "DCPCR School Development Index 2018-19",
        "description": "DCPCR School Development Index 2018-19",
        "assessments": [
          {
            "_id": "5b98fa069f664f7e1ae7498c",
            "externalId": "EF-DCPCR-2018-001",
            "name": "DCPCR Assessment Framework 2018",
            "description": "DCPCR Assessment Framework 2018"
          }
        ]
      }
    ]
  * @apiUse successBody
  * @apiUse errorBody
  */

  async list(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let programDocument = await database.models.programs.aggregate([
          {
            $lookup: {
              from: "solutions",
              localField: "components",
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

        let response = { message: "Program information list fetched successfully.", result: programDocument };

        return resolve(response);

      }
      catch (error) {
        return reject({ message: error });
      }
    })

  }

  /**
  * @api {get} /assessment/api/v1/programs/entityList?solutionId=""&search="" Fetch Entity List
  * @apiVersion 1.0.0
  * @apiName Fetch Entity List 
  * @apiGroup Program
  * @apiParam {String} solutionId Solution ID.
  * @apiParam {String} Page Page.
  * @apiParam {String} Limit Limit.
  * @apiSampleRequest /assessment/api/v1/programs/entityList?solutionId=5c5693fd28466d82967b9429&search=
  * @apiParamExample {json} Response:
    "result": {
        "totalCount": 54,
        "entityInformation": [
          {
            "externalId": "EXC1001",
            "addressLine1": "Chaitanya Nagar, Gajuwaka, Visakhapatnam, Andhra Pradesh",
            "name": "Chalapathi School",
            "administration": "",
            "status": ""
          }
        ]
      }  
  * @apiUse successBody
  * @apiUse errorBody
  */

  async entityList(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let solutionId = req.query.solutionId;

        let result = {};

        let solutionDocument = await database.models.solutions.findOne({ _id: ObjectId(solutionId) }, { "entities": 1 }).lean()

        let limitValue = (!req.pageSize) ? "" : req.pageSize;
        let skipValue = (!req.pageNo) ? "" : (req.pageSize * (req.pageNo - 1));

        let queryObject = {};
        queryObject["_id"] = { $in: solutionDocument.entities };
        if (req.searchText != "") {
          queryObject["$or"] = [{ "metaInformation.name": new RegExp(req.searchText, 'i') }, { "metaInformation.externalId": new RegExp(req.searchText, 'i') }];
        }

        let entityDocuments = await database.models.entities.find(queryObject, {
          "metaInformation.name": 1, "metaInformation.addressLine1": 1, "metaInformation.administration": 1, "metaInformation.externalId": 1
        }).limit(limitValue).skip(skipValue).lean();

        let totalCount = await database.models.entities.countDocuments(queryObject);

        let submissionDocument = await database.models.submissions.find({ entityId: { $in: entityDocuments.map(entity => entity._id) } }, { status: 1, entityId: 1 }).lean()

        let submissionEntityMap = _.keyBy(submissionDocument, 'entityId');

        result["totalCount"] = totalCount;

        result["entityInformation"] = entityDocuments.map(eachEntityDocument => {
          let status = submissionEntityMap[eachEntityDocument._id.toString()] ? submissionEntityMap[eachEntityDocument._id.toString()].status : ""
          return {
            "externalId": eachEntityDocument.metaInformation.externalId,
            "addressLine1": eachEntityDocument.metaInformation.addressLine1,
            "name": eachEntityDocument.metaInformation.name,
            "administration": eachEntityDocument.metaInformation.administration,
            "status": submissionsHelper.mapSubmissionStatus(status) || status
          }
        })

        return resolve({ message: "List of entities fetched successfully", result: result })
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
  * @api {get} /assessment/api/v1/programs/userEntityList?solutionId="" Fetch User Entity List
  * @apiVersion 1.0.0
  * @apiName Fetch User Entity List 
  * @apiGroup Program
  * @apiParam {String} SolutionId Solution ID.
  * @apiParam {String} Page Page.
  * @apiParam {String} Limit Limit.
  * @apiSampleRequest /assessment/api/v1/programs/userEntityList?solutionId=5b98fa069f664f7e1ae7498c
  * @apiParamExample {json} Response:
  * "result": {
        "entities": [
          {
           "_id": "5bfe53ea1d0c350d61b78d3d",
           "isSingleEntityHighLevel": true,
           "isSingleEntityDrillDown": true,
           "externalId": "1412153",
           "addressLine1": "Karam Vihar Hari Enclave Sultan Puri",
           "addressLine2": "",
           "city": "Urban",
           "name": "Nav Jyoti Public School, Karam Vihar Hari Enclave Sultan Puri Delhi"
          }
        ]
      }
  * @apiUse successBody
  * @apiUse errorBody
  */

  async userEntityList(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let solutionId = req.query.solutionId;

        let solutionDocument = await database.models.solutions.findOne({ _id: ObjectId(solutionId) }, {
          _id: 1, entities: 1, programExternalId: 1
        }).lean();

        let entityAssessorQueryObject = [
          {
            $match: {
              userId: req.userDetails.userId,
              solutionId: solutionDocument._id
            }
          },
          {
            $lookup: {
              from: "entities",
              localField: "entities",
              foreignField: "_id",
              as: "entityDocuments"
            }
          },
          {
            $project: {
              "entities": 1,
              "entityDocuments._id": 1,
              "entityDocuments.metaInformation.externalId": 1,
              "entityDocuments.metaInformation.name": 1,
              "entityDocuments.metaInformation.addressLine1": 1,
              "entityDocuments.metaInformation.addressLine2": 1,
              "entityDocuments.metaInformation.city": 1,
              "entityDocuments.state": 1
            }
          }
        ];

        const assessorsDocument = await database.models.entityAssessors.aggregate(entityAssessorQueryObject)

        let entityIds = assessorsDocument[0].entityDocuments.map(eachEntityDocument => eachEntityDocument._id)

        let insightDocument = await insightsHelper.insightsDocument(solutionDocument.programExternalId, entityIds);

        let singleEntityDrillDown

        if (insightDocument.length > 0) {
          let solutionDocument = await solutionsHelper.checkIfSolutionIsRubricDriven(insightDocument[0].solutionId)

          singleEntityDrillDown = solutionDocument ? true : false;

        }

        assessorsDocument[0].entityDocuments.forEach(eachEntityDocument => {
          if (insightDocument.length > 0 && insightDocument.some(eachInsight => eachInsight.entityId.toString() == eachEntityDocument._id.toString())) {
            eachEntityDocument["isSingleEntityHighLevel"] = true
            eachEntityDocument["isSingleEntityDrillDown"] = singleEntityDrillDown
          } else {
            eachEntityDocument["isSingleEntityHighLevel"] = false
            eachEntityDocument["isSingleEntityDrillDown"] = false
          }
          eachEntityDocument = _.merge(eachEntityDocument, { ...eachEntityDocument.metaInformation })
          delete eachEntityDocument.metaInformation
        })


        return resolve({
          message: "Entity list fetched successfully",
          result: {
            entities: assessorsDocument[0].entityDocuments
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
  * @api {get} /assessment/api/v1/programs/userList?solutionId=:solutionInternalId&search=:searchText&page=:page&limit=:limit Fetch User List
  * @apiVersion 1.0.0
  * @apiName Fetch User Entity List 
  * @apiGroup Program
  * @apiParam {String} ProgramId Program ID.
  * @apiParam {String} Page Page.
  * @apiParam {String} Limit Limit.
  * @apiSampleRequest /assessment/api/v1/programs/userList?solutionId=5b98fa069f664f7e1ae7498c&search=&page=1&limit=1
  * @apiParamExample {json} Response:
    "result": {
      "totalCount": 3055,
      "assessorInformation": [
      {
        "_id": "5bfe69021d0c350d61b78e68",
        "userId": "32172a5c-8bfe-4520-9089-355de77aac71",
        "__v": 0,
        "createdAt": "2019-01-01T00:00:00.000Z",
        "createdBy": "e7719630-0457-47ca-a5ce-8190ffb34f13",
        "externalId": "SPM001",
        "parentId": "",
        "programId": "5c9d0937a43629432ce631db",
        "role": "PROGRAM_MANAGER",
        "updatedAt": "2019-01-01T00:00:00.000Z",
        "updatedBy": "e7719630-0457-47ca-a5ce-8190ffb34f13",
        "solutionId": null,
        "entityTypeId": "5ce23d633c330302e720e65f",
        "entityType": "school"
      }
        ]
      }
  * @apiUse successBody
  * @apiUse errorBody
  */

  async userList(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let solutionId = req.query.solutionId
        let assessorName = {};
        let assessorExternalId = {};

        if (req.searchText != "") {
          assessorName["assessorInformation.name"] = new RegExp((req.searchText), "i");
          assessorExternalId["assessorInformation.externalId"] = new RegExp((req.searchText), "i");
        }

        let solutionDocument = await database.models.solutions.aggregate([
          {
            $match: {
              _id: ObjectId(solutionId)
            }
          },
          {
            $project: {
              "entities": 1
            }
          },
          {
            "$addFields": { "entityIdInObjectIdForm": "$entities" }
          },
          {
            $lookup: {
              from: "entityAssessors",
              localField: "entityIdInObjectIdForm",
              foreignField: "entities",
              as: "assessorInformation"
            }
          },
          {
            $project: {
              "assessorInformation.entities": 0,
              "assessorInformation.deleted": 0
            }
          },
          {
            $unwind: "$assessorInformation"
          },
          {
            $match: { $or: [assessorName, assessorExternalId] }
          },
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

        if (!solutionDocument) throw "Bad request";

        let result = {};

        result["totalCount"] = solutionDocument[0].totalCount[0].count;

        result["assessorInformation"] = solutionDocument[0].assessorInformationData.map(eachAssessor => eachAssessor.assessorInformation)

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
  * @api {get} /assessment/api/v1/programs/entityBlocks?solutionId="" Fetch Zone
  * @apiVersion 1.0.0
  * @apiName Fetch Zone 
  * @apiGroup Program
  * @apiParam {String} SolutionId Solution ID.
  * @apiParam {String} Page Page.
  * @apiParam {String} Limit Limit.
  * @apiSampleRequest /assessment/api/v1/programs/entityBlocks?solutionId=5b98fa069f664f7e1ae7498c
  * @apiParamExample {json} Response:
  * "result": {
      "zones": [
        {
         "id": "7",
         "label": "Zone - 7"
        },
        {
          "id": "8",
          "label": "Zone - 8"
        }
      ]
    }
  * @apiUse successBody
  * @apiUse errorBody
  */

  async entityBlocks(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let solutionId = req.query.solutionId

        let solutionDocument = await database.models.solutions.findOne({ _id: ObjectId(solutionId) }, {
          _id: 1, "entities": 1
        }).lean();

        if (!solutionDocument) throw "Bad request"

        let distinctEntityBlocks = await database.models.entities.distinct('metaInformation.blockId', { _id: { $in: solutionDocument.entities } }).lean();

        let result = {};

        result["zones"] = distinctEntityBlocks.map((zoneId) => {
          return {
            id: zoneId,
            label: 'Zone - ' + zoneId
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
  * @api {get} /assessment/api/v1/programs/blockEntity?solutionId=""&blockId="" Block Entity
  * @apiVersion 1.0.0
  * @apiName Block Entity 
  * @apiGroup Program
  * @apiParam {String} SolutionId Solution ID.
  * @apiParam {String} Page Page.
  * @apiParam {String} Limit Limit.
  * @apiSampleRequest /assessment/api/v1/programs/blockEntity?solutionId=5b98fa069f664f7e1ae7498c&blockId=1
  * @apiParamExample {json} Response:
  * "result": {
      "entities": [
        {
          "_id": "5bfe53ea1d0c350d61b78e4a",
          "name": "Govt. Girls Sr. Sec. School, Nicholson Road, Delhi",
          "externalId": "1207043",
          "addressLine1": "Nicholson Road",
          "addressLine2": "",
          "city": "Urban",
          "isSingleEntityHighLevel": true,
          "isSingleEntityDrillDown": true
        }
      ]
    }
  * @apiUse successBody
  * @apiUse errorBody
  */

  async blockEntity(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let solutionId = req.query.solutionId;
        let blockId = req.query.blockId;

        let solutionDocument = await database.models.solutions.findOne({ _id: ObjectId(solutionId) }, {
          _id: 1, "entities": 1, programExternalId: 1
        }).lean();

        if (!solutionDocument) throw "Bad request"

        let entitiesInBlock = await database.models.entities.aggregate([
          {
            $match: {
              _id: { $in: solutionDocument.entities },
              "metaInformation.blockId": blockId
            },
          },
          {
            $project:
            {
              _id: 1,
              name: "$metaInformation.name",
              externalId: "$metaInformation.externalId",
              addressLine1: "$metaInformation.addressLine1",
              addressLine2: "$metaInformation.addressLine2",
              city: "$metaInformation.city"
            }
          }
        ])

        let entitiesIdArray = entitiesInBlock.map(eachEntitiesInBlock => eachEntitiesInBlock._id)

        let insightDocument = await insightsHelper.insightsDocument(solutionDocument.programExternalId, entitiesIdArray);

        let singleEntityDrillDown

        if (insightDocument.length > 0) {
          let solutionDocument = await solutionsHelper.checkIfSolutionIsRubricDriven(insightDocument[0].solutionId)
          singleEntityDrillDown = solutionDocument ? true : false;
        }

        let result = {};

        entitiesInBlock.forEach(eachEntityInBlock => {
          if (insightDocument.length > 0 && insightDocument.some(eachInsight => eachInsight.entityId.toString() == eachEntityInBlock._id.toString())) {
            eachEntityInBlock["isSingleEntityHighLevel"] = true
            eachEntityInBlock["isSingleEntityDrillDown"] = singleEntityDrillDown
          } else {
            eachEntityInBlock["isSingleEntityHighLevel"] = false
            eachEntityInBlock["isSingleEntityDrillDown"] = false
          }
        })

        result["entities"] = entitiesInBlock

        return resolve({
          message: "List of entities fetched successfully",
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