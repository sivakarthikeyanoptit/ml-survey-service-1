module.exports = {
    name: "app-access-token",
    schema: {
      userId: "String",
      schoolId: "String",
      programId: "String",
      action: Array,
      schoolId: "String",
      ecmId: "String",
      isValid: { type : Boolean, default: true },
      verifiedAt: Date,
      referance: "String",
      requestedBy: "String",
    }
  };
  