var http = require("https");
var getUserInfo = function(token, userId) {
  let options = {
    host: "dev.shikshalokam.org",
    port: 443,
    path: "/api/user/v1/read/" + userId,
    method: "GET",
    headers: {
      authorization: process.env.AUTHORIZATION,
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
module.exports = {
  userInfo: getUserInfo
};
