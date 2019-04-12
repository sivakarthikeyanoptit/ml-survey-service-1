const uuid = require('uuid/v1');
module.exports = class SharedLink extends Abstract {

  constructor() {
    super(sharedLinksSchema);
  }

  static get name() {
    return "sharedLink";
  }

  generate(req) {
    return new Promise(async (resolve, reject) => {
      try {

        if (!req.body.privateURL || !req.body.publicURL || !req.body.reportName) throw { status: 400, message: "Bad request." }

        let shareableData;

        let queryParams = req.body.publicURL.split("?")

        shareableData = await database.models.sharedLink.findOne({
          privateURL: req.body.privateURL,
          publicURL: req.body.publicURL,
          reportName: req.body.reportName,
          queryParams: queryParams[1],
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
            queryParams: queryParams[1],
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

  verify(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let linkId = req.headers.linkId;

        let reportName = req.headers.reportName;

        if (!linkId || !reportName) throw { status: 400, message: "Bad request." };

        let shareableData;

        shareableData = await database.models.sharedLink.findOne({ linkId: linkId, reportName: reportName, isActive: true }).lean();

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

        let privateURL = shareableData.privateURL + ((shareableData.privateURL.includes("?")) ? "&" : "?") + `linkId=${shareableData.linkId}`

        return resolve({
          status: 200,
          result: {
            privateURL: privateURL,
            publicURL: shareableData.publicURL,
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