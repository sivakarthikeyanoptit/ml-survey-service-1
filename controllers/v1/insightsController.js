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

      let message = "Insights generated successfully."
      
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
        completedDate: 1,
        ratingCompletedAt : 1,
        evaluationFrameworkId: 1,
        evaluationFrameworkExternalId: 1
      }

      let submissionDocument = await database.models.submissions.findOne(
        submissionsQueryObject,
        submissionsProjectionObject
      );

      // console.log(submissionDocument)
      
      if(!submissionDocument._id) throw "No submission found"

      let evaluationFrameworkDocument = await database.models.evaluationFrameworks.findOne(
        {_id : submissionDocument.evaluationFrameworkId},
        {themes : 1, scoringSystem : 1, levelToScoreMapping : 1}
      );

      // console.log(evaluationFrameworkDocument)

      if(!evaluationFrameworkDocument._id) throw "No evaluation framework document found."
      
      let criteriaScore = _.keyBy(submissionDocument.criterias, '_id')

      // console.log(criteriaScore)
      submissionDocument.submissionId = submissionDocument._id
      _.assignIn(submissionDocument, evaluationFrameworkDocument)
      

      let scoreThemes =  function (themes,levelToScoreMapping,scoringSystem,criteriaScore) {
        themes.forEach(theme => {
          if (theme.children) {
            scoreThemes(theme.children,levelToScoreMapping,scoringSystem,criteriaScore)
            let themeScore = 0
            theme.children.forEach(subTheme => {
              if(subTheme.score) {
                themeScore += (subTheme.weightage * subTheme.score / 100 )
              }
            })
            theme.score = themeScore
          } else {
            let criteriaScores = new Array
            let themeScore = 0
            theme.criteria.forEach(criteria => {
              if(criteriaScore[criteria.criteriaId.toString()]) {
                criteriaScores.push({
                  name : criteriaScore[criteria.criteriaId.toString()].name,
                  level : criteriaScore[criteria.criteriaId.toString()].score,
                  score : levelToScoreMapping[criteriaScore[criteria.criteriaId.toString()].score] ? levelToScoreMapping[criteriaScore[criteria.criteriaId.toString()].score] : "NA",
                  weight : criteria.weightage
                })
                themeScore += (criteria.weightage * levelToScoreMapping[criteriaScore[criteria.criteriaId.toString()].score] / 100 )
              }
            })
            theme.criteria = criteriaScores
            theme.score = themeScore
          }
        })
      }

      scoreThemes(evaluationFrameworkDocument.themes,evaluationFrameworkDocument.levelToScoreMapping,evaluationFrameworkDocument.scoringSystem,criteriaScore)

      console.log(evaluationFrameworkDocument.themes)
      // let insightsDocument = await database.models.insights.findOneAndUpdate(
      //   {submissionId : submissionDocument._id},
      //   submissionDocument,
      //   {
      //     upsert: true,
      //     new: true,
      //     setDefaultsOnInsert: true,
      //     returnNewDocument: true
      //   }
      // );

      // console.log(insightsDocument)

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
