module.exports = async (req, res, next) => {
    if (req.userDetails.id) {
        
        let roles = ['programManagers', 'projectManagers', 'leadAssessors', 'assessors'];
        let queryParams = roles.map(role => {
            return {
                [`components.roles.${role}.users`]: { $in: [req.userDetails.id] }
            }
        })

        let programs = await database.models.programs.find({ $or: queryParams }, {
            externalId: 1,
            name: 1,
            description: 1
        }).lean();

        if (programs.length) req['userDetails'].accessiblePrograms = programs

    }
    next();
    return;
}


