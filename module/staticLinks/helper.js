/**
 * name : StaticLinks/helper.js
 * author : Akash
 * created-date : 22-feb-2019
 * Description : Static links related helper functionality.
 */

/**
    * StaticLinksHelper
    * @class
*/
module.exports = class StaticLinksHelper {

    /**
   * List static links.
   * @method
   * @name list
   * @param {Object} filterQueryObject -
   * @param {Object} projectionQueryObject - required projected data.
   * @returns {Array} List of static links data. 
   */

    static list(filterQueryObject, projectionQueryObject) {
        return new Promise(async (resolve, reject) => {
            try {

                let staticLinkData = await database.models.staticLinks.find(filterQueryObject,projectionQueryObject).lean();

                return resolve(staticLinkData);

            } catch (error) {
                return reject(error);
            }
        })


    }

     /**
   * Bulk create static links.
   * @method
   * @name bulkCreate
   * @param {Object} staticLinksCSVData - array of static links
   * @param {Object} userDetails - logged in user data.
   * @param {String} userDetails.id - logged in user id. 
   * @returns {Array} List of static links with _SYSTEM_ID. 
   */

    static bulkCreate(staticLinksCSVData,userDetails) {

        return new Promise(async (resolve, reject) => {
            try {

                const staticLinksUploadedData = await Promise.all(
                    staticLinksCSVData.map(async staticLink => {

                        try {
                            
                            let newLink = await database.models.staticLinks.create(
                                _.merge({
                                    "status" : "active",
                                    "updatedBy": userDetails.id,
                                    "createdBy": userDetails.id
                                },gen.utils.valueParser(staticLink))
                            );

                            if (newLink._id) {
                                staticLink["_SYSTEM_ID"] = newLink._id ;
                                staticLink.status = "Success";
                            } else {
                                staticLink["_SYSTEM_ID"] = "";
                                staticLink.status = "Failed";
                            }

                        } catch (error) {
                            staticLink["_SYSTEM_ID"] = "";
                            staticLink.status = error.message;
                        }


                        return staticLink;
                    })
                )


                return resolve(staticLinksUploadedData);

            } catch (error) {
                return reject(error)
            }
        })

    }

      /**
   * Bulk update static links.
   * @method
   * @name bulkUpdate
   * @param {Object} staticLinksCSVData - array of static links
   * @param {Object} userDetails - logged in user data.
   * @param {String} userDetails.id - logged in user id. 
   * @returns {Array} List of static links with _SYSTEM_ID. 
   */

    static bulkUpdate(staticLinksCSVData,userDetails) {

        return new Promise(async (resolve, reject) => {
            try {

                const staticLinksUploadedData = await Promise.all(
                    staticLinksCSVData.map(async staticLink => {

                        try {
                            
                            let updateLink = await database.models.staticLinks.findOneAndUpdate(
                                {
                                    value : staticLink.value
                                },
                                _.merge({
                                    "updatedBy": userDetails.id
                                },gen.utils.valueParser(staticLink))
                            );

                            if (updateLink._id) {
                                staticLink["_SYSTEM_ID"] = updateLink._id ;
                                staticLink.status = "Success";
                            } else {
                                staticLink["_SYSTEM_ID"] = "";
                                staticLink.status = "Failed";
                            }

                        } catch (error) {
                            staticLink["_SYSTEM_ID"] = "";
                            staticLink.status = error.message;
                        }


                        return staticLink;
                    })
                )


                return resolve(staticLinksUploadedData);

            } catch (error) {
                return reject(error);
            }
        })

    }

};