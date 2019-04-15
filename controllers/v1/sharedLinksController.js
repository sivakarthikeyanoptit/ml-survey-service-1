const uuid = require('uuid/v1');
module.exports = class SharedLink extends Abstract {

  constructor() {
    super(sharedLinksSchema);
  }

  static get name() {
    return "sharedLink";
  }

  /**
      * @apiDefine errorBody
      * @apiError {String} status 4XX,5XX
      * @apiError {String} message Error
      */

  /**
     * @apiDefine successBody
     *  @apiSuccess {String} status 200
     * @apiSuccess {String} result Data
     */


  /**
  * @api {get} /assessment/api/v1/sharedLinks/generate Create a shared link
  * @apiVersion 0.0.1
  * @apiName Create shared link
  * @apiGroup sharedLinks
  * @apiUse successBody
  * @apiUse errorBody
  */

  generate(req) {
    return new Promise(async (resolve, reject) => {
      try {

        if (!req.body.privateURL || !req.body.publicURL || !req.body.reportName) throw { status: 400, message: "Bad request." }

        let shareableData;

        let queryParams = req.body.publicURL.includes("?") ? req.body.publicURL.split("?")[1] : "";

        shareableData = await database.models.sharedLink.findOne({
          privateURL: req.body.privateURL,
          publicURL: req.body.publicURL,
          reportName: req.body.reportName,
          queryParams: queryParams,
          "userDetails.id": req.userDetails.id,
          isActive: true
        })

        if (!shareableData) {

          let linkId = uuid();

          let linkViews = {
            ip: req.headers["x-real-ip"],
            userAgent: req.headers["user-agent"],
            createdAt: new Date
          }

          let dataObject = {
            privateURL: req.body.privateURL,
            publicURL: req.body.publicURL,
            linkId: linkId,
            isActive: true,
            reportName: req.body.reportName,
            queryParams: queryParams,
            accessedCount: 0,
            userDetails: _.pick(req.userDetails, ['id', 'accessiblePrograms', 'allRoles', 'firstName', 'lastName', 'email']),
            linkViews: [linkViews]
          }

          shareableData = await database.models.sharedLink.create(dataObject)

        }

        return resolve({
          status: 200,
          result: {
            linkId: shareableData.linkId,
          }
        })


      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! Something went wrong!",
          errorObject: error
        });

      }
    })
  }

  /**
    * @api {get} /assessment/api/v1/sharedLinks/verify Create a shared link
    * @apiVersion 0.0.1
    * @apiName Verify shared link
    * @apiGroup sharedLinks
    * @apiUse successBody
    * @apiUse errorBody
    */

  verify(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let linkId = req.headers.linkid;

        if (!linkId) throw { status: 400, message: "Bad request." };

        let shareableData;

        shareableData = await database.models.sharedLink.findOne({ linkId: linkId, isActive: true }).lean();

        if (!shareableData) throw { status: 400, message: "No data found for given params." };

        let isChanged = false;

        shareableData.linkViews.forEach(user => { if (user.ip == req.headers["x-real-ip"]) isChanged = true })

        if (isChanged == false) shareableData.linkViews.push({ ip: req.headers["x-real-ip"], userAgent: req.headers["user-agent"], createdAt: new Date })

        let updateObject = _.omit(shareableData, ['createdAt'])

        if (isChanged == true) {

          updateObject.accessedCount++;

          shareableData = await database.models.sharedLink.findOneAndUpdate({ linkId: linkId }, updateObject,
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              returnNewDocument: true
            });

        }

        let publicURL = shareableData.publicURL + ((shareableData.publicURL.includes("?")) ? "&" : "?") + `linkId=${shareableData.linkId}`

        return resolve({
          status: 200,
          result: {
            privateURL: shareableData.privateURL,
            publicURL: publicURL,
            linkId: shareableData.linkId
          }
        })

      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! Something went wrong!",
          errorObject: error
        });

      }
    })
  }

};