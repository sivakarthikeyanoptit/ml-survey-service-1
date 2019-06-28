module.exports = {
  async up(db) {

    global.migrationMsg = "index created for feedback submissions date";

    await db.collection('submissions').createIndex({ "feedback.submissionDate": 1 })

  },

  async down(db) {

  }
};