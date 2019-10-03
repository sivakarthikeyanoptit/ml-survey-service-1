const Request = require('./httpRequest');
const kafkaCommunicationsOnOff = (!process.env.KAFKA_COMMUNICATIONS_ON_OFF || process.env.KAFKA_COMMUNICATIONS_ON_OFF != "OFF") ? "ON" : "OFF"
const sendKafkaErrorMessagesToSlack = (!process.env.KAFKA_ERROR_MESSAGES_TO_SLACK || !process.env.KAFKA_ERROR_MESSAGES_TO_SLACK != "OFF") ? "ON" : "OFF"
const observationSubmissionKafkaTopic = (process.env.OBSERVATION_SUBMISSION_TOPIC && process.env.OBSERVATION_SUBMISSION_TOPIC != "OFF") ? process.env.OBSERVATION_SUBMISSION_TOPIC : "sl-observations-dev"

const pushObservationSubmissionToKafka = function (message) {
  if (kafkaCommunicationsOnOff === "ON") {

    const reqObj = new Request()
    let attachmentData = new Array
    let fieldsData = new Array

    Object.keys(errorMessage.formData).forEach(objValue => {
      fieldsData.push({
        title: objValue,
        value: errorMessage.formData[objValue],
        short: false
      })
    })

    fieldsData.push({
      title: "Environment",
      value: process.env.NODE_ENV,
      short: false
    })

    let attachment = {
      color: "#7296a1",
      pretext: errorMessage,
      text: "More information below",
      fields: fieldsData
    }
    attachmentData.push(attachment)

    var options = {
      json: {
        text: "GotenBerg Error Logs",
        attachments: attachmentData
      }
    }


    let returnResponse = {}

    new Promise((resolve, reject) => {
      return resolve(reqObj.post(
        exceptionLogPostUrl,
        options
      ));
    }).then(result => {
      if (result.data === "ok") {
        returnResponse = {
          success: true,
          message: "Slack message posted."
        }
      } else {
        throw Error("Slack message was not posted")
      }
      return returnResponse
    }).catch((err) => {
      returnResponse = {
        success: false,
        message: "Slack message was not posted"
      }
      return returnResponse
    })

  } else {
    return {
      success: false,
      message: "Kafka configuration is not done"
    }
  }
}

module.exports = {
  pushObservationSubmissionToKafka: pushObservationSubmissionToKafka
};

