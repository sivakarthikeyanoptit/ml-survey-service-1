const jwt = require('jsonwebtoken');
const fs = require('fs');
let slackClient = require("../helpers/slackCommunications");
var messageUtil = require("./lib/messageUtil");
var responseCode = require("../httpStatusCodes");

const keycloakPublicKeyPath = "keycloak-public-keys/";


var reqMsg = messageUtil.REQUEST;

var respUtil = function (resp) {
  return {
    status: resp.errCode,
    message: resp.errMsg,
    currentDate: new Date().toISOString()
  };
};

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

module.exports = async function (req, res, next) {

  if (req.path.includes("/sharedLinks/verify")) return next();

  if (req.headers && req.headers.linkid) {

    let isShareable = await database.models.sharedLink.findOne({ linkId: req.headers.linkid, isActive: true });

    let requestURL = req.url.includes("?") ? req.url.split("?")[0] : req.url;

    if (isShareable && requestURL.includes(isShareable.reportName)) {

      req.url = (isShareable.queryParams) ? requestURL + "?" + isShareable.queryParams : requestURL;

      req.userDetails = isShareable.userDetails;

      return next();

    } else {

      let msg = "Bad request.";

      const slackMessageForBadRequest = { userIP: req.headers["x-real-ip"], method: req.method, url: req.url, headers: req.headers, body: req.body, errorMsg: msg, customFields: null };

      slackClient.badSharedLinkAccessAttemptAlert(slackMessageForBadRequest);

      let rspObj = {};

      rspObj.errCode = 400;

      rspObj.errMsg = msg;

      rspObj.responseCode = 400;

      return res.status(400).send(respUtil(rspObj));

    }
  }

  removedHeaders.forEach(function (e) {
    delete req.headers[e];
  });

  let paths = [
    "reports", 
    "pendingAssessments", 
    "completedAssessments", 
    "pendingObservations", 
    "completedObservations", 
    "solutionDetails",
    "/solutions/list",
    "/programs/listByIds",
    "frameworks/delete/",
    "questions/delete/",
    "observationSubmissions/disable/"
  ]

  var token = req.headers["x-authenticated-user-token"];
  if (!req.rspObj) req.rspObj = {};
  var rspObj = req.rspObj;

  
  let internalAccessApiPaths = [
    "createGesture", 
    "createEmoji", 
    "solutionDetails",
    "solutions/updateSolutions", 
    "solutions/addEntities",
    "frameworks/delete/",
    "questions/delete/",
    "observationSubmissions/disable/"
  ];
  
  let performInternalAccessTokenCheck = false;
  await Promise.all(internalAccessApiPaths.map(async function (path) {
    if (req.path.includes(path)) {
      performInternalAccessTokenCheck = true;
    }
  }));

  
  if (performInternalAccessTokenCheck) {
    if (req.headers["internal-access-token"] !== process.env.INTERNAL_ACCESS_TOKEN) {
      rspObj.errCode = reqMsg.TOKEN.MISSING_CODE;
      rspObj.errMsg = reqMsg.TOKEN.MISSING_MESSAGE;
      rspObj.responseCode = responseCode.unauthorized.status;
      return res.status(401).send(respUtil(rspObj));
    }
  }

//api need both internal access token and x-authenticated-user-token
  const internalAccessAndTokenApiPaths = ["entityAssessors/create"];
  let performInternalAccessTokenAndTokenCheck = false;
  await Promise.all(internalAccessAndTokenApiPaths.map(async function (path) {
    if (req.path.includes(path)) {
      performInternalAccessTokenAndTokenCheck = true;
    }
  }));

  
  if (performInternalAccessTokenAndTokenCheck) {
    if (req.headers["internal-access-token"] !== process.env.INTERNAL_ACCESS_TOKEN  || !token) {
      rspObj.errCode = reqMsg.TOKEN.MISSING_CODE;
      rspObj.errMsg = reqMsg.TOKEN.MISSING_MESSAGE;
      rspObj.responseCode = responseCode.unauthorized.status;
      return res.status(401).send(respUtil(rspObj));
    }
  }

//api need either x-authenticated-user-token or internal access token
 const insternalAccessTokenOrTokenPaths = ["userExtension/getProfile/","entities/relatedEntities/"];
 let performInternalAccessTokenOrTokenCheck = false;
  await Promise.all(insternalAccessTokenOrTokenPaths.map(async function (path) {
    if (req.path.includes(path)) {
      performInternalAccessTokenOrTokenCheck = true;
    }
  }));
  
  if (performInternalAccessTokenOrTokenCheck && !token) {
    if (req.headers["internal-access-token"] !== process.env.INTERNAL_ACCESS_TOKEN ) {
      rspObj.errCode = reqMsg.TOKEN.MISSING_CODE;
      rspObj.errMsg = reqMsg.TOKEN.MISSING_MESSAGE;
      rspObj.responseCode = responseCode.unauthorized.status;
      return res.status(401).send(respUtil(rspObj));
    }
    else {
        next();
        return
    }
  }

  for (let pointerToByPassPath = 0; pointerToByPassPath < paths.length; pointerToByPassPath++) {
    if ((req.path.includes(paths[pointerToByPassPath]) || (req.query.csv && req.query.csv == true)) && req.headers["internal-access-token"] === process.env.INTERNAL_ACCESS_TOKEN) {
      req.setTimeout(parseInt(120000));
      next();
      return
    }
  }

  if (!token) {
    rspObj.errCode = reqMsg.TOKEN.MISSING_CODE;
    rspObj.errMsg = reqMsg.TOKEN.MISSING_MESSAGE;
    rspObj.responseCode = responseCode.unauthorized.status;
    return res.status(401).send(respUtil(rspObj));
  }

  var decoded = jwt.decode(token, { complete: true });
  if(decoded === null || decoded.header === undefined){
    return res.status(HTTP_STATUS_CODE["unauthorized"].status).send(respUtil(rspObj));
  }

  const kid = decoded.header.kid;
  let cert = "";
  let path = keycloakPublicKeyPath + kid + '.pem';
  
  if (fs.existsSync(path)) {

    cert = fs.readFileSync(path);
    jwt.verify(token, cert, { algorithm: 'RS256' }, function (err, decode) {

      if (err) {
        return res.status(401).send(respUtil(rspObj));
      }

      if (decode !== undefined) {
        const expiry = decode.exp;
        const now = new Date();
        if (now.getTime() > expiry * 1000) {
          return res.status(401).send(respUtil(rspObj));
        }

        req.userDetails = {
          userToken : token,
          id : decode.sub.split(":").pop(),
          userId : decode.sub.split(":").pop(),
          userName : decode.preferred_username,
          email : decode.email,
          firstName : decode.name
        }

        next();
      
      } else {

        return res.status(401).send(respUtil(rspObj));
      }

    });
  } else {
    rspObj.errCode = reqMsg.TOKEN.MISSING_CODE;
    rspObj.errMsg = reqMsg.TOKEN.MISSING_MESSAGE;
    rspObj.responseCode = responseCode.unauthorized.status;
    return res.status(401).send(respUtil(rspObj));
  }
};
