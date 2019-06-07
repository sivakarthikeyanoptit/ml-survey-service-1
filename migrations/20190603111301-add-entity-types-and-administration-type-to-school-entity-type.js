module.exports = {
  async up(db) {

    global.migrationMsg = "Add entity type and administration type in school entity type collection"

    let entityTypes = await db.collection('entities').distinct("metaInformation.types");

    let administrationTypes = await db.collection('entities').distinct("metaInformation.administration");

    [entityTypes, administrationTypes] = [_.compact(entityTypes), _.compact(administrationTypes)];

    await db.collection('entityTypes').findOneAndUpdate({ "name": "school" }, { $set: { "entityTypes": entityTypes, "administrationTypes": administrationTypes } });

  },

  async down(db) {

  }
};
