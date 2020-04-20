module.exports = {
    name: "entities",
    schema: {
      entityTypeId: "ObjectId",
      entityType: String,
      regsitryDetails : Object,
      groups: Object,
      metaInformation : Object,
      updatedBy: String,
      createdBy: String,
      childHierarchyPath : Array
    }
  };