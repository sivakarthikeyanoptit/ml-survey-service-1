module.exports = {
    name: "appAccessToken",
    schema: {
      userId: String,
      passcode: String,
      entityId: "ObjectId",
      programId: "ObjectId",
      userExternalId: String,
      entityField: String,
      entityFieldValue: String,
      programExternalId: String,
      passcode: String,
      action: Array,
      evidenceCollectionMethod: String,
      isValid: { type : Boolean, default: true },
      verifiedAt: Date,
      reference: String,
      createdBy: String,
      requestedBy: String,
      successMessage: String,
      solutionId: "ObjectId",
      solutionExternalId: String
    }
  };