// var Promise = require("bluebird");
// var GoogleCloudStorage = Promise.promisifyAll(require("@google-cloud/storage"));
// var GoogleCloudStorage = require("@google-cloud/storage");
const { Storage } = require("@google-cloud/storage");
const BUCKET_NAME = "sl-dev-storage";
const storage = new Storage({
  projectId: "shikshalokam",
  keyFilename: "./generics/helpers/credentials/sl-dev-storage.json"
});

var myBucket = storage.bucket(BUCKET_NAME);

let gcpFileUpload = file => {
  // Uploads a local file to the bucket
  return myBucket.upload(file, {
    gzip: true,
    metadata: {
      // cacheControl: "public, max-age=31536000"
    }
  });
};
var makePublic = file_name => {
  return myBucket.file(file_name).makePublic();
};
// function getThumbnail(){
var getThumbnail = file_name => {
  return `https://storage.googleapis.com/${BUCKET_NAME}/${file_name}`;
};
// }
// gcpFileUpload();
module.exports = {
  upload: gcpFileUpload,
  makePublic: makePublic,
  getThumbnail: getThumbnail
};
