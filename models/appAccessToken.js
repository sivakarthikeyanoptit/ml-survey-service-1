module.exports = {
    name: "appAccessToken",
    schema: {
      userId: String,
      passcode: String,
      entityId: "ObjectId",
      programId: String,
      userExternalId: String,
      entityExternalId: String,
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
    }
  };
  