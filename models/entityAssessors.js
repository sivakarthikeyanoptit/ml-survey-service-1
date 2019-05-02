module.exports = {
  name: "entityAssessors",
  schema: {
    userId: String,
    name: String,
    email: String,
    role: String,
    programId: "ObjectId",
    parentId: String,
    entities: [{ type: "ObjectId", ref: "entities" }],
    createdBy: String,
    updatedBy: String,
    externalId: String,
    solutionId: "ObjectId",
    entityTypeId: "ObjectId",
    entityType: String
  }
};