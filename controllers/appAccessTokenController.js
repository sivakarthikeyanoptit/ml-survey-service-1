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

};