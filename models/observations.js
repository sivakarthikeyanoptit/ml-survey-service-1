module.exports = {
  name: "observations",
  schema: {
    name: String,
    description: String,
    createdBy: String,
    frameworkId: "ObjectId",
    frameworkExternalId: String,
    solutionId: "ObjectId",
    solutionExternalId: String,
    startDate: Date,
    endDate: Date,
    status: String,
    entityTypeId: "ObjectId",
    entityType : String,
    entities: Array
  }
};