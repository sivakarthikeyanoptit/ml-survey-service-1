module.exports = {
  async up(db) {
    global.migrationMsg = "Add entity type to submissions and observation submissions."
    
    let allEntityTypes = await db.collection('entityTypes').find({}).toArray();

    for (let pointerToAllEntityTypes = 0; pointerToAllEntityTypes < allEntityTypes.length; pointerToAllEntityTypes++) {
      
      await db.collection('submissions').updateMany( {entityTypeId:allEntityTypes[pointerToAllEntityTypes]._id}, { $set: { "entityType": allEntityTypes[pointerToAllEntityTypes].name } } )

      await db.collection('observationSubmissions').updateMany( {entityTypeId:allEntityTypes[pointerToAllEntityTypes]._id}, { $set: { "entityType": allEntityTypes[pointerToAllEntityTypes].name } } )

    }


    return
  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
