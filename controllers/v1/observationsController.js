module.exports = class Observations {

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
    }

    /**
    * @api {get} /assessment/api/v1/observations/solutions/:entityTypeId Observation Solution
    * @apiVersion 0.0.1
    * @apiName Observation Solution
    * @apiGroup Observations
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/observations/solutions
    * @apiUse successBody
    * @apiUse errorBody
    */

    async solutions(req) {

        return new Promise(async (resolve, reject) => {
            
            try {

                if (!req.params._id) {
                    let responseMessage = "Bad request.";
                    return resolve({ status: 400, message: responseMessage })
                }

                
                let solutionsData = await database.models.solutions.find({
                    entityTypeId : ObjectId(req.params._id),
                    isReusable : true
                }, {
                    name : 1,
                    description : 1,
                    externalId : 1,
                    programId:1,
                    entityTypeId : 1
                }).lean();
        
                return resolve({
                    message: "Solution list fetched successfully.",
                    result: solutionsData
                });
      
            } catch (error) {
              return reject({
                status: 500,
                message: error,
                errorObject: error
              });
            }
      
          });

    }


    /**
    * @api {get} /assessment/api/v1/observations/metaForm/:solutionId Observation Creation Meta Form
    * @apiVersion 0.0.1
    * @apiName Observation Creation Meta Form
    * @apiGroup Observations
    * @apiHeader {String} X-authenticated-user-token Authenticity token
    * @apiSampleRequest /assessment/api/v1/observations/metaForm
    * @apiUse successBody
    * @apiUse errorBody
    */

    async metaForm(req) {

        return new Promise(async (resolve, reject) => {
            
            try {

                if (!req.params._id) {
                    let responseMessage = "Bad request.";
                    return resolve({ status: 400, message: responseMessage })
                }

                
                let solutionsData = await database.models.solutions.findOne({
                    _id : ObjectId(req.params._id),
                    isReusable : true
                }, {
                    observationMetaFormKey : 1
                }).lean();
        

                if (!solutionsData._id) {
                    let responseMessage = "Bad request.";
                    return resolve({ status: 400, message: responseMessage })
                }

                let observationsMetaForm = await database.models.forms.findOne({ "name": (solutionsData.observationMetaFormKey && solutionsData.observationMetaFormKey != "") ? solutionsData.observationMetaFormKey : "defaultObservationMetaForm" }, { value: 1 }).lean();

                return resolve({
                    message: "Observation meta fetched successfully.",
                    result: observationsMetaForm.value
                });
    
            } catch (error) {
            return reject({
                status: 500,
                message: error,
                errorObject: error
            });
            }
    
        });

    }


}
