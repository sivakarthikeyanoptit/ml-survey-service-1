const config = {
  mongodb: {
    url: "mongodb://localhost:27017",
    databaseName: "sl-assessment",

    options: {
      useNewUrlParser: true 
    }
  },

  migrationsDir: "migrations",
  changelogCollectionName: "changelog"
};

module.exports = config;
