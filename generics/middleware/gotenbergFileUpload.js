var fs = require('fs');
let gcp = require(ROOT_PATH + "/generics/helpers/gcpFileUpload");

module.exports = (req, res, next) => {
    if (req.method == "POST" && req.path.includes("/gotenberg/fileUpload") && req.query.submissionId != "") {

        req.file = {}

        const folderPath = req.query.submissionId+"/"

        let gcpFile = gcp.bucket.file(folderPath+"submission-1.pdf")

        // req.pipe(fs.createWriteStream('/Users/akash/projects/shikshalokam/backend/sl-assessments-service/some-upload.pdf'));
        
        // const gcsname = Date.now() + req.file.originalname;
        // const file = bucket.file(gcsname);
      
        const stream = gcpFile.createWriteStream({
          metadata: {
            contentType: "application/pdf"
          },
          resumable: false
        });
      
        stream.on('error', (err) => {
          req.file.cloudStorageError = err;
          next(err);
        });
      
        stream.on('finish', () => {
          req.file.cloudStorageObject = folderPath+"submission-1.pdf";
          gcpFile.makePublic().then(() => {
            req.file.cloudStoragePublicUrl = gcpFile.makePublic(folderPath+"submission-1.pdf");
            next();
          });
        });
      
        req.pipe(stream)
        //stream.end(req);
    }

    next();
    return;
}


