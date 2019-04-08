module.exports = {
    name: "assessorSchoolTrackers",
    schema: {
        assessorId: "String",
        action: "String",
        actionObject: ["String"],
        type: "String",
        createdBy: "String",
        dateOfOperation: Date,
        programId: "ObjectId",
        updatedData: ["String"],
    }
};
