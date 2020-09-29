/**
 * name : messageConstants/endpoints.js
 * author : Aman
 * Date : 04-May-2020
 * Description : All service endpoints
 */

module.exports = {
    GET_IMPROVEMENT_PROJECTS : "api/v1/template/getImprovementProjects", // Unnati service
    DOWNLOADABLE_GCP_URL : "api/v1/cloud-services/gcp/getDownloadableUrl", // Kendra service
    DOWNLOADABLE_AWS_URL : "api/v1/cloud-services/aws/getDownloadableUrl", // Kendra service
    DOWNLOADABLE_AZURE_URL : "api/v1/cloud-services/azure/getDownloadableUrl", // Kendra service
    UPLOAD_FILE : "api/v1/cloud-services/gcp/uploadFile",  // Kendra service
    GET_APP_DETAILS : "apps/details" // Kendra service
}