module.exports = {
  async up(db) {

    global.migrationMsg = "Created createdBy index in observationSubmissions";

    await db.collection('observationSubmissions').createIndex({ createdBy: 1 }, { unique: true })

  },
  async down(db) {

  }
};