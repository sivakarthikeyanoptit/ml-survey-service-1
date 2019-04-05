const uuid = require('uuid/v1');
module.exports = class ShareableLink extends Abstract {

  constructor() {
    super(shareableLinksSchema);
  }

  static get name() {
    return "shareableLink";
  }

  getLink(req) {
    return new Promise(async (resolve, reject) => {
      try {

        if (!req.body.url) throw { status: 400, message: "Bad request." }

        if (req.body.url.includes("/operations/reports") || req.body.url.includes("/insights/reports")) {

          let shareableData;

          shareableData = await database.models.shareableLink.findOne({
            url: req.body.url,
            createdBy: req.userDetails.id
          })

          if (!shareableData) {

            let dataObject = {
              url: req.body.url,
              linkId: uuid(),
              createdBy: req.userDetails.id,
              userDetails: _.pick(req.userDetails, ['id', 'accessiblePrograms', 'allRoles', 'firstName', 'lastName', 'email']),
            }

            shareableData = await database.models.shareableLink.create(dataObject)

          }

          return resolve({
            status: 200,
            result: {
              url: "/share/reports/",
              linkId: shareableData.linkId,
              fullUrl: "/share/reports/" + "?linkId=" + shareableData.linkId
            }
          })

        } else {

          throw { status: 400, message: "shareable link is only for operations and insights reports." }

        }


      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! Something went wrong!",
          errorObject: error
        });

      }
    })
  }

  parseLink(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let linkId = req.params._id;

        if (!linkId) throw { status: 400, message: "Bad request." };

        let shareableData;

        shareableData = await database.models.shareableLink.findOne({ linkId: linkId });

        if (!shareableData) throw { status: 400, message: "No data found for given params." };

        return resolve({
          status: 200,
          result: {
            url: shareableData.url,
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