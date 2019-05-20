module.exports = {
  async up(db) {

    await db.collection('entityAssessors').createIndex( { userId: 1} )

  },

  async down(db) {

  }
};
