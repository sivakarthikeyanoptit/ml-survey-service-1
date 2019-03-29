// let ObjectId = require("mongoose").Types.ObjectId;
module.exports = {
  name: "evaluationFrameworks",
  schema: {
    externalId: String,
    name: String,
    description: String,
    author: String,
    parentId: "ObjectId",
    resourceType: Array,
    language: Array,
    keywords: Array,
    concepts: Array,
    createdFor: Array,
    scoringSystem : String,
    levelToScoreMapping : Object,
    themes: Array
  }
};
