module.exports = {
  name: "schoolAssessors",
  schema: {
    externalId: "String",
    userId: "String",
    name: "String",
    email: "String",
    role: "String",
    programId: "ObjectId",
    parentId: "String",
    schools: [{ type: "ObjectId", ref: "schools" }],
    createdBy: "String",
    updatedBy: "String"
  }
};
