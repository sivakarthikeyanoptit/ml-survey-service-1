const moment = require("moment-timezone");

module.exports = class AssessorSchoolTrackers extends Abstract {
    constructor() {
        super(assessorSchoolTrackersSchema);
    }

    static get name() {
        return "assessorSchoolTrackers";
    }

    async upload(req) {
        return new Promise(async (resolve, reject) => {
            try {

                let schoolAssessorTrackerDocument = await database.models.assessorSchoolTrackers.find({ "assessorId": req.body.assessorId }).sort({ "dateOfOperation": -1 }).limit(1).lean();

                let actions = ["APPEND", "OVERRIDE", "REMOVE"];

                req.body.schools = req.body.schools.map(school => school.toString());

                let trackerObject = {};
                let updatedData = schoolAssessorTrackerDocument[0].updatedData;

                if (actions.includes(req.body.action)) {

                    trackerObject.action = req.body.action;

                    if (req.body.action == "APPEND") {

                        req.body.schools.forEach(school => {
                            if (!updatedData.includes(school)) {
                                updatedData.push(school)
                            }
                        })

                    } else if (req.body.action == "OVERRIDE") {

                        updatedData = req.body.schools;

                    } else if (req.body.action == "REMOVE") {

                        _.pullAll(updatedData, req.body.schools);

                    }

                } else {

                    throw { status: 400, message: 'wrong action' };

                }
                trackerObject.updatedData = updatedData;

                trackerObject.actionObject = req.body.schools;

                trackerObject.assessorId = req.body.assessorId;

                trackerObject.type = req.body.type;

                trackerObject.dateOfOperation = new Date;

                trackerObject.createdBy = req.userDetails.id;

                let queryObject = {};

                queryObject.dateOfOperation = {};

                queryObject.dateOfOperation["$gte"] = moment().startOf('day');

                queryObject.dateOfOperation["$lte"] = moment().endOf('day');

                let trackerDocument = await database.models.assessorSchoolTrackers.findOneAndUpdate(queryObject, trackerObject, {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true,
                    returnNewDocument: true
                  });

                return resolve({ result: trackerDocument });

            } catch (error) {
                return reject({
                    status: error.status || 500,
                    message: error.message || "Oops! Something went wrong!",
                    errorObject: error
                });
            }
        })
    }

    async filterByDate(params, userIds) {
        return new Promise(async (resolve, reject) => {
            let filterdDocuments = await Promise.all(userIds.map(async (userId) => {

                params.fromDate.setHours(23, 59, 59)
                params.toDate.setHours(23, 59, 59)

                let fromDate = await database.models.assessorSchoolTrackers.find({ assessorId: userId, dateOfOperation: { $lte: params.fromDate } }, { dateOfOperation: 1 }).sort({ dateOfOperation: -1 }).limit(1);

                let toDate = await database.models.assessorSchoolTrackers.find({ assessorId: userId, dateOfOperation: { $lte: params.toDate } }, { dateOfOperation: 1 }).sort({ dateOfOperation: -1 }).limit(1);


                let queryObject = {};
                queryObject.assessorId = userId;
                queryObject.dateOfOperation = {};
                if (fromDate.length) queryObject.dateOfOperation['$gte'] = moment(fromDate[0].dateOfOperation).startOf('day');
                if (toDate.length) queryObject.dateOfOperation['$lte'] = moment(toDate[0].dateOfOperation).endOf('day');
                return database.models.assessorSchoolTrackers.distinct('updatedData', queryObject).exec()
            }))
            let result = _.uniq(_.flattenDeep(filterdDocuments))
            return resolve(result);

        })
    }

};
