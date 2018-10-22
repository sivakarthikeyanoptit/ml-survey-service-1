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
    schoolProfile: Object,
    allOnfieldEvidenceMethodsAreAccepted: Boolean,
    allManualCriteriaRatingSubmitted: Boolean,
    ratings: Object
  }
};
