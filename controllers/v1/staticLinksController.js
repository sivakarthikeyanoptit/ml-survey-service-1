const csv = require("csvtojson");
const staticLinksHelper = require(ROOT_PATH + "/module/staticLinks/helper")
const FileStream = require(ROOT_PATH + "/generics/fileStream");

module.exports = class StaticLinks extends Abstract {
  constructor() {
    super(staticLinksSchema);
  }

  static get name() {
    return "staticLinks";
  }

  /**
  * @api {get} /assessment/api/v1/staticLinks/list Static Link list
  * @apiVersion 0.0.1
  * @apiName Static Link list
  * @apiGroup Static Links
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/staticLinks/list
  * @apiUse successBody
  * @apiUse errorBody
  */

  list(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = await staticLinksHelper.list({
          link: {
            $ne : ""
          },
          status : "active",
          isDeleted : false
        }, {
          value : 1,
          link: 1,
          title: 1
        });

        return resolve({
          message: "Static Links fetched successfully.",
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
  * @api {post} /assessment/api/v1/staticLinks/bulkCreate Upload Static Links Information CSV
  * @apiVersion 0.0.1
  * @apiName Upload Static Links Information CSV
  * @apiGroup Static Links
  * @apiParam {File} staticLinks     Mandatory static links file of type CSV.
  * @apiSampleRequest /assessment/api/v1/staticLinks/bulkCreate
  * @apiUse successBody
  * @apiUse errorBody
  */
  bulkCreate(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let staticLinksCSVData = await csv().fromString(req.files.staticLinks.data.toString());

        if(!staticLinksCSVData || staticLinksCSVData.length < 1) throw "File or data is missing."

        let newStaticLinkData = await staticLinksHelper.bulkCreate(staticLinksCSVData,req.userDetails);

        if (newStaticLinkData.length > 0) {

          const fileName = `StaticLink-Upload`;
          let fileStream = new FileStream(fileName);
          let input = fileStream.initStream();

          (async function () {
            await fileStream.getProcessorPromise();
            return resolve({
              isResponseAStream: true,
              fileNameWithPath: fileStream.fileNameWithPath()
            });
          }());

          await Promise.all(newStaticLinkData.map(async staticLink => {
            input.push(staticLink)
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
  * @api {post} /assessment/api/v1/staticLinks/bulkUpdate Upload Static Links Information CSV
  * @apiVersion 0.0.1
  * @apiName Upload Static Links Information CSV
  * @apiGroup Static Links
  * @apiParam {File} staticLinks     Mandatory static links file of type CSV.
  * @apiSampleRequest /assessment/api/v1/staticLinks/bulkUpdate
  * @apiUse successBody
  * @apiUse errorBody
  */
  bulkUpdate(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let staticLinksCSVData = await csv().fromString(req.files.staticLinks.data.toString());
        
        if(!staticLinksCSVData || staticLinksCSVData.length < 1) throw "File or data is missing."

        let newStaticLinkData = await staticLinksHelper.bulkUpdate(staticLinksCSVData,req.userDetails);

        if (newStaticLinkData.length > 0) {

          const fileName = `StaticLink-Upload`;
          let fileStream = new FileStream(fileName);
          let input = fileStream.initStream();

          (async function () {
            await fileStream.getProcessorPromise();
            return resolve({
              isResponseAStream: true,
              fileNameWithPath: fileStream.fileNameWithPath()
            });
          }());

          await Promise.all(newStaticLinkData.map(async staticLink => {
            input.push(staticLink)
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
