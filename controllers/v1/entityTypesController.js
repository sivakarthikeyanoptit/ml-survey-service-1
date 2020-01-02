/**
 * name : entityTypesController.js
 * author : Akash
 * created-date : 22-Nov-2018
 * Description : Entity types information. 
 */

 // Dependencies
const entitiyTypesHelper = require(MODULES_BASE_PATH + "/entityTypes/helper");
const entitiesHelper = require(MODULES_BASE_PATH + "/entities/helper");

 /**
    * EntityTypes
    * @class
*/
module.exports = class EntityTypes extends Abstract {
  constructor() {
    super(entityTypesSchema);
  }

  static get name() {
    return "entityTypes";
  }


  /**
  * @api {get} /assessment/api/v1/entityTypes/canBeObserved Entity Type list
  * @apiVersion 1.0.0
  * @apiName Entity Type Observable list
  * @apiGroup Entity Types
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/entityTypes/canBeObserved
  * @apiUse successBody
  * @apiUse errorBody
  * @apiParamExample {json} Response:
  * "result": [
    {
      "_id": "5ce23d633c330302e720e661",
      "name": "teacher"
    },
    {
      "_id": "5ce23d633c330302e720e663",
      "name": "schoolLeader"
    }
    ]
  */

  /**
   * Get all the entity types which can be observed.
   * @method
   * @name canBeObserved 
   * @returns {JSON} - List of all entity types that can be observed.
   */

  canBeObserved() {
    return new Promise(async (resolve, reject) => {

      try {

        let result = await entitiyTypesHelper.list({ isObservable: true }, { name: 1 });

        return resolve({
          message: "Entity type fetched successfully.",
          result: result
        });

      } catch (error) {

        return reject({
          status: error.status || 500,
          message: error.message || "Oops! something went wrong.",
          errorObject: error
        });

      }


    })
  }


  /**
  * @api {get} /assessment/api/v1/entityTypes/createGroupEntityTypeIndex Create groups.entityType index
  * @apiVersion 1.0.0
  * @apiName Create groups.entityType index
  * @apiGroup Entity Types
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v1/entityTypes/createGroupEntityTypeIndex
  * @apiUse successBody
  * @apiUse errorBody
  */

   /**
   * Get all the entity types which can be observed.
   * @method
   * @name createGroupEntityTypeIndex 
   * @returns {JSON} - List of all entity types that can be observed.
   */

  createGroupEntityTypeIndex() {
    return new Promise(async (resolve, reject) => {

      try {

        const result = await entitiyTypesHelper.list({}, { name: 1 });

        let indexResult = await Promise.all(result.map(async entityType => {
          const indexCreation = await entitiesHelper.createGroupEntityTypeIndex(entityType.name)
          return "Index successfully created for entity type - " + entityType.name
        }))

        if (
          indexResult.findIndex(
            index => index === undefined || index === null
          ) >= 0
        ) {
          throw "Something went wrong, entity group index was not created.";
        }

        return resolve({
          message: "Entity type index created successfully.",
          result: indexResult
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
