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
* @api {get} /assessment/api/v1/frameworks/updateTheme updateTheme  in frameworks 
* @apiVersion 0.0.1
* @apiName updateTheme in frameworks
* @apiGroup frameworks
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiParam {File} themeData Mandatory Theme file of type CSV.
* @apiParam {String} Id frameworkExternalId
* @apiUse successBody
* @apiUse errorBody
*/
  async updateTheme(req) {
    return new Promise(async (resolve, reject) => {
      try {
        const fileName = `Edit Theme`;
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
        let themeArray = await csv().fromString(req.files.themeData.data.toString()).on('header', (headers) => { headerSequence = headers });

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
