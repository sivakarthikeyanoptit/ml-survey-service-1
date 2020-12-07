/**
 * name : kendra.js
 * author : Aman Jung Karki
 * Date : 26-June-2020
 * Description : All kendra service related information.
 */

//dependencies

const request = require('request');
const fs = require("fs");
const kendraServiceBaseURL = process.env.KENDRA_APPLICATION_ENDPOINT + "/";

/**
  * Get downloadable file.
  * @function
  * @name getDownloadableUrl
  * @param {Object} bodyData - body data.
  * @returns {Array} Downloadable file.
*/

const getDownloadableUrl = function (bodyData) {

    let fileDownloadUrl = kendraServiceBaseURL; 
    
    if ( process.env.CLOUD_STORAGE === "GC" ) {
        fileDownloadUrl = fileDownloadUrl + messageConstants.endpoints.DOWNLOADABLE_GCP_URL;
        bodyData.bucketName = process.env.GCP_BUCKET_NAME;
    } else if (process.env.CLOUD_STORAGE === "AWS" ) {
        fileDownloadUrl = fileDownloadUrl + messageConstants.endpoints.DOWNLOADABLE_AWS_URL;
        bodyData.bucketName = process.env.AWS_BUCKET_NAME;
    } else {
        fileDownloadUrl = fileDownloadUrl + messageConstants.endpoints.DOWNLOADABLE_AZURE_URL;
        bodyData.bucketName = process.env.AZURE_STORAGE_CONTAINER;
    }

    return new Promise((resolve, reject) => {
        try {

            const kendraCallBack = function (err, response) {
                if (err) {
                    return reject({
                        status : httpStatusCode.bad_request.status,
                        message : messageConstants.apiResponses.KENDRA_SERVICE_DOWN
                    })
                } else {
                    let downloadableImage = response.body;
                    return resolve(downloadableImage);
                }
            }

            request.post(fileDownloadUrl, {
                headers: {
                    "internal-access-token": process.env.INTERNAL_ACCESS_TOKEN
                },
                json : bodyData
            }, kendraCallBack);

        } catch (error) {
            return reject(error);
        }
    })

}

/**
  * Upload file.
  * @function
  * @name upload
  * @param {Object} bodyData - body data.
  * @returns {Array} upload file.
*/

const upload = function (file,filePath) {

    let fileUploadUrl = kendraServiceBaseURL; 
    let bucketName = "";

    if ( process.env.CLOUD_STORAGE === "GC" ) {
        fileUploadUrl = fileUploadUrl + "api/v1/cloud-services/gcp/uploadFile";
        bucketName = process.env.GCP_BUCKET_NAME;
    } else if( process.env.CLOUD_STORAGE === "AWS" ) {
        fileUploadUrl = fileUploadUrl + "api/v1/cloud-services/aws/uploadFile";
        bucketName = process.env.AWS_BUCKET_NAME;
    } else {
        fileUploadUrl = fileUploadUrl + "api/v1/cloud-services/azure/uploadFile";
        bucketName = process.env.AZURE_STORAGE_CONTAINER;
    }

    return new Promise((resolve, reject) => {
        try {

            const kendraCallBack = function (err, response) {
                if (err) {
                    return reject({
                        status : httpStatusCode.bad_request.status,
                        message : messageConstants.apiResponses.KENDRA_SERVICE_DOWN
                    })
                } else {
                    let uploadedData = response.body;
                    return resolve(uploadedData);
                }
            }

            let formData = request.post(fileUploadUrl,{
                headers: {
                    "internal-access-token": process.env.INTERNAL_ACCESS_TOKEN
                }
            },kendraCallBack);

            let form = formData.form();
            form.append("filePath",filePath);
            form.append("bucketName",bucketName);
            form.append("file",fs.createReadStream(file));

        } catch (error) {
            return reject(error);
        }
    });
}

/**
  * Get app Details.
  * @function
  * @name getAppDetails
  * @param {String} appName - App Name.
  * @returns {JSON} App Details.
*/

const getAppDetails = function (appName) {

    let getAppDetailsUrl = kendraServiceBaseURL + messageConstants.endpoints.GET_APP_DETAILS + "/" + appName;

    return new Promise((resolve, reject) => {
        try {

            const kendraCallBack = function (err, response) {
                if (err) {
                    return reject({
                        status : httpStatusCode.bad_request.status,
                        message : messageConstants.apiResponses.KENDRA_SERVICE_DOWN
                    })
                } else {
                    let appDetails =  JSON.parse(response.body);
                    return resolve(appDetails);
                }
            }

            request.post(getAppDetailsUrl, kendraCallBack);

        } catch (error) {
            return reject(error);
        }
    })
}

/**
  * Get list of users by entity and role.
  * @function
  * @name getUsersByEntityAndRole
  * @param {String} entityId - entity id.
  * @param {String} role - role. 
  * @returns {JSON} - List of users and entityId.
*/

const getUsersByEntityAndRole = function ( 
    entityId = "",
    role = ""
 ) {
     return new Promise(async (resolve, reject) => {
         try {
             
             const url = kendraServiceBaseURL + messageConstants.endpoints.GET_USERS_BY_ENTITY_AND_ROLE + "/" + entityId + "?role=" + role;
            
             const options = {
                 headers : {
                     "content-type": "application/json",
                     AUTHORIZATION : process.env.AUTHORIZATION,
                     "internal-access-token": process.env.INTERNAL_ACCESS_TOKEN
                 }
             };
            
             request.post(url,options,kendraCallback);
 
             function kendraCallback(err, data) {
 
                 let result = {
                     success : true
                 };
 
                 if (err) {
                     result.success = false;
                 } else {
                    
                     let response = JSON.parse(data.body);
 
                     if( response.status === httpStatusCode['ok'].status ) {
                         result["data"] = response.result;
                     } else {
                         result.success = false;
                     }
                 }
 
                 return resolve(result);
             }
 
         } catch (error) {
             return reject(error);
         }
     })
 }
 

module.exports = {
    getDownloadableUrl : getDownloadableUrl,
    upload : upload,
    getAppDetails : getAppDetails,
    getUsersByEntityAndRole : getUsersByEntityAndRole
};

