module.exports = {
  async up(db) {

    await db.collection('entityAssessors').createIndex( { userId: 1} )
    await db.collection('entityAssessorsTrackers').createIndex( { programId: 1, assessorUserId:1} )

  },

  async down(db) {

  }
};
