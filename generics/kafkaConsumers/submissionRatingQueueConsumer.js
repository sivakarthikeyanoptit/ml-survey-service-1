const submissionsHelper = require(MODULES_BASE_PATH + "/submissions/helper")
const observationSubmissionsHelper = require(MODULES_BASE_PATH + "/observationSubmissions/helper")

var messageReceived = function (message) {

  return new Promise(async function (resolve, reject) {

    try {

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
            console.log("GOING TO RATE OBSERVATION SUBMISSIONS")
            console.log(parsedMessage.submissionId)
            const observationSubmissionRatingResponse = await observationSubmissionsHelper.rateSubmissionById(parsedMessage.submissionId)
            console.log(observationSubmissionRatingResponse)
        } else if (parsedMessage.submissionModel == "submissions") {
            console.log("GOING TO RATE  SUBMISSIONS")
            console.log(parsedMessage.submissionId)
            const submissionRatingResponse = await submissionsHelper.rateSubmissionById(parsedMessage.submissionId)
            console.log(submissionRatingResponse)
        }

        console.log("Message Processed.")
        console.log("############################ AUTO RATING LOGS ENDS ############################")
        return resolve("Message Processed.");

    } catch (error) {
      console.log(error)
      console.log("############################ AUTO RATING LOGS ENDS ############################")
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
