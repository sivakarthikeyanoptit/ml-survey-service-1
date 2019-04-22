module.exports = {
  upgrade(db) {
    global.migrationMsg = "Include collectionName and what does it update"
    // return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
  },

  downgrade(db) {
    // return db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
