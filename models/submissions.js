module.exports = {
  name: "submissions",
  schema: {
    schoolId: "String",
    programId: "ObjectId",
    status: "String",
    evidenceSubmissions: "Array",
    schoolProfile: Object,
    ratings: "String"
  }
};
