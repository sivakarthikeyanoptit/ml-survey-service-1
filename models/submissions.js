module.exports = {
  name: "submissions",
  schema: {
    entityId: "ObjectId",
    programId: "ObjectId",
    assessors: Array,
    status: String,
    evidencesStatus: Array,
    evidences: Object,
    criteria: Array,
    themes: Array,
    answers: Object,
    entityExternalId: String,
    entityInformation: Object,
    programExternalId: String,
    programInformation: Object,
    entityProfile: Object,
    ratingOfManualCriteriaEnabled: Boolean,
    allManualCriteriaRatingSubmitted: Boolean,
    feedback: Array,
    generalQuestions: Object,
    parentInterviewResponsesStatus: Array,
    parentInterviewResponses: Object,
    completedDate: Date,
    solutionId: "ObjectId",
    solutionExternalId: String,
    submissionsUpdatedHistory: Array,
    ratingCompletedAt: Date,
    entityTypeId: "ObjectId",
    entityType: String,
    pointsBasedMaxScore : { type : Number, default: 0 },
    pointsBasedScoreAchieved : { type : Number, default: 0 },
    pointsBasedPercentageScore : { type : Number, default: 0 },
    isAPrivateProgram : {
      default : false,
      type : Boolean
    },
    submissionNumber : Number,
    scoringSystem : String,
    isRubricDriven: { type : Boolean, default: false },
    numberOfAnsweredCriterias: { type : Number, default: 0 },
    title : { 
      type : String,
      default: function() {
        if (this.submissionNumber && this.submissionNumber > 0) {
          return "Assessment "+this.submissionNumber;
        } else {
          return "Assessment";
        }
      }
    },
    project : Object,
    referenceFrom : String,
    appInformation : Object,
    criteriaLevelReport : Boolean
  }
};
