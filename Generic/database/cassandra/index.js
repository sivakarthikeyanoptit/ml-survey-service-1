var ExpressCassandra = require("express-cassandra");

module.exports = class database {
  constructor(defaults) {
    defaults.cassandraConnection.clientOptions.queryOptions = {
      consistency: ExpressCassandra.consistencies.one
    };
    if (
      defaults.cassandraConnection.clientOptions.user &&
      defaults.cassandraConnection.clientOptions.pass
    ) {
      defaults.cassandraConnection.clientOptions.authProvider = new ExpressCassandra.driver.auth.PlainTextAuthProvider(
        "casandra",
        "casandra"
      );
      defaults.cassandraConnection.clientOptions.pooling = {
        warmup: true
      };
    }
    this.db_connection = ExpressCassandra.createClient(
      defaults.cassandraConnection
    );
    this.dataTypes = {
      String: "text",
      ObjectId: "text"
    };
  }

  createModel(opts) {
    let self = this;
    let model = this.db_connection.loadSchema(opts.name, {
      fields: self._createCompoundSchema(opts.schema),
      key: opts.key
    });
    return model;
  }

  _createCompoundSchema(schema) {
    var self = this;
    var schemaDefination = {}; //{ _id: { "type": "uuid", "default": { "$db_function": "uuid()" } } };
    Object.keys(schema).forEach(key => {
      if (typeof schema[key] == "string") {
        schemaDefination[key] = self.dataTypes[schema[key]];
      }
    });
    return schemaDefination;
  }
};
