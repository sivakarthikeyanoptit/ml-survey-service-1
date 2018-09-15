module.exports = {
  name: "programs",
  schema: {
    id: "String",
    externalId: "String",
    externalId: "String",
    name: "String",
    description: "String",
    owner: "String",
    createdBy: "String",
    updatedBy: "String",
    status: "String",
    resourceType: ["String"],
    language: ["String"],
    keywords: ["String"],
    concepts: ["json"],
    createdFor: ["String"],
    components: ["json"],
    components: ["json"]
  },
  key: ["id"]
};
