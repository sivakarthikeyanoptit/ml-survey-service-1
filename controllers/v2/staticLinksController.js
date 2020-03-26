/**
 * name : staticLinksController.js
 * author : Akash
 * created-date : 26-mar-2019
 * Description : Static links related information.
 */

// Dependencies
const staticLinksHelper = require(MODULES_BASE_PATH + "/staticLinks/helper")
const v1StaticLinks = require(ROOT_PATH + "/controllers/v1/staticLinksController");

/**
    * StaticLinks
    * @class
*/
module.exports = class StaticLinks extends v1StaticLinks {

  /**
  * @api {get} /assessment/api/v2/staticLinks/list Static Link list
  * @apiVersion 1.0.0
  * @apiName Static Link list
  * @apiGroup Static Links
  * @apiHeader {String} X-authenticated-user-token Authenticity token
  * @apiSampleRequest /assessment/api/v2/staticLinks/list
  * @apiParamExample {json} Response:
  * "result": [
      {
       "_id": "5d259439a9bc1209d0184390",
       "value": "privacyPolicy",
       "link": "https://shikshalokam.org/wp-content/uploads/2019/01/data_privacy_policy.html",
       "title": "Privacy Policy"
      },
      {
       "_id": "5d259439a9bc1209d0184391",
       "value": "termsOfUse",
       "link": "https://shikshalokam.org/wp-content/uploads/2019/05/Final-ShikshaLokam-Terms-of-Use-MCM-08052019-Clean-copy-1.html",
       "title": "Terms of Use"
      }
    ]
  * @apiUse successBody
  * @apiUse errorBody
  */

    /**
   * List static links.
   * @method
   * @name list
   * @returns {Array} List of all static links. 
   */

  list() {
    return new Promise(async (resolve, reject) => {

      try {

        let result = await staticLinksHelper.list({
          status: "active",
          isDeleted: false
        }, {
            value: 1,
            link: 1,
            title: 1,
            metaInformation: 1
          });

        result = _.keyBy(result, 'value');
        
        return resolve({
          message: messageConstants.apiResponses.STATIC_LINKS_FETCHED,
          result: result
        });

      } catch (error) {

        return reject({
          status: error.status || httpStatusCode.internal_server_error.status,
          message: error.message || httpStatusCode.internal_server_error.message,
          errorObject: error
        })

      }


    })
  }

};
