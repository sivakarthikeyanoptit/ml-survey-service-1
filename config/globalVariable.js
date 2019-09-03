let fs = require("fs"),
  path = require("path");
const requireAll = require("require-all");
mkdirp(path.join(__dirname + "/../logs/" + process.env.NODE_ENV));
mkdirp(path.join(__dirname + "/../" + "uploads"));

gen = Object.assign(global, {});

module.exports = function () {
  var Log = require("log");
  // let createStream = fs.createWriteStream(
  //   __dirname +
  //     "/../logs/" +
  //     process.env.NODE_ENV +
  //     "/log-" +
  //     new Date().getTime() +
  //     ".log",
  //   { flags: "w" }
  // );
  // let readStream = fs.createReadStream(__dirname +'/../logs/'+process.env.NODE_ENV + '/logs.log');
  global.async = require("async");
  global.ROOT_PATH = path.join(__dirname, '..')
  global.log = new Log(global.config.log);
  global._ = require("lodash");
  gen.utils = require(ROOT_PATH + "/generics/helpers/utils");
  global.config = require(".");

  global.ENABLE_CONSOLE_LOGGING = process.env.ENABLE_CONSOLE_LOGGING || "ON";
  global.ENABLE_BUNYAN_LOGGING = process.env.ENABLE_BUNYAN_LOGGING || "ON";


  global.REQUEST_TIMEOUT_FOR_REPORTS = process.env.REQUEST_TIMEOUT_FOR_REPORTS || 120000;

  // boostrap all models
  global.models = requireAll({
    dirname: ROOT_PATH + "/models",
    filter: /(.+)\.js$/,
    resolve: function (Model) {
      return Model;
    }
  });

  //load base v1 controllers
  fs.readdirSync(ROOT_PATH + '/controllers/v1/').forEach(function (file) {
    if (file.match(/\.js$/) !== null) {
      var name = file.replace('Controller.js', '');
      global[name + 'BaseController'] = require(ROOT_PATH + '/controllers/v1/' + file);
    }
  });

  //load base v2 controllers
  fs.readdirSync(ROOT_PATH + '/controllers/v2/').forEach(function (file) {
    if (file.match(/\.js$/) !== null) {
      var name = file.replace('Controller.js', '');
      global[name + 'BaseController'] = require(ROOT_PATH + '/controllers/v2/' + file);
    }
  });

  //load schema files
  fs.readdirSync(ROOT_PATH + '/models/').forEach(function (file) {
    if (file.match(/\.js$/) !== null) {
      var name = file.replace('.js', '');
      global[name + 'Schema'] = require(ROOT_PATH + '/models/' + file);
    }
  });

  // boostrap all controllers
  global.controllers = requireAll({
    dirname: ROOT_PATH + "/controllers",
    filter: /(.+Controller)\.js$/,
    resolve: function (Controller) {
      if (Controller.name) return new Controller(models[Controller.name]);
      else return new Controller();
    }
  });
};

function mkdirp(dir, exist = "", state = 1) {
  if (dir != exist) {
    let path = dir.split("/");
    exist = exist + "/" + path[state];
    path = path.slice(state + 1, path.length);
    if (fs.existsSync(exist)) {
      mkdirp(dir, exist, ++state);
    } else {
      fs.mkdirSync(exist);
      mkdirp(dir, exist, ++state);
    }
  }
}
