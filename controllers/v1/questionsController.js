const csv = require("csvtojson");
const questionsHelper = require(ROOT_PATH + "/module/questions/helper")

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
    * @apiName Upload General Questions
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


    /**
    * @api {post} /assessment/api/v1/questions/upload Upload Questions CSV
    * @apiVersion 0.0.1
    * @apiName Upload Questions CSV
    * @apiGroup Questions
    * @apiParam {File} questions     Mandatory questions file of type CSV.
    * @apiUse successBody
    * @apiUse errorBody
    */
    upload(req){

      return new Promise(async (resolve,reject)=>{
        
        try {

          if (!req.files || !req.files.questions) {
            let responseMessage = "Bad request.";
            return resolve({ status: 400, message: responseMessage })
          }

          let questionData = await csv().fromString(req.files.questions.data.toString());
          
          let criteriaIds = new Array
          let criteriaObject = {}

          let questionCollection = {}
          let questionIds = new Array
          
          let solutionDocument = await database.models.solutions.findOne({ externalId: questionData[0]["solutionId"] },{"evidenceMethods":1,"sections":1,"themes":1}).lean();
          let criteriasIdArray = gen.utils.getCriteriaIds(solutionDocument.themes);
          let criteriasArray = new Array;

          criteriasIdArray.forEach(eachCriteriaIdArray=>{
            criteriasArray.push(eachCriteriaIdArray._id.toString())
          })

          questionData.forEach(eachQuestionData=>{

            let parsedQuestion = gen.utils.valueParser(eachQuestionData)

            if(!criteriaIds.includes(parsedQuestion["criteriaExternalId"])){
              criteriaIds.push(parsedQuestion["criteriaExternalId"])
            }

            if(!questionIds.includes(parsedQuestion["externalId"])) questionIds.push(parsedQuestion["externalId"])
            
            if (parsedQuestion["hasAParentQuestion"] !== "NO" && !questionIds.includes(parsedQuestion["parentQuestionId"])) { 
              questionIds.push(parsedQuestion["parentQuestionId"]) 
            }

            if (parsedQuestion["instanceParentQuestionId"] !== "NA" && !questionIds.includes(parsedQuestion["instanceParentQuestionId"])) { 
              questionIds.push(parsedQuestion["instanceParentQuestionId"]) 
            }

          })
        
          let criteriaDocument = await database.models.criterias.find({
            externalId:{$in:criteriaIds}
          }).lean()

          if(!criteriaDocument.length>0){
            throw "Criteria is not found"
          }

          criteriaDocument.forEach(eachCriteriaDocument=>{
            if(criteriasArray.includes(eachCriteriaDocument._id.toString())){
              criteriaObject[eachCriteriaDocument.externalId]= eachCriteriaDocument
            }
          })

          let questionsFromDatabase = await database.models.questions.find({
            externalId: { $in: questionIds }
          }).lean();

          if (questionsFromDatabase.length > 0) {
            questionsFromDatabase.forEach(question => {
              questionCollection[question.externalId] = question
            })
          }

          const fileName = `Question-Upload-Result`;
          let fileStream = new FileStream(fileName);
          let input = fileStream.initStream();

          (async function () {
            await fileStream.getProcessorPromise();
            return resolve({
              isResponseAStream: true,
              fileNameWithPath: fileStream.fileNameWithPath()
            });
          }());

          let pendingItems = new Array

          for(let pointerToQuestionData = 0;pointerToQuestionData<questionData.length;pointerToQuestionData++){
            
            let parsedQuestion = gen.utils.valueParser(questionData[pointerToQuestionData])

            let criteria = {}
            let ecm = {}

            ecm[parsedQuestion["evidenceMethod"]] = solutionDocument.evidenceMethods[parsedQuestion["evidenceMethod"]]
            criteria[parsedQuestion.criteriaExternalId] = criteriaObject[parsedQuestion.criteriaExternalId]

            let section = solutionDocument.sections[parsedQuestion.section]

            if ((parsedQuestion["hasAParentQuestion"] == "YES" && !questionCollection[parsedQuestion["parentQuestionId"]]) || (parsedQuestion["instanceParentQuestionId"] !== "NA" && !questionCollection[parsedQuestion["instanceParentQuestionId"]])) {
              
              pendingItems.push({
                parsedQuestion:parsedQuestion,
                criteriaToBeSent:criteria,
                evaluationFrameworkMethod:ecm,
                section:section
              })
              
            } else {

              let question = {}

              if(questionCollection[parsedQuestion["externalId"]]) {
                question[parsedQuestion["externalId"]] = questionCollection[parsedQuestion["externalId"]]
              }

              if(parsedQuestion["instanceParentQuestionId"] !== "NA" && questionCollection[parsedQuestion["instanceParentQuestionId"]]){
                question[parsedQuestion["instanceParentQuestionId"]] =  questionCollection[parsedQuestion["instanceParentQuestionId"]]
              }
              
              if(parsedQuestion["hasAParentQuestion"] == "YES" && questionCollection[parsedQuestion["parentQuestionId"]]){
                question[parsedQuestion["parentQuestionId"]] =  questionCollection[parsedQuestion["parentQuestionId"]]
              }

              let resultFromCreateQuestions = await questionsHelper.createQuestions(parsedQuestion,question,criteria,ecm,section)
              
              if(resultFromCreateQuestions.result){
                questionCollection[resultFromCreateQuestions.result.externalId] = resultFromCreateQuestions.result
              }
              input.push(resultFromCreateQuestions.total[0])

            }

          }

          if(pendingItems) {

            for(let pointerToPendingData = 0;pointerToPendingData<pendingItems.length;pointerToPendingData++) {
              
              let question = {}
              let eachPendingItem = gen.utils.valueParser(pendingItems[pointerToPendingData])
              
              if(questionCollection[eachPendingItem.parsedQuestion["externalId"]]) {
                question[eachPendingItem.parsedQuestion["externalId"]] = questionCollection[eachPendingItem.parsedQuestion["externalId"]]
              }

              if(eachPendingItem.parsedQuestion["instanceParentQuestionId"] !== "NA" && questionCollection[eachPendingItem.parsedQuestion["instanceParentQuestionId"]]){
                question[eachPendingItem.parsedQuestion["instanceParentQuestionId"]] =  questionCollection[eachPendingItem.parsedQuestion["instanceParentQuestionId"]]
              }
              
              if(eachPendingItem.parsedQuestion["hasAParentQuestion"] == "YES" && questionCollection[eachPendingItem.parsedQuestion["parentQuestionId"]]){
                question[eachPendingItem.parsedQuestion["parentQuestionId"]] =  questionCollection[eachPendingItem.parsedQuestion["parentQuestionId"]]
              }
              let csvQuestionData = await this.createQuestions(eachPendingItem.parsedQuestion,question,eachPendingItem.criteriaToBeSent,eachPendingItem.evaluationFrameworkMethod,eachPendingItem.section)
              
              input.push(csvQuestionData.total[0])
            }

          }
          
          input.push(null)

        } catch(error) {
          reject({
            message:error
          })
        }                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           

      })

    }

};
