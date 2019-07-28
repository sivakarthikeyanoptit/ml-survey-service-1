const gcp = require(ROOT_PATH + "/generics/helpers/gcpFileUpload");

module.exports = class Gotenberg {

    constructor() {
    }

    static get name() {
        return "gotenberg";
    }
    
    /**
    * @api {post} /assessment/api/v1/gotenberg/fileUpload:observationSubmissionId Upload PDF Genereated by Gotenberg
    * @apiVersion 0.0.1
    * @apiName Upload PDF Genereated by Gotenberg
    * @apiGroup Gotenberg
    * @apiParam {File} program Mandatory file of type PDF.
    * @apiParam {String} observationSubmissionId Observation Submission ID.
    * @apiParam {String} fileName Filename to be uploaded.
    * @apiSampleRequest /assessment/api/v1/gotenberg/fileUpload/5ce52aa259b3b17de8c2b310?internal-access-token={{internal-access-token}}&fileName=submission.pdf
    * @apiUse successBody
    * @apiUse errorBody
    */

    fileUpload(req) {
        return new Promise(async (resolve, reject) => {
            try {

                if (req.method != "POST" || req.params._id == "" || req.query.fileName == "") {
                    throw "Bad request."
                }

                let submissionDocument = await database.models.observationSubmissions.findOne(
                    { 
                      $and: [ 
                        {"_id": req.params._id},
                        { status: "completed" }
                      ]
                    },
                    {
                      pdfFileUrl: 1
                    }
                );
          
                if (!submissionDocument || !submissionDocument._id) {
                    throw "Bad request."
                }

                req.file = {}
        
                const filePath = req.params._id+"/"+req.query.fileName
                let gcpFile = gcp.bucket.file(filePath)
                
                const checkIfFileExists = await new Promise(function (resolve, reject) {
                    gcpFile.exists().then(function(data) {
                        resolve(data[0])
                    }).catch(err => {
                        reject(err)
                    });
                });

                if(checkIfFileExists) {
                    const fileDeletion = await new Promise(function (resolve, reject) {
                        gcpFile.delete().then(function(data) {
                            resolve(data)
                        }).catch(err => {
                            reject(err)
                        });
                    });
                }

                // req.pipe(fs.createWriteStream('/Users/akash/projects/shikshalokam/backend/sl-assessments-service/some-upload.pdf'));
                
                // const gcsname = Date.now() + req.file.originalname;
                // const file = bucket.file(gcsname);
                
                const stream = gcpFile.createWriteStream({
                    metadata: {
                        contentType: req.headers["content-type"]
                    },
                    resumable: false
                });
                
                stream.on('error', (err) => {
                    req.file.cloudStorageError = err;
                    console.log("On error - "+err)
                    throw "Something went wrong!"
                });
                
                // stream.on('finish', () => {
                //     req.file.cloudStorageObject = filePath
                //     console.log("On finish - "+filePath)
                //     gcpFile.makePublic().then(() => {
                //         req.file.cloudStoragePublicUrl = `https://storage.googleapis.com/sl-dev-storage/5d3a786941526142d27bfd54/submission.pdf`;
                //     });
                // });

                // stream.end(req.file.buffer);

                (async function() {
                    await new Promise(function (resolve, reject) {
                        stream.on('finish', resolve);
                    });
                    req.file.cloudStorageObject = filePath
                    
                    await gcpFile.makePublic()

                    req.file.cloudStoragePublicUrl = filePath;

                    await database.models.observationSubmissions.findOneAndUpdate(
                        { "_id": submissionDocument._id},
                        {
                          $set : {pdfFileUrl: req.file.cloudStoragePublicUrl}
                        }
                    );

                    return resolve({
                        status: 200,
                        message: "File uploaded successfully."
                    });

                })();

                req.pipe(stream)


            } catch (error) {
                return reject({
                    status: 500,
                    message: error,
                    errorObject: error
                });
            }
        })
    }

};