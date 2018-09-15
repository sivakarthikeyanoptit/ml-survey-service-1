let authenticator = require("../generic/middleware/authenticator");
module.exports = function(app) {
  //swagger docs
  const swagger = require("../swagger");
  const swaggerMW = new swagger();
  app.get("/assessment/api/v1/swagger", swaggerMW.sendFile);

  app.use(authenticator);
  var router = function(req, res, next) {
    req.params.controller += "Controller";
    if (!controllers[req.params.controller]) next();
    else if (!controllers[req.params.controller][req.params.method]) next();
    else if (req.params.method.startsWith("_")) next();
    else {
      new Promise((resolve, reject) => {
        try {
          if (req.params.middlewear) {
            return controllers[req.params.controller]
              [req.params.middlewear](req, res, next)
              .then(result => {
                resolve(
                  controllers[req.params.controller][req.params.method](req)
                );
              });
          } else
            resolve(controllers[req.params.controller][req.params.method](req));
        } catch (ex) {
          reject(ex);
        }
      })
        .then(result => {
          res.status(result.status ? result.status : 200).json({
            meta: {
              code: result.errorCode,
              message: result.message,
              currentDate: new Date().toISOString()
            },
            pagination: result.pagination,
            totalCount: result.totalCount,
            count: result.count,
            data: result.data
          });
        })
        .catch(error => {
          if (!error.status) {
            next();
          } else {
            res.status(error.status ? error.status : 400).json({
              meta: {
                code: error.errorCode,
                message: error.message,
                currentDate: new Date().toISOString()
              }
            });
          }
        });
    }
  };

  app.all("/assessment/api/v1/:controller/:method", router);

  app.all("/assessment/api/v1/:controller/:_id/:method", router);

  app.all(
    "/assessment/api/v1/:controller/:middlewear/redirect/:method",
    router
  );

  app.use((req, res, next) => {
    res.status(404).send("Not found!");
  });
};
