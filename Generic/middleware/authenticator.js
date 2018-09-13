var ApiInterceptor = require("./lib/sb_api_interceptor");
var messageUtil = require("./lib/messageUtil");
var responseCode = require("../httpStatusCodes");

var reqMsg = messageUtil.REQUEST;
var keyCloakConfig = {
  authServerUrl: process.env.sunbird_keycloak_auth_server_url
    ? process.env.sunbird_keycloak_auth_server_url
    : "https://dev.shikshalokam.org/auth",
  realm: process.env.sunbird_keycloak_realm
    ? process.env.sunbird_keycloak_realm
    : "sunbird",
  clientId: process.env.sunbird_keycloak_client_id
    ? process.env.sunbird_keycloak_client_id
    : "portal",
  public: process.env.sunbird_keycloak_public
    ? process.env.sunbird_keycloak_public
    : true
};

var cacheConfig = {
  store: process.env.sunbird_cache_store
    ? process.env.sunbird_cache_store
    : "memory",
  ttl: process.env.sunbird_cache_ttl ? process.env.sunbird_cache_ttl : 1800
};

var respUtil = function(resp) {
  return {
    code: resp.errCode,
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
  "user-agent",
  "accept-encoding",
  "accept-language",
  "accept-charset",
  "cookie",
  "dnt",
  "postman-token",
  "cache-control",
  "connection"
];

module.exports = function(req, res, next) {
  removedHeaders.forEach(function(e) {
    delete req.headers[e];
  });

  var token = req.headers["x-authenticated-user-token"];
  var rspObj = req.rspObj || {};

  if (!token) {
    console.error("Token Not Found!!");
    rspObj.errCode = reqMsg.TOKEN.MISSING_CODE;
    rspObj.errMsg = reqMsg.TOKEN.MISSING_MESSAGE;
    rspObj.responseCode = responseCode.unauthorized;
    return res.status(401).send(respUtil(rspObj));
  }

  apiInterceptor.validateToken(token, function(err, tokenData) {
    if (err) {
      console.error(err, tokenData, rspObj);
      rspObj.errCode = reqMsg.TOKEN.INVALID_CODE;
      rspObj.errMsg = reqMsg.TOKEN.INVALID_MESSAGE;
      rspObj.responseCode = responseCode.UNAUTHORIZED_ACCESS;
      return res.status(401).send(respUtil(rspObj));
    } else {
      delete req.headers["x-authenticated-userid"];
      delete req.headers["x-authenticated-user-token"];
      req.rspObj.userId = tokenData.userId;
      rspObj.telemetryData.actor = utilsService.getTelemetryActorData(req);
      req.headers["x-authenticated-userid"] = tokenData.userId;
      req.rspObj = rspObj;
      next();
    }
  });
};
