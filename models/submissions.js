module.exports = {
  name: "submissions",
  schema: {
    schoolId: "ObjectId",
    programId: "ObjectId",
    status: "String",
    evidenceSubmissions: "Array",
    schoolProfile: Object,
    ratings: Object
  }
};
