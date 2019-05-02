module.exports = async (req, res, next) => {
    if (req.userDetails && req.userDetails.id) {

        let roles = _.pull(req.userDetails.allRoles, 'PUBLIC');
        let queryParams = roles.map(role => {
            return {
                [`roles.${gen.utils.mapUserRole(role)}.users`]: { $in: [req.userDetails.id] }
            }
        })

        let solutions = await database.models.solutions.find({ $or: queryParams }, {
            programId: 1,
            programExternalId: 1
        }).lean();

        if (solutions.length) req['userDetails'].accessiblePrograms = solutions

    }
    next();
    return;
}


