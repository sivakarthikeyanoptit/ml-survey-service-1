module.exports = {
    name: "entityAssessorsTrackers",
    schema: {
        assessorUserId: String,
        assessorId: "ObjectId",
        action: String,
        actionObject: Array,
        type: String,
        createdBy: String,
        dateOfOperation: Date,
        validFrom: Date,
        validTo: Date,
        programId: "ObjectId",
        updatedData: Array,
        solutionId: "ObjectId",
        entityTypeId: "ObjectId",
        entityType: String
    }
};