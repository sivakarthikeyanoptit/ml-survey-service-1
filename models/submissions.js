module.exports = {
  name: "submissions",
  schema: {
    schoolId: "ObjectId",
    programId: "ObjectId",
    assessors:Array,
    status: "String",
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
    generalQuestions:Array,
    parentInterviewResponses:Array
  }
};
