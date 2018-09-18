/**
 * Project          : Shikshalokam-Assessment
 * Module           : Configuration
 * Source filename  : index.js
 * Description      : Environment related configuration variables
 * Copyright        : Copyright © 2018
 *                    Written under contract by Above Solutions Pvt. Ltd.
 * Author           : Yogesh Sinoriya <yogesh.sinoriya@above-inc.com>
 */

let db_connect = function(configData) {
  global.database = require("./dbConfig")(
    configData.DB_Config.connection.mongodb
  );
  global.ObjectId = database.ObjectId;
  global.Abstract = require("../generics/abstract");
};

const configuration = {
  development: {
    root: require("path").normalize(__dirname + "/.."),
    app: {
      name: "sl-assessment-api"
    },
    host: process.env.HOST || "http://localhost",
    port: process.env.PORT || 4201,
    log: process.env.LOG || "debug",
    DB_Config: {
      connection: {
        mongodb: {
          host:
            process.env.MONGODB_URL ||
            process.env.MONGOLAB_URI ||
            process.env.MONGOHQ_URL ||
            "mongodb://localhost:27017",
          user: "",
          pass: "",
          database: process.env.DB || "sl-assessment"
        }
      },
      plugins: {
        timestamps: true,
        elasticSearch: false,
        softDelete: true,
        autoPopulate: false,
        timestamps_fields: {
          createdAt: "createdAt",
          updatedAt: "updatedAt"
        }
      }
    },
    version: "0.0.1",
    URLPrefix: "/api/v1",
    webUrl: "https://dev.shikshalokam.org"
  },

  stage: {
    root: require("path").normalize(__dirname + "/.."),
    app: {
      name: "sl-assessment-api"
    },
    host: process.env.HOST || "http://localhost",
    port: process.env.PORT || 4201,
    log: process.env.LOG || "info",
    DB_Config: {
      connection: {
        mongodb: {
          host:
            process.env.MONGODB_URL ||
            process.env.MONGOLAB_URI ||
            process.env.MONGOHQ_URL ||
            "mongodb://10.160.0.8:27017",
          user: "",
          pass: "",
          database: process.env.DB || "sl-assessment-stage"
        }
      },
      plugins: {
        timestamps: true,
        elasticSearch: false,
        softDelete: true,
        autoPopulate: false,
        timestamps_fields: {
          createdAt: "createdAt",
          updatedAt: "updatedAt"
        }
      }
    },
    version: "0.0.1",
    URLPrefix: "/api/v1",
    webUrl: "https://dev.shikshalokam.org"
  },

  qa: {
    root: require("path").normalize(__dirname + "/.."),
    app: {
      name: "sl-assessment-api"
    },
    host: process.env.HOST || "http://localhost",
    port: process.env.PORT || 4201,
    log: process.env.LOG || "notice",
    DB_Config: {
      connection: {
        mongodb: {
          host:
            process.env.MONGODB_URL ||
            process.env.MONGOLAB_URI ||
            process.env.MONGOHQ_URL ||
            "mongodb://10.160.0.8:27017",
          user: "",
          pass: "",
          database: process.env.DB || "sl-assessment"
        }
      },
      plugins: {
        timestamps: true,
        elasticSearch: false,
        softDelete: true,
        autoPopulate: false,
        timestamps_fields: {
          createdAt: "createdAt",
          updatedAt: "updatedAt"
        }
      }
    },
    version: "0.0.1",
    URLPrefix: "/api/v1",
    webUrl: "https://dev.shikshalokam.org"
  },

  production: {
    root: require("path").normalize(__dirname + "/.."),
    app: {
      name: "sl-assessment-api"
    },
    host: process.env.HOST || "http://localhost",
    port: process.env.PORT || 4201,
    log: process.env.LOG || "warning",
    DB_Config: {
      connection: {
        mongodb: {
          host:
            process.env.MONGODB_URL ||
            process.env.MONGOLAB_URI ||
            process.env.MONGOHQ_URL ||
            "mongodb://10.160.0.8:27017",
          user: "",
          pass: "",
          database: process.env.DB || "sl-assessment"
        }
      },
      plugins: {
        timestamps: true,
        elasticSearch: false,
        softDelete: true,
        autoPopulate: false,
        timestamps_fields: {
          createdAt: "createdAt",
          updatedAt: "updatedAt"
        }
      }
    },
    version: "0.0.1",
    URLPrefix: "/api/v1",
    webUrl: "ewayapp.its-dost.com"
  }
};

let env = process.env.NODE_ENV || "development";
db_connect(configuration[env]);

module.exports = configuration[env];
