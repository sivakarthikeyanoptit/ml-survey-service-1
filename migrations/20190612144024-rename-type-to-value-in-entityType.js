module.exports = {
  async up(db) {

    global.migrationMsg = "Rename type to value in types array entityType collection"

    let entityTypeDocuments = await db.collection('entityTypes').find({}).project({ types: 1 }).toArray();

    await Promise.all(entityTypeDocuments.map(async entityType => {
      let types = entityType.types;
      if (types) {
        types.forEach(type => {
          if(type.type){
            type.value = type.type
            delete type.type
          }
        })
        db.collection('entityTypes').updateOne({ _id: entityType._id }, { $set: { types: types } });
      }
    }));
  },

  async down(db) {

  }
};
