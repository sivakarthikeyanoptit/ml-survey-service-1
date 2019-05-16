const csv = require("csvtojson");

module.exports = class Questions extends Abstract {
  constructor() {
    super(questionsSchema);
  }

  static get name() {
    return "questions";
  }


    /**
    * @api {post} /assessment/api/v1/questions/setGeneralQuestions Upload General Questions
    * @apiVersion 0.0.1
    * @apiName Upload Question Document JSON
    * @apiGroup Questions
    * @apiParam {File} questions     Mandatory questions file of type CSV.
    * @apiUse successBody
    * @apiUse errorBody
    */

    async setGeneralQuestions(req) {

      return new Promise(async (resolve, reject) => {

        try {
          let questionData = await csv().fromString(req.files.questions.data.toString());

          questionData = await Promise.all(questionData.map(async (question) => {
            if(question.externalId && question.isAGeneralQuestion) {
              question = await database.models.questions.findOneAndUpdate(
                { externalId: question.externalId },
                { $set: { isAGeneralQuestion: (question.isAGeneralQuestion === "TRUE") ? true : false } },
                {
                  returnNewDocument : true
                }
              );
              return question
            } else {
              return;
            }
          }));
          

          if (questionData.findIndex( question => question === undefined || question === null) >= 0) {
            throw "Something went wrong, not all records were inserted/updated."
          }

          let responseMessage = "Questions updated successfully."

          let response = { message: responseMessage };

          return resolve(response);

        } catch (error) {
          return reject({
            status:500,
            message:error,
            errorObject: error
          });
        }

      })
    }


};
