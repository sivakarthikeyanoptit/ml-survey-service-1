module.exports = {
  name: "observationSubmissions",
  schema: {
    entityId: "ObjectId",
    observationId: "ObjectId",
    createdBy: "String",
    status: "String",
    evidencesStatus: Array,
    evidences: Object,
    criteria: Array,
    answers: Object,
    entityExternalId: "String",
    entityInformation: Object,
    observationInformation: Object,
    entityProfile: Object,
    feedback: Array,
    generalQuestions: Object,
    completedDate: Date,
    solutionId: "ObjectId",
    solutionExternalId: String,
    submissionsUpdatedHistory: Array,
    entityTypeId: "ObjectId",
    entityType: "String",
    submissionNumber: Number
  }
};
