/**
 * name : helper.js
 * author : Aman
 * created-date : 05-July-2020
 * Description : Library search helper functionality.
 */

// Dependencies 
let solutionsHelper = require(MODULES_BASE_PATH + "/solutions/helper");

/**
    * librarySearchHelper
    * @class
*/

module.exports = class librarySearchHelper {

     /**
      * Search library solutions.
      * @method
      * @name search
      * @returns {Object} Search library solutions.
     */

    static search( searchText,pageSize,pageNo ) {
        return new Promise(async (resolve, reject) => {
            try {

                let matchQuery = {
                    $match : {
                        isReusable : true,
                        status : "active",
                        "$or" : [
                            { 
                              "name": new RegExp(searchText, 'i') 
                            }, { 
                              "description": new RegExp(searchText, 'i') 
                            }, { 
                              "keywords": new RegExp(searchText, 'i') 
                            }
                          ]
                    }
                };

                let solutionDocument = 
                await solutionsHelper.search(
                    matchQuery, 
                    pageSize, 
                    pageNo,
                    {
                        name : 1,
                        description : 1,
                        externalId : 1
                    }
                );

                return resolve({
                    message : messageConstants.apiResponses.LIBRARY_CATEGORY_FETCHED,
                    result : {
                        data : solutionDocument[0].data,
                        count : solutionDocument[0].count ? solutionDocument[0].count : 0
                    }
                });

            } catch (error) {
                return reject(error);
            }
        })
    }

};


