const csv = require("csvtojson");
const userExtensionHelper = require(MODULES_BASE_PATH + "/userExtension/helper")
const FileStream = require(ROOT_PATH + "/generics/fileStream");
const entitiesHelper = require(MODULES_BASE_PATH + "/entities/helper")

module.exports = class UserExtension extends Abstract {
  constructor() {
    super(userExtensionSchema);
  }

  static get name() {
    return "userExtension";
  }

  /**
  * @api {get} /assessment/api/v1/userExtension/getProfile/{{userId}} Get user profile
  * @apiVersion 1.0.0
  * @apiName Get user profile
  * @apiGroup User Extension
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/userExtension/getProfile/e97b5582-471c-4649-8401-3cc4249359bb
  * @apiUse successBody
  * @apiUse errorBody
  * @apiParamExample {json} Response:
  * {
  *  "_id": "5d5e4758f89df53a1d26b454",
     "externalId": "a1",
     "roles": [
        {
         "_id": "5d5e47051f5a363a0a187029",
         "code": "HM",
         "title": "Headmaster",
         "immediateSubEntityType": "school",
         "entities": [
          {
            "_id": "5bfe53ea1d0c350d61b78d0f",
            "externalId": "1208138",
            "name": "Shri Shiv Middle School, Shiv Kutti, Teliwara, Delhi",
            "childrenCount": 0,
             "entityType": "school",
             "entityTypeId": "5ce23d633c330302e720e65f",
             "subEntityGroups": [
              "parent"
              ]
            }
          ]
       }
     ]
  * }
  */

  getProfile(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = await userExtensionHelper.profileWithEntityDetails({
          userId: (req.params._id && req.params._id != "") ? req.params._id : req.userDetails.userId,
          status: "active",
          isDeleted: false
        });

        return resolve({
          message: "User profile fetched successfully.",
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
  * @api {post} /assessment/api/v1/userExtension/bulkUpload Bulk Upload User Roles
  * @apiVersion 1.0.0
  * @apiName Bulk Upload User Roles
  * @apiGroup User Extension
  * @apiParam {File} userRoles Mandatory user roles file of type CSV.
  * @apiSampleRequest /assessment/api/v1/userExtension/bulkUpload
  * @apiUse successBody
  * @apiUse errorBody
  */

  bulkUpload(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let userRolesCSVData = await csv().fromString(req.files.userRoles.data.toString());

        if (!userRolesCSVData || userRolesCSVData.length < 1) throw "File or data is missing."

        let newUserRoleData = await userExtensionHelper.bulkCreateOrUpdate(userRolesCSVData, req.userDetails);

        if (newUserRoleData.length > 0) {

          const fileName = `UserRole-Upload`;
          let fileStream = new FileStream(fileName);
          let input = fileStream.initStream();

          (async function () {
            await fileStream.getProcessorPromise();
            return resolve({
              isResponseAStream: true,
              fileNameWithPath: fileStream.fileNameWithPath()
            });
          }());

          await Promise.all(newUserRoleData.map(async userRole => {
            input.push(userRole)
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
   * @api {get} /assessment/api/v1/userExtension/entities/:userId?entityType=:entityType&limit=:limit&page=:page&search=:searchText User Extension Entity details
   * @apiVersion 1.0.0
   * @apiName User Extension Entity details
   * @apiGroup User Extension
   * @apiSampleRequest /assessment/api/v1/userExtension/entities/e97b5582-471c-4649-8401-3cc4249359bb?entityType=school&limit=10&page=1&search=school
   * @apiUse successBody
   * @apiUse errorBody
   * @apiParamExample {json} Response:
   * "result": [
   * {
     "_id": "5bfe53ea1d0c350d61b78d0f",
     "entityTypeId": "5ce23d633c330302e720e65f",
     "entityType": "school",
     "metaInformation": {
     "externalId": "1208138",
     "addressLine1": "Shiv Kutti, Teliwara",
     "addressLine2": "",
     "administration": "Aided",
     "city": "Urban",
     "country": "India",
     "name": "Shri Shiv Middle School, Shiv Kutti, Teliwara, Delhi"
      }
     }
    ],
    "count": 1
   */

  entities(req) {
    return new Promise(async (resolve, reject) => {

      try {
        let allEntities = []

        let userId = req.params._id ? req.params._id : req.userDetails.id
        let userExtensionEntities = await userExtensionHelper.getUserEntities(userId);
        let projection = ["metaInformation.externalId", "metaInformation.name", "metaInformation.addressLine1", "metaInformation.addressLine2", "metaInformation.administration", "metaInformation.city", "metaInformation.country", "entityTypeId", "entityType"]
        let entityType = req.query.entityType ? req.query.entityType : "school"

        let entitiesFound = await entitiesHelper.entityDocuments({
          _id: { $in: userExtensionEntities },
          entityType: entityType
        }, ["_id"])


        if (entitiesFound.length > 0) {
          entitiesFound.forEach(eachEntityData => {
            allEntities.push(eachEntityData._id)
          })
        }

        let findQuery = {
          _id: { $in: userExtensionEntities },
          entityType: { $ne: entityType }
        }

        findQuery[`groups.${entityType}`] = { $exists: true }

        let remainingEntities = await entitiesHelper.entityDocuments(findQuery, [`groups.${entityType}`])

        if (remainingEntities.length > 0) {
          remainingEntities.forEach(eachEntityNotFound => {
            allEntities = _.concat(allEntities, eachEntityNotFound.groups[entityType])
          })
        }

        if (!allEntities.length > 0) {
          throw { status: 400, message: "No entities were found for given userId" };
        }

        let skippingValue = req.pageSize * (req.pageNo - 1)

        let queryObject = {}

        if(req.searchText && req.searchText != "") {
          queryObject = {
              $and: [
                  {
                      _id: { 
                          $in: allEntities
                      }
                  },
                  { 
                      $or: [
                          { "metaInformation.name": new RegExp(req.searchText, 'i') },
                          { "metaInformation.externalId": new RegExp("^" + req.searchText, 'm') },
                          { "metaInformation.addressLine1": new RegExp(req.searchText, 'i') },
                          { "metaInformation.addressLine2": new RegExp(req.searchText, 'i') }
                      ]
                  } 
              ]
          }
      } else {
          queryObject = {
              _id: { $in: allEntities }
          }
      }

        let result = await entitiesHelper.entityDocuments(queryObject, projection, req.pageSize, skippingValue)

        return resolve({
          message: "User Extension entities fetched successfully",
          result: result,
          count: allEntities.length
        })

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
