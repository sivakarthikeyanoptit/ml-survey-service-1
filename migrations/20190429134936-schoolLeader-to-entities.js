module.exports = {
  async up(db) {
    
    let sourceDB = global.transferFromDb

    let schoolLeaders = await sourceDB.collection('schoolLeaderRegistry').find({}).toArray();

    let schoolToSchoolLeaders = {}

    let schoolLeadersArray = new Array
    
    let schoolLeaderEntity = await db.collection('entityTypes').find({
      name : "schoolLeader"
    }).toArray();

    for (let schoolLeaderCounter = 0; schoolLeaderCounter < schoolLeaders.length; schoolLeaderCounter++) {

      schoolLeaders[schoolLeaderCounter].createdByProgramId = ObjectID(schoolLeaders[schoolLeaderCounter].programId)
      if(schoolToSchoolLeaders[schoolLeaders[schoolLeaderCounter].schoolId]) {
        schoolToSchoolLeaders[schoolLeaders[schoolLeaderCounter].schoolId].schoolLeaders.push(schoolLeaders[schoolLeaderCounter]._id)
      } else {
        schoolToSchoolLeaders[schoolLeaders[schoolLeaderCounter].schoolId] = {
          schoolLeaders : [
            schoolLeaders[schoolLeaderCounter]._id
          ]
        }
      }

      schoolLeadersArray.push({
        _id : schoolLeaders[schoolLeaderCounter]._id,
        entityTypeId: schoolLeaderEntity[0]._id,
        entityType: "schoolLeader",
        regsitryDetails : {},
        groups: {},
        metaInformation : _.omit(schoolLeaders[schoolLeaderCounter],[
          "_id",
          "createdAt",
          "createdBy",
          "updatedAt",
          "updatedBy",
          "__v",
          "isDeleted",
          "programId",
          "schoolId"
        ]),
        updatedBy: "INITIALIZE",
        createdBy: "INITIALIZE",
        createdAt: new Date()
      })
    }

    global.migrationMsg = "Total school leaders transferred - "+schoolLeaders.length

    await Promise.all(Object.keys(schoolToSchoolLeaders).map( async (schoolId) => {
      await db.collection('entities').findOneAndUpdate(
        {
          _id : ObjectID(schoolId)
        },
        {
          $set: { "groups.schoolLeader": schoolToSchoolLeaders[schoolId].schoolLeaders }
        }
      )
    }))
    
    return await db.collection('entities').insertMany(schoolLeadersArray);
  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
