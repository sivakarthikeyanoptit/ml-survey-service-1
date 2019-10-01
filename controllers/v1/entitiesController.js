const csv = require("csvtojson");
const entitiesHelper = require(ROOT_PATH + "/module/entities/helper")
const FileStream = require(ROOT_PATH + "/generics/fileStream");

module.exports = class Entities extends Abstract {
  constructor() {
    super(entitiesSchema);
  }

  static get name() {
    return "entities";
  }

  /**
  * @api {post} /assessment/api/v1/entities/add?type=:entityType&programId=:programInternalId&solutionId=:solutionInternalId&parentEntityId=:parentEntityInternalId Entity add
  * @apiVersion 1.0.0
  * @apiName Entity add
  * @apiGroup Entities
  * @apiParamExample {json} Request-Body:
  * {
  "data" :[
	 	{
    "externalId" : "Test",
    "addressLine1" : "A1",
    "addressLine2" : "A2",
    "city" : "Bangalore",
    "country" : "India",
    "gpsLocation" : "",
    "name" : "Test School",
    "phone" : "761957452",
    "principalName" : "P1",
    "state" : "Karnataka",
    "pincode" : "7678",
    "districtId" : "10",
    "districtName" : "North",
    "zoneId" : "1",
    "administration" : "DOE",
    "gender" : "Co-ed",
    "shift" : "Morning",
    "totalStudents" : "1000",
    "totalBoys" : "500",
    "totalGirls" : "500",
    "lowestGrade" : "1",
    "highestGrade" : "12",
    "status" : "active",
    "updatedDate" : "Wed Sep 12 2018 14:26:01 GMT+0530",
    "createdDate" : "Wed Sep 12 2018 14:26:01 GMT+0530",
    "blockId" : "1",
    "questionGroup" : [ 
        "A1", 
        "A2", 
        "A3"
    ],
    "types" : [ 
        "A1", 
        "A2", 
        "A3"
    ]}
	 	]
  *}
  * @apiUse successBody
  * @apiUse errorBody
  * @apiSampleRequest /assessment/api/v1/entities/add?type=school&programId=5b98d7b6d4f87f317ff615ee&solutionId=5b98fa069f664f7e1ae7498c
  * @apiParamExample {json} Response:
  * "result": [
        {
            "_id": "5d8f36c430c4af40b646c4bc",
            "deleted": false,
            "entityTypeId": "5ce23d633c330302e720e65f",
            "entityType": "school",
            "metaInformation": {
                "externalId": "Test",
                "addressLine1": "A1",
                "addressLine2": "A2",
                "city": "Bangalore",
                "country": "India",
                "gpsLocation": "",
                "name": "Test School",
                "phone": "761957452",
                "principalName": "P1",
                "state": "Karnataka",
                "pincode": "7678",
                "districtId": "10",
                "districtName": "North",
                "zoneId": "1",
                "administration": "DOE",
                "gender": "Co-ed",
                "shift": "Morning",
                "totalStudents": "1000",
                "totalBoys": "500",
                "totalGirls": "500",
                "lowestGrade": "1",
                "highestGrade": "12",
                "status": "active",
                "updatedDate": "Wed Sep 12 2018 14:26:01 GMT+0530",
                "createdDate": "Wed Sep 12 2018 14:26:01 GMT+0530",
                "blockId": "1",
                "questionGroup": [
                    "A1",
                    "A2",
                    "A3"
                ],
                "types": [
                    "A1",
                    "A2",
                    "A3"
                ],
                "createdByProgramId": "5d8f36c430c4af40b646c4ba",
                "createdBySolutionId": "5d8f36c430c4af40b646c4bb"
            },
            "updatedBy": "e97b5582-471c-4649-8401-3cc4249359bb",
            "createdBy": "e97b5582-471c-4649-8401-3cc4249359bb",
            "updatedAt": "2019-09-28T10:32:36.318Z",
            "createdAt": "2019-09-28T10:32:36.318Z",
            "__v": 0
        }
    ]
  */

  add(req) {
    return new Promise(async (resolve, reject) => {

      try {
        let queryParams = {
          type: req.query.type,
          programId: req.query.programId,
          solutionId: req.query.solutionId,
          parentEntityId: req.query.parentEntityId
        }
        let result = await entitiesHelper.add(queryParams, req.body.data, req.userDetails);

        return resolve({
          message: "Entity information added successfully.",
          result: result
        });

      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! something went wrong.",
          errorObject: error
        })

      }


    })
  }

  /**
  * @api {get} /assessment/api/v1/entities/list/:entityId?type=:entityType Entity list
  * @apiVersion 1.0.0
  * @apiName Entity list
  * @apiGroup Entities
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/entities/list/5bfe53ea1d0c350d61b78d0a?type=parent
  * @apiUse successBody
  * @apiUse errorBody
  */

  list(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = await entitiesHelper.list(req.query.type, req.params._id, req.pageSize, req.pageSize * (req.pageNo - 1));

        return resolve({
          message: "Information fetched successfully.",
          result: result.entityData,
          count: result.count
        });

      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! something went wrong.",
          errorObject: error
        })

      }


    })
  }

  /**
  * @api {get} /assessment/api/v1/entities/form?type=:entityType Entity form
  * @apiVersion 1.0.0
  * @apiName Entity form
  * @apiGroup Entities
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/entities/form?type=parent
  * @apiUse successBody
  * @apiUse errorBody
  */
  form(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = await entitiesHelper.form(req.query.type);

        return resolve({
          message: "Information fetched successfully.",
          result: result
        });

      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! something went wrong.",
          errorObject: error
        })

      }

    })
  }

  /**
  * @api {get} /assessment/api/v1/entities/fetch/:entityId?type=:entityType Entity profile
  * @apiVersion 1.0.0
  * @apiName Entity profile
  * @apiGroup Entities
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/entities/fetch/5bfe53ea1d0c350d61b78d0a?type=parent
  * @apiUse successBody
  * @apiUse errorBody
  */
  fetch(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = await entitiesHelper.fetch(req.query.type, req.params._id);

        return resolve({
          message: "Information fetched successfully.",
          result: result
        });

      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! something went wrong.",
          errorObject: error
        })

      }


    })
  }

  /**
  * @api {post} /assessment/api/v1/entities/update/:entityId?type=:entityType Update Entity Information
  * @apiVersion 1.0.0
  * @apiName Update Entity Information
  * @apiGroup Entities
  * @apiParamExample {json} Request-Body:
  * 	{
  *	        "studentName" : "",
  *	        "grade" : "",
  *	        "name" : "",
  *	        "gender" : "",
  *   		  "type": "",
  *  		    "typeLabel":"",
  *  		    "phone1": "",
  *  	    	"phone2": "",
  *     		"address": "",
  *    		  "programId": "",
  *    		  "callResponse":"",
  *         "createdByProgramId" : "5b98d7b6d4f87f317ff615ee",
  *         "parentEntityId" : "5bfe53ea1d0c350d61b78d0a"
  *   }
  * @apiUse successBody
  * @apiUse errorBody
  */
  update(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = await entitiesHelper.update(req.query.type, req.params._id, req.body);

        return resolve({
          message: "Information updated successfully.",
          result: result
        });

      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! something went wrong.",
          errorObject: error
        })

      }


    })
  }

  /**
  * @api {post} /assessment/api/v1/entities/bulkCreate?type=:entityType Upload Entity Information CSV
  * @apiVersion 1.0.0
  * @apiName Upload Entity Information CSV
  * @apiGroup Entities
  * @apiParam {String} type Entity Type.
  * @apiParam {File} entities Mandatory entities file of type CSV.
  * @apiUse successBody
  * @apiUse errorBody
  */
  bulkCreate(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let entityCSVData = await csv().fromString(req.files.entities.data.toString());
        let newEntityData = await entitiesHelper.bulkCreate(req.query.type, null, null, req.userDetails, entityCSVData);

        if (newEntityData.length > 0) {

          const fileName = `Entity-Upload`;
          let fileStream = new FileStream(fileName);
          let input = fileStream.initStream();

          (async function () {
            await fileStream.getProcessorPromise();
            return resolve({
              isResponseAStream: true,
              fileNameWithPath: fileStream.fileNameWithPath()
            });
          }());

          await Promise.all(newEntityData.map(async newEntity => {
            input.push(newEntity)
          }))

          input.push(null)

        } else {
          throw "Something went wrong!"
        }

      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! something went wrong.",
          errorObject: error
        })

      }


    })
  }


  /**
  * @api {post} /assessment/api/v1/entities/mappingUpload?programId=:programExternalId&?solutionId=:solutionExternalId Upload Entity Mapping Information CSV
  * @apiVersion 1.0.0
  * @apiName Upload Entity Information CSV
  * @apiGroup Entities
  * @apiParam {String} programId Program External ID.
  * @apiParam {String} solutionId Solution External ID.
  * @apiParam {File} entityMap Mandatory entity mapping file of type CSV.
  * @apiUse successBody
  * @apiUse errorBody
  */
  mappingUpload(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let entityCSVData = await csv().fromString(req.files.entityMap.data.toString());

        //   let solutionEntities = await database.models.solutions.findOne({
        //     programExternalId: req.query.programId,
        //     externalId: req.query.solutionId
        //   }, {
        //     entities : 1
        //   }).lean();

        //   if(!solutionEntities.entities.length > 0) 
        //     throw "Invalid Solution ID."

        //   const solutionEntitiyMap = solutionEntities.entities.reduce(
        //     (ac, entityId) => ({
        //       ...ac,
        //       [entityId.toString()]: true
        //     }),
        //     {}
        //   );

        const entityMapUploadedData = await Promise.all(
          entityCSVData.map(async (singleRow) => {

            if (singleRow.parentEntiyId != "" && singleRow.childEntityId != "") {
              await entitiesHelper.addSubEntityToParent(singleRow.parentEntiyId, singleRow.childEntityId);
            }
            return true

          })
        )

        return resolve({
          message: "Information updated successfully."
        });

      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! something went wrong.",
          errorObject: error
        })

      }

    })
  }

  /**
  * @api {post} /assessment/api/v1/entities/uploadForPortal?type=:entityType&programId=:programExternalId&solutionId=:solutionExternalId Upload Entity Information CSV Using Portal
  * @apiVersion 1.0.0
  * @apiName Upload Entity Information CSV Using Portal
  * @apiGroup Entities
  * @apiParam {File} entities Mandatory entities file of type CSV.
  * @apiUse successBody
  * @apiUse errorBody
  */
  uploadForPortal(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let entityCsvData = await csv().fromString(req.files.entities.data.toString());

        await entitiesHelper.bulkCreate(req.query.type, req.query.programId, req.query.solutionId, req.userDetails, entityCsvData);

        return resolve({
          message: "Information updated successfully."
        });

      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! something went wrong.",
          errorObject: error
        })

      }


    })
  }

  /**
  * @api {get} /assessment/api/v1/entities/relatedEntities/:entityId Get Related Entities
  * @apiVersion 1.0.0
  * @apiName Get Related Entities
  * @apiGroup Entities
  * @apiSampleRequest /assessment/api/v1/entities/relatedEntities/5c0bbab881bdbe330655da7f
  * @apiUse successBody
  * @apiUse errorBody
  * @apiParamExample {json} Response:
     "relatedEntities": [
            {
                "_id": "5d6609ef81a57a6173a79e78",
                "entityTypeId": "5d6605db652f3110440de195",
                "entityType": "state",
                "metaInformation": {
                    "externalId": "DL",
                    "name": "Delhi"
                }
            },
            {
                "_id": "5d660a3d81a57a6173a79e7b",
                "entityTypeId": "5ce23d633c330302e720e665",
                "entityType": "district",
                "metaInformation": {
                    "externalId": "1",
                    "name": "North"
                }
            },
            {
                "_id": "5d660a5681a57a6173a79e7f",
                "entityTypeId": "5d6606ce652f3110440de21b",
                "entityType": "zone",
                "metaInformation": {
                    "externalId": "1",
                    "name": "Zone 1"
                }
            }
        ]
  */

  relatedEntities(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = {}
        let projection = ["metaInformation.externalId", "metaInformation.name", "metaInformation.addressLine1", "metaInformation.addressLine2", "metaInformation.administration", "metaInformation.city", "metaInformation.country", "entityTypeId", "entityType"]
        let entityDocument = await entitiesHelper.entities({ _id: req.params._id }, projection)

        if (entityDocument.length < 0) {
          throw { status: 404, message: "No entitiy found" };
        }

        let relatedEntities = await entitiesHelper.relatedEntities(entityDocument[0]._id, entityDocument[0].entityTypeId, entityDocument[0].entityType, projection)

        _.merge(result, entityDocument[0])
        result["relatedEntities"] = (relatedEntities.length > 0) ? relatedEntities : []

        return resolve({
          message: "Fetched Entities details",
          result: result
        });

      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! something went wrong.",
          errorObject: error
        })

      }


    })
  }
};
