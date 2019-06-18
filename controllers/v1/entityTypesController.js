const entitiyTypesHelper = require(ROOT_PATH + "/module/entityTypes/helper")

module.exports = class EntityTypes extends Abstract {
  constructor() {
    super(entityTypesSchema);
  }

  static get name() {
    return "entityTypes";
  }


  /**
  * @api {get} /assessment/api/v1/entityTypes/canBeObserved Entity Type list
  * @apiVersion 0.0.1
  * @apiName Entity Type Observable list
  * @apiGroup Entity Types
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/entityTypes/canBeObserved
  * @apiUse successBody
  * @apiUse errorBody
  */

  canBeObserved(req) {
    return new Promise(async (resolve, reject) => {

      try {

        let result = await entitiyTypesHelper.list({isObservable:true},{name :1});

        return resolve({
          message: "Entity type fetched successfully.",
          result: result
        });

      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! something went wrong.",
          errorObject: error
        })

      }


    })
  }

};
