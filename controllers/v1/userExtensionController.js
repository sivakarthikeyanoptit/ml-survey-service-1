const csv = require("csvtojson");
const userExtensionHelper = require(ROOT_PATH + "/module/userExtension/helper")
const FileStream = require(ROOT_PATH + "/generics/fileStream");

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
          userId:(req.params._id && req.params._id !="") ? req.params._id :req.userDetails.userId,
          status : "active",
          isDeleted : false
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
  * @apiGroup User Roles
  * @apiParam {File} userRoles     Mandatory user roles file of type CSV.
  * @apiSampleRequest /assessment/api/v1/userExtension/bulkUpload
  * @apiUse successBody
  * @apiUse errorBody
  */
  bulkUpload(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let userRolesCSVData = await csv().fromString(req.files.userRoles.data.toString());

        if(!userRolesCSVData || userRolesCSVData.length < 1) throw "File or data is missing."

        let newUserRoleData = await userExtensionHelper.bulkCreateOrUpdate(userRolesCSVData,req.userDetails);

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

};
