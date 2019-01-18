module.exports = class AppAccessToken extends Abstract {
    constructor(schema) {
        super(schema);
    }
    static get name() {
        return "appAccessToken";
    }

    verify(req) {
        return new Promise((resolve, reject) => {
            return resolve({
                result: {
                    "action": ["enableSubmission"],
                    "schoolId": "5bebcfcf92ec921dcf114827",
                    "evidenceCollectionMethod": "LW",
                    "successMessage": "success"
                }
            })

            let queryObject = {
                userId: req.userDetails.userId,
                passcode: req.body.passcode,
                isValid: true
            }
            database.models.appAccessToken.findOne(queryObject).then((tokenData, err) => {
                if (err) {
                    return reject({
                        status: 500,
                        message: err
                    })
                }
                if(!tokenData){
                    return reject({
                        status: 400,
                        message: 'Bad Request'
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
                            "evidenceCollectionMethod": tokenData.evidenceCollectionMethod,
                            "successMessage": "success"
                        }
                    })
                })
            })
        })
    }

};