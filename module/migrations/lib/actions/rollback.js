const _ = require("lodash");
const pEachSeries = require("p-each-series");
const fnArgs = require("fn-args");
const { promisify } = require("util");
const status = require("./status");
const migrationsDir = require("../env/migrationsDir");

module.exports = async db => {
  const statusItems = await status(db);
  const pendingItems = statusItems.filter(eachItem=>{
    return eachItem.appliedAt != "PENDING"  
  })
  
  const migrated = [];

  const migrateItem = async item => {
    try {
      const migration = await migrationsDir.loadMigration(item.fileName);
      const args = fnArgs(migration.rollback);
      const rollback = args.length > 1 ? promisify(migration.rollback) : migration.rollback;
      await rollback(db);
    } catch (err) {
      const error = new Error(
        `Could not migrate rollback ${item.fileName}: ${err.message}`
      );
      error.migrated = migrated;
      throw error;
    }

    const collectionName = process.env.MIGRATION_COLLECTION;
    const collection = db.collection(collectionName);

    const { fileName } = item;
    const appliedAt = new Date();

    try {
      await collection.insertOne({ fileName, appliedAt });
    } catch (err) {
      throw new Error(`Could not update migration-status: ${err.message}`);
    }
    migrated.push(item.fileName);
  };

  await pEachSeries(pendingItems, migrateItem);
  return migrated;
};
