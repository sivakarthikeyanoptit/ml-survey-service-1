/**
 * Project          : Doxtro
 * Module           : Configuration
 * Source filename  : index.js
 * Description      : Environment related configuration variables
 * Author           : Lloyd Presly Saldanha <lloyd.presly@above-inc.com>
 * Copyright        : Copyright © 2017
 *                    Written under contract by Above Solutions Pvt. Ltd.
 */


var installModule = function (config) {
    global.AbstractController = require('../Generic/AbstractController').init(config);
}

const configuration = {
    development: {
        root: require('path').normalize(__dirname + '/..'),
        app: {
            name: 'doxtro-api'
        },
        host: process.env.HOST || 'http://localhost',
        port: process.env.PORT || 8020,
        DB_Config: {
            connection: {
                mongodb: {
                    host: process.env.MONGODB_URL || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || "mongodb://localhost:27017",
                    user: "",
                    pass: "",
                    database: process.env.DB || 'Project-Name-Development'
                }
            },
            cassandraConnection: {
                clientOptions: {
                    contactPoints: ['35.200.172.221'],
                    // protocolOptions: { port: 9042 },
                    keyspace: 'shikshalokam',
                    user: "",
                    pass: ""
                },
                ormOptions: {
                    defaultReplicationStrategy: {
                        class: 'SimpleStrategy',
                        replication_factor: 1
                    },
                    migration: 'safe',
                }
            }
        },
        version: '0.0.1',
        URLPrefix: '/api/v1',
        security: {
            tokenLife: 3600
        },
        email: {
            senderEmail: '',
            password: ''
        },
        LoginByPass: false
    },
    staging: {
        root: require('path').normalize(__dirname + '/..'),
        app: {
            name: 'doxtro-api'
        },
        host: process.env.HOST || 'http://localhost',
        port: process.env.PORT || 8001,
        DB_Config: {
            connection: {
                mongodb: {
                    host: process.env.MONGODB_URL || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || "mongodb://localhost:27017",
                    user: "",
                    pass: "",
                    database: process.env.DB || 'Project-Name-Staging'
                }
            }
        },
        version: '0.0.1',
        URLPrefix: '/api/v1',
        security: {
            tokenLife: 3600
        },
        facebook: {
            clientID: '',
            clientSecret: ''
        },
        google: {
            clientID: '',
            clientSecret: ''
        },
        email: {
            senderEmail: '',
            password: ''
        },
        LoginByPass: false
    },
    testing: {
        root: require('path').normalize(__dirname + '/..'),
        app: {
            name: 'doxtro-api'
        },
        host: process.env.HOST || 'http://localhost',
        port: process.env.PORT || 8000,
        DB_Config: {
            connection: {
                mongodb: {
                    host: process.env.MONGODB_URL || process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || "mongodb://localhost:27017",
                    user: "",
                    pass: "",
                    database: process.env.DB || 'Project-Name-Testing'
                }
            }
        },
        version: '0.0.1',
        URLPrefix: '/api/v1',
        security: {
            tokenLife: 3600
        },
        facebook: {
            clientID: '',
            clientSecret: ''
        },
        google: {
            clientID: '',
            clientSecret: ''
        },
        email: {
            senderEmail: '',
            password: ''
        },
        LoginByPass: false
    }
};

let env = process.env.NODE_ENV || 'development';
installModule(configuration[env]);

module.exports = configuration[env];
