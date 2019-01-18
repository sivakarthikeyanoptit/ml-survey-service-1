module.exports = {
    name: "appAccessToken",
    schema: {
      userId: "String",
      schoolId: "String",
      programId: "String",
      action: Array,
      evidenceCollectionMethod: "String",
      isValid: { type : Boolean, default: true },
      verifiedAt: Date,
      reference: "String",
      requestedBy: "String",
      successMessage: "String",
    }
  };
  