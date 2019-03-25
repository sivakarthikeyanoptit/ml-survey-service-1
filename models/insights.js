module.exports = {
  name: "insights",
  schema: {
    submissionId: "ObjectId",
    schoolId: "ObjectId",
    schoolExternalId: String,
    programId: "ObjectId",
    programExternalId: String,
    evaluationFrameworkId: "ObjectId",
    evaluationFrameworkExternalId: String,
    submissionStartedAt: Date,
    submissionCompletedAt: Date,
    score: String,
    themes: Array,
    scoringSystem : String,
    levelToScoreMapping : Object
  }
};
