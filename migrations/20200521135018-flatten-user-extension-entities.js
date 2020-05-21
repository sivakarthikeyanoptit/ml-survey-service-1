module.exports = {
  async up(db) {
    global.migrationMsg = "flatten user extension entities";

    if(!es) {
      throw new Error("Elastic search connection not available.");
    }

    let userExtensionIndex = process.env.ELASTICSEARCH_USER_EXTENSION_INDEX;

    if(!userExtensionIndex || userExtensionIndex == "") {
      throw new Error("Invalid user extension index");
    }

    const checkIfIndexExists = await es.indices.exists({ index: userExtensionIndex});

    if(checkIfIndexExists.statusCode === 200) {
      const deleteIndex = await es.indices.delete({ index: userExtensionIndex});
      if(deleteIndex.statusCode != 200) {
        throw new Error("Error while deleting user extension index.");
      }
    }

    const createIndex = await es.indices.create({ index: userExtensionIndex});

    if(createIndex.statusCode != 200) {
      throw new Error("Error while creating user extension index.")
    }

    let userExtensionIndexType = process.env.ELASTICSEARCH_USER_EXTENSION_INDEX_TYPE;

    if(!userExtensionIndexType || userExtensionIndexType == "") {
      throw new Error("Invalid user extension index type");
    }

    let userExtensions = 
    await db.collection('userExtension').find({}).project({ _id : 1 }).toArray();

    let chunkOfUsers = _.chunk(userExtensions, 100);
    
    for ( let users = 0; users < chunkOfUsers.length; users++ ) {

      let usersId = chunkOfUsers[users].map(user => {
        return user._id;
      });

      let userDocumentArray = 
      await db.collection('userExtension').find({
        _id : { $in : usersId }
      }).project({ devices : 0 }).toArray();

      await Promise.all(userDocumentArray.map(async userDocument=>{

        let result = [];

        if( userDocument.roles.length > 0 ) {
  
          let entities = [];
  
          for ( let role = 0 ; role < userDocument.roles.length ; role++ ) {
            entities = entities.concat(userDocument.roles[role].entities);
          }
  
          if( entities.length > 0 ) {

            let entityDocuments = 
            await db.collection('entities').find({
              _id : {$in : entities}
            }).project({
              "metaInformation.externalId" : 1,
              "metaInformation.name" : 1,
              "entityType" : 1,
              "entityTypeId" : 1,
              "_id" : 1
            }).toArray();

            entityDocuments = entityDocuments.map(entity=>{
              return {
                name : entity.metaInformation.name,
                externalId : entity.metaInformation.externalId,
                entityType : entity.entityType,
                entityTypeId : entity.entityTypeId,
                _id : entity._id
              }
            });

            if ( entityDocuments.length > 0 ) {

              for( let entity = 0; entity < entityDocuments.length ; entity++) {
                
                let entityObj = entityDocuments[entity];

                let relatedEntitiesQuery = {
                  [`groups.${entityObj.entityType}`] : entityObj._id,
                  entityTypeId : {
                    $ne : entityObj.entityTypeId
                  }
                }
                
                let relatedEntities = await db.collection('entities').find(
                  relatedEntitiesQuery
                ).project({
                  "metaInformation.externalId" : 1,
                  "metaInformation.name" : 1,
                  "entityType" : 1,
                  "entityTypeId" : 1,
                  "_id" : 1
                }).toArray();

                if( relatedEntities.length > 0 ) {

                  relatedEntities = relatedEntities.map(entity=>{
                    return {
                      name : entity.metaInformation.name,
                      externalId : entity.metaInformation.externalId,
                      entityType : entity.entityType,
                      entityTypeId : entity.entityTypeId,
                      _id : entity._id
                    }
                  })

                  entityObj["relatedEntities"] = relatedEntities;
                }

                result.push(entityObj)

              }

            }

          }
  
        }

        if( result.length > 0 ) {
          userDocument["entities"] = result;
        }

  
        await es.create({
          id : userDocument.userId,
          index: userExtensionIndex,
          type: userExtensionIndexType,
          body: {
            _doc : userDocument
          }
        });

        return;

      }))


    }

    return;


  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
