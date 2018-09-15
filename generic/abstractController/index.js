function mix(...mixins) {
  class Mix {}

  // Programmatically add all the methods and accessors
  // of the mixins to class Mix.
  for (let mixin of mixins) {
    copyProperties(Mix, mixin);
    copyProperties(Mix.prototype, mixin.prototype);
  }

  return Mix;
}

function copyProperties(target, source) {
  for (let key of Reflect.ownKeys(source)) {
    if (key !== "constructor" && key !== "prototype" && key !== "name") {
      let desc = Object.getOwnPropertyDescriptor(source, key);
      Object.defineProperty(target, key, desc);
    }
  }
}

let cassandraAbstract = require("./cassandra");
let mongoAbstract = require("./mongo");

let BaseController = class BaseController extends mix(
  mongoAbstract,
  cassandraAbstract
) {
  constructor(schema) {
    super(schema);
    super.mongoConstructor(schema);
    super.cassandraConstructor(schema);
  }

  isValidMethod(expectedMethod, requestMethod) {
    return new Promise((resolve, reject) => {
      if (expectedMethod == requestMethod) resolve({ status: 200 });
      else reject({});
    });
  }

  find(req) {
    let prefix = "_" + (req.db || "mongo");
    return this.isValidMethod("GET", req.method).then(result => {
      if (req.params._id)
        return eval(super[prefix + "FindById"](req.params._id));
      else {
        var totalCount = 0;
        var query = req.query;
        return eval(super[prefix + "Count"](query))
          .then(result => {
            totalCount = result.data;
            return eval(super[prefix + "Find"](query));
          })
          .then(result => {
            var limit = query.limit;
            var skip = query.skip;
            if (isNaN(limit) || typeof limit == "string") {
              limit = limit === undefined ? 10 : parseInt(limit);
            }

            limit = limit > 20 ? 20 : limit;

            if (isNaN(skip) || typeof skip == "string") {
              skip = skip === undefined ? 0 : parseInt(skip);
            }

            var pagination = {
              from: skip + 1,
              to: skip + result.data.length
            };
            result.totalCount = totalCount;
            result.count = result.data.length;
            result.pagination = pagination;
            return result;
          });
      }
    });
  }

  aggregate(req) {
    let prefix = "_mongo";
    return this.isValidMethod("GET", req.method).then(result => {
      let prefix = "_mongo";
      return eval(super[prefix + "Aggregate"](req.query));
    });
  }

  populate(req) {
    let prefix = "_mongo";
    return this.isValidMethod("GET", req.method).then(result => {
      let prefix = "_mongo";
      return eval(super[prefix + "Populate"](req.query, req.populate));
    });
  }

  insert(req) {
    return this.isValidMethod("POST", req.method).then(result => {
      let prefix = "_" + (req.db || "mongo");
      return eval(super[prefix + "Insert"](req.body));
    });
  }

  count(req) {
    return this.isValidMethod("GET", req.method).then(result => {
      let prefix = "_" + (req.db || "mongo");
      return eval(super[prefix + "Count"](req.query));
    });
  }

  findOne(req) {
    return this.isValidMethod("GET", req.method).then(result => {
      let prefix = "_" + (req.db || "mongo");
      return eval(super[prefix + "FindOne"](req.query));
    });
  }

  findById(req) {
    return this.isValidMethod("GET", req.method).then(result => {
      let prefix = "_" + (req.db || "mongo");
      return eval(super[prefix + "FindById"](req.query));
    });
  }

  findOneAndUpdate(req) {
    return this.isValidMethod("PUT", req.method).then(result => {
      let prefix = "_" + (req.db || "mongo");
      return eval(super[prefix + "FindOneAndUpdate"](req.query, req.body));
    });
  }

  update(req) {
    return this.isValidMethod("PUT", req.method).then(result => {
      let prefix = "_" + (req.db || "mongo");
      if (req.params._id) {
        return eval(
          super[prefix + "FindByIdAndUpdate"](req.params._id, req.body)
        );
      } else {
        return eval(super[prefix + "FindAndUpdate"](req.query, req.body));
      }
    });
  }

  remove(req) {
    return this.isValidMethod("DELETE", req.method).then(result => {
      let prefix = "_" + (req.db || "mongo");
      if (req.params._id) {
        return eval(super[prefix + "RemoveById"](req.params._id));
      } else {
        return eval(super[prefix + "Remove"](req.query));
      }
    });
  }
};

module.exports = {
  init: function(options) {
    const MongoDatabaseController = require("../database/mongo");
    const CassandraDatabaseController = require("../database/cassandra");
    global.databases = {
      mongo: new MongoDatabaseController(options.DB_Config),
      cassandra: new CassandraDatabaseController(options.DB_Config)
    };
    return BaseController;
  }
};
