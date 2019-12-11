module.exports = {
  async up(db) {
    global.migrationMsg = "Added isActive flag to ecms in all solutions."

    let solutionDocuments = await db.collection('solutions').find({evidenceMethods :{$exists : true}}).project({evidenceMethods: 1}).toArray();

    await Promise.all(solutionDocuments.map(async (solution) => {

      if (solution.evidenceMethods) {
        let newEvidenceMethods = {}

        Object.keys(solution.evidenceMethods).forEach(ecmCode => {
          newEvidenceMethods[ecmCode] = _.merge(solution.evidenceMethods[ecmCode],{isActive : true})
        })

        return await db.collection('solutions').findOneAndUpdate({
          _id: solution._id
        }, { $set: {evidenceMethods: newEvidenceMethods}})

      }

    }))

    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
