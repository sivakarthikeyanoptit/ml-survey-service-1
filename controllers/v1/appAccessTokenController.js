module.exports = class AppAccessToken extends Abstract {

    /**
     * @apiDefine errorBody
     * @apiError {String} status 4XX,5XX
     * @apiError {String} message Error
     */

    /**
     * @apiDefine successBody
     *  @apiSuccess {String} status 200
     * @apiSuccess {String} result Data
     */

    constructor() {
        super(appAccessTokenSchema);
    }

    static get name() {
        return "appAccessToken";
    }

    /**
    * @api {post} /assessment/api/v1/appAccessToken/verify App access token verify
    * @apiVersion 1.0.0
    * @apiName App access token verify
    * @apiGroup appAccessToken
    * @apiParamExample {json} Request-Body:
    * 
    *   {
    *       "passcode" : "123123123"
    *   }
    *
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/appAccessToken/verify
    * @apiUse successBody
    * @apiUse errorBody
    */

    verify(req) {

        return new Promise(async (resolve, reject) => {

            try {

                let tokenQueryObject = {
                    userId: req.userDetails.userId,
                    passcode: req.body.passcode,
                    isValid: true
                }

                const tokenData = await database.models.appAccessToken.findOne(tokenQueryObject)

                let result = {}

                if (tokenData) {
                    result = _.pick(tokenData, ["action", "entityId", "evidenceCollectionMethod", "successMessage", "programId", "solutionId"])
                } else {
                    throw "Bad Request"
                }

                await database.models.appAccessToken.findOneAndUpdate(
                    { _id: tokenData._id },
                    {
                        isValid: false,
                        verifiedAt: new Date
                    }
                );

                let responseMessage = "Token verified successfully."

                let response = { message: responseMessage, result: result };

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

    /**
    * @api {post} /assessment/api/v1/appAccessToken/create App access token create
    * @apiVersion 1.0.0
    * @apiName App access token create
    * @apiGroup appAccessToken
    * @apiParamExample {json} Request-Body:
    * 
    *   { 
    *       "userId" : "e97b5582-471c-4649-8401-3cc4249359bb",
    *       "userExternalId": "a1@shikshalokamdev",
    *       "entityField" : "name",
    *       "entityFieldValue" : "St.Ramjas Convent School, Plot No.342, Vill Bhalswa, Delhi",
    *       "programId": "PROGID01",
    *       "action" : [ 
    *           "enableAutoSubmission"
    *       ],
    *       "evidenceCollectionMethod" : "BL",
    *       "successMessage" : "Book Look will now be automatically submitted",
    *       "reference": "Seva desk 160",
    *       "requestedBy": "Bachi"   
    *   }
    *
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/appAccessToken/create
    * @apiUse successBody
    * @apiUse errorBody
    */

    create(req) {

        return new Promise(async (resolve, reject) => {

            try {

                let token = req.body;

                let solutionDocument = await database.models.solutions.findOne({ programExternalId: token.programId }, { _id: 1, entities: 1 });

                let entity = await database.models.entities.findOne({
                    _id: {
                        $in: solutionDocument.entities
                    },
                    [token.entityField]: token.entityFieldValue
                }, {
                        _id: 1
                    });

                token.entityId = entity._id;

                token.solutionExternalId = solutionDocument.externalId;
                token.solutionId = solutionDocument._id;
                token.programExternalId = solutionDocument.programExternalId;
                token.programId = solutionDocument.programId;
                token.passcode = gen.utils.generateRandomCharacters(10);
                token.createdBy = req.userDetails.userId

                const tokenDocument = await database.models.appAccessToken.create(token)

                let responseMessage = "Token created successfully."

                let response = { message: responseMessage, result: _.pick(tokenDocument, ["passcode"]) };

                return resolve(response);

            }
            catch (error) {

                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                })

            }
        })
    }

};