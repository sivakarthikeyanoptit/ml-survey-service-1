let gcp = require("../../generics/helpers/gcpFileUpload");
let UploadFile = require("../../generics/helpers/fileUpload");
let uploadFile = new UploadFile(
  require("path").join(__dirname + "/../" + "uploads")
);
let fs = require("fs");

module.exports = class FileUpload {
  find(req) {
    return super.find(req);
  }

  async upload(req) {
    return new Promise((resolve, reject) => {
      return uploadFile.save(req.files, true).then(uploads => {
        async.forEachOfSeries(
          uploads.uploads,
          (uploadedFile, key, cb) => {
            let temp = uploads.uploads[key].url.split("/");
            gcp
              .upload(uploadedFile.url)
              .then(file => {
                fs.unlinkSync(uploadedFile.url);
                uploads.uploads[key].infoLink = file[1].selfLink;
                uploads.uploads[key].url = file[1].mediaLink;
                // cb();
                console.log(temp[temp.length - 1]);

                gcp
                  .makePublic(temp[temp.length - 1])
                  .then(file => {
                    cb(null);
                  })
                  .catch(error => {
                    cb(error);
                    console.error(error);
                  });
              })
              .catch(err => {
                console.error("ERROR:", err);
                cb(null);
              });
          },
          error => {
            if (error) return reject(error);
            return resolve({
              message: "File uploaded successfully",
              result: uploads.uploads,
              failed: uploads.failedDocs.length ? uploads.failedDocs : undefined
            });
          }
        );
      });
    });
  }

    getImageUploadUrl(req) {
        return new Promise( async (resolve,reject) => {

          let responseMessage = ""
          let result = {}

          if(req.body.submissionId && req.body.submissionId != "" && Array.isArray(req.body.files)) {

            let noOfMinutes = 30
            let expiry = Date.now() + noOfMinutes * 60 * 1000

            result = await new Promise( async (resolve, reject) => {
              const config = {
                action: 'write',
                expires: expiry,
                contentType: 'multipart/form-data'
              };
              const folderPath = req.body.submissionId+"/"+req.userDetails.userId+"/"

              let fileUrls = []
              for (let counter = 0; counter < req.body.files.length; counter++) {

                let gcpFile = gcp.bucket.file(folderPath+req.body.files[counter])

                const signedUrl = await gcpFile.getSignedUrl(config)
                fileUrls.push({
                  file:req.body.files[counter],
                  url:signedUrl[0],
                  payload:{sourcePath:gcpFile.name}
                })
              }
              resolve(fileUrls)
            })
            responseMessage = "URLs generated successfully."
          } else {
            responseMessage = "Invalid request."
          }
          
          return resolve({
            message: responseMessage,
            result: result
          });

        }).catch(error => {
            return reject({
              error
            })
        })
    }
};
