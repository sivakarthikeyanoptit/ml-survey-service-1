let moment = require("moment");

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

};