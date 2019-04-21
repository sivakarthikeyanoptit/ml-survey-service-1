const { find } = require("lodash");
const migrationsDir = require("../env/migrationsDir");

module.exports = async db => {
  await migrationsDir.shouldExist();

  const fileNames = await migrationsDir.getFileNames();

  const collectionName = process.env.MIGRATION_COLLECTION

  const collection = db.collection(collectionName);
  const changelog = await collection.find({}).toArray();

  const statusTable = fileNames.map(fileName => {
    const itemInLog = find(changelog, { fileName });
    const appliedAt = itemInLog ? itemInLog.appliedAt.toJSON() : "PENDING";
    return { fileName, appliedAt };
  });

  return statusTable;
};
