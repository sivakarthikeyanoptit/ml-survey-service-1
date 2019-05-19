module.exports = {
  async up(db) {
    global.migrationMsg = "Remove users from solution document and convert school profile to entity profile."
    

    let solutionDocuments = await db.collection('solutions').find({}).project({roles: 1}).toArray();

    await Promise.all(solutionDocuments.map(async (solution) => {

      let newRoles = {}
      Object.keys(solution.roles).forEach(role => {
        if(solution.roles[role].acl && solution.roles[role].acl.schoolProfile) {
          newRoles[role] = {
            acl: {
              entityProfile : solution.roles[role].acl.schoolProfile
            }
          }
        }
      })

      return await db.collection('solutions').findOneAndUpdate({
        _id: solution._id
      }, { $set: {roles: newRoles}})

    }))

    return true

  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
