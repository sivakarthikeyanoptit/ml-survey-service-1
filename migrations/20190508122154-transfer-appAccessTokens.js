module.exports = {
  async up(db) {
    
    let sourceDB = global.transferFromDb

    let oldAppAccessTokens = await sourceDB.collection('appAccessToken').find({}).toArray();
    
    let oldAppAccessTokensArray = new Array

    for (let pointerToOldAppAccessToken = 0; pointerToOldAppAccessToken < oldAppAccessTokens.length; pointerToOldAppAccessToken++) {
    
      oldAppAccessTokens[pointerToOldAppAccessToken].entityId = (oldAppAccessTokens[pointerToOldAppAccessToken].entityId) ? oldAppAccessTokens[pointerToOldAppAccessToken].entityId : oldAppAccessTokens[pointerToOldAppAccessToken].schoolId
      oldAppAccessTokens[pointerToOldAppAccessToken].entityExternalId = (oldAppAccessTokens[pointerToOldAppAccessToken].entityExternalId) ? oldAppAccessTokens[pointerToOldAppAccessToken].entityExternalId : oldAppAccessTokens[pointerToOldAppAccessToken].schoolExternalId
      
      oldAppAccessTokensArray.push(_.omit(oldAppAccessTokens[pointerToOldAppAccessToken],[
        "schoolExternalId",
        "schoolId"
      ]))

    }

    global.migrationMsg = "Total app access tokens transferred - "+oldAppAccessTokens.length

    return await db.collection('appAccessToken').insertMany(oldAppAccessTokensArray);
    
  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
