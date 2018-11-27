module.exports = {
  name: "school-assessors",
  schema: {
    externalId: "String",
    userId: "String",
    role: "String",
    programId: "ObjectId",
    parentId: "String",
    schools: [{ type: "ObjectId", ref: "schools" }],
    createdBy: "String",
    updatedBy: "String"
  }
};
