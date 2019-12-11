var fs = require('fs');
const moment = require("moment-timezone");
const cloudStorage = (process.env.CLOUD_STORAGE && process.env.CLOUD_STORAGE != "") ? process.env.CLOUD_STORAGE : ""
const gcp = require(ROOT_PATH + "/generics/helpers/gcpFileUpload");
const aws = require(ROOT_PATH + "/generics/helpers/awsFileUpload");

module.exports = class filesHelper {

    static createFileWithName(name) {
        return new Promise(async (resolve, reject) => {
            try {

                let currentDate = new Date();
                let fileExtensionWithTime = moment(currentDate).tz("Asia/Kolkata").format("YYYY_MM_DD_HH_mm") + ".json";
                let filePath = ROOT_PATH + '/public/exports/';
                if (!fs.existsSync(filePath)) fs.mkdirSync(filePath);

                return resolve(filePath + name + '_' + fileExtensionWithTime);

            } catch (error) {
                return reject(error);
            }
        })

    }

    static writeJsObjectToJsonFile(filePath,document) {
        return new Promise(async (resolve, reject) => {
            try {

                fs.writeFile(filePath, JSON.stringify(document), 'utf8', function (error) {
                    if (error) {
                        return reject({
                            status: 500,
                            message: error,
                            errorObject: error
                        });
                    }
                    return resolve({
                        isResponseAStream: true,
                        fileNameWithPath: filePath
                    });
                });

            } catch (error) {
                return reject(error);
            }
        })

    }

    static getFilePublicBaseUrl() {
        return new Promise(async (resolve, reject) => {
            try {

                if(cloudStorage == "") throw new Error("Cloud storage provider not given.")

                if(cloudStorage != "GC" && cloudStorage != "AWS") {
                    throw new Error("Invalid Cloud storage provider.")
                }

                let fileBaseUrl = ""
                if(cloudStorage == "GC") {
                    fileBaseUrl = await gcp.getFilePublicBaseUrl()
                } else if (cloudStorage == "AWS") {
                    fileBaseUrl = await aws.getFilePublicBaseUrl()
                }

                return resolve(fileBaseUrl)
                
            } catch (error) {
                return reject(error);
            }
        })
    }

    static getSignedUrls(folderPath = "", fileNames = []) {
        return new Promise(async (resolve, reject) => {
            try {

                if(folderPath == "") throw new Error("File base url not given.")

                if(!Array.isArray(fileNames) || fileNames.length < 1) throw new Error("File names not given.")

                if(cloudStorage == "") throw new Error("Cloud storage provider not given.")

                if(cloudStorage != "GC" && cloudStorage != "AWS") {
                    throw new Error("Invalid Cloud storage provider.")
                }

                let signedUrls = new Array

                for (let pointerToFileNames = 0; pointerToFileNames < fileNames.length; pointerToFileNames++) {
                    const file = fileNames[pointerToFileNames];
                    let signedUrlResponse
                    
                    if(cloudStorage == "GC") {
                        signedUrlResponse = await this.getGCBSignedUrl(folderPath, file)
                    } else if (cloudStorage == "AWS") {
                        signedUrlResponse = await this.getS3SignedUrl(folderPath, file)
                    }

                    if(signedUrlResponse.success) {
                        signedUrls.push({
                            file: file,
                            url: signedUrlResponse.url,
                            payload: { sourcePath: signedUrlResponse.name }
                        })
                    }

                }

                if(signedUrls.length == fileNames.length) {
                    return resolve({
                        success : true,
                        message : "URLs generated successfully.",
                        files : signedUrls
                    });
                } else {
                    return resolve({
                        success : false,
                        message : "Failed to generate pre signed URLs.",
                        files : signedUrls
                    });
                }
                

            } catch (error) {
                return reject(error);
            }
        })
    }

    static getGCBSignedUrl(folderPath = "", fileName = "") {
        return new Promise(async (resolve, reject) => {
            try {

                if(folderPath == "" || fileName == "") throw new Error("Bad request.")

                let noOfMinutes = 30
                let expiry = Date.now() + noOfMinutes * 60 * 1000

                const config = {
                    action: 'write',
                    expires: expiry,
                    contentType: 'multipart/form-data'
                };
                
                let gcpFile = gcp.bucket.file(folderPath + fileName)
    
                const signedUrl = await gcpFile.getSignedUrl(config)

                if(signedUrl[0] && signedUrl[0] != "") {
                    return resolve({
                        success : true,
                        message : "Signed URL generated successfully.",
                        url : signedUrl[0],
                        name : gcpFile.name
                    })
                } else {
                    return resolve({
                        success : false,
                        message : "Failed to generated Signed URL.",
                        response : signedUrl
                    })
                }
                

            } catch (error) {
                return reject(error);
            }
        })
    }

    static getS3SignedUrl(folderPath = "", fileName = "") {
        return new Promise(async (resolve, reject) => {
            try {

                if(folderPath == "" || fileName == "") throw new Error("Bad request.")

                let noOfMinutes = 30
                let expiry = 60 * noOfMinutes

                try {
                    const url = await aws.s3.getSignedUrlPromise('putObject', {
                        Bucket: aws.bucketName,
                        Key: folderPath + fileName,
                        Expires: expiry
                    })
                    if(url && url != "") {
                        return resolve({
                            success : true,
                            message : "Signed URL generated successfully.",
                            url : url,
                            name : folderPath + fileName
                        })
                    } else {
                        return resolve({
                            success : false,
                            message : "Failed to generated Signed URL.",
                            response : url
                        })
                    }
                } catch (error) {
                    return resolve({
                        success : false,
                        message : error.message,
                        response : error
                    })
                }
                

            } catch (error) {
                return reject(error);
            }
        })
    }

};