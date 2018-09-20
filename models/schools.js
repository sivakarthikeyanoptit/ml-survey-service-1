module.exports = {
  name: "schools",
  schema: {
    form: Object,
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
    pincode: "String",
    districtName: "String",
    zoneId: "String",
    administration: "String",
    gender: "String",
    shift: "String",
    schoolType: "String",
    totalStudents: "String",
    totalGirls: "String",
    totalBoys: "String",
    lowestGrade: "String",
    highestGrade: "String"
  }
};
