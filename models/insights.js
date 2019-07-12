module.exports = {
  name: "insights",
  schema: {
    submissionId: "ObjectId",
    entityId: "ObjectId",
    entityExternalId: String,
    entityName: String,
    programId: "ObjectId",
    programExternalId: String,
    solutionId: "ObjectId",
    solutionExternalId: String,
    submissionStartedAt: Date,
    submissionCompletedAt: Date,
    ratingCompletedAt : Date,
    score: String,
    themeScores: Array,
    criteriaScores: Array,
    scoringSystem : String,
    levelToScoreMapping : Object,
    criteriaLevelCount : Object,
    entityTypeId: "ObjectId",
    entityType: String
  }
};
