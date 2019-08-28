const csv = require("csvtojson");
const userExtensionHelper = require(ROOT_PATH + "/module/userExtension/helper")
const FileStream = require(ROOT_PATH + "/generics/fileStream");
const entitiesHelper = require(ROOT_PATH + "/module/entities/helper")

module.exports = class UserExtension extends Abstract {
  constructor() {
    super(userExtensionSchema);
  }

  static get name() {
    return "userExtension";
  }

  /**
  * @api {get} /assessment/api/v1/userExtension/getProfile/{{userId}} Get user profile
  * @apiVersion 0.0.1
  * @apiName Get user profile
  * @apiGroup User Extension
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/userExtension/getProfile/e97b5582-471c-4649-8401-3cc4249359bb
  * @apiUse successBody
  * @apiUse errorBody
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
  * @apiVersion 0.0.1
  * @apiName Bulk Upload User Roles
  * @apiGroup User Extension
  * @apiParam {File} userRoles     Mandatory user roles file of type CSV.
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
   * @api {get} /assessment/api/v1/userExtension/entities/:userId?entityType=:entityType&limit=:limit&page=:page User Extension Entity details
   * @apiVersion 0.0.1
   * @apiName User Extension Entity details
   * @apiGroup User Extension
   * @apiSampleRequest /assessment/api/v1/userExtension/entities/e97b5582-471c-4649-8401-3cc4249359bb?entityType=school&limit=10&page=1
   * @apiUse successBody
   * @apiUse errorBody
   */

  entities(req) {
    return new Promise(async (resolve, reject) => {

      try {
        let allEntities = []

        let userId = req.params._id ? req.params._id : req.userDetails.id
        let userExtensionEntities = await userExtensionHelper.getUserEntities(userId);
        let projection = ["metaInformation.externalId", "metaInformation.name", "metaInformation.addressLine1", "metaInformation.addressLine2", "metaInformation.administration", "metaInformation.city", "metaInformation.country", "entityTypeId", "entityType"]
        let entityType = req.query.entityType ? req.query.entityType : "school"

        let entitiesFound = await entitiesHelper.entities({
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

        let remainingEntities = await entitiesHelper.entities(findQuery, [`groups.${entityType}`])

        if (remainingEntities.length > 0) {
          remainingEntities.forEach(eachEntityNotFound => {
            allEntities = _.concat(allEntities, eachEntityNotFound.groups[entityType])
          })
        }

        if (!allEntities.length > 0) {
          throw { status: 400, message: "No entities were found for given userId" };
        }

        let skippingValue = req.pageSize * (req.pageNo - 1)

        let result = await entitiesHelper.entities({
          _id: { $in: allEntities }
        }, projection, req.pageSize, skippingValue)

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
