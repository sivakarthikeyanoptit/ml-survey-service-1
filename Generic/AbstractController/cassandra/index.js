const httpStatus = require('../../httpStatusCodes');
const async = require('async');

let AbstractController = class AbstractController {
    cassandraConstructor(schema) {
        this.cassandraModel = databases['cassandra'].createModel(schema);
        this.cassandraSchema = schema.name;
        this.errorMessages = {
            'fieldsMissing': 'Few fields are missing!',
            'typeMismatch': 'Invalid type of data has been sent!',
            'databaseFailure': 'Database Failure'
        }
    }

    _cassandraInsert(data) {
        var self = this;
        return new Promise((resolve, reject) => {
            let cassandraModel = self.cassandraModel;
            let model = new cassandraModel(data);
            model.save(err => {
                if (!err) resolve({ data: model, status: httpStatus.ok, message: self.cassandraSchema + ' record created successfully' });
                else reject({ error: err, status: httpStatus.bad_request, message: 'failed to save' });
            })
        })
    }

    _cassandraFind(queryString) {
        var self = this;
        return new Promise((resolve, reject) => {
            self.cassandraModel.find({}, (error, data) => {
                if (error) {
                    reject({ error: error, status: httpStatus.bad_request, message: 'error occurred' });
                } else if (!data.length) {
                    reject({ data: null, status: httpStatus.not_found, message: 'No ' + self.cassandraSchema + ' record found' });
                } else {
                    resolve({ data: data, status: httpStatus.ok, message: self.cassandraSchema + '\'s record found successfully' });
                }
            });
        });
    }

    _cassandraCount(queryString) {
        return Promise.resolve({ data: 10 });
        var self = this;
        return new Promise((resolve, reject) => {
            resolve(10);
            // self.cassandraModel.find({}, (error, data) => {
            //     if (error) {
            //         reject({ error: error, status: httpStatus.bad_request, message: 'error occurred' });
            //     } else if (!data.length) {
            //         reject({ data: null, status: httpStatus.not_found, message: 'No ' + self.cassandraSchema + ' record found' });
            //     } else {
            //         resolve({ data: data, status: httpStatus.ok, message: self.cassandraSchema + '\'s record found successfully' });
            //     }
            // });
        });
    }

}

module.exports = AbstractController;
