module.exports = {
    name: "entities",
    schema: {
      entityTypeId: "ObjectId",
      entityType: String,
      registryDetails: {
        locationId: { type: String, index: true },
        code: String,
        lastUpdatedAt: Date
      },
      groups: Object,
      metaInformation : Object,
      updatedBy: String,
      createdBy: String,
      childHierarchyPath : Array,
      userId : String,
      allowedRoles : Array
    }
  };