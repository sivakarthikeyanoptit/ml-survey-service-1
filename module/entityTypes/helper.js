/**
 * name : entityTyes/helper.js
 * author : Akash
 * created-date : 22-Feb-2019
 * Description : Entity types related helper functionality.
 */

 /**
    * EntityTypesHelper
    * @class
*/
module.exports = class EntityTypesHelper {

    /**
      * List of all entity types.
      * @method
      * @name list
      * @param {Object} [queryParameter = "all"] - Filtered query data.
      * @param {Object} [projection = {}] - Projected data.   
      * @returns {Object} returns a entity types list from the filtered data.
     */

    static list(queryParameter = "all", projection = {}) {
        return new Promise(async (resolve, reject) => {
            try {

                if( queryParameter === "all" ) {
                    queryParameter = {};
                };

                let entityTypeData = 
                await database.models.entityTypes.find(queryParameter, projection).lean();

                return resolve(entityTypeData);

            } catch (error) {
                return reject(error);
            }
        })

    }

};