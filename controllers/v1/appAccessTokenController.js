module.exports = class AppAccessToken extends Abstract {
    
    constructor() {
        super(appAccessTokenSchema);
    }

    static get name() {
        return "appAccessToken";
    }

    verify(req) {

        return new Promise( async (resolve, reject) => {

            try {

                let tokenQueryObject = {
                    passcode: req.body.passcode,
                    isValid: true
                }

                const tokenData = await database.models.appAccessToken.findOne(tokenQueryObject)

                let result = {}

                if (tokenData) {
                    result = _.pick(tokenData,["action","schoolId","evidenceCollectionMethod","successMessage"])
                } else {
                    throw "Bad Request"
                }

                await database.models.appAccessToken.findOneAndUpdate(
                    {_id:tokenData._id},
                    {
                        isValid : false,
                        verifiedAt : new Date
                    }
                );

                let responseMessage = "Token verified successfully."

                let response = { message: responseMessage,result: result};

                return resolve(response);


            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }

        })

    }

    create(req){

        return new Promise(async (resolve,reject)=>{

            try {

                let token = req.body;

                let schoolDocument = await database.models.schools.findOne({externalId:token.schoolId},{_id:1});

                let programDocument = await database.models.programs.findOne({externalId:token.programId},{_id:1});

                token.schoolExternalId = token.schoolId;
                token.programExternalId = token.programId;
                token.schoolId = schoolDocument._id;
                token.programId = programDocument._id;
                token.passcode = gen.utils.generateRandomCharacters(10);
                token.createdBy = req.userDetails.userId

                const tokenDocument = await database.models.appAccessToken.create(token)

                let responseMessage = "Token created successfully."

                let response = { message: responseMessage,result: _.pick(tokenDocument,["passcode"])};

                return resolve(response);

            }
            catch(error){

                return reject({
                    status:500,
                    message: error,
                    errorObject: error
                })
                
            }
        })
    }

};