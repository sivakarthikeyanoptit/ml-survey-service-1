module.exports = {
    name: "sharedLink",
    schema: {
        actualURL: "string",
        linkId: "string",
        isActive: Boolean,
        sharedURL: "string",
        linkViews: Array,
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