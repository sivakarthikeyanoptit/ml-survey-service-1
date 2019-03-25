module.exports = {
  name: "submissions",
  schema: {
    schoolId: "ObjectId",
    programId: "ObjectId",
    assessors: Array,
    status: "String",
    evidencesStatus: Array,
    evidences: Object,
    criterias: Array,
    answers: Object,
    schoolExternalId: "String",
    schoolInformation: Object,
    programExternalId: "String",
    programInformation: Object,
    schoolProfile: Object,
    ratingOfManualCriteriaEnabled: Boolean,
    allManualCriteriaRatingSubmitted: Boolean,
    feedback: Array,
    generalQuestions: Object,
    parentInterviewResponsesStatus: Array,
    parentInterviewResponses: Object,
    completedDate: Date,
    evaluationFrameworkId: "ObjectId",
    evaluationFrameworkExternalId: String,
    csvUpdatedHistory: Array,
    ratingCompletedAt: Date
  }
};
