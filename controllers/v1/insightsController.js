module.exports = class Insights extends Abstract {
  /**
     * @apiDefine errorBody
     * @apiError {String} status 4XX,5XX
     * @apiError {String} message Error
     */

  /**
     * @apiDefine successBody
     *  @apiSuccess {String} status 200
     * @apiSuccess {String} result Data
     */


  constructor() {
    super(insightsSchema);
  }

  static get name() {
    return "insights";
  }

  /**
* @api {post} /assessment/api/v1/insights/generateFromSubmissionId/:submissionId Generates insights from submission
* @apiVersion 0.0.1
* @apiName Generate Insights From Submissions
* @apiSampleRequest /assessment/api/v1/insights/generateFromSubmissionId/5c5147ae95743c5718445eff
* @apiGroup insights
* @apiUse successBody
* @apiUse errorBody
*/

  async generateFromSubmissionId(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};

        let submissionId = (req && req.params && req.params._id) ? req.params._id : false

        if(!submissionId) throw "Submission ID is mandatory."

        let response = await this.generate(submissionId)

        return resolve(response);

      } catch (error) {
        return reject({
          status: 500,
          message: "Oops! Something went wrong!",
          errorObject: error
        });
      }

    })
  }

  async generate(submissionId = false) {

    try {

      if(!submissionId) throw "Submission ID is mandatory."

      let submissionsQueryObject = {
        _id: submissionId,
        ratingCompletedAt : {$exists : true}
      }

      let submissionsProjectionObject = {
        schoolId: 1,
        programId: 1,
        "criterias.name": 1,
        "criterias.score": 1,
        "criterias._id": 1,
        schoolExternalId: 1,
        programExternalId: 1,
        createdAt: 1,
        completedDate: 1,
        ratingCompletedAt : 1,
        evaluationFrameworkId: 1,
        evaluationFrameworkExternalId: 1
      }

      let submissionDocument = await database.models.submissions.findOne(
        submissionsQueryObject,
        submissionsProjectionObject
      ).lean();
      
      if(!submissionDocument._id) throw "No submission found"

      let evaluationFrameworkDocument = await database.models.evaluationFrameworks.findOne(
        {_id : submissionDocument.evaluationFrameworkId},
        {themes : 1, scoringSystem : 1, levelToScoreMapping : 1}
      );

      if(!evaluationFrameworkDocument._id) throw "No evaluation framework document found."
      
      let criteriaScore = _.keyBy(submissionDocument.criterias, '_id')

      let scoreThemes =  function (themes,levelToScoreMapping,criteriaScore,hierarchyLevel = 0,hierarchyTrack = [],themeScores = [],criteriaScores = []) {
        
        themes.forEach(theme => {
          if (theme.children) {
            theme.hierarchyLevel = hierarchyLevel
            theme.hierarchyTrack = hierarchyTrack

            let hierarchyTrackToUpdate = [...hierarchyTrack]
            hierarchyTrackToUpdate.push(_.pick(theme,["type","label","externalId","name"]))

            scoreThemes(theme.children,levelToScoreMapping,criteriaScore,hierarchyLevel+1,hierarchyTrackToUpdate,themeScores,criteriaScores)
            let themeScore = 0
            let criteriaLevelCount = {}
            for(var k in levelToScoreMapping) criteriaLevelCount[k]=0;
            let criteriaScoreNotAvailable = false

            theme.children.forEach(subTheme => {
              if(subTheme.score == "NA") {
                criteriaScoreNotAvailable = true
              } else {
                if(subTheme.score) {
                  themeScore += (subTheme.weightage * subTheme.score / 100 )
                }
                if(subTheme.criteriaLevelCount) {
                  Object.keys(subTheme.criteriaLevelCount).forEach(level => {
                    criteriaLevelCount[level] += subTheme.criteriaLevelCount[level]
                  })
                }
              }
            })
            theme.score = (!criteriaScoreNotAvailable) ? themeScore.toFixed(2) : "NA"
            theme.criteriaLevelCount = criteriaLevelCount

            themeScores.push(_.omit(theme,["children"]))
          } else {

            theme.hierarchyLevel = hierarchyLevel
            theme.hierarchyTrack = hierarchyTrack

            let hierarchyTrackToUpdate = [...hierarchyTrack]
            hierarchyTrackToUpdate.push(_.pick(theme,["type","label","externalId","name"]))

            let criteriaScoreArray = new Array
            let themeScore = 0
            let criteriaLevelCount = {}
            for(var k in levelToScoreMapping) criteriaLevelCount[k]=0;
            let criteriaScoreNotAvailable = false
            theme.criteria.forEach(criteria => {
              if(criteriaScore[criteria.criteriaId.toString()]) {
                criteriaScoreArray.push({
                  name : criteriaScore[criteria.criteriaId.toString()].name,
                  level : criteriaScore[criteria.criteriaId.toString()].score,
                  score : levelToScoreMapping[criteriaScore[criteria.criteriaId.toString()].score] ? levelToScoreMapping[criteriaScore[criteria.criteriaId.toString()].score].points : "NA",
                  weight : criteria.weightage,
                  hierarchyLevel : hierarchyLevel+1,
                  hierarchyTrack : hierarchyTrackToUpdate
                })
                if(criteriaScoreArray[criteriaScoreArray.length - 1].score == "NA") {
                  criteriaScoreNotAvailable = true
                } else {
                  themeScore += (criteria.weightage * levelToScoreMapping[criteriaScore[criteria.criteriaId.toString()].score].points / 100 )
                  criteriaLevelCount[criteriaScore[criteria.criteriaId.toString()].score] += 1
                }
              }
            })
            theme.criteria = criteriaScoreArray
            theme.score = (!criteriaScoreNotAvailable) ? themeScore.toFixed(2) : "NA"
            theme.criteriaLevelCount = criteriaLevelCount

            criteriaScores.push(...criteriaScoreArray)
            themeScores.push(_.omit(theme,["criteria"]))
          }
        })

        return {
          themeScores : themeScores,
          criteriaScores: criteriaScores
        }
      }

      let themeAndCriteriaScores = scoreThemes(evaluationFrameworkDocument.themes,evaluationFrameworkDocument.levelToScoreMapping,criteriaScore,0,[])
      _.merge(submissionDocument,themeAndCriteriaScores)

      submissionDocument.submissionId = submissionDocument._id
      _.merge(submissionDocument, _.omit(evaluationFrameworkDocument,["themes"]))

      let score = 0
      let criteriaLevelCount = {}
      for(var k in evaluationFrameworkDocument.levelToScoreMapping) criteriaLevelCount[k]=0;
      let criteriaScoreNotAvailable = false

      evaluationFrameworkDocument.themes.forEach(theme => {
        if(theme.score == "NA") {
          criteriaScoreNotAvailable = true
        } else {
          if(theme.score) {
            score += (theme.weightage * theme.score / 100 )
          }
          if(theme.criteriaLevelCount) {
            Object.keys(theme.criteriaLevelCount).forEach(level => {
              criteriaLevelCount[level] += theme.criteriaLevelCount[level]
            })
          }
        }
      })
      
      submissionDocument.score = (!criteriaScoreNotAvailable) ? score.toFixed(2) : "NA"
      submissionDocument.criteriaLevelCount = criteriaLevelCount

      submissionDocument.submissionStartedAt = submissionDocument.createdAt
      submissionDocument.submissionCompletedAt = submissionDocument.completedDate

      delete submissionDocument.createdAt
      delete submissionDocument._id
      delete submissionDocument.updatedAt

      let insightsDocument = await database.models.insights.findOneAndUpdate(
        {submissionId : submissionDocument.submissionId},
        _.pick(submissionDocument,Object.keys(database.models.insights.schema.paths)),
        {
          upsert: true,
          setDefaultsOnInsert: true,
          returnNewDocument: true
        }
      );

      return {
        message : "Insights generated successfully."
      };


    } catch (error) {
      return {
        status: 500,
        message: "Oops! Something went wrong!",
        errorObject: error
      }

    }

  }

  /**
  * @api {post} /assessment/api/v1/insights/singleEntityReport/:schoolId Return insights for a school
  * @apiVersion 0.0.1
  * @apiName Generate Insights From Submissions
  * @apiSampleRequest /assessment/api/v1/insights/singleEntityReport/5c5147ae95743c5718445eff
  * @apiGroup insights
  * @apiUse successBody
  * @apiUse errorBody
  */

  async singleEntityReport(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};

        let programId = (req && req.params && req.params._id) ? req.params._id : false
        let schoolId = (req && req.query && req.query.school) ? req.query.school : ""

        if(!programId) throw "Program ID is mandatory."
        if(schoolId == "") throw "School ID is mandatory."

        let insights = await database.models.insights.findOne(
          {
            programExternalId : programId,
            schoolId : ObjectId(schoolId)
          }
        );

        if(!insights) throw "No insights found for this school"

        let insightResult = {}

        let noRecordsFound = false
        let hierarchyLevel = 0

        while (noRecordsFound != true) {
          let recordsToProcess = insights.themeScores.filter(theme => theme.hierarchyLevel == hierarchyLevel);
          if(recordsToProcess.length > 0) {
            if(!insightResult[hierarchyLevel]) {
              insightResult[hierarchyLevel] = {
                data : new Array
              }
            }
            recordsToProcess.forEach(record => {
              if(!record.hierarchyTrack[hierarchyLevel-1] || !record.hierarchyTrack[hierarchyLevel-1].name) {
                insightResult[hierarchyLevel].data.push(_.omit(record,"hierarchyTrack"))
              } else {
                if(!insightResult[hierarchyLevel][record.hierarchyTrack[hierarchyLevel-1]]) {
                  insightResult[hierarchyLevel][record.hierarchyTrack[hierarchyLevel-1].name] = {
                    data : new Array
                  }
                }
                insightResult[hierarchyLevel][record.hierarchyTrack[hierarchyLevel-1].name].data.push(_.omit(record,"hierarchyTrack"))
              }
            })
            hierarchyLevel += 1
          } else {
            noRecordsFound = true
          }
        }

        let response = {
          message: "Insights report fetched successfully.",
          result: insightResult
        };

        return resolve(response);
      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }


  /**
  * @api {post} /assessment/api/v1/insights/mutltiEntityReport/:programId Return insights for a school
  * @apiVersion 0.0.1
  * @apiName Generate Insights From Submissions
  * @apiSampleRequest /assessment/api/v1/insights/mutltiEntityReport/5c5147ae95743c5718445eff
  * @apiGroup insights
  * @apiUse successBody
  * @apiUse errorBody
  */

  async mutltiEntityReport(req) {
    return new Promise(async (resolve, reject) => {

      try {

        req.body = req.body || {};

        let programId = (req && req.params && req.params._id) ? req.params._id : false
        let schoolIdArray = (req && req.query && req.query.school) ? req.query.school.split(",") : []

        if(!programId) throw "Program ID is mandatory."
        if(!(schoolIdArray.length > 0)) throw "School ID is mandatory."

        let insights = await database.models.insights.find(
          {
            programExternalId : programId,
            schoolId : { $in: schoolIdArray }
          },
          {
            schoolId : 1,
            themeScores : 1,
            criteriaScores : 1,
            programId: 1,
            levelToScoreMapping : 1
          }
        );

        if(!insights) throw "No insights found for this school"
        
        let insightResult = {}
        insights[0].themeScores.forEach(theme => {
          if(theme.hierarchyLevel == 1) {
              (!insightResult[theme.hierarchyTrack[0].name]) ? insightResult[theme.hierarchyTrack[0].name] = {} : ""
              if(!insightResult[theme.hierarchyTrack[0].name][theme.name]) {
                insightResult[theme.hierarchyTrack[0].name][theme.name] = {}
              }
              for(var k in insights[0].levelToScoreMapping) insightResult[theme.hierarchyTrack[0].name][theme.name][k] = 0;
          }
        })

        insights.forEach(insight => {
          insight.themeScores.forEach(theme => {
            if(theme.hierarchyLevel == 1) {
              for(var k in theme.criteriaLevelCount) insightResult[theme.hierarchyTrack[0].name][theme.name][k]+=theme.criteriaLevelCount[k];
            }
          })
        })

        let response = {
          message: "Insights report fetched successfully.",
          result: insightResult
        };

        return resolve(response);

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }

};
