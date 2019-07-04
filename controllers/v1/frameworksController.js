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
  * @apiSampleRequest /assessment/api/v1/frameworks/uploadThemes/:frameworkExternalID
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

        let headerSequence
        let themeArray = await csv().fromString(req.files.themes.data.toString()).on('header', (headers) => { headerSequence = headers });

        let frameworkThemes = await solutionsHelper.updateTheme("frameworks", req.query.Id, themeArray, headerSequence)

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
};
