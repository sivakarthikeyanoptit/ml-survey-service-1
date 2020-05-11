/**
 * name : helper.js
 * author : Aman
 * created-date : 11-May-2020
 * Description : User organisations related informations
 */

/**
    * UserOrganisationsHelper
    * @class
*/

module.exports = class UserOrganisationsHelper {

    /**
   * Lists of user organisations
   * @method
   * @name list
   * @param {Object} userIds - list of user ids.
   * @returns {Object} - key userId and value as organisations and root organisations lists 
   */

    static list(userIds = "") {
        return new Promise(async (resolve, reject) => {
            try {

                let result = {
                    success : false,
                    data : {}
                };

                await Promise.all(userIds.map(async function (userId) {

                    result.data[userId] = {};

                    let organisationLists = 
                    await cassandraDatabase.models.user_org.findAsync(
                        {
                            userid : userId
                        },{
                            allow_filtering: true,
                            select: ['organisationid']
                        }
                    );

                    if ( organisationLists.length > 0 ) {
                        result.success = true;
                        result.data[userId]["rootOrganisations"] = [organisationLists[0]];

                        result.data[userId]["organisations"] = organisationLists.map(organisation=>{

                            if( 
                                organisation.organisationid !== 
                                result.data[userId].rootOrganisations 
                            ) {
                                return organisation.organisationid
                            }
                        })
                    }
                }));

                return resolve(result);

            } catch (error) {
                return reject(error);
            }
        })


    }
}