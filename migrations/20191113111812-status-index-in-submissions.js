module.exports = {
  async up(db) {
    global.migrationMsg = "Include collectionName and what does it update"
    await db.collection('submissions').createIndex({ status: 1 })
    await db.collection('observationSubmissions').createIndex({ status: 1 })
  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
