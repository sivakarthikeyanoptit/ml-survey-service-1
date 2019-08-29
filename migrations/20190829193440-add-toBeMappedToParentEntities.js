module.exports = {
  async up(db) {
    global.migrationMsg = "Add toBeMappedToParentEntities flag in entityTypes."

    let parentEntitiesMappingNotIncluded = ["parent", "teacher", "student", "schoolLeader", "smc"]

    let entityTyoeDocuments = await db.collection('entityTypes').find({}).project({ name: 1 }).toArray();

    await Promise.all(entityTyoeDocuments.map(async (entityType) => {

      let toBeMappedToParentEntities = true

      if (parentEntitiesMappingNotIncluded.includes(entityType.name)) {
        toBeMappedToParentEntities = false
      }

      return await db.collection('entityTypes').findOneAndUpdate({
        _id: entityType._id
      }, { $set: { toBeMappedToParentEntities: toBeMappedToParentEntities } })

    }))

    return true

  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
