module.exports = {
  name: "submissions",
  schema: {
    schoolId: "ObjectId",
    programId: "ObjectId",
    assessors:Array,
    status: "String",
    evidencesStatus:Array,
    evidences:Object,
    criterias:Array,
    answers: Object,
    schoolInformation: Object,
    programInformation: Object,
    schoolProfile: Object,
    ratingOfManualCriteriaEnabled: Boolean,
    allManualCriteriaRatingSubmitted: Boolean,
    ratings: Object,
    feedback:Array,
    generalQuestions:Object,
    parentInterviewResponses:Object,
    completedDate: Date,
    isDataFixDone: false
  }
};
