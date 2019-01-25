const jwtDecode = require('jwt-decode');
let slackClient = require("../helpers/slackCommunications");
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
  
  if(req.path.includes("reports") && req.headers["internal-access-token"] === process.env.INTERNAL_ACCESS_TOKEN) {
    next();
    return
  }

  let tokenCheckByPassAllowedForURL = false
  let tokenCheckByPassAllowedForUser = false
  let tokenCheckByPassAllowedUserDetails = false
  if(process.env.DISABLE_TOKEN_ON_OFF && process.env.DISABLE_TOKEN_ON_OFF === "ON" && process.env.DISABLE_TOKEN_CHECK_FOR_API && process.env.DISABLE_TOKEN_CHECK_FOR_API!= "") {
      process.env.DISABLE_TOKEN_CHECK_FOR_API.split(',').forEach(allowedEndpoints =>{
        if(req.path.includes(allowedEndpoints)) {
          tokenCheckByPassAllowedForURL = true
          let allowedUsersPath = "DISABLE_TOKEN_"+allowedEndpoints+"_USERS"
          if(process.env[allowedUsersPath] && process.env[allowedUsersPath] == "ALL") {
            tokenCheckByPassAllowedForUser = true
            tokenCheckByPassAllowedUserDetails = {
              id: process.env.DISABLE_TOKEN_DEFAULT_USERID,
              userId:process.env.DISABLE_TOKEN_DEFAULT_USERID,
              roles:[process.env.DISABLE_TOKEN_DEFAULT_USER_ROLE],
              name:process.env.DISABLE_TOKEN_DEFAULT_USER_NAME,
              email:process.env.DISABLE_TOKEN_DEFAULT_USER_EMAIL,
            }
          } else if(process.env[allowedUsersPath]) {
            let jwtInfo = jwtDecode(token)
            process.env[allowedUsersPath].split(',').forEach(allowedUser => {
              if(allowedUser == jwtInfo.sub) {
                tokenCheckByPassAllowedForUser = true
                tokenCheckByPassAllowedUserDetails = {
                  id: jwtInfo.sub,
                  userId: jwtInfo.sub,
                  roles:[process.env.DISABLE_TOKEN_DEFAULT_USER_ROLE],
                  name:jwtInfo.name,
                  email:jwtInfo.email,
                }
              }
            })
          }
        }
      })
  }

  if (!token) {
    console.error("Token Not Found!!");
    rspObj.errCode = reqMsg.TOKEN.MISSING_CODE;
    rspObj.errMsg = reqMsg.TOKEN.MISSING_MESSAGE;
    rspObj.responseCode = responseCode.unauthorized;
    return res.status(401).send(respUtil(rspObj));
  }

  apiInterceptor.validateToken(token, function(err, tokenData) {
    // console.error(err, tokenData, rspObj);
    
    if (err && tokenCheckByPassAllowedForURL && tokenCheckByPassAllowedForUser) {
      req.rspObj.userId = tokenCheckByPassAllowedUserDetails.userId;
      req.rspObj.userToken = req.headers["x-authenticated-user-token"];
      delete req.headers["x-authenticated-userid"];
      delete req.headers["x-authenticated-user-token"];
      req.headers["x-authenticated-userid"] = tokenCheckByPassAllowedUserDetails.userId;
      req.rspObj = rspObj;
      req.userDetails = tokenCheckByPassAllowedUserDetails;
      req.userDetails.allRoles = tokenCheckByPassAllowedUserDetails.roles;

      let jwtInfomration = jwtDecode(token)
      jwtInfomration["x-authenticated-user-token"] = req.rspObj.userToken
      const tokenByPassAllowedLog = { method: req.method, url: req.url, headers: req.headers, body: req.body, errorMsg: "TOKEN BYPASS ALLOWED", errorStack: err, customFields : jwtInfomration}
      slackClient.sendExceptionLogMessage(tokenByPassAllowedLog)
      next();
      return
    }
    
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
