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

      let scoreThemes =  function (themes,levelToScoreMapping,criteriaScore) {
        themes.forEach(theme => {
          if (theme.children) {
            scoreThemes(theme.children,levelToScoreMapping,criteriaScore)
            let themeScore = 0
            let criteriaLevelCount = {}
            for(var k in levelToScoreMapping) criteriaLevelCount[k]=0;

            theme.children.forEach(subTheme => {
              if(subTheme.score) {
                themeScore += (subTheme.weightage * subTheme.score / 100 )
              }
              if(subTheme.criteriaLevelCount) {
                Object.keys(subTheme.criteriaLevelCount).forEach(level => {
                  criteriaLevelCount[level] += subTheme.criteriaLevelCount[level]
                })
              }
            })
            theme.score = themeScore.toFixed(2)
            theme.criteriaLevelCount = criteriaLevelCount
          } else {
            let criteriaScores = new Array
            let themeScore = 0
            let criteriaLevelCount = {}
            for(var k in levelToScoreMapping) criteriaLevelCount[k]=0;

            theme.criteria.forEach(criteria => {
              if(criteriaScore[criteria.criteriaId.toString()]) {
                criteriaScores.push({
                  name : criteriaScore[criteria.criteriaId.toString()].name,
                  level : criteriaScore[criteria.criteriaId.toString()].score,
                  score : levelToScoreMapping[criteriaScore[criteria.criteriaId.toString()].score] ? levelToScoreMapping[criteriaScore[criteria.criteriaId.toString()].score] : "NA",
                  weight : criteria.weightage
                })
                themeScore += (criteria.weightage * levelToScoreMapping[criteriaScore[criteria.criteriaId.toString()].score] / 100 )
                criteriaLevelCount[criteriaScore[criteria.criteriaId.toString()].score] += 1
              }
            })
            theme.criteria = criteriaScores
            theme.score = themeScore.toFixed(2)
            theme.criteriaLevelCount = criteriaLevelCount
          }
        })
      }

      scoreThemes(evaluationFrameworkDocument.themes,evaluationFrameworkDocument.levelToScoreMapping,criteriaScore)

      submissionDocument.submissionId = submissionDocument._id
      _.merge(submissionDocument, evaluationFrameworkDocument)

      let score = 0
      let criteriaLevelCount = {}
      for(var k in evaluationFrameworkDocument.levelToScoreMapping) criteriaLevelCount[k]=0;

      evaluationFrameworkDocument.themes.forEach(theme => {
        if(theme.score) {
          score += (theme.weightage * theme.score / 100 )
        }
        if(theme.criteriaLevelCount) {
          Object.keys(theme.criteriaLevelCount).forEach(level => {
            criteriaLevelCount[level] += theme.criteriaLevelCount[level]
          })
        }
      })

      submissionDocument.score = score.toFixed(2)
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

};
