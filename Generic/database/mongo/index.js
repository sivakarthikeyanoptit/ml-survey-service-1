var mongoose = require('mongoose');

mongoose.Promise = global.Promise;
let ObjectId = mongoose.Schema.Types.ObjectId;

//Plugins
var timestamps = require('mongoose-timestamp');
var mongoosastic = require('mongoosastic');
var mongoose_delete = require('mongoose-delete');
var autopopulate = require('mongoose-autopopulate');
var requireAll = require('require-all');
var merge = require('merge');

var db_defaults = {
    plugins: {
        timestamps: true,
        elasticSearch: false,
        softDelete: true,
        autoPopulate: true,
        timestamps_fields: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        }
    },
    connection: {
        mongodb: {
            host: 'mongodb://localhost',
            user: "",
            pass: "",
            database: "",
            replicaSet: ""
        },
        elasticSearchHosts: ['localhost:9200']
    },
    indices: {
        fields: {},
        options: {}
    }
}

module.exports = class database {
    constructor(defaults) {
        this.db_connection = mongoose.createConnection(defaults.connection.mongodb.host + '/' + defaults.connection.mongodb.database + ((defaults.connection.mongodb.replicaSet != "" && defaults.connection.mongodb.replicaSet != undefined) ? ('?replicaSet=' + defaults.connection.mongodb.replicaSet) : ''), defaults.connection.mongodb);
        this.db_connection.on('error', function (err) {
            console.log("err:", err);
        });
        this.db_connection.once('open', function () {
            console.log("DB connection opened");
        });
    }

    createModel(opts) {   // opts is {} or path to {} file
        // opts = name,schema
        opts = this.objectFinder(opts);
        opts.plugins = this.objectExtend(db_defaults.plugins, opts.plugins);
        opts.indices = this.objectExtend(db_defaults.indices, opts.indices);

        if (typeof opts.schema.__proto__.instanceOfSchema === 'undefined') {
            var schema = mongoose.Schema(opts.schema);
        } else {
            var schema = opts.schema;
        }
        // apply Plugins
        if (opts.plugins.timestamps)
            schema.plugin(timestamps, opts.plugins.timestamps_fields);
        if (opts.plugins.elasticSearch)
            schema.plugin(mongoosastic, {
                hosts: defaults.connection.elasticSearchHosts
            })
        if (opts.plugins.softDelete)
            schema.plugin(mongoose_delete, { overrideMethods: true, deletedAt: true });
        if (opts.plugins.autoPopulate)
            schema.plugin(autopopulate);
        //index
        schema.index(opts.indices.fields || {}, opts.indices.options || {});

        var model = this.db_connection.model(opts.name, schema, opts.name);
        // custom methods
        model.insert = function (data) {
            return model(data).save();
        }
        return model;
    }

    // add all models to mongoose/neev db
    createModels(path) {
        return requireAll({
            dirname: process.cwd() + path,
            filter: /(.+)\.js$/,
            resolve: function (Model) {
                return createModel(Model);
            }
        });
    }

    objectFinder(obj) {
        if (typeof obj == "object") { return obj; }
        else if (typeof obj == "string") {
            return require(process.cwd() + obj);
        }
    }

    // extend passed object with default
    objectExtend(default_obj, obj) {
        return merge.recursive(true, this.objectFinder(default_obj), this.objectFinder(obj));
    }
}