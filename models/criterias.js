// let ObjectId = require("mongoose").Types.ObjectId;
module.exports = {
  name: "criterias",
  schema: {
    externalId: "String",
    owner: "String",
    timesUsed: Number,
    weightage: Number,
    name: "String",
    score: "String",
    remarks: "String",
    showRemarks: "boolean",
    description: "String",
    resourceType: ["String"],
    language: ["String"],
    keywords: ["String"],
    concepts: ["json"],
    createdFor: ["String"],
    createdFor: ["String"],
    rubric: Object,
    evidences: ["json"],
    flag: Object,
    criteriaType: "String"
  }
};
