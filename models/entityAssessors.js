module.exports = {
    name: "entityAssessors",
    schema: {
      userId: "String",
      name: "String",
      email: "String",
      role: "String",
      programId: "ObjectId",
      parentId: "String",
      entities: [{ type: "ObjectId", ref: "schools" }],
      createdBy: "String",
      updatedBy: "String"
    }
  };