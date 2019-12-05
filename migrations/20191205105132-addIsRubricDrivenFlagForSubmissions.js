module.exports = {
  async up(db) {
    global.migrationMsg = "Add isRubricDriven field for observationSubmissions and submissions."

    let observationSolutionDocuments = await db.collection('solutions').find({"isRubricDriven" : true,"type":"observation"}).project({_id: 1}).toArray();

    await Promise.all(observationSolutionDocuments.map(async (solution) => {

      return await db.collection('observationSubmissions').updateMany({solutionId:solution._id}, { $set: {isRubricDriven: true}})

    }))

    let solutionDocuments = await db.collection('solutions').find({"isRubricDriven" : true,"type":"assessment"}).project({_id: 1}).toArray();

    await Promise.all(solutionDocuments.map(async (solution) => {

      return await db.collection('submissions').updateMany({solutionId:solution._id}, { $set: {isRubricDriven: true}})

    }))

    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
