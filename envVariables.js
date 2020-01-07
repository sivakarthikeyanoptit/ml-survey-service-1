let table = require("cli-table");

let tableData = new table();

let enviromentVariables = {
"HOST" : "Required host name",
"PORT" : "Required port no",
"LOG" : "Required logger type",
"NODE_ENV" : 'Required node environment',
"ENABLE_BUNYAN_LOGGING" : "Enable or disable bunyan logging",
"REQUEST_TIMEOUT_FOR_REPORTS" : "Required Reports request timeout",
"APPLICATION_BASE_URL" : "Required Application base url",
"APPLICATION_BASE_HOST" : "Required Base host",
"AUTHORIZATION" : "Required Server authorization code",
"CLOUD_STORAGE" : "Required cloud storage provider",
"GCP_PATH" : "Required path for google cloud platform",
"GCP_BUCKET_NAME" : "Required gcp bucket name",
"AWS_ACCESS_KEY_ID" : "Required aws access key id",
"AWS_SECRET_ACCESS_KEY" : "Required aws secret access key",
"AWS_BUCKET_NAME" : "Required aws bucket name",
"AWS_BUCKET_REGION" : "Required aws bucket region",
"AWS_BUCKET_ENDPOINT" : "Required aws bucket endpoint",
"MONGODB_URL" : "Required mongodb url",
"SHIKSHALOKAM_BASE_HOST" : "Required shikshalokam base host",
"DB" : "Required database",
"INTERNAL_ACCESS_TOKEN" : "Required internal access token",
"sunbird_keycloak_auth_server_url" : "Required sunbird keycloak auth server url",
"sunbird_keycloak_realm" : "Required sunbird keycloak realm",
"sunbird_keycloak_client_id" : "Required sunbird keycloak client id",
"sunbird_keycloak_public" : "Required sunbird keycloak public",
"sunbird_cache_store" : "Required sunbird cache store",
"sunbird_cache_ttl" : "Required sunbird cache ttl",
"MIGRATION_COLLECTION" : "Required migrations collection name",
"MIGRATION_DIR" : "Required migrations directory name",
"SLACK_COMMUNICATIONS_ON_OFF" : "Enable/Disable slack communications",
"SLACK_EXCEPTION_LOG_URL" : "Enable/Disable slack exception log url",
"SLACK_TOKEN" : "Required slack token",
"RUBRIC_ERROR_MESSAGES_TO_SLACK" : "Enable/Disable rubric error message",
"CSV_REPORTS_PATH" : "Required csv reports path",
"DISABLE_TOKEN_CHECK_ON_OFF" : "",
"DISABLE_TOKEN_CHECK_FOR_API" : "Required Api endpoint for disabling token check",
"DISABLE_TOKEN_endpoint1_USERS" : "Required comma-seperated-userIds-for-multiple-values",
"DISABLE_TOKEN_endpoint2_USERS" : "Required comma-seperated-userIds-for-multiple-values",
"DISABLE_TOKEN_DEFAULT_USERID" : "Required",
"DISABLE_TOKEN_DEFAULT_USER_ROLE" : "ASSESSOR",
"DISABLE_TOKEN_DEFAULT_USER_NAME" : "DISABLE_TOKEN_CHECK_DEFAULT_USER_NAME",
"DISABLE_TOKEN_DEFAULT_USER_EMAIL" : "DISABLE_TOKEN_CHECK_DEFAULT_USER_EMAIL",
"DISABLE_LEARNER_SERVICE_ON_OFF" : "Disable learner service",
"KAFKA_COMMUNICATIONS_ON_OFF" : "Enable/Disable kafka communications",
"KAFKA_URL" : "Required kafka url",
"SUBMISSION_TOPIC" : "Required submission topic for kafka",
"SUBMISSION_RATING_QUEUE_TOPIC" : "OFF/TOPIC_NAME",
"OBSERVATION_SUBMISSION_TOPIC" : "OFF/TOPIC_NAME",
"NOTIFICATIONS_TOPIC" : "OFF/TOPIC_NAME",
"KAFKA_ERROR_MESSAGES_TO_SLACK" : "ON/OFF",
"EMAIL_COMMUNICATIONS_ON_OFF" : "ON/OFF",
"EMAIL_SERVICE_BASE_URL" : "Required email service url",
"EMAIL_SERVICE_TOKEN" : "Required email service token",
"SUBMISSION_RATING_DEFAULT_EMAIL_RECIPIENTS" : "Required email recipients for submission rating"
}

let success = true;

module.exports = function() {
  Object.keys(enviromentVariables).forEach(eachEnvironmentVariable=>{
  
    let tableObj = {
      [eachEnvironmentVariable] : ""
    };
  
    if(!process.env[eachEnvironmentVariable]) {
      success = false;

      if(enviromentVariables[eachEnvironmentVariable] && enviromentVariables[eachEnvironmentVariable] !== "") {
        tableObj[eachEnvironmentVariable] = 
        enviromentVariables[eachEnvironmentVariable];
      } else {
        tableObj[eachEnvironmentVariable] = "required";
      }
    } else {
      tableObj[eachEnvironmentVariable] = "success";
    }

    tableData.push(tableObj);
  })

  log.info(tableData.toString());

  return {
    success : success
  }
}
