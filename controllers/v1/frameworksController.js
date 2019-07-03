const solutionsHelper = require(ROOT_PATH + "/module/solutions/helper");
const FileStream = require(ROOT_PATH + "/generics/fileStream");

module.exports = class Frameworks extends Abstract {
  constructor() {
    super(frameworksSchema);
  }

  static get name() {
    return "frameworks";
  }

  /**
* @api {get} /assessment/api/v1/frameworks/edit Edit theme in frameworks 
* @apiVersion 0.0.1
* @apiName Edit Theme in frameworks
* @apiGroup frameworks
* @apiHeader {String} X-authenticated-user-token Authenticity token
* @apiParam {String} Id Framework external Id
* @apiUse successBody
* @apiUse errorBody
*/
  async edit(req) {
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

        let frameworkThemes = await solutionsHelper.editTheme("frameworks", req.query.Id, req.files.themeData)

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
