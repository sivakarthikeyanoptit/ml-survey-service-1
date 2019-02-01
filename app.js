require("dotenv").config();
//config and routes
global.config = require("./config");
require("./config/globalVariable")();

let router = require("./routes");

//express
const express = require("express");
const fileUpload = require("express-fileupload");
let app = express();

//required modules
const requireAll = require("require-all");
const bodyParser = require("body-parser");
const cors = require("cors");

//To enable cors
app.use(cors());

//check server connectivity
app.get("/ping", (req, res) => {
  res.send("pong!");
});

// boostrap all models
global.models = requireAll({
  dirname: __dirname + "/models",
  filter: /(.+)\.js$/,
  resolve: function(Model) {
    return Model;
  }
});

//load base controllers
require('fs').readdirSync(__dirname+'/controllers/v1/').forEach(function(file) {
  if (file.match(/\.js$/) !== null) {
    var name = file.replace('Controller.js', '');
    global[name+'BaseController'] = require('./controllers/v1/' + file);
  }
});

//load schema files
require('fs').readdirSync(__dirname+'/models/').forEach(function(file) {
  if (file.match(/\.js$/) !== null) {
    var name = file.replace('.js', '');
    global[name+'Schema'] = require('./models/' + file);
  }
});

// boostrap all controllers
global.controllers = requireAll({
  dirname: __dirname + "/controllers",
  filter: /(.+Controller)\.js$/,
  resolve: function(Controller) {
    if (Controller.name) return new Controller(models[Controller.name]);
    else return new Controller();
  }
});

app.use(fileUpload());
app.use(bodyParser.json({limit: '50MB'}));
app.use(bodyParser.urlencoded({ limit: '50MB', extended: false }));
app.use(express.static("public"));

//request logger
var fs = require("fs");
//var morgan = require("morgan");
var path = require("path");

fs.existsSync("logs") || fs.mkdirSync("logs");
// var accessLogStream = fs.createWriteStream(
//   path.join(__dirname, "./logs/" + process.env.NODE_ENV + "/access.log"),
//   { flags: "a" }
// );
// var errorLogStream = fs.createWriteStream(
//   path.join(__dirname, "./logs/" + process.env.NODE_ENV + "/error.log"),
//   { flags: "a" }
// );
// app.use(morgan("combined", { stream: accessLogStream }));
// app.use(
//   morgan("combined", {
//     stream: errorLogStream,
//     skip: function(req, res) {
//       return res.statusCode < 400;
//     }
//   })
// );
// app.use(morgan("dev"));

//swagger docs
const swagger = require("./swagger");
const swaggerMW = new swagger();
const serviceBaseUrl = process.env.APPLICATION_BASE_URL || "/assessment/"
app.use(serviceBaseUrl+"api/v1/swagger", swaggerMW.sendFile);

// app.get(serviceBaseUrl+"web/*", function(req, res) {
//   res.sendFile(path.join(__dirname, "/public/assessment/web/index.html"));
// });

app.get(serviceBaseUrl+"web2/*", function(req, res) {
  res.sendFile(path.join(__dirname, "/public"+serviceBaseUrl+"web2/index.html"));
});

var bunyan = require("bunyan");
global.loggerObj = bunyan.createLogger({
  name: "foo",
  streams: [
    {
      type: "rotating-file",
      path: path.join(__dirname + "/logs/all.log"),
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
      path: path.join(__dirname + "/logs/exception.log"),
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

// Add headers
/* app.use(function(req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
}); */

//add routing
router(app);

//listen to given port

app.listen(config.port, () => {
  log.info(
    "Environment: " +
      (process.env.NODE_ENV ? process.env.NODE_ENV : "development")
  );
  log.info("Application is running on the port:" + config.port);




  // const schedule = require("node-schedule");

  // var schedule_string =
  //   process.env.NODE_ENV == "production" ? "0 0 * * * *" : "0 * * * * *";

  // var csvData = schedule.scheduleJob(schedule_string, () => {
  //   var date = new Date();
  //   var hour = date.getMinutes();

  //   if (process.env.NODE_ENV == "production") {
  //     var hour = date.getHours();
  //   }

  //   let csvReports = require("./generics/helpers/csvReports");

  //   if ((hour % 2 == 0) && (hour >= 8) && (hour <= 20)) {
  //     let csvReports = require("./generics/helpers/csvReports");
  //     ["BL", "LW", "SI", "AC3", "PI", "AC8", "PAI", "TI", "AC5"].map(item =>
  //       csvReports.getCSVData(process.env.PROGRAM_NAME_FOR_SCHEDULE, item)
  //     );
  //   }
  // });
});
