module.exports = {
  async up(db) {

    await db.collection('entityAssessors').createIndex( { userId: 1} )
    await db.collection('entityAssessors').createIndex( { programId: 1} )
    await db.collection('entityAssessors').createIndex( { solutionId: 1} )
    await db.collection('entityAssessorsTrackers').createIndex( { assessorUserId:1} )
    await db.collection('entityAssessorsTrackers').createIndex( { programId: 1} )
    await db.collection('entityAssessorsTrackers').createIndex( { solutionId:1} )

  },

  async down(db) {

  }
};
