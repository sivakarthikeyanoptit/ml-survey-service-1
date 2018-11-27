// let ObjectId = require("mongoose").Types.ObjectId;
module.exports = {
  name: "evaluation-frameworks",
  schema: {
    externalId: "String",
    name: "String",
    description: "String",
    author: "String",
    parentId: "ObjectId",
    resourceType: ["String"],
    language: ["String"],
    keywords: ["String"],
    concepts: ["json"],
    createdFor: ["String"],
    themes: ["json"]
  }
};
