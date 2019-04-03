module.exports = class Configurations extends Abstract {
    constructor() {
        super(configurationsSchema);
    }

    static get name() {
        return "configurations";
    }

    async navigation(req) {
        return new Promise(async (resolve, reject) => {
            try {
                _.pull(req.userDetails.allRoles, 'PUBLIC');
                const userRole = req.userDetails.allRoles[0];
                if (!userRole) {
                    return resolve({
                        status: 400,
                        message: "Bad request."
                    });
                }
                let tabControlsDocument = await database.models.configurations.findOne({ name: 'navigation' }).lean();
                if (!tabControlsDocument) {
                    return resolve({
                        status: 400,
                        message: "No configurations available for given params."
                    });
                }
                return resolve({
                    message: "Configurations fetched successfully.",
                    result: tabControlsDocument.result.tabGroups[userRole]
                });
            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }
        })
    }

};
