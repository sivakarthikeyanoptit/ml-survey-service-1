// let ObjectId = require("mongoose").Types.ObjectId;
module.exports = {
  name: "criterias",
  schema: {
    externalId: "String",
    owner: "String",
    timesUsed: Number,
    weightage: Number,
    name: "String",
    description: "String",
    resourceType: ["String"],
    language: ["String"],
    keywords: ["String"],
    concepts: ["json"],
    createdFor: ["String"],
    createdFor: ["String"],
    rubric: ["json"],
    evidences: ["json"]
  }
};
