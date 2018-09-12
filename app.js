let config = require("./config");
let router = require("./routes");

const requireAll = require("require-all");
var compression = require("compression");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const morgan = require("morgan");
let app = require("express")();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

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

app.use(morgan("dev"));
app.all("*", (req, res, next) => {
  console.log(
    "---------------------------------------------------------------------------"
  );
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
  next();
});

router(app);

app.listen(config.port, () => {
  console.log("Application is running on the port:" + config.port);
});
