module.exports = {
  async up(db) {

    global.migrationMsg = "Remove start date and end date from default observation creation form."

    let defaultObservation = await db.collection('forms').find({"name" : "defaultObservationMetaForm"}).project({ name: 1, value :1 }).toArray();

    defaultObservation[0].value = _.pullAllBy(defaultObservation[0].value, [{ "field" : "startDate" }, { "field" : "endDate" }], 'field');
    
    return await db.collection('forms').updateOne(
      { "name" : "defaultObservationMetaForm" },
      { $set: { "value": defaultObservation[0].value } }
    )

  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
