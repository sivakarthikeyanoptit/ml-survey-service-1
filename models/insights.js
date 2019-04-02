module.exports = {
  name: "insights",
  schema: {
    submissionId: "ObjectId",
    schoolId: "ObjectId",
    schoolExternalId: String,
    schoolName: String,
    programId: "ObjectId",
    programExternalId: String,
    evaluationFrameworkId: "ObjectId",
    evaluationFrameworkExternalId: String,
    submissionStartedAt: Date,
    submissionCompletedAt: Date,
    ratingCompletedAt : Date,
    score: String,
    themeScores: Array,
    criteriaScores: Array,
    scoringSystem : String,
    levelToScoreMapping : Object,
    criteriaLevelCount : Object
  }
};
