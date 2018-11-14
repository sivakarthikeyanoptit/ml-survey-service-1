let authenticator = require("../generics/middleware/authenticator");
module.exports = function(app) {
  app.use("/assessment/api", authenticator);

  var router = function(req, res, next) {
    // console.log(req.params);
    //req.params.controller = (req.params.controller).toLowerCase();

    req.params.controller += "Controller";
    if (!controllers[req.params.controller]) next();
    else if (!controllers[req.params.controller][req.params.method]) next();
    else if (req.params.method.startsWith("_")) next();
    else {
      new Promise((resolve, reject) => {
        try {
          resolve(controllers[req.params.controller][req.params.method](req));
        } catch (ex) {
          reject(ex);
        }
      })
        .then(result => {
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
          loggerObj.info({ resp: result});
          console.log('-------------------Response log starts here-------------------');
          console.log(result);
          console.log('-------------------Response log ends here-------------------');
        })
        .catch(error => {
          res.status(error.status ? error.status : 400).json({
            status: error.status ? error.status : 400,
            message: error.message
          });
          loggerExceptionObj.info({ method: req.method, url: req.url, headers: req.headers, body: req.body, errorMsg: error.errorObject.message, errorStack: error.errorObject.stack });
          loggerObj.info({ resp: error});
          console.log('-------------------Response log starts here-------------------');
          console.log(error);
          console.log('-------------------Response log ends here-------------------');
        });
    }
  };

  app.all("/assessment/api/v1/:controller/:method", router);

  app.all("/assessment/api/v1/:controller/:_id/:method", router);

  app.all("/assessment/api/v1/:controller/:method/:_id", router);


  app.use((req, res, next) => {
    res.status(404).send("Not found!");
  });
};
