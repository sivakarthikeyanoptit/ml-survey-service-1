module.exports = class AppAccessToken extends Abstract {
    
    constructor(schema) {
        super(schema);
    }

    static get name() {
        return "appAccessToken";
    }

    verify(req) {

        return new Promise( async (resolve, reject) => {

            try {

                let tokenQueryObject = {
                    userId: req.userDetails.userId,
                    passcode: req.body.passcode,
                    isValid: true
                }

                const tokenData = await database.models.appAccessToken.findOne(tokenQueryObject)

                let result = {}

                if (tokenData._id) {
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

    async createToken(req){

        return new Promise(async (resolve,reject)=>{

            try {
                let token = req.body;

                let schoolDocument = await database.models.schools.findOne({externalId:token.schoolId});

                let programDocument = await database.models.programs.findOne({externalId:token.programId});

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