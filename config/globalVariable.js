let fs = require("fs"),
  path = require("path");
mkdirp(path.join(__dirname + "/../logs/" + process.env.NODE_ENV));
mkdirp(path.join(__dirname + "/../" + "uploads"));

gen = Object.assign(global, {});

module.exports = function() {
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

  global.log = new Log(global.config.log);
  global._ = require("lodash");
  gen.utils = require("../generics/helpers/utils");
  gen.jwt = require("../generics/helpers/jwt");
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
