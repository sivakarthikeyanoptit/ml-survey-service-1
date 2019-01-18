module.exports = {
    name: "appAccessToken",
    schema: {
      userId: "String",
      passcode: "String",
      schoolId: "String",
      programId: "String",
      userExternalId: "String",
      schoolExternalId: "String",
      programExternalId: "String",
      passcode: "String",
      action: Array,
      evidenceCollectionMethod: "String",
      isValid: { type : Boolean, default: true },
      verifiedAt: Date,
      reference: "String",
      requestedBy: "String",
      successMessage: "String",
    }
  };
  