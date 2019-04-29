module.exports = {
  async up(db) {
    
    let sourceDB = global.transferFromDb

    let schools = await sourceDB.collection('schools').find({}).toArray();

    let schoolArray = new Array
    
    let schoolEntity = await db.collection('entityTypes').find({
      name : "school"
    }).toArray();

    for (let schoolCounter = 0; schoolCounter < schools.length; schoolCounter++) {
      schools[schoolCounter].questionGroup = schools[schoolCounter].schoolTypes
      schoolArray.push({
        _id : schools[schoolCounter]._id,
        entityTypeId: schoolEntity[0]._id,
        entityType: "school",
        regsitryDetails : {},
        groups: {},
        metaInformation : _.omit(schools[schoolCounter],[
          "_id",
          "createdAt",
          "createdBy",
          "updatedAt",
          "updatedBy",
          "__v",
          "deleted"
        ]),
        updatedBy: "INITIALIZE",
        createdBy: "INITIALIZE",
        createdAt: new Date()
      })
    }

    global.migrationMsg = "Total schools transferred - "+schools.length

    await db.collection('entities').createIndex( { entityTypeId: 1} )

    await db.collection('entities').createIndex( {"entityType": "text" } )
    
    return await db.collection('entities').insertMany(schoolArray);
  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
