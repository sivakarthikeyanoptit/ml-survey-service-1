const httpStatus = require('../../httpStatusCodes');
const async = require('async');

let AbstractController = class AbstractController {

    constructor(schema) {

    }

    mongoConstructor(mongoSchema) {
        this.mongoModel = databases['mongo'].createModel(mongoSchema);
        this.mongoSchema = mongoSchema.name;
        this.errorMessages = {
            'fieldsMissing': 'Few fields are missing!',
            'typeMismatch': 'Invalid type of data has been sent!',
            'databaseFailure': 'Database Failure'
        }
    }

    _mongoErrorHandler(err) {
        if (err) {
            switch (err.name) {
                case 'ValidationError': return (err.errors !== undefined) ? this._mongoValidateErrorHandler(err) : this.errorMessages.databaseFailure;
                    break;
                case 'CastError': return this.errorMessages.typeMismatch;
                    break;
                default: return this._mongoDatabaseErrorHandler(err);
                    break;
            }
        } else {
            return this.errorMessages.databaseFailure;
        }
    }

    _parseMongoError(message) {
        if (message.indexOf('Path') != -1 && message.indexOf('required') != -1) {
            message = errorMessages.fieldsMissing;
        } else if (message && message.indexOf('E11000') != -1) {
            if (message.indexOf('collection:') != -1) {
                var model = message.split('collection:')[1].split('index:')[0].split('.').pop();
                var key = message.split('_1 dup key')[0].split(':').pop();
                var value = message.split('{ :')[1].split(' }')[0].replace(/"/g, "`");
                key = key.replace(/\s/g, '').replace(/([A-Z])/g, ' $1').replace(/^./, function (str) { return str.toUpperCase(); })
                message = key + ' ' + value + ' already exist!';
            } else {
                var code = message.split('index:')[1].split('.$').pop();
                var key = code.split('_1 dup key')[0].split(':').pop();
                var value = message.split('{ :')[1].split(' }')[0].replace(/"/g, "`");
                key = key.replace(/\s/g, '').replace(/([A-Z])/g, ' $1').replace(/^./, function (str) { return str.toUpperCase(); })
                message = key + ' ' + value + ' already exist!';
            }
        }
        return message;
    }

    _mongoValidateErrorHandler(err) {
        var mongoErr = err.errors;
        var keys = Object.keys(mongoErr);
        return this._parseMongoError(mongoErr[keys[0]].message);
    }

    _mongoDatabaseErrorHandler(err) {
        var message = err.message;
        if (message != undefined) {
            return this._parseMongoError(err.message);
        }
        return errorMessages.databaseFailure;
    }

    _checkRequired(params, body) {
        var params = params;
        return new Promise((resolve, reject) => {
            async.each(params, (param, callback) => {
                if (!body[param]) {
                    callback(new Error("Parameter `" + param + "` is Missing"));
                }
                callback();
            }, (err) => {
                if (err) {
                    return reject({ error: true, message: err.message, status: httpStatus.bad_request });
                } else {
                    resolve({ data: 'continue' });
                }
            })
        });
    }

    getSelectedFields(fields) {
        return (fields !== undefined) ? fields.replace(/,/g, ' ') : ''
    }

    getInQuery(value) {
        var arrayValue = value.split(',');
        return { '$in': arrayValue }
    }

    getBetweenQuery(value) {
        let data = value.split(',');
        let start = data[1];
        let end = data[2];
        return { "$gte": new Date(start), "$lt": new Date(end) };
    }

    isExists(value) {
        let data = value.split(',');
        let condition = data[1] == 'false' ? false : true;
        return { "$exists": condition }
    }

    notEqual(value) {
        let data = value.split(',');
        return { $ne: data[1] }
    }

    validateObjectId(_id) {
        var objectID = require('mongodb').ObjectID;
        return objectID.isValid(_id);
    }

    getFindQuery(find, fields, populate, limit, skip, sort) {
        fields = fields != undefined ? this.getSelectedFields(fields) : '';
        if (limit != '__^all^__') {
            if (isNaN(limit) || typeof limit == 'string') {
                limit = (limit === undefined) ? 10 : parseInt(limit);
            }

            limit = (limit > 20) ? 20 : limit;

            if (isNaN(skip) || typeof skip == 'string') {
                skip = (skip === undefined) ? 0 : parseInt(skip);
            }
        } else {
            limit = 0;
            skip = 0;
        }

        return this.mongoModel.find(find).select(fields).limit(limit).skip(skip).sort(sort);
    }

    getFilterQuery(query) {
        var self = this;
        var filterQuery = {};
        var findParam = ['limit', 'skip', 'fields', 'search', 'populate', 'searchFields', 'sortByAscending', 'sortByDescending'];
        Object.keys(query).forEach(function (key) {
            if (findParam.indexOf(key) < 0) {
                if (query[key].indexOf(',') == -1) {
                    filterQuery[key] = query[key];
                } else if (query[key].indexOf('compare') != -1) {
                    filterQuery[key] = self.getBetweenQuery(query[key])
                } else if (query[key].indexOf('exists') != -1) {
                    filterQuery[key] = self.isExists(query[key])
                } else if (query[key].indexOf('ne') != -1) {
                    filterQuery[key] = self.notEqual(query[key])
                } else {
                    filterQuery[key] = self.getInQuery(query[key]);
                }
            }
        });
        if (query['searchFields'] && query['search']) {
            var search = [];
            var searchText = query['search'].split(' ');
            query['searchFields'].forEach(function (field) {
                var dict = {};
                searchText.forEach(function (text) {
                    dict[field] = new RegExp(text, 'i');
                    search.push(dict);
                });
            });
            filterQuery.$or = search;
        }
        return filterQuery;
    }

    constructFindQuery(query) {
        var filterQuery = this.getFilterQuery(query);
        var findParam = ['limit', 'skip', 'fields', 'search', 'populate', 'searchFields', 'sortByAscending', 'sortByDescending', 'gender', 'gradelevel', 'gradeLevel'];
        var sort = {};
        var sortField = query.sortByAscending ? query.sortByAscending : query.sortByDescending;
        sort[sortField] = query.sortByAscending ? 1 : -1;
        if (!sortField) {
            sort = { 'createdAt': -1 };
        }
        var findQuery = this.getFindQuery(filterQuery, query.fields, query.populate, query.limit, query.skip, sort)
        Object.keys(query).forEach(function (key) {
            if (findParam.indexOf(key) < 0 && query[key] != 'true' && query[key] != 'false' && (typeof query[key]) != 'boolean' && query[key].indexOf(',') < 0) {
                findQuery.where(key).regex(new RegExp(query[key], 'i'))
            }
        })
        return findQuery;
    }

    _mongoInsert(data) {
        var self = this;
        return new Promise((resolve, reject) => {
            return this.mongoModel.create(data)
                .then(result => {
                    resolve({ data: result, status: httpStatus.ok, message: self.mongoSchema + ' record created successfully' });
                }).catch(error => {
                    reject({ error: error, status: httpStatus.bad_request, message: self._mongoErrorHandler(error) });
                });
        })
    }

    _mongoFind(queryString) {
        var self = this;
        var findQuery = self.constructFindQuery(queryString);
        return new Promise((resolve, reject) => {
            findQuery.exec((error, data) => {
                if (error) {
                    reject({ error: error, status: httpStatus.bad_request, message: self._mongoErrorHandler(error) });
                } else if (!data.length) {
                    reject({ data: null, status: httpStatus.not_found, message: 'No ' + self.mongoSchema + ' record found' });
                } else {
                    resolve({ data: data, status: httpStatus.ok, message: self.mongoSchema + '\'s record found successfully' });
                }
            });
        });
    }

    mongoCount(query) {
        var find = this.getFilterQuery(query);
        var countQuery = this.mongoModel.count(find);
        return new Promise((resolve, reject) => {
            countQuery.exec((error, totalCount) => {
                if (error) {
                    reject({ error: error, status: httpStatus.bad_request, message: self._mongoErrorHandler(error) });
                } else {
                    resolve({ data: totalCount, status: httpStatus.ok });
                }
            });
        });
    }

    _mongoFindOne(queryString) {
        var self = this;
        return new Promise((resolve, reject) => {
            self.model.findOne(queryString).exec(function (error, data) {
                if (error) {
                    reject({ error: error, status: httpStatus.bad_request, message: self._mongoErrorHandler(error) });
                } else if (!data) {
                    reject({ data: null, status: httpStatus.not_found, message: 'No ' + self.mongoSchema + ' record found' });
                } else {
                    resolve({ data: data, status: httpStatus.ok, message: self.mongoSchema + ' record found successfully' });
                }
            });
        });
    }

    _mongoFindById(_id) {
        var self = this;
        return new Promise((resolve, reject) => {
            if (self.validateObjectId(_id)) {
                self.model.findById(_id, (error, data) => {
                    if (error) {
                        reject({ error: error, status: httpStatus.bad_request, message: self._mongoErrorHandler(error) });
                    } else if (!data) {
                        reject({ data: null, status: httpStatus.not_found, message: 'No ' + self.mongoSchema + ' record found' });
                    } else {
                        resolve({ data: data, status: httpStatus.ok, message: self.mongoSchema + ' record found successfully' });
                    }
                });
            } else {
                reject({ error: true, status: httpStatus.bad_request, message: 'Invalid type of id has been sent for ' + this.mongoSchema + ' find' });
            }
        });
    }

    _mongoFindByIdAndUpdate(_id, update) {
        var self = this;
        let options = { new: true, runValidators: true };
        return new Promise((resolve, reject) => {
            if (self.validateObjectId(_id)) {
                self.model.findByIdAndUpdate(_id, update, options, (error, data) => {
                    if (error) {
                        reject({ error: error, status: httpStatus.bad_request, message: self._mongoErrorHandler(error) });
                    } else if (!data) {
                        reject({ error: true, status: httpStatus.not_found, message: 'No ' + self.mongoSchema + ' record found' });
                    } else {
                        resolve({ data: data, status: httpStatus.ok, message: self.mongoSchema + ' record updated successfully' });
                    }
                });
            } else {
                reject({ error: true, status: httpStatus.bad_request, message: 'Invalid type of id has been sent for ' + modelName + ' update' })
            }
        });
    }

    _mongoFindOneAndUpdate(findQuery, update) {
        var self = this;
        let options = { new: true, runValidators: true };
        return new Promise((resolve, reject) => {
            this.mongoModel.findOneAndUpdate(findQuery, update, options, (error, data) => {
                if (error) {
                    reject({ error: error, status: httpStatus.bad_request, message: self._mongoErrorHandler(error) });
                } else if (!data) {
                    reject({ error: true, status: httpStatus.not_found, message: 'No ' + self.mongoSchema + ' record found' });
                } else {
                    resolve({ data: data, status: httpStatus.ok, message: self.mongoSchema + ' record updated successfully' });
                }
            });
        });
    }

    _mongoFindAndUpdate(findQuery, update) {
        var self = this;
        let options = { multi: true, runValidators: true };
        return new Promise((resolve, reject) => {
            self.model.update(findQuery, update, options, (error, data) => {
                if (error) {
                    reject({ error: error, status: httpStatus.bad_request, message: self._mongoErrorHandler(error) });
                } else if (!data) {
                    reject({ error: true, status: httpStatus.not_found, message: 'No ' + self.mongoSchema + ' record found' });
                } else if (!data.nModified) {
                    reject({ error: true, status: httpStatus.not_found, message: 'No ' + self.mongoSchema + ' record found' });
                } else {
                    resolve({ status: httpStatus.ok, message: self.mongoSchema + ' record updated successfully' });
                }
            });
        });
    }

    mongoRemove(findQuery) {
        var self = this;
        return new Promise((resolve, reject) => {
            self.model.remove(findQuery, (error, data) => {
                if (error) {
                    reject({ error: error, status: httpStatus.bad_request, message: self._mongoErrorHandler(error) });
                } else if (!data) {
                    reject({ error: true, status: httpStatus.not_found, message: 'No ' + self.mongoSchema + ' record found' });
                } else {
                    resolve({ status: httpStatus.ok, message: self.mongoSchema + ' record deleted successfully' });
                }
            });
        });
    }

    _mongoRemoveById(_id) {
        var self = this;
        return new Promise((resolve, reject) => {
            self.model.remove({ _id: _id }, (error, data) => {
                if (error) {
                    reject({ error: error, status: httpStatus.bad_request, message: self._mongoErrorHandler(error) });
                } else if (!data) {
                    reject({ error: true, status: httpStatus.not_found, message: 'No ' + self.mongoSchema + ' record found' });
                } else {
                    resolve({ status: httpStatus.ok, message: self.mongoSchema + ' record deleted successfully' });
                }
            });
        });
    }
}

module.exports = AbstractController;