const moment = require("moment-timezone");

module.exports = class EntityAssessorsTrackers extends Abstract {
    constructor() {
        super(entityAssessorsTrackersSchema);
    }

    static get name() {
        return "entityAssessorsTrackers";
    }

    async filterByDate(params, userIds, programId) {
        return new Promise(async (resolve, reject) => {

            params.fromDate.setHours(0);
            params.toDate.setHours(23, 59, 59);

            let queryObject = {
                assessorId: { $in: userIds },
                programId: programId,
                //formula =  (validFrom <= fromDate && fromDate <= validTo) || (validFrom <= toDate && toDate <= validTo)
                $or: 
                [
                    {
                        validFrom: { $lte: params.fromDate },
                        validTo: { $gte: params.fromDate }
                    },
                    {
                        validFrom: { $lte: params.toDate }, 
                        validTo: { $gte: params.toDate }
                    },
                ]
            };

            let assessorSchoolTrackersDocuments = await database.models.assessorSchoolTrackers.find(queryObject, { updatedData: 1 }).lean();
            let schoolIds = assessorSchoolTrackersDocuments.map(documents => documents.updatedData)
            let result = _.uniq(_.flattenDeep(schoolIds));
            return resolve(result);

        })
    }

};
