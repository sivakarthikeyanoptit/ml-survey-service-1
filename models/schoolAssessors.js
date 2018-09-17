// let ObjectId = require("mongoose").Types.ObjectId;
module.exports = {
  name: "school-assessors",
  schema: {
    externalId: "String",
    userId: "String",
    role: "String",
    programId: "ObjectId",
    assessmentStatus: "String",
    parentId: "ObjectId",
    schools: [{ type: "ObjectId", ref: "schools" }],
    createdBy: "String",
    updatedBy: "String"
  }
};
