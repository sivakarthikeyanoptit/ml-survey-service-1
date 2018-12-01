const Request = require('./httpRequest');
const slackCommunicationsOnOff = process.env.SLACK_COMMUNICATIONS_ON_OFF
const slackToken = process.env.SLACK_TOKEN
const exceptionLogPostUrl = process.env.SLACK_EXCEPTION_LOG_URL;

const headers = {"Content-Type":"application/json",token:slackToken}

const sendExceptionLogMessage = function (errorObject) {

  if(slackCommunicationsOnOff === "ON" && slackToken != "" && gen.utils.checkIfStringIsUrl(exceptionLogPostUrl)) {
    const reqObj = new Request()
    let attachmentData = new Array
    let fieldsData = new Array
    Object.keys(_.pick(errorObject, ["method","url","errorStack"])).forEach(objProperty => {
      fieldsData.push({
        title:objProperty,
        value:errorObject[objProperty],
        short:false
      })
    })
    Object.keys(_.pick(errorObject.headers, ["x-channel-id","gpslocation","x-authenticated-userid"])).forEach(objProperty => {
      fieldsData.push({
        title:objProperty,
        value:errorObject.headers[objProperty],
        short:false
      })
    })
    Object.keys(errorObject.customFields).forEach(customField => {
      fieldsData.push({
        title:customField,
        value:errorObject.customFields[customField],
        short:false
      })
    })
    fieldsData.push({
      title:"Environment",
      value:process.env.NODE_ENV,
      short:false
    })
    
    let attachment = {
      color: "#36a64f",
      pretext: errorObject.errorMsg,
      text: "More information below",
      fields: fieldsData
    }
    attachmentData.push(attachment)
    var options = {
      json: {
        text:"Exception Logs",
        attachments:attachmentData
      }
    }

    options.headers = headers

    let returnResponse = {}

    new Promise((resolve, reject) => {
      return resolve(reqObj.post(
        exceptionLogPostUrl,
        options
      ));
    }).then(result => {
      if(result.data === "ok") {
        returnResponse = {
          success:true,
          message:"Slack message posted."
        }
      } else {
        throw Error("Slack message was not posted")
      }
      return returnResponse
    }).catch((err) => {
      returnResponse = {
        success:false,
        message:"Slack message was not posted"
      }
      return returnResponse
    })

  } else {
    return {
      success:false,
      message:"Slack configuration is not done"
    }
  }

}

module.exports = {
  sendExceptionLogMessage: sendExceptionLogMessage
};
