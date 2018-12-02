const math = require('mathjs')
math.import({
  compareDates: function (dateArg1, dateArg2) {
    let date1 = new Date(dateArg1.replace( /(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3"))
    let date2 = new Date(dateArg2.replace( /(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3"))

    date1.setHours(0)
    date1.setMinutes(0)
    date1.setSeconds(0)
    date2.setHours(0)
    date2.setMinutes(0)
    date2.setSeconds(0)

    if(date1 > date2) {
      return 1
    } else if (date1 < date2) {
      return -1
    } else {
      return 0
    }
  },
  checkIfPresent: function (needle, haystack) {
    let searchUniverse = new Array
    if(haystack._data) {searchUniverse = haystack._data} else {searchUniverse = haystack}
    return searchUniverse.findIndex( arrayElement => arrayElement === needle)
  },
  checkIfModeIs: function (needle, haystack) {
    let searchKey
    let isMode
    if(needle._data) {
      searchKey = needle._data
      searchKey.sort()
      haystack.forEach(haystackElm => {
        haystackElm.sort()
      })
    } else {
      searchKey = needle
    }
    const countOfElements = Object.entries(_.countBy(haystack)).sort((a,b) => {return b[1]-a[1]})
    
    if(needle._data) {
      isMode = (_.isEqual(countOfElements[0][0].split(','), searchKey) && (countOfElements[0][1] > countOfElements[1][1])) ? 1 : -1
    } else {
      isMode = (countOfElements[0][0] === searchKey && (countOfElements[0][1] > countOfElements[1][1])) ? 1 : -1
    }

    return isMode
  },
  modeValue: function (haystack) {
    const countOfElements = Object.entries(_.countBy(haystack)).sort((a,b) => {return b[1]-a[1]})
    return countOfElements[0][1]
  },
  percentageOf: function (needle, haystack) {
    const countOfElements = _.countBy(haystack)
    return Math.round((countOfElements[needle]/haystack.length)*100)
  },
  averageOf: function (haystack) {
    haystack = haystack.map(x => parseInt(x));
    return Math.round(_.sum(haystack)/haystack.length)
  },
  differenceInDays: function (dateArg1, dateArg2) { 

    let date1
    let date2
    
    if(typeof dateArg1 === "string") {
      date1 = new Date(dateArg1.replace( /(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3"))
    } else {
      date1 = new Date(dateArg1)
    }

    if(typeof dateArg2 === "string") {
      date2 = new Date(dateArg2.replace( /(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3"))
    } else {
      date2 = new Date(dateArg2)
    }

    date1.setHours(0)
    date1.setMinutes(0)
    date1.setSeconds(0)
    date2.setHours(0)
    date2.setMinutes(0)
    date2.setSeconds(0)

    return Math.ceil((date1.getTime() - date2.getTime()) / (1000 * 3600 * 24))
  }
})


module.exports = class Submission extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "submissions";
  }
  insert(req) {
    return super.insert(req);
  }
  
  async findSubmissionBySchoolProgram(document,requestObject) {

    let queryObject = {
      schoolId: document.schoolId,
      programId:document.programId
    };

    let submissionDocument = await database.models.submissions.findOne(
      queryObject
    );
    
    if(!submissionDocument) {
        let schoolAssessorsQueryObject = [
          {
            $match: { schools: document.schoolId, programId: document.programId}
          }
        ];

        document.assessors = await database.models[
          "school-assessors"
        ].aggregate(schoolAssessorsQueryObject);

        let assessorElement = document.assessors.find(assessor => assessor.userId === requestObject.userDetails.userId)
        if(assessorElement && assessorElement.externalId != "") {
          assessorElement.assessmentStatus = "started"
          assessorElement.userAgent = requestObject.headers['user-agent']
        }

        submissionDocument = await database.models.submissions.create(
          document
        );
    } else {
      let assessorElement = submissionDocument.assessors.find(assessor => assessor.userId === requestObject.userDetails.userId)
      if(assessorElement && assessorElement.externalId != "") {
        assessorElement.assessmentStatus = "started"
        assessorElement.userAgent = requestObject.headers['user-agent']
        let updateObject = {}
        updateObject.$set = { 
          assessors : submissionDocument.assessors
        }
        submissionDocument = await database.models.submissions.findOneAndUpdate(
          queryObject,
          updateObject
        );
      }
    }

    return {
      message: "Submission found",
      result: submissionDocument
    };
  }

  async make(req) {
    return new Promise(async (resolve, reject) => {

      try {
        
        req.body = req.body || {};
        let message = "Submission completed successfully"
        let runUpdateQuery = false

        let queryObject = {
          _id: ObjectId(req.params._id)
        }
        
        let queryOptions = {
          new: true
        }

        let submissionDocument = await database.models.submissions.findOne(
          queryObject
        );

        let updateObject = {}
        let result = {}

        if(req.body.schoolProfile) {
          updateObject.$set = { schoolProfile : req.body.schoolProfile }
          runUpdateQuery = true
        }
      
        if(req.body.evidence) {
          req.body.evidence.gpsLocation = req.headers.gpslocation
          req.body.evidence.submittedBy = req.userDetails.userId
          req.body.evidence.submittedByName = req.userDetails.firstName + " " + req.userDetails.lastName
          req.body.evidence.submittedByEmail = req.userDetails.email
          req.body.evidence.submissionDate = new Date()
          if(submissionDocument.evidences[req.body.evidence.externalId].isSubmitted === false) {
            runUpdateQuery = true
            req.body.evidence.isValid = true
            let answerArray = {}
            Object.entries(req.body.evidence.answers).forEach(answer => {
              if(answer[1].responseType === "matrix") {
                if(answer[1].isAGeneralQuestion == true && submissionDocument.generalQuestions && submissionDocument.generalQuestions[answer[0]]) {
                  submissionDocument.generalQuestions[answer[0]].submissions.forEach(generalQuestionSubmission => {
                    generalQuestionSubmission.value.forEach(generalQuestionInstanceValue => {
                      generalQuestionInstanceValue.isAGeneralQuestionResponse = true
                      answer[1].value.push(generalQuestionInstanceValue)
                    })
                    generalQuestionSubmission.payload.labels[0].forEach(generalQuestionInstancePayload => {
                      answer[1].payload.labels[0].push(generalQuestionInstancePayload)
                    })
                  })
                }
                for (let countOfInstances = 0; countOfInstances < answer[1].value.length; countOfInstances++) {
                  
                  _.valuesIn(answer[1].value[countOfInstances]).forEach(question => {
                    
                    if(answerArray[question.qid]) {
                      answerArray[question.qid].instanceResponses.push(question.value)
                      answerArray[question.qid].instanceRemarks.push(question.remarks)
                      answerArray[question.qid].instanceFileName.push(question.fileName)
                    } else {
                      let clonedQuestion = {...question}
                      clonedQuestion.instanceResponses = new Array
                      clonedQuestion.instanceRemarks = new Array
                      clonedQuestion.instanceFileName = new Array
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
            
            if(answerArray.isAGeneralQuestionResponse) { delete answerArray.isAGeneralQuestionResponse}
            
            updateObject.$push = { 
              ["evidences."+req.body.evidence.externalId+".submissions"]: req.body.evidence
            }
            updateObject.$set = { 
              answers : _.assignIn(submissionDocument.answers, answerArray),
              ["evidences."+req.body.evidence.externalId+".isSubmitted"] : true,
              ["evidences."+req.body.evidence.externalId+".notApplicable"] : req.body.evidence.notApplicable,
              ["evidences."+req.body.evidence.externalId+".startTime"] : req.body.evidence.startTime,
              ["evidences."+req.body.evidence.externalId+".endTime"] : req.body.evidence.endTime,
              ["evidences."+req.body.evidence.externalId+".hasConflicts"]: false,
              status: (submissionDocument.status === "started") ? "inprogress" : submissionDocument.status
            }
          } else {
            runUpdateQuery = true
            req.body.evidence.isValid = false

            Object.entries(req.body.evidence.answers).forEach(answer => {
              if(answer[1].responseType === "matrix") {
                if(answer[1].isAGeneralQuestion == true && submissionDocument.generalQuestions && submissionDocument.generalQuestions[answer[0]]) {
                  submissionDocument.generalQuestions[answer[0]].submissions.forEach(generalQuestionSubmission => {
                    generalQuestionSubmission.value.forEach(generalQuestionInstanceValue => {
                      generalQuestionInstanceValue.isAGeneralQuestionResponse = true
                      answer[1].value.push(generalQuestionInstanceValue)
                    })
                    generalQuestionSubmission.payload.labels[0].forEach(generalQuestionInstancePayload => {
                      answer[1].payload.labels[0].push(generalQuestionInstancePayload)
                    })
                  })
                }
                answer[1].countOfInstances = answer[1].value.length
              }
            });

            updateObject.$push = { 
              ["evidences."+req.body.evidence.externalId+".submissions"]: req.body.evidence
            }

            updateObject.$set = {
              ["evidences."+req.body.evidence.externalId+".hasConflicts"]: true,
              status: (submissionDocument.ratingOfManualCriteriaEnabled === true) ? "inprogress" : "blocked"
            }

            message = "Duplicate evidence method submission detected."
          }
          
        }
        
        if(runUpdateQuery) {
          let updatedSubmissionDocument = await database.models.submissions.findOneAndUpdate(
            queryObject,
            updateObject,
            queryOptions
          );
          
          let canRatingsBeEnabled = await this.canEnableRatingQuestionsOfSubmission(updatedSubmissionDocument)
          let {ratingsEnabled} = canRatingsBeEnabled

          if(ratingsEnabled) {
            updateObject.$set = {
              status: "pendingRating"
            }
            updatedSubmissionDocument = await database.models.submissions.findOneAndUpdate(
              queryObject,
              updateObject,
              queryOptions
            );
          }

          let status = await this.extractStatusOfSubmission(updatedSubmissionDocument)

          let response = {
            message: message,
            result: status
          };

          return resolve(response);

        } else {

          let response = {
            message: message
          };

          return resolve(response);
        }

      } catch (error) {
        return reject({
          status:500,
          message:"Oops! Something went wrong!",
          errorObject: error
        });
      }
      
    })
  }


  async generalQuestions(req) {
    return new Promise(async (resolve, reject) => {

      try {
        
        req.body = req.body || {};
        let message = "General question submitted successfully."
        let runUpdateQuery = false

        let queryObject = {
          _id: ObjectId(req.params._id)
        }
        
        let queryOptions = {
          new: true
        }

        let submissionDocument = await database.models.submissions.findOne(
          queryObject
        );

        let updateObject = {}
        updateObject.$set = {}
      
        if(req.body.answers) {
          let gpsLocation = req.headers.gpslocation
          let submittedBy = req.userDetails.userId
          let submissionDate = new Date()
          
          Object.entries(req.body.answers).forEach(answer => {
            if(answer[1].isAGeneralQuestion == true && answer[1].responseType === "matrix" && answer[1].evidenceMethod != "") {
              runUpdateQuery = true
              answer[1].gpslocation = gpsLocation
              answer[1].submittedBy = submittedBy
              answer[1].submissionDate = submissionDate
              if(submissionDocument.generalQuestions && submissionDocument.generalQuestions[answer[0]]) {
                submissionDocument.generalQuestions[answer[0]].submissions.push(answer[1])
              } else {
                submissionDocument.generalQuestions = {
                  [answer[0]] : {
                    submissions : [answer[1]]
                  }
                }
              }
              if(submissionDocument.evidences[answer[1].evidenceMethod].isSubmitted === true) {
                submissionDocument.evidences[answer[1].evidenceMethod].submissions.forEach((evidenceMethodSubmission,indexOfEvidenceMethodSubmission) => {
                  if(evidenceMethodSubmission.answers[answer[0]]) {
                    answer[1].value.forEach(incomingGeneralQuestionInstance => {
                      incomingGeneralQuestionInstance.isAGeneralQuestionResponse = true
                      evidenceMethodSubmission.answers[answer[0]].value.push(incomingGeneralQuestionInstance)
                    })
                    answer[1].payload.labels[0].forEach(incomingGeneralQuestionInstancePayload => {
                      evidenceMethodSubmission.answers[answer[0]].payload.labels[0].push(incomingGeneralQuestionInstancePayload)
                    })
                    evidenceMethodSubmission.answers[answer[0]].countOfInstances = evidenceMethodSubmission.answers[answer[0]].value.length
                  }
                  if(evidenceMethodSubmission.isValid === true) {

                    for (let countOfInstances = 0; countOfInstances < answer[1].value.length; countOfInstances++) {
                      
                      _.valuesIn(answer[1].value[countOfInstances]).forEach(question => {
                        
                          submissionDocument.answers[question.qid].instanceResponses.push(question.value)
                          submissionDocument.answers[question.qid].instanceRemarks.push(question.remarks)
                          submissionDocument.answers[question.qid].instanceFileName.push(question.fileName)

                      })
                    }
                  }

                })
              }
              
            }
          });

          updateObject.$set.generalQuestions = submissionDocument.generalQuestions
          updateObject.$set.evidences = submissionDocument.evidences
          updateObject.$set.answers = submissionDocument.answers

        }

        if(runUpdateQuery) {
          let updatedSubmissionDocument = await database.models.submissions.findOneAndUpdate(
            queryObject,
            updateObject,
            queryOptions
          );

          let response = {
            message: message
          };

          return resolve(response);

        } else {

          let response = {
            message: "Failed to submit general questions"
          };

          return resolve(response);
        }

      } catch (error) {
        return reject({
          status:500,
          message:"Oops! Something went wrong!",
          errorObject: error
        });
      }
      
    })
  }


  async rate(req) {
    return new Promise(async (resolve, reject) => {

      try {
        
        req.body = req.body || {};
        let message = "Crtieria rating completed successfully"

        let queryObject = {
          _id: ObjectId(req.params._id)
        }

        let submissionDocument = await database.models.submissions.findOne(
          queryObject
        );

        if(!submissionDocument._id) {
          throw "Couldn't find the submission document"
        }

        let result = {}
      
        if(req.body.expressionVariables && req.body.expression && req.body.criteriaId) {
          const submissionAnswers = new Array
          const questionValueExtractor = function (question) {
            const questionArray = question.split('.')
            submissionAnswers.push(submissionDocument.answers[questionArray[0]])
            if(questionArray[1] === "value") {
              if(submissionDocument.answers[questionArray[0]]) {
                return submissionDocument.answers[questionArray[0]].value
              } else {
                return "NA"
              }
            } else if (questionArray[1] === "mode") {
              if(submissionDocument.answers[questionArray[0]]) {
                return submissionDocument.answers[questionArray[0]].value
              } else {
                return "NA"
              }
            } else if (questionArray[1] === "instanceResponses") {
              if(submissionDocument.answers[questionArray[0]]) {
                return submissionDocument.answers[questionArray[0]].instanceResponses
              } else {
                return "NA"
              }
            }
          }
          const criteria = submissionDocument.criterias.find(criteria => criteria._id.toString() === req.body.criteriaId)
          let expressionVariables = {}
          let expressionResult = {}
          let allValuesAvailable = true
          Object.keys(req.body.expressionVariables).forEach(variable => {
            if(variable != "default") {
              expressionVariables[variable] = questionValueExtractor(req.body.expressionVariables[variable])
              expressionVariables[variable] = (expressionVariables[variable] === "NA" && req.body.expressionVariables.default[variable]) ? req.body.expressionVariables.default[variable] : "NA"
              if(expressionVariables[variable] === "NA") {
                allValuesAvailable = false
              }
            }
          })

          Object.keys(req.body.expression).forEach(level => {
            //console.log(math.eval("(((G3/G1)>31) and ((G3/G1)<=35) and (compare((G2-G1),-1) == 0))",expressionVariables))
            expressionResult[level] = {
              expressionParsed : req.body.expression[level],
              result : (allValuesAvailable) ? math.eval(req.body.expression[level],expressionVariables) : false
            }
          })
          // const parser = math.parser()
          // create a string
          // console.log(math.compareText("hello", "hello"))                      // String, "hello"

          result.expressionVariables = expressionVariables
          result.expressionResult = expressionResult
          result.submissionAnswers = submissionAnswers
          result.criteria = criteria
          
        } else {
          throw "Missing post parameters"
        }


        let response = {
          message: message,
          result: result
        };

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

  // Commented out the rating flow
  // async fetchRatingQuestions(req) {
  //   return new Promise(async (resolve, reject) => {
  //     req.body = req.body || {};

  //     let result = {}
  //     let responseMessage
      
  //     let queryObject = {
  //       _id: ObjectId(req.params._id)
  //     }

  //     let submissionDocument = await database.models.submissions.findOne(
  //       queryObject
  //     );

  //     if(submissionDocument.ratingOfManualCriteriaEnabled === true) {

  //       result._id = submissionDocument._id
  //       result.status = submissionDocument.status

  //       let {isEditable, criterias} = await this.extractCriteriaQuestionsOfSubmission(submissionDocument, req.userDetails.allRoles)
  //       result.isEditable = isEditable
  //       result.criterias = criterias
  //       result.allManualCriteriaRatingSubmitted = (submissionDocument.allManualCriteriaRatingSubmitted) ? submissionDocument.allManualCriteriaRatingSubmitted : false
  //       responseMessage = "Rating questions fetched successfully."
        
  //     } else {
  //       responseMessage = "Rating questions not yet enabled for this submission."
  //     }

  //     let response = { message: responseMessage, result: result };
  //     return resolve(response);

  //   }).catch(error => {
  //     reject(error);
  //   });
  // }

  // Commented out the rating flow
  // async submitRatingQuestions(req) {
  //   return new Promise(async (resolve, reject) => {
  //     req.body = req.body || {};
  //     let responseMessage = "Rating questions submission completed successfully"
  //     let runUpdateQuery = false

  //     let queryObject = {
  //       _id: ObjectId(req.params._id)
  //     }

  //     let submissionDocument = await database.models.submissions.findOne(
  //       queryObject
  //     );

  //     let updateObject = {}
  //     let result = {}

  //     if(req.body.ratings) {
  //       if(submissionDocument.ratingOfManualCriteriaEnabled === true && submissionDocument.allManualCriteriaRatingSubmitted != true) {
  //         runUpdateQuery = true
  //         Object.entries(req.body.ratings).forEach(rating => {
  //           let criteriaElm = _.find(submissionDocument.criterias, {_id:ObjectId(rating[1].criteriaId)});
  //           criteriaElm.score = rating[1].score
  //           criteriaElm.remarks = rating[1].remarks
  //           criteriaElm.ratingSubmittedBy = req.userDetails.userId
  //           criteriaElm.ratingSubmissionDate = new Date()
  //           criteriaElm.ratingSubmissionGpsLocation = req.headers.gpslocation
  //         });
  //         updateObject.$set = { 
  //           criterias : submissionDocument.criterias,
  //           allManualCriteriaRatingSubmitted: true
  //         }
  //       } else {
  //         responseMessage = "Cannot submit ratings for this submission."
  //       }
  //     } else {
  //       responseMessage = "Invalid request"
  //     }

  //     if(runUpdateQuery) {

  //       result = await database.models.submissions.findOneAndUpdate(
  //         queryObject,
  //         updateObject
  //       );

  //       let response = {
  //         message: responseMessage
  //       };

  //       return resolve(response);

  //     } else {

  //       let response = {
  //         message: responseMessage
  //       };

  //       return resolve(response);
  //     }

      
  //   }).catch(error => {
  //     reject(error);
  //   });
  // }


  // Commented out the rating flow
  // async fetchCriteriaRatings(req) {
  //   return new Promise(async (resolve, reject) => {
  //     req.body = req.body || {};
  //     let result = {}
  //     let responseMessage = ""

  //     let queryObject = {
  //       _id: ObjectId(req.params._id)
  //     }

  //     let submissionDocument = await database.models.submissions.findOne(
  //       queryObject
  //     );
      
  //     if(submissionDocument.allManualCriteriaRatingSubmitted === true) {
  //       let criteriaResponses = {}
  //       submissionDocument.criterias.forEach(criteria => {
  //         if (criteria.criteriaType === 'manual') {
  //           criteriaResponses[criteria._id] = _.pick(criteria, ['_id', 'name', 'externalId', 'description', 'score', 'remarks', 'flag'])
            
  //           if(criteria.flagRaised && criteria.flagRaised[req.userDetails.userId]) {
  //             criteriaResponses[criteria._id].flagRaised = _.pick(criteria.flagRaised[req.userDetails.userId], ['value', 'remarks', 'submissionDate'])
  //           }
            
  //         }
  //       })

  //       result._id = submissionDocument._id
  //       result.status = submissionDocument.status
  //       result.isEditable = (_.includes(req.userDetails.allRoles,"ASSESSOR")) ? true : false
  //       result.criterias = _.values(criteriaResponses)
  //       responseMessage = "Criteria ratings fetched successfully."
  //     } else {
  //       responseMessage = "No Criteria ratings found for this assessment."
  //     }

  //     let response = {
  //       message: responseMessage,
  //       result: result
  //     };
  //     return resolve(response);
  //   }).catch(error => {
  //     reject(error);
  //   });
  // }


  // Commented out the rating flow
  // async flagCriteriaRatings(req) {
  //   return new Promise(async (resolve, reject) => {
  //     req.body = req.body || {};
  //     let responseMessage
  //     let runUpdateQuery = false

  //     let queryObject = {
  //       _id: ObjectId(req.params._id)
  //     }

  //     let submissionDocument = await database.models.submissions.findOne(
  //       queryObject
  //     );

  //     let updateObject = {}
  //     let result = {}

  //     if(req.body.flag) {
  //       if(submissionDocument.allManualCriteriaRatingSubmitted === true) {
  //         Object.entries(req.body.flag).forEach(flag => {
  //           let criteriaElm = _.find(submissionDocument.criterias, {_id:ObjectId(flag[1].criteriaId)});

  //           flag[1].userId = req.userDetails.userId
  //           flag[1].submissionDate = new Date()
  //           flag[1].submissionGpsLocation = req.headers.gpslocation

  //           if(criteriaElm.flagRaised && criteriaElm.flagRaised[req.userDetails.userId]) {
  //             responseMessage = "You cannot update an already flagged criteria."
  //           } else if(criteriaElm.flagRaised) {
  //             runUpdateQuery = true
  //             criteriaElm.flagRaised[req.userDetails.userId] = flag[1]
  //           } else {
  //             runUpdateQuery = true
  //             criteriaElm.flagRaised = {}
  //             criteriaElm.flagRaised[req.userDetails.userId] = flag[1]
  //           }

  //         });
  //         updateObject.$set = { criterias : submissionDocument.criterias }
  //       } else {
  //         responseMessage = "Cannot flag ratings for this assessment."
  //       }
  //     } else {
  //       responseMessage = "Invalid request"
  //     }
      
  //     if(runUpdateQuery) {
  //       result = await database.models.submissions.findOneAndUpdate(
  //         queryObject,
  //         updateObject
  //       );
        
  //       responseMessage = "Criterias flagged successfully."

  //     }

  //     let response = {
  //       message: responseMessage
  //     };

  //     return resolve(response);
      
  //   }).catch(error => {
  //     reject(error);
  //   });
  // }


  async feedback(req) {
    return new Promise(async (resolve, reject) => {
      req.body = req.body || {};
      let responseMessage
      let runUpdateQuery = false

      let queryObject = {
        _id: ObjectId(req.params._id)
      }

      let submissionDocument = await database.models.submissions.findOne(
        queryObject
      );

      let updateObject = {}

      if(req.body.feedback && submissionDocument.status != "started") {

        req.body.feedback.userId = req.userDetails.userId
        req.body.feedback.submissionDate = new Date()
        req.body.feedback.submissionGpsLocation = req.headers.gpslocation

        runUpdateQuery = true
        
        updateObject.$push = { 
          ["feedback"]: req.body.feedback
        }

      } else {
        responseMessage = "Atleast one evidence method has to be completed before giving feedback."
      }
      
      if(runUpdateQuery) {
        let result = await database.models.submissions.findOneAndUpdate(
          queryObject,
          updateObject
        );
        
        responseMessage = "Feedback submitted successfully."

      }

      let response = {
        message: responseMessage
      };

      return resolve(response);
      
    }).catch(error => {
      reject(error);
    });
  }


  async status(req) {
    return new Promise(async (resolve, reject) => {
      req.body = req.body || {};
      let result = {}

      let queryObject = {
        _id: ObjectId(req.params._id)
      }

      let submissionDocument = await database.models.submissions.findOne(
        queryObject
      );

      result._id = submissionDocument._id
      result.status = submissionDocument.status
      result.evidences = submissionDocument.evidences
      let response = { message: "Submission status fetched successfully", result: result };

      return resolve(response);
    }).catch(error => {
      reject(error);
    });
  }


  extractStatusOfSubmission(submissionDocument) {

    let result = {}
    result._id = submissionDocument._id
    result.status = submissionDocument.status
    result.evidences = submissionDocument.evidences

    return result;

  }

  // Commented out the rating flow
  // extractCriteriaQuestionsOfSubmission(submissionDocument, requestingUserRoles) {

  //   let result = {}
  //   let criteriaResponses = {}
  //   submissionDocument.criterias.forEach(criteria => {
  //     if (criteria.criteriaType === 'manual') {
  //       criteriaResponses[criteria._id] = _.pick(criteria, ['_id', 'name', 'externalId', 'description', 'score', 'rubric', 'remarks'])
  //       criteriaResponses[criteria._id].questions = []
  //     }
  //   })

  //   if(submissionDocument.answers) {
  //     Object.entries(submissionDocument.answers).forEach(answer => {
  //       if(criteriaResponses[answer[1].criteriaId] != undefined) {
  //         criteriaResponses[answer[1].criteriaId].questions.push(answer[1])
  //       }
  //     });
  //   }

  //   result.isEditable = (_.includes(requestingUserRoles,"ASSESSOR")) ? false : true
  //   result.criterias = _.values(criteriaResponses)

  //   return result;

  // }

  canEnableRatingQuestionsOfSubmission(submissionDocument) {

    let result = {}
    result.ratingsEnabled = true
    result.responseMessage = ""

    if(submissionDocument.evidences && submissionDocument.status !== "blocked") {
      const evidencesArray = Object.entries(submissionDocument.evidences)
      for (let iterator = 0; iterator < evidencesArray.length; iterator++) {
        if(!evidencesArray[iterator][1].isSubmitted || evidencesArray[iterator][1].hasConflicts === true) {
          result.ratingsEnabled = false
          result.responseMessage = "Sorry! All evidence methods have to be completed to enable ratings."
          break
        }
      }
    } else {
      result.ratingsEnabled = false
      result.responseMessage = "Sorry! This could be because the assessment has been blocked. Resolve conflicts to proceed further."
    }

    return result;

  }

};
