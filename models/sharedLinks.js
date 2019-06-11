module.exports = {
    name: "sharedLink",
    schema: {
        privateURL: "string",
        publicURL: "string",
        linkId: "string",
        isActive: Boolean,
        accessedCount: Number,
        linkViews: Array,
        reportName: "string",
        queryParams: "string",
        userDetails: {
            id: "string",
            accessiblePrograms: Array,
            allRoles: Array,
            firstName: "string",
            lastName: "string",
            email: "string"
        },
    }
};