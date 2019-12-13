let moment = require("moment");
const filesHelper = require(MODULES_BASE_PATH + "/files/helper");

module.exports = class reportsHelper {

    static gmtToIst(gmtTime) {
        try {

            let istStart = moment(gmtTime)
                .tz("Asia/Kolkata")
                .format("YYYY-MM-DD HH:mm:ss");

            if (istStart == "Invalid date") {
                istStart = "-";
            }

            return istStart;

        } catch (error) {
            return error;
        }

    }


    static getFilePublicBaseUrl() {
        return new Promise(async (resolve, reject) => {
            try {

            const url = filesHelper.getFilePublicBaseUrl()

            return resolve(url)

            } catch (error) {
                return reject(error);
            }
        })
    }

};