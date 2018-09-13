// let ObjectId = require("mongoose").Types.ObjectId;
module.exports = {
  name: "school-assessors",
  schema: {
    id: "String",
    externalId: "String",
    userId: "String",
    role: "String",
    programId: "ObjectId",
    assessmentStatus: "String",
    parentId: "ObjectId",
    schools: ["ObjectId"],
    createdBy: "String",
    updatedBy: "String"
  },
  key: ["id"]
};
