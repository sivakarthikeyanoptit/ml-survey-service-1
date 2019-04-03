module.exports = async (req, res, next) => {
    if (req.userDetails.id) {

        let roles = _.pull(req.userDetails.allRoles, 'PUBLIC');
        let queryParams = roles.map(role => {
            return {
                [`components.roles.${gen.utils.mapUserRole(role)}.users`]: { $in: [req.userDetails.id] }
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


