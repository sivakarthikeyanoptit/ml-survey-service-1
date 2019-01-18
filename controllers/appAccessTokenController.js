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

    async createToken(req){
        return new Promise(async (resolve,reject)=>{
            try {
                let token = req.body;
                let schoolDocument = await database.models.schools.findOne({externalId:token.schoolId})
                let programDocument = await database.models.programs.findOne({externalId:token.programId})
                token.userExternalId = token.userExternalId;
                token.schoolExternalId = token.schoolId;
                token.programExternalId = token.programId;
                token.schoolId = schoolDocument._id;
                token.programId = programDocument._id;
                token.passcode = gen.utils.generateRandomCharacters(10);
                database.models.appAccessToken.create(token).then(tokenData=>{
                    return resolve({
                        status:200,
                        message: {
                            status: "token created successfully",
                            passcode: tokenData.passcode,
                        }
                    });
                }).catch(err=>{
                    return reject({
                        status:400,
                        message: err
                    })
                })
            }
            catch(err){
                return reject({
                    status:500,
                    message: err
                })
            }
        })
    }

};