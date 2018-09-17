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

// boostrap all controllers
global.controllers = requireAll({
  dirname: __dirname + "/controllers",
  filter: /(.+Controller)\.js$/,
  resolve: function(Controller) {
    return new Controller(models[Controller.name]);
  }
});

app.use(fileUpload());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

//request logger
var fs = require("fs");
var morgan = require("morgan");
var path = require("path");

fs.existsSync("logs") || fs.mkdirSync("logs");
var accessLogStream = fs.createWriteStream(
  path.join(__dirname, "./logs/" + process.env.NODE_ENV + "/access.log"),
  { flags: "a" }
);
var errorLogStream = fs.createWriteStream(
  path.join(__dirname, "./logs/" + process.env.NODE_ENV + "/error.log"),
  { flags: "a" }
);
app.use(morgan("combined", { stream: accessLogStream }));
app.use(
  morgan("combined", {
    stream: errorLogStream,
    skip: function(req, res) {
      return res.statusCode < 400;
    }
  })
);
app.use(morgan("dev"));

//swagger docs
const swagger = require("./swagger");
const swaggerMW = new swagger();
app.use("/assessment/api/v1/swagger", swaggerMW.sendFile);

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
});
