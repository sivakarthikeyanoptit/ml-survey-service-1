const csv = require("csvtojson");

module.exports = class Questions extends Abstract {
  constructor() {
    super(questionsSchema);
  }

  static get name() {
    return "questions";
  }

  insert(req) {
    return super.insert(req);
  }

  update(req) {
    return super.update(req);
  }

  find(req) {
    return super.find(req);
  }

  async upload(req) {

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

  async mergeAnswer(req){

    return new Promise(async (resolve,reject)=>{

      try{
        
        if (!req.query.schoolId){
          throw "School id is required"
        }

        if(!req.query.ecm){
          throw "Ecm is required"
        }

        let ecmMethod = "evidences."+req.query.ecm

        let submissionDocuments = await database.models.submissions.findOne({
          schoolExternalId:req.query.schoolId
        },{answers:1,[ecmMethod]:1}).lean()

        if(!submissionDocuments){
          throw "Submissions is not found for given schools"
        }

        let ecmData = submissionDocuments.evidences[req.query.ecm]

        let messageData

        if(ecmData.isSubmitted == true){

          for(let pointerToSubmissions = 0;pointerToSubmissions<ecmData.submissions.length;pointerToSubmissions++){
         
            let answerArray = {}

            let currentEcmSubmissions = ecmData.submissions[pointerToSubmissions]

            if(currentEcmSubmissions.isValid === true){

                Object.entries(currentEcmSubmissions.answers).forEach(answer => {
                        
                if (answer[1].responseType === "matrix" && answer[1].notApplicable != true) {
    
                    for (let countOfInstances = 0; countOfInstances < answer[1].value.length; countOfInstances++) {
    
                        answer[1].value[countOfInstances]  && _.valuesIn(answer[1].value[countOfInstances]).forEach(question => {
    
                            if (question.qid && answerArray[question.qid]) {
    
                                answerArray[question.qid].instanceResponses && answerArray[question.qid].instanceResponses.push(question.value)
                                answerArray[question.qid].instanceRemarks && answerArray[question.qid].instanceRemarks.push(question.remarks)
                                answerArray[question.qid].instanceFileName && answerArray[question.qid].instanceFileName.push(question.fileName)
    
                            } else {
                                let clonedQuestion = { ...question }
                                clonedQuestion.instanceResponses = []
                                clonedQuestion.instanceRemarks = []
                                clonedQuestion.instanceFileName = []
                                clonedQuestion.instanceResponses.push(question.value)
                                clonedQuestion.instanceRemarks.push(question.remarks)
                                clonedQuestion.instanceFileName.push(question.fileName)
                                delete clonedQuestion.value
                                delete clonedQuestion.remarks
                                delete clonedQuestion.fileName
                                delete clonedQuestion.payload
                                answerArray[question.qid] = clonedQuestion
                            }
    
                        })
                    }
                    answer[1].countOfInstances = answer[1].value.length
                }
    
                answerArray[answer[0]] = answer[1]
                });
  
              _.merge(submissionDocuments.answers,answerArray)

            }

          }
          
        messageData = "Answers merged successfully"

        }else{
          messageData = "isSubmitted False"
        }

        return resolve({
          message:messageData
        })

      } catch(error){
        return reject({
          message:error
        })
      }
    })
  }


};
