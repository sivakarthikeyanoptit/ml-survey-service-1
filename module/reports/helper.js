module.exports = class reportsHelper {

    static gmtToIst(gmtTime) {
        return new Promise(async (resolve, reject) => {
            try {

                let istStart = moment(gmtTime)
                    .tz("Asia/Kolkata")
                    .format("YYYY-MM-DD HH:mm:ss");
          
                if (istStart == "Invalid date") {
                    istStart = "-";
                }

                return resolve(istStart);

            } catch (error) {
                return reject(error);
            }
        })

    }

};