module.exports = {
  name: "schools",
  schema: {
    externalId: "String",
    addressLine1: "String",
    addressLine2: "String",
    city: "String",
    country: "String",
    createdBy: "String",
    createdDate: "String",
    gpsLocation: {
      lat: "String",
      long: "String"
    },
    isDeleted: false,
    name: "String",
    phone: "String",
    principalName: "String",
    state: "String",
    status: "String",
    updatedBy: "String",
    updatedDate: "String",
    pincode: "String"
  }
};
