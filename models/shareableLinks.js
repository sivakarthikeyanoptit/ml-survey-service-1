module.exports = {
    name: "shareableLink",
    schema: {
        url: "string",
        linkId: "string",
        createdBy: "string",
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