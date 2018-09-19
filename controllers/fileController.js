module.exports = class FileUpload extends Abstract {
  constructor(schema) {
    super(schema);
  }

  static get name() {
    return "files";
  }

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
              data: uploads.uploads,
              failed: uploads.failedDocs.length ? uploads.failedDocs : undefined
            });
          }
        );
      });
    });
  }
};
