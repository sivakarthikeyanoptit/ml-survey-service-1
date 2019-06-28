var fs = require('fs');
const moment = require("moment-timezone");

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

};