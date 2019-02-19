var http = require("https");
const Request = require('./httpRequest');

var getUserInfo = function (token, userId) {
  let options = {
    host: process.env.SHIKSHALOKAM_BASE_HOST,
    port: 443,
    path: "/api/user/v1/read/" + userId,
    method: "GET",
    headers: {
      authorization: process.env.AUTHORIZATION,
      "x-authenticated-user-token": token
    }
  };

  let body = "";
  return new Promise(function (resolve, reject) {
    try {
      var httpreq = http.request(options, function (response) {
        response.setEncoding("utf8");
        response.on("data", function (chunk) {
          body += chunk;
        });
        response.on("end", function () {
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

var getUserDetailByToken = function (token, userName) {
  const reqObj = new Request()

  let requestData = {
    "request": {
      "filters": {
        "userName": userName
      }
    }
  }

  let url = "https://" + process.env.SHIKSHALOKAM_BASE_HOST + "/api/user/v1/search"
  let options = {
    headers: {
      "content-type": "application/json",
      authorization: process.env.AUTHORIZATION,
      "x-authenticated-user-token": token
    },
    json: requestData
  };

  let returnResponse = {}
  return new Promise((resolve, reject) => {
    return resolve(reqObj.post(
      url,
      options
    ));
  }).then(result => {
    let dataResponse = JSON.parse(result.data);
    returnResponse = dataResponse.result.response.content
    return returnResponse
  }).catch((err) => {
    returnResponse = {
      success: false,
      message: "Something went wrong !!"
    }
    return returnResponse
  })
}

module.exports = {
  userInfo: getUserInfo,
  checkUser: getUserDetailByToken
};
