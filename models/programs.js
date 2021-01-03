module.exports = {
  name: "programs",
  schema: {
    externalId: String,
    name: String,
    description: String,
    owner: String,
    createdBy: String,
    updatedBy: String,
    status: String,
    resourceType: {
      type : [String],
      default : ["Program"]
    },
    language: {
      type : [String],
      default : ["English"]
    },
    keywords: {
      type : [String],
      default : ["keywords 1","keywords 2"]
    },
    concepts: {
      type : ["json"],
      concepts : []
    },
    createdFor: [String],
    imageCompression: {
      type : Object,
      default : {"quality" : 10}
    },
    components: ["json"],
    components: ["json"],
    isAPrivateProgram : {
      default : false,
      type : Boolean
    },
    rootOrganisations : {
      type : [String],
      default : []
    }
  }
};
