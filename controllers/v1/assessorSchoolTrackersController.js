const moment = require("moment-timezone");

module.exports = class AssessorSchoolTrackers extends Abstract {
    constructor() {
        super(assessorSchoolTrackersSchema);
    }

    static get name() {
        return "assessorSchoolTrackers";
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

                if(fromDate.length){
                    if (fromDate.length) queryObject.dateOfOperation['$gte'] = moment(fromDate[0].dateOfOperation).startOf('day');
                    if (toDate.length) queryObject.dateOfOperation['$lte'] = moment(toDate[0].dateOfOperation).endOf('day');
                    return database.models.assessorSchoolTrackers.distinct('updatedData', queryObject).exec()
                }else{
                    return []
                }

            }))
            let result = _.uniq(_.flattenDeep(filterdDocuments))
            return resolve(result);

        })
    }

};
