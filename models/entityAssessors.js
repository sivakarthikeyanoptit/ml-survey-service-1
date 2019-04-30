module.exports = {
  name: "entityAssessors",
  schema: {
    userId: "String",
    name: "String",
    email: "String",
    role: "String",
    programId: "ObjectId",
    parentId: "String",
    entities: Array,
    createdBy: "String",
    updatedBy: "String"
  }
};