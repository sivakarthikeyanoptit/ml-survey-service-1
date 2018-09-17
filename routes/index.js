let authenticator = require("../generics/middleware/authenticator");
module.exports = function(app) {
  app.use(authenticator);

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
            data: result.data,
            additionalDetails: result.additionalDetails,
            pagination: result.pagination,
            totalCount: result.totalCount,
            total: result.total,
            count: result.count
          });
        })
        .catch(error => {
          res.status(error.status ? error.status : 400).json({
            message: error.message
          });
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
