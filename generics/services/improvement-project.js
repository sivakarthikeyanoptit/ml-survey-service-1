/**
 * name : samiksha.js
 * author : Aman Jung Karki
 * Date : 11-Nov-2019
 * Description : All samiksha related api call.
 */

//dependencies

const request = require('request');

/**
  * Get list of unnati improvement projects.
  * @function
  * @name getImprovementProjects
  * @param {Array} improvementProjectIds - improvement project external ids.
  * @param {String} token - logged in user token. 
  * @returns {Array} Array of improvement projects.
*/

var getImprovementProjects = function (improvementProjectIds,token) {

    let bodyData = {
        "externalIds" : improvementProjectIds
    }

    const improvementProjectsUrl = 
    process.env.UNNATI_APPLICATION_HOST + 
    process.env.UNNATI_APPLICATION_BASE_URL + 
    messageConstants.endpoints.GET_IMPROVEMENT_PROJECTS;

    return new Promise((resolve, reject) => {
        try {

            const unnatiCallBack = function (err, response) {
                if (err) {
                    return reject({
                        status : httpStatusCode.bad_request.status,
                        message : messageConstants.apiResponses.UNNATI_SERVICE_DOWN
                    })
                } else {
                    let listOfImprovementProjecys = response.body;
                    return resolve(listOfImprovementProjecys);
                }
            }

            request.post(improvementProjectsUrl, {
                headers: {
                    "x-auth-token": token
                },
                json : bodyData
            }, unnatiCallBack);

        } catch (error) {
            return reject(error);
        }
    })

}

module.exports = {
    getImprovementProjects : getImprovementProjects
};