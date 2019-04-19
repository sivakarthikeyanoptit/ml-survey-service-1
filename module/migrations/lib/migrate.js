const init = require("./actions/init");
const create = require("./actions/create");
const upgrade = require("./actions/upgrade");
const down = require("./actions/down");
const status = require("./actions/status");
const database = require("./env/database");
const config = require("./env/configFile");

module.exports = {
  init,
  create,
  upgrade,
  down,
  status,
  database,
  config
};
