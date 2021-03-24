const submissionsHelper = require(MODULES_BASE_PATH + "/submissions/helper")
const observationSubmissionsHelper = require(MODULES_BASE_PATH + "/observationSubmissions/helper")

var messageReceived = function (message) {

  return new Promise(async function (resolve, reject) {

    try {
        console.log("############################ OBSERVATION SUBMISSIONS HELPER ####################")
        console.log("observationSubmissionsHelper");
        let parsedMessage = JSON.parse(message.value)
      
        // Parsed Message Strucutre
        //   {
        //     submissionModel : "observationSubmissions/submissions",
        //     submissionId : observationSubmissionId
        //   }
        console.log("############################ AUTO RATING LOGS STARTS ############################")
        console.log(parsedMessage)
        console.log("############################ AUTO RATING LOGS ENDS ############################")
        if(parsedMessage.submissionModel == "observationSubmissions") {
            console.log("###################### coming inside observationSubmissions ###########");
            const observationSubmissionRatingResponse = await observationSubmissionsHelper.rateSubmissionById(parsedMessage.submissionId)
        } else if (parsedMessage.submissionModel == "submissions") {
            console.log("#####################coming inside submissions ############################");
            const submissionRatingResponse = await submissionsHelper.rateSubmissionById(parsedMessage.submissionId)
        }
        console.log("message processed");
        return resolve("Message Processed.");

    } catch (error) {
        console.log("error ", error);
        return reject(error);
    }

  });
};


var errorTriggered = function (error) {

  return new Promise(function (resolve, reject) {

    try {
      console.log(error)
      return resolve("Error Processed");
    } catch (error) {
      return reject(error);
    }

  });
};

module.exports = {
  messageReceived: messageReceived,
  errorTriggered: errorTriggered
};
