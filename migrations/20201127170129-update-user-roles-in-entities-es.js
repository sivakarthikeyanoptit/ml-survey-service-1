module.exports = {
  async up(db) {

    global.migrationMsg = "Update user roles in entites elasticsearch";

    if (!es) {
      throw new Error("Elastic search connection not available.");
    }

    let entitiesIndex = process.env.ELASTICSEARCH_ENTITIES_INDEX;

    if (!entitiesIndex || entitiesIndex == "") {
      throw new Error("Invalid entities index");
    }

    const checkIfIndexExists = await es.indices.exists({ index: entitiesIndex });

    if (checkIfIndexExists.statusCode !== 200) {
      const createIndex = await es.indices.create({ index: entitiesIndex });
      if (createIndex.statusCode != 200) {
        throw new Error("Error while creating entities index.")
      }
    }

    let users = await db.collection('userExtension').find({}).project({ _id: 1, roles: 1, userId: 1 }).toArray();

    let chunkOfUsers = _.chunk(users, 100);

    for (let users = 0; users < chunkOfUsers.length; users++) {

      await Promise.all(chunkOfUsers[users].map(async user => {

        if (user.roles.length > 0) {

          await Promise.all(user.roles.map(async role => {

            await Promise.all(role.entities.map(async entity => {

              let entityDocument = await es.get({
                id: entity,
                index: process.env.ELASTICSEARCH_ENTITIES_INDEX
              }, {
                  ignore: [404],
                  maxRetries: 3
                });
                
              if (entityDocument.statusCode == 200) {
                entityDocument = entityDocument.body["_source"].data;
                console.log(entityDocument);
                if (!entityDocument.roles) {
                  entityDocument.roles = {};
                }

                if (entityDocument.roles[role.code]) {
                  if (!entityDocument.roles[role.code].includes(user.userId)) {
                    entityDocument.roles[role.code].push(user.userId);
                  }
                }
                else {
                  entityDocument.roles[role.code] = [user.userId];
                }
                
                await es.update({
                  id: entity,
                  index: process.env.ELASTICSEARCH_ENTITIES_INDEX,
                  body: {
                    doc: { data : entityDocument },
                    doc_as_upsert: true
                  }
                })
              }
            }))
          }))
        }
      }))
    }

    return;
  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
