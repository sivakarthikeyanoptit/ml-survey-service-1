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
  
  async findSubmissionBySchoolProgram(document) {

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

        submissionDocument = await database.models.submissions.create(
          document
        );
    }

    return {
      message: "submission found",
      result: submissionDocument
    };
  }

  async make(req) {
    return new Promise(async (resolve, reject) => {
      req.body = req.body || {};
      let message = "Submission completed successfully"
      let runUpdateQuery = false

      let queryObject = {
        _id: ObjectId(req.params._id)
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
        req.body.evidence.submissionDate = new Date()
        if(submissionDocument.evidences[req.body.evidence.externalId].isSubmitted === false) {
          runUpdateQuery = true
          req.body.evidence.isValid = true
          let answerArray = new Array()
          Object.entries(req.body.evidence.answers).forEach(answer => {
            answerArray[answer[0]] = answer[1]
          });
          updateObject.$push = { 
            ["evidences."+req.body.evidence.externalId+".submissions"]: req.body.evidence
          }
          updateObject.$set = { 
            answers : _.assignIn(submissionDocument.answers, req.body.evidence.answers),
            ["evidences."+req.body.evidence.externalId+".isSubmitted"] : true,
            ["evidences."+req.body.evidence.externalId+".startTime"] : req.body.evidence.startTime,
            ["evidences."+req.body.evidence.externalId+".endTime"] : req.body.evidence.endTime,
            ["evidences."+req.body.evidence.externalId+".hasConflicts"]: false,
            status: "inprogress"
          }
        } else {
          runUpdateQuery = true
          req.body.evidence.isValid = false
          updateObject.$push = { 
            ["evidences."+req.body.evidence.externalId+".submissions"]: req.body.evidence
          }
          updateObject.$set = {
            ["evidences."+req.body.evidence.externalId+".hasConflicts"]: true,
            status: "inprogress"
          }
          message = "Duplicate evidence method submission detected."
        }
        
      }
      
      if(runUpdateQuery) {
        result = await database.models.submissions.findOneAndUpdate(
          queryObject,
          updateObject
        );

        let response = {
          message: message
        };

        return resolve(response);

      } else {

        let response = {
          message: message
        };

        return resolve(response);
      }

      
    }).catch(error => {
      reject(error);
    });
  }


  async fetchRatingQuestions(req) {
    return new Promise(async (resolve, reject) => {
      req.body = req.body || {};

      let result = {}
      
      let queryObject = {
        _id: ObjectId(req.params._id)
      }

      let submissionDocument = await database.models.submissions.findOne(
        queryObject
      );
      
      let criteriaResponses = {}
      submissionDocument.criterias.forEach(criteria => {
        if (criteria.criteriaType === 'manual') {
          criteriaResponses[criteria._id] = _.pick(criteria, ['_id', 'name', 'externalId', 'description', 'score', 'rubric', 'remarks'])
          criteriaResponses[criteria._id].questions = []
        }
      })

      if(submissionDocument.answers) {
        Object.entries(submissionDocument.answers).forEach(answer => {
          if(criteriaResponses[answer[1].criteriaId] != undefined) {
            criteriaResponses[answer[1].criteriaId].questions.push(answer[1])
          }
        });
      }

      result._id = submissionDocument._id
      result.status = submissionDocument.status
      result.isEditable = (_.includes(req.userDetails.allRoles,"ASSESSOR")) ? false : true
      result.criterias = _.values(criteriaResponses)

      let response = { message: "Rating questions fetched successfully.", result: result };

      return resolve(response);
    }).catch(error => {
      reject(error);
    });
  }


  async submitRatingQuestions(req) {
    return new Promise(async (resolve, reject) => {
      req.body = req.body || {};
      let message = "Rating questions submission completed successfully"
      let runUpdateQuery = false

      let queryObject = {
        _id: ObjectId(req.params._id)
      }

      let submissionDocument = await database.models.submissions.findOne(
        queryObject
      );

      let updateObject = {}
      let result = {}

      if(req.body.ratings) {
        if(submissionDocument.status !== "blocked") {
          runUpdateQuery = true
          Object.entries(req.body.ratings).forEach(rating => {
            let criteriaElm = _.find(submissionDocument.criterias, {_id:ObjectId(rating[1].criteriaId)});
            criteriaElm.score = rating[1].score
            criteriaElm.remarks = rating[1].remarks
            criteriaElm.ratingSubmittedBy = req.userDetails.userId
            criteriaElm.ratingSubmissionDate = new Date()
            criteriaElm.ratingSubmissionGpsLocation = req.headers.gpslocation
          });
          updateObject.$set = { criterias : submissionDocument.criterias }
        } else {
          message = "Cannot submit ratings for a blocked submission."
        }
      }

      if(runUpdateQuery) {

        result = await database.models.submissions.findOneAndUpdate(
          queryObject,
          updateObject
        );

        let response = {
          message: message
        };

        return resolve(response);

      } else {

        let response = {
          message: message
        };

        return resolve(response);
      }

      
    }).catch(error => {
      reject(error);
    });
  }



  async fetchCriteriaRatings(req) {
    return new Promise(async (resolve, reject) => {
      req.body = req.body || {};
      let result = {}
      
      let queryObject = {
        _id: ObjectId(req.params._id)
      }

      let submissionDocument = await database.models.submissions.findOne(
        queryObject
      );
      
      let criteriaResponses = {}
      submissionDocument.criterias.forEach(criteria => {
        if (criteria.criteriaType === 'manual') {
          criteriaResponses[criteria._id] = _.pick(criteria, ['_id', 'name', 'externalId', 'description', 'score', 'remarks', 'flag'])
        }
      })

      result._id = submissionDocument._id
      result.status = submissionDocument.status
      result.isEditable = (_.includes(req.userDetails.allRoles,"ASSESSOR")) ? true : false
      result.criterias = _.values(criteriaResponses)
      let response = { message: "Criteria ratings fetched successfully.", result: result };

      return resolve(response);
    }).catch(error => {
      reject(error);
    });
  }

  async flagCriteriaRatings(req) {
    return new Promise(async (resolve, reject) => {
      req.body = req.body || {};
      let message = "Criterias flagged successfully"
      let runUpdateQuery = false

      let queryObject = {
        _id: ObjectId(req.params._id)
      }

      let submissionDocument = await database.models.submissions.findOne(
        queryObject
      );

      let updateObject = {}
      let result = {}

      if(req.body.flag) {
        if(submissionDocument.status !== "blocked") {
          runUpdateQuery = true
          Object.entries(req.body.flag).forEach(flag => {
            let criteriaElm = _.find(submissionDocument.criterias, {_id:ObjectId(flag[1].criteriaId)});
            flag[1].userId = req.userDetails.userId
            flag[1].submissionDate = new Date()
            flag[1].submissionGpsLocation = req.headers.gpslocation
            if(criteriaElm.flagRaised) {
              criteriaElm.flagRaised.push(flag[1])
            } else {
              criteriaElm.flagRaised = []
              criteriaElm.flagRaised.push(flag[1])
            }
          });
          updateObject.$set = { criterias : submissionDocument.criterias }
        } else {
          message = "Cannot flag ratings for a blocked submission."
        }
      }
      
      if(runUpdateQuery) {
        result = await database.models.submissions.findOneAndUpdate(
          queryObject,
          updateObject
        );

        let response = {
          message: message
        };

        return resolve(response);

      } else {

        let response = {
          message: message
        };

        return resolve(response);
      }

      
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

};
