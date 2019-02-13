let authenticator = require(ROOT_PATH + "/generics/middleware/authenticator");
let slackClient = require(ROOT_PATH + "/generics/helpers/slackCommunications");
const fs = require("fs");

module.exports = function (app) {

  const applicationBaseUrl = process.env.APPLICATION_BASE_URL || "/assessment/"

  // app.use(applicationBaseUrl, authenticator);

  var router = async function (req, res, next) {

    //req.params.controller = (req.params.controller).toLowerCase();

    req.params.controller += "Controller";
    if (!req.params.version) next();
    else if (!controllers[req.params.version]) next();
    else if (!controllers[req.params.version][req.params.controller]) next();
    else if (!controllers[req.params.version][req.params.controller][req.params.method]) next();
    else if (req.params.method.startsWith("_")) next();
    else {

      try {

        var result = await controllers[req.params.version][req.params.controller][req.params.method](req);

        if (result.isResponseAStream == true) {
          // Check if file specified by the filePath exists 
          fs.exists(result.fileNameWithPath, function (exists) {

            if (exists) {

              res.setHeader('Content-disposition', 'attachment; filename=' + result.fileNameWithPath.split('/').pop());
              res.set('Content-Type', 'application/octet-stream');
              fs.createReadStream(result.fileNameWithPath).pipe(res);

            } else {

              throw {
                status: 500,
                message: "Oops! Something went wrong!"
              };

            }

          });

        } else {
          res.status(result.status ? result.status : 200).json({
            message: result.message,
            status: result.status ? result.status : 200,
            result: result.data,
            result: result.result,
            additionalDetails: result.additionalDetails,
            pagination: result.pagination,
            totalCount: result.totalCount,
            total: result.total,
            count: result.count,
            failed: result.failed
          });
        }
        loggerObj.info({ resp: result });
        console.log('-------------------Response log starts here-------------------');
        console.log(result);
        console.log('-------------------Response log ends here-------------------');
      }
      catch (error) {
        res.status(error.status ? error.status : 400).json({
          status: error.status ? error.status : 400,
          message: error.message
        });

        let customFields = {
          appDetails: '',
          userDetails: 'NON_LOGGED_IN_USER'
        }

        if (req.userDetails) {
          customFields = {
            appDetails: req.headers["user-agent"],
            userDetails: req.userDetails.firstName + " - " + req.userDetails.lastName + " - " + req.userDetails.email
          }
        }

        const toLogObject = {
          method: req.method,
          url: req.url, headers: req.headers,
          body: req.body,
          errorMsg: error.errorObject ? error.errorObject.message : null,
          errorStack: error.errorObject ? error.errorObject.stack : null,
          customFields: customFields
        }
        slackClient.sendExceptionLogMessage(toLogObject)
        loggerExceptionObj.info(toLogObject);
        loggerObj.info({ resp: error });
        console.log('-------------------Response log starts here-------------------');
        console.log(error);
        console.log('-------------------Response log ends here-------------------');
      };
    }
  };

  app.get('/*', function (req, res, next) {
    req.pageNo = (req.query.page && Number(req.query.page) > 0) ? Number(req.query.page) : 1
    req.pageSize = (req.query.limit && Number(req.query.limit) > 0 && Number(req.query.limit) <= 100) ? Number(req.query.limit) : 100
    req.searchText = (req.query.search && req.query.search != "") ? req.query.search : ""
    delete req.query.page
    delete req.query.limit
    next();
  })

  app.get("/*", (req, res, next) => {
    req.programId = req.query.programId;
    next();
  })

  app.get("/*", (req, res, next) => {
    req.componentId = req.query.componentId;
    next();
  })

  app.all(applicationBaseUrl + "api/:version/:controller/:method", router);

  app.all(applicationBaseUrl + "api/:version/:controller/:method/:_id", router);

  app.use((req, res, next) => {
    res.status(404).send("Not found!");
  });
};

