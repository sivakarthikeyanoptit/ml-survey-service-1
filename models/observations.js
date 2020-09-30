module.exports = {
  name: "observations",
  schema: {
    name: String,
    description: String,
    createdBy: String,
    frameworkId: "ObjectId",
    frameworkExternalId: String,
    solutionId: "ObjectId",
    programId: {
      type: "ObjectId",
      required: true
    },
    programExternalId: {
      type: String,
      required: true
    },
    solutionExternalId: String,
    startDate: Date,
    endDate: Date,
    status: String,
    entityTypeId: "ObjectId",
    entityType : String,
    entities: Array,
    createdFor: [String],
    rootOrganisations: [String],
    isAPrivateProgram : {
      default : false,
      type : Boolean
    },
    link: {
      type: String,
      index: true
    }
  }
};