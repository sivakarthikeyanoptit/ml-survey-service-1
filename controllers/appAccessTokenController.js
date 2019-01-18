module.exports = class AppAccessToken extends Abstract {
    constructor(schema) {
        super(schema);
    }
    static get name() {
        return "appAccessToken";
    }

    tokenData(req) {
        return new Promise((resolve, reject) => {
            let queryObject = {
                userId: req.userDetails.userId,
                passcode: req.body.userId,
                isValid: true
            }
            database.models['app-access-token'].findOne(queryObject).then((tokenData, err) => {
                if (err) {
                    return reject({
                        status: 500,
                        message: err
                    })
                }
                let updatedTokenData = {};
                updatedTokenData.isValid = false;
                updatedTokenData.verifiedAt = new Date;

                database.models['app-access-token'].updateOne({ _id: tokenData._id }, updatedTokenData).then(() => {
                    return resolve({
                        result: {
                            "userId": tokenData.userId,
                            "action": tokenData.action,
                            "schoolId": tokenData.schoolId,
                            "ecmId": tokenData.ecmId,
                            "message": "success"
                        }
                    })
                })
            })
        })
    }

};