module.exports = {
    name: "entities",
    schema: {
      entityTypeId: "ObjectId",
      entityType: String,
      registryDetails: {
        locationId: { type: String, index: true }
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