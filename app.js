require("dotenv").config();
//config and routes
global.config = require("./config");
require("./config/globalVariable")();

let router = require("./routes");

//express
const express = require("express");
let app = express();

//required modules
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const cors = require("cors");
var fs = require("fs");
var path = require("path");

//To enable cors
app.use(cors());


//health check
app.get("/ping", (req, res) => {
  res.send("pong!");
});

app.use(fileUpload());
app.use(bodyParser.json({ limit: '50MB' }));
app.use(bodyParser.urlencoded({ limit: '50MB', extended: false }));
app.use(express.static("public"));

fs.existsSync("logs") || fs.mkdirSync("logs");

const serviceBaseUrl = process.env.APPLICATION_BASE_URL || "/assessment/";

//API documentation (apidoc)
if (process.env.NODE_ENV == "development") {
  app.use(express.static("apidoc"));
  app.get("/apidoc", (req, res) => {
    res.sendFile(path.join(__dirname, "/public/apidoc/index.html"));
  });
}

// app.get(serviceBaseUrl+"web/*", function(req, res) {
//   res.sendFile(path.join(__dirname, "/public/assessment/web/index.html"));
// });

app.get(serviceBaseUrl + "web2/*", function (req, res) {
  res.sendFile(path.join(__dirname, "/public" + serviceBaseUrl + "web2/index.html"));
});

var bunyan = require("bunyan");
global.loggerObj = bunyan.createLogger({
  name: "foo",
  streams: [
    {
      type: "rotating-file",
      path: path.join(__dirname + "/logs/" + process.pid + "-all.log"),
      period: "1d", // daily rotation
      count: 3 // keep 3 back copies
    }
  ]
});
global.loggerExceptionObj = bunyan.createLogger({
  name: "exceptionLogs",
  streams: [
    {
      type: "rotating-file",
      path: path.join(__dirname + "/logs/" + process.pid + "-exception.log"),
      period: "1d", // daily rotation
      count: 3 // keep 3 back copies
    }
  ]
});

app.all("*", (req, res, next) => {
  loggerObj.info({
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  console.log("-------Request log starts here------------------");
  console.log(
    "%s %s on %s from ",
    req.method,
    req.url,
    new Date(),
    req.headers["user-agent"]
  );
  console.log("Request Headers: ", req.headers);
  console.log("Request Body: ", req.body);
  console.log("Request Files: ", req.files);
  console.log("-------Request log ends here------------------");
  next();
});


//add routing
router(app);

//listen to given port
app.listen(config.port, () => {

  log.info(
    "Environment: " +
    (process.env.NODE_ENV ? process.env.NODE_ENV : "development")
  );

  log.info("Application is running on the port:" + config.port);

});
