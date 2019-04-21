const init = require("./actions/init");
const create = require("./actions/create");
const upgrade = require("./actions/upgrade");
const downgrade = require("./actions/down");
const rollback = require("./actions/rollback");
const status = require("./actions/status");
const database = require("./env/database");
require('dotenv').config()

module.exports = {
  init,
  create,
  upgrade,
  downgrade,
  status,
  database,
  rollback
};
