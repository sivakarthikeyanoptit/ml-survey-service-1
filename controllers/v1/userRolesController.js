const csv = require("csvtojson");
const userRolesHelper = require(ROOT_PATH + "/module/userRoles/helper")
const FileStream = require(ROOT_PATH + "/generics/fileStream");

module.exports = class UserRoles extends Abstract {
  constructor() {
    super(userRolesSchema);
  }

  static get name() {
    return "userRoles";
  }

  /**
  * @api {get} /assessment/api/v1/userRoles/list User Roles list
  * @apiVersion 1.0.0
  * @apiName User Roles list
  * @apiGroup User Roles
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/userRoles/list
  * @apiUse successBody
  * @apiUse errorBody
  */

  list(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = await userRolesHelper.list({
          status: "active",
          isDeleted: false
        }, {
            code: 1,
            title: 1,
            entityTypes: 1
          });

        return resolve({
          message: "User roles fetched successfully.",
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
  * @api {post} /assessment/api/v1/userRoles/bulkCreate Bulk Create User Roles
  * @apiVersion 1.0.0
  * @apiName Bulk Create User Roles
  * @apiGroup User Roles
  * @apiParam {File} userRoles     Mandatory user roles file of type CSV.
  * @apiSampleRequest /assessment/api/v1/userRoles/bulkCreate
  * @apiUse successBody
  * @apiUse errorBody
  */
  bulkCreate(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let userRolesCSVData = await csv().fromString(req.files.userRoles.data.toString());

        if (!userRolesCSVData || userRolesCSVData.length < 1) throw "File or data is missing."

        let newUserRoleData = await userRolesHelper.bulkCreate(userRolesCSVData, req.userDetails);

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
  * @api {post} /assessment/api/v1/userRoles/bulkUpdate Bulk Update User Roles
  * @apiVersion 1.0.0
  * @apiName Bulk Update User Roles
  * @apiGroup User Roles
  * @apiParam {File} userRoles     Mandatory user roles file of type CSV.
  * @apiSampleRequest /assessment/api/v1/userRoles/bulkUpdate
  * @apiUse successBody
  * @apiUse errorBody
  */
  bulkUpdate(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let userRolesCSVData = await csv().fromString(req.files.userRoles.data.toString());

        if (!userRolesCSVData || userRolesCSVData.length < 1) throw "File or data is missing."

        let newUserRoleData = await userRolesHelper.bulkUpdate(userRolesCSVData, req.userDetails);

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
