var ApiInterceptor = require("./lib/apiInterceptor");
var messageUtil = require("./lib/messageUtil");
var responseCode = require("../httpStatusCodes");

var shikshalokam = require("../helpers/shikshalokam");

var reqMsg = messageUtil.REQUEST;
var keyCloakConfig = {
  authServerUrl: process.env.sunbird_keycloak_auth_server_url,
  realm: process.env.sunbird_keycloak_realm,
  clientId: process.env.sunbird_keycloak_client_id,
  public: process.env.sunbird_keycloak_public
};

var cacheConfig = {
  store: process.env.sunbird_cache_store,
  ttl: process.env.sunbird_cache_ttl
};

var respUtil = function(resp) {
  return {
    status: resp.errCode,
    message: resp.errMsg,
    currentDate: new Date().toISOString()
  };
};

var apiInterceptor = new ApiInterceptor(keyCloakConfig, cacheConfig);
var removedHeaders = [
  "host",
  "origin",
  "accept",
  "referer",
  "content-length",
  "accept-encoding",
  "accept-language",
  "accept-charset",
  "cookie",
  "dnt",
  "postman-token",
  "cache-control",
  "connection"
];

async function getAllRoles(obj) {
  let roles = await obj.roles;
  await _.forEach(obj.organisations, async value => {
    roles = await roles.concat(value.roles);
  });
  return roles;
}

module.exports = function(req, res, next) {
  removedHeaders.forEach(function(e) {
    delete req.headers[e];
  });

  var token = req.headers["x-authenticated-user-token"];
  if (!req.rspObj) req.rspObj = {};
  var rspObj = req.rspObj;
  // console.log(!token, authorization);

  if (!token) {
    console.error("Token Not Found!!");
    rspObj.errCode = reqMsg.TOKEN.MISSING_CODE;
    rspObj.errMsg = reqMsg.TOKEN.MISSING_MESSAGE;
    rspObj.responseCode = responseCode.unauthorized;
    return res.status(401).send(respUtil(rspObj));
  }

  apiInterceptor.validateToken(token, function(err, tokenData) {
    // console.error(err, tokenData, rspObj);
    if (err) {
      rspObj.errCode = reqMsg.TOKEN.INVALID_CODE;
      rspObj.errMsg = reqMsg.TOKEN.INVALID_MESSAGE;
      rspObj.responseCode = responseCode.UNAUTHORIZED_ACCESS;
      return res.status(401).send(respUtil(rspObj));
    } else {
      req.rspObj.userId = tokenData.userId;
      req.rspObj.userToken = req.headers["x-authenticated-user-token"];
      delete req.headers["x-authenticated-userid"];
      delete req.headers["x-authenticated-user-token"];
      // rspObj.telemetryData.actor = utilsService.getTelemetryActorData(req);
      req.headers["x-authenticated-userid"] = tokenData.userId;
      req.rspObj = rspObj;
      shikshalokam
        .userInfo(token, tokenData.userId)
        .then(async userDetails => {
          if (userDetails.responseCode == "OK") {
            req.userDetails = userDetails.result.response;
            req.userDetails.allRoles = await getAllRoles(req.userDetails);
            next();
          } else {
            rspObj.errCode = reqMsg.TOKEN.INVALID_CODE;
            rspObj.errMsg = reqMsg.TOKEN.INVALID_MESSAGE;
            rspObj.responseCode = responseCode.UNAUTHORIZED_ACCESS;
            return res.status(401).send(respUtil(rspObj));
          }
        })
        .catch(error => {
          return res.status(401).send(error);
        });
    }
  });
};
