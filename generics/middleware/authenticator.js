var ApiInterceptor = require("./lib/apiInterceptor");
var messageUtil = require("./lib/messageUtil");
var responseCode = require("../httpStatusCodes");
var http = require("https");
var env_tokens = require("../helpers/credentials/envTokens");

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

var getUserInfo = function(authorization, token, userId) {
  let options = {
    host: "dev.shikshalokam.org",
    port: 443,
    path: "/api/user/v1/read/" + userId,
    method: "GET",
    headers: {
      authorization: authorization,
      "x-authenticated-user-token": token
    }
  };
  let body = "";
  return new Promise(function(resolve, reject) {
    try {
      var httpreq = http.request(options, function(response) {
        response.setEncoding("utf8");
        response.on("data", function(chunk) {
          body += chunk;
        });
        response.on("end", function() {
          // console.log(response.headers["content-type"]);
          if (
            response.headers["content-type"] ==
              "application/json; charset=utf-8" ||
            response.headers["content-type"] == "application/json"
          ) {
            body = JSON.parse(body);
            return resolve(body);
            // console.log(body);
          }
        });
      });
      httpreq.end();
    } catch (error) {
      reject(error);
    }
  });
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
  var authorization = env_tokens.authorization;
  if (!req.rspObj) req.rspObj = {};
  var rspObj = req.rspObj;
  // console.log(!token, authorization);

  if (!token || !authorization) {
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
      delete req.headers["x-authenticated-userid"];
      delete req.headers["x-authenticated-user-token"];
      req.rspObj.userId = tokenData.userId;
      // rspObj.telemetryData.actor = utilsService.getTelemetryActorData(req);
      req.headers["x-authenticated-userid"] = tokenData.userId;
      req.rspObj = rspObj;
      getUserInfo(authorization, token, tokenData.userId)
        .then(userDetails => {
          log.debug(tokenData.userId);
          if (userDetails.responseCode == "OK") {
            req.userDetails = userDetails.result.response;
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
