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

        if (!req.body.url) throw { status: 400, message: "Bad request." }

        let shareableData;

        shareableData = await database.models.sharedLink.findOne({
          actualURL: req.body.url,
          "userDetails.id": req.userDetails.id
        })

        if (!shareableData) {

          let linkId = uuid();

          let linkViews = {
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            createdAt: new Date,
            accessedCount: 0
          }

          let requestURL = req.body.url.split("/");
          let hostName = requestURL[0] + "/" + requestURL[1] + "/" + requestURL[2];

          let dataObject = {
            actualURL: req.body.url,
            linkId: linkId,
            isActive: true,
            userDetails: _.pick(req.userDetails, ['id', 'accessiblePrograms', 'allRoles', 'firstName', 'lastName', 'email']),
            linkViews: [linkViews],
            sharedURL: hostName + "/share/reports?linkId=" + linkId,
          }

          shareableData = await database.models.sharedLink.create(dataObject)

        }

        return resolve({
          status: 200,
          result: {
            url: shareableData.sharedURL,
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

        let linkId = req.query.linkId;

        if (!linkId) throw { status: 400, message: "Bad request." };

        let shareableData;

        shareableData = await database.models.sharedLink.findOne({ linkId: linkId, isActive: true }).lean();

        if (!shareableData) throw { status: 400, message: "No data found for given params." };

        let isChanged = false;

        shareableData.linkViews.forEach(user => {
          if (user.ip == req.ip) {
           user.accessedCount++;
            isChanged = true;
          }
        })

        if(isChanged==false) shareableData.linkViews.push({ ip: req.ip, userAgent: req.headers["user-agent"], createdAt: new Date, accessedCount: 0 })
        
        let updateObject = _.omit(shareableData, ['createdAt'])

        if (isChanged == true) {

          shareableData = await database.models.sharedLink.findOneAndUpdate({ linkId: linkId }, updateObject,
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              returnNewDocument: true
            });

        }

        return resolve({
          status: 200,
          result: {
            url: shareableData.actualURL,
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