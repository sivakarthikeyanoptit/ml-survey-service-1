module.exports = {
  name: "observationSubmissions",
  schema: {
    entityId: "ObjectId",
    observationId: "ObjectId",
    createdBy: String,
    status: String,
    evidencesStatus: Array,
    evidences: Object,
    criteria: Array,
    themes: Array,
    answers: Object,
    entityExternalId: String,
    entityInformation: Object,
    observationInformation: Object,
    entityProfile: Object,
    feedback: Array,
    generalQuestions: Object,
    ratingCompletedAt: Date,
    completedDate: Date,
    solutionId: "ObjectId",
    solutionExternalId: String,
    submissionsUpdatedHistory: Array,
    entityTypeId: "ObjectId",
    entityType: String,
    programId: {
      type: "ObjectId",
      required: true
    },
    programExternalId: {
      type: String,
      required: true
    },
    submissionNumber: Number,
    pointsBasedMaxScore : { type : Number, default: 0 },
    pointsBasedScoreAchieved : { type : Number, default: 0 },
    pointsBasedPercentageScore : { type : Number, default: 0 },
    title : { 
      type : String,
      default: function() {
        if (this.submissionNumber && this.submissionNumber > 0) {
          return "Observation "+this.submissionNumber;
        } else {
          return "Observation";
        }
      }
    },
    isAPrivateProgram : {
      default : false,
      type : Boolean
    },
    scoringSystem: String,
    isRubricDriven: { type : Boolean, default: false },
    projectId : "ObjectId",
    taskId : String
  }
};
