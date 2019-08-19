module.exports = {
  async up(db) {
    global.migrationMsg = "Created default user roles."

    await db.collection('userRoles').createIndex( { code: 1}, { unique: true } )

    let hmrole = {
      code: "HM",
      title : "Headmaster",
      createdAt : new Date,
      updatedAt : new Date,
      createdBy: "SYSTEM",
      updatedBy: "SYSTEM",
      status: "active",
      isDeleted: false
    }

    let crprole = {
      code: "CRP",
      title : "Cluster Resource Person",
      createdAt : new Date,
      updatedAt : new Date,
      createdBy: "SYSTEM",
      updatedBy: "SYSTEM",
      status: "active",
      isDeleted: false
    }

    let beorole = {
      code: "BEO",
      title : "Block Education Officer",
      createdAt : new Date,
      updatedAt : new Date,
      createdBy: "SYSTEM",
      updatedBy: "SYSTEM",
      status: "active",
      isDeleted: false
    }

    let deorole = {
      code: "DEO",
      title : "District Education Officer",
      createdAt : new Date,
      updatedAt : new Date,
      createdBy: "SYSTEM",
      updatedBy: "SYSTEM",
      status: "active",
      isDeleted: false
    }

    let spdrole = {
      code: "SPD",
      title : "State Project Director",
      createdAt : new Date,
      updatedAt : new Date,
      createdBy: "SYSTEM",
      updatedBy: "SYSTEM",
      status: "active",
      isDeleted: false
    }

    return await db.collection('userRoles').insertMany( [
      hmrole,
      crprole,
      beorole,
      deorole,
      spdrole
    ]);

  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
