const solutionsHelper = require(ROOT_PATH + "/module/solutions/helper");
const FileStream = require(ROOT_PATH + "/generics/fileStream");
const csv = require("csvtojson");

module.exports = class Frameworks extends Abstract {
  constructor() {
    super(frameworksSchema);
  }

  static get name() {
    return "frameworks";
  }

  /**
  * @api {post} /assessment/api/v1/frameworks/uploadThemes/{frameworkExternalID} Upload Themes For Frameworks
  * @apiVersion 0.0.1
  * @apiName Upload Themes For Frameworks
  * @apiGroup Frameworks
  * @apiParam {File} themes Mandatory file upload with themes data.
  * @apiSampleRequest /assessment/api/v1/frameworks/uploadThemes/EF-DCPCR-2018-001
  * @apiHeader {String} X-authenticated-user-token Authenticity token  
  * @apiUse successBody
  * @apiUse errorBody
  */

  async uploadThemes(req) {
    return new Promise(async (resolve, reject) => {
      try {
        const fileName = `Theme-Upload-Result`;
        let fileStream = new FileStream(fileName);
        let input = fileStream.initStream();

        (async function () {
          await fileStream.getProcessorPromise();
          return resolve({
            isResponseAStream: true,
            fileNameWithPath: fileStream.fileNameWithPath()
          });
        })();


        let frameworkDocument = await database.models.frameworks
          .findOne({ externalId: req.params._id }, { _id: 1 })
          .lean();

        if (!frameworkDocument) {
          return resolve({
            status: 404,
            message: "No framework found."
          });
        }

        let headerSequence
        let themes = await csv().fromString(req.files.themes.data.toString()).on('header', (headers) => { headerSequence = headers });

        let frameworkThemes = await solutionsHelper.uploadTheme("frameworks", frameworkDocument._id, themes, headerSequence)

        for (let pointerToFrameworkTheme = 0; pointerToFrameworkTheme < frameworkThemes.length; pointerToFrameworkTheme++) {
          input.push(frameworkThemes[pointerToFrameworkTheme])
        }

        input.push(null)
      }
      catch (error) {
        reject({
          status: 500,
          message: error,
          errorObject: error
        })
      }
    })
  }

  /**
 * @api {post} /assessment/api/v1/frameworks/create create Frameworks
 * @apiVersion 0.0.1
 * @apiName create Frameworks
 * @apiGroup Frameworks
 * @apiParam {File} Mandatory framework file of type json.
 * @apiSampleRequest /assessment/api/v1/frameworks/create
 * @apiHeader {String} X-authenticated-user-token Authenticity token  
 * @apiUse successBody
 * @apiUse errorBody
 */

  async create(req) {
    return new Promise(async (resolve, reject) => {
      try {


        let frameworkData = JSON.parse(req.files.framework.data.toString());

        let queryObject = {
          externalId: frameworkData.externalId
        };

        let frameworkDocument = await database.models.frameworks.findOne(queryObject, { _id: 1 }).lean()

        if (frameworkDocument) {
          throw "Framework already exists"
        }

        frameworkData["createdBy"] = req.userDetails.id
        frameworkData.isDeleted = false

        frameworkDocument = await database.models.frameworks.create(frameworkData)

        return resolve({
          status: 200,
          message: "Framework inserted successfully."
        });
      }
      catch (error) {
        reject({
          status: 500,
          message: error,
          errorObject: error
        })
      }
    })
  }

  /**
* @api {post} /assessment/api/v1/frameworks/update?frameworkExternalId={frameworkExternalId} Update Frameworks
* @apiVersion 0.0.1
* @apiName update Frameworks
* @apiGroup Frameworks
* @apiParam {File} Mandatory framework file of type json.
* @apiSampleRequest /assessment/api/v1/frameworks/update?frameworkExternalId=TAF-2019
* @apiHeader {String} X-authenticated-user-token Authenticity token  
* @apiUse successBody
* @apiUse errorBody
*/

  async update(req) {
    return new Promise(async (resolve, reject) => {
      try {


        let frameworkData = JSON.parse(req.files.framework.data.toString());

        let queryObject = {
          externalId: req.query.frameworkExternalId
        };

        let frameworkDocument = await database.models.frameworks.findOne(queryObject, { themes: 0 }).lean()

        if (!frameworkDocument) {
          return resolve({
            status: 400,
            message: "Framework doesnot exist"
          });
        }

        let updateObject = _.merge(_.omit(frameworkDocument, "createdAt"), frameworkData)
        updateObject.updatedBy = req.userDetails.id

        frameworkDocument = await database.models.frameworks.findOneAndUpdate({
          _id: frameworkDocument._id
        }, updateObject)

        return resolve({
          status: 200,
          message: "Framework updated successfully."
        });
      }
      catch (error) {
        reject({
          status: 500,
          message: error,
          errorObject: error
        })
      }
    })
  }
};
