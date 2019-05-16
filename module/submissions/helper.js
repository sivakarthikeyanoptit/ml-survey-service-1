
module.exports = class submissionsHelper {
    static findSubmissionByEntityProgram(document, requestObject) {

        return new Promise(async (resolve, reject) => {

            try {

              let queryObject = {
                entityId: document.entityId,
                programId: document.programId
              };
          
              let submissionDocument = await database.models.submissions.findOne(
                queryObject
              );
          
              if (!submissionDocument) {
                let entityAssessorsQueryObject = [
                  {
                    $match: { entities: document.entityId, programId: document.programId }
                  }
                ];
          
                document.assessors = await database.models[
                  "entityAssessors"
                ].aggregate(entityAssessorsQueryObject);
          
                let assessorElement = document.assessors.find(assessor => assessor.userId === requestObject.userDetails.userId)
                if (assessorElement && assessorElement.externalId != "") {
                  assessorElement.assessmentStatus = "started"
                  assessorElement.userAgent = requestObject.headers['user-agent']
                }
          
                submissionDocument = await database.models.submissions.create(
                  document
                );

              } else {

                let assessorElement = submissionDocument.assessors.find(assessor => assessor.userId === requestObject.userDetails.userId)
                if (assessorElement && assessorElement.externalId != "") {
                  assessorElement.assessmentStatus = "started"
                  assessorElement.userAgent = requestObject.headers['user-agent']
                  let updateObject = {}
                  updateObject.$set = {
                    assessors: submissionDocument.assessors
                  }
                  submissionDocument = await database.models.submissions.findOneAndUpdate(
                    queryObject,
                    updateObject
                  );
                }
              }
          
              return resolve({
                message: "Submission found",
                result: submissionDocument
              });
          
          
              } catch (error) {
                return reject(error);
              }

        })

    }

    static extractStatusOfSubmission(submissionDocument) {

        return new Promise(async (resolve, reject) => {

            try {

                let result = {}
                result._id = submissionDocument._id
                result.status = submissionDocument.status
                result.evidences = submissionDocument.evidences
        
                return resolve(result);
      
      
          } catch (error) {
              return reject(error);
          }

      })
    }
  

    static canEnableRatingQuestionsOfSubmission(submissionDocument) {

        return new Promise(async (resolve, reject) => {

            try {

                let result = {}
                result.ratingsEnabled = true
                result.responseMessage = ""
            
                if (submissionDocument.evidences && submissionDocument.status !== "blocked") {
                    const evidencesArray = Object.entries(submissionDocument.evidences)
                    for (let iterator = 0; iterator < evidencesArray.length; iterator++) {
                        if (!evidencesArray[iterator][1].isSubmitted || evidencesArray[iterator][1].hasConflicts === true) {
                            result.ratingsEnabled = false
                            result.responseMessage = "Sorry! All evidence methods have to be completed to enable ratings."
                            break
                        }
                    }
                } else {
                    result.ratingsEnabled = false
                    result.responseMessage = "Sorry! This could be because the assessment has been blocked. Resolve conflicts to proceed further."
                }
        
                return resolve(result);
      
      
            } catch (error) {
                return reject(error);
            }

        })
    }


    static allSubmission(allSubmission) {

        return new Promise(async (resolve, reject) => {

            try {

                return resolve(allSubmission.isSubmitted);
    
    
            } catch (error) {
                return reject(error);
            }

        })
    }

    static questionValueConversion(question, oldResponse, newResponse) {

        return new Promise(async (resolve, reject) => {

            try {

                let result = {}

                if (question.responseType == "date") {
            
                    let oldResponseArray = oldResponse.split("/")
              
                    if (oldResponseArray.length > 2) {
                        [oldResponseArray[0], oldResponseArray[1]] = [oldResponseArray[1], oldResponseArray[0]];
                    }
              
                    let newResponseArray = newResponse.split("/")
              
                    if (newResponseArray.length > 2) {
                        [newResponseArray[0], newResponseArray[1]] = [newResponseArray[1], newResponseArray[0]];
                    }
              
                    result["oldValue"] = oldResponseArray.map(value => (value < 10) ? "0" + value : value).reverse().join("-")
                    result["newValue"] = newResponseArray.map(value => (value < 10) ? "0" + value : value).reverse().join("-")
            
                } else if (question.responseType == "radio") {
            
                    question.options.forEach(eachOption => {
              
                        if (eachOption.label.replace(/\s/g, '').toLowerCase() == oldResponse.replace(/\s/g, '').toLowerCase()) {
                            result["oldValue"] = eachOption.value
                        }
                
                        if (eachOption.label.replace(/\s/g, '').toLowerCase() == newResponse.replace(/\s/g, '').toLowerCase()) {
                            result["newValue"] = eachOption.value
                        }
                    })
            
                } else if (question.responseType == "multiselect") {
            
                    result["oldValue"] = result["newValue"] = new Array
                    let oldResponseArray = oldResponse.split(",").map((value) => { return value.replace(/\s/g, '').toLowerCase() })
                    let newResponseArray = newResponse.split(",").map((value) => { return value.replace(/\s/g, '').toLowerCase() })
              
                    question.options.forEach(eachOption => {
              
                        if (oldResponseArray.includes(eachOption.label.replace(/\s/g, '').toLowerCase())) {
                            result["oldValue"].push(eachOption.value)
                        }
                
                        if (newResponseArray.includes(eachOption.label.replace(/\s/g, '').toLowerCase())) {
                            result["newValue"].push(eachOption.value)
                        }
                    })
            
                } else {
            
                    result["oldValue"] = oldResponse
                    result["newValue"] = newResponse
                }

                return resolve(result);
    
    
            } catch (error) {
                return reject(error);
            }

        })
    }

};