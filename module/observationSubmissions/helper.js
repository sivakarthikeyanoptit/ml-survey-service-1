var request = require('request');


module.exports = class observationSubmissionsHelper {

    static generatePdf(observationSubmissionId) {
        return new Promise(async (resolve, reject) => {
            try {

                // Remote url 

                var gotenBerg = request.post(process.env.GOTENBERG_URL, {
                    headers: { "Content-Type": "multipart/form-data" }
                }, function (err, res, body) {
                    console.log(body)
                });

                const form = gotenBerg.form()
                let webHookUrl = process.env.GOTENBERG_HOST + process.env.GOTENBERG_APPLICATION_BASE_URL + process.env.GOTENBERG_ENDPOINT + observationSubmissionId + "?internal-access-token=" + process.env.INTERNAL_ACCESS_TOKEN + "&fileName=aman.pdf"
                form.append("remoteURL", process.env.APPLICATION_HOST + observationSubmissionId + "index.html");
                form.append("marginTop", 0);
                form.append("marginBottom", 0);
                form.append("marginLeft", 0);
                form.append("marginRight", 0);
                form.append("webhookURL", webHookUrl);


                // From Files

                // var gotenBerg = request.post(process.env.GOTENBERG_URL, {
                //     headers: { "Content-Type": "multipart/form-data" }
                // }, function (err, res, body) {
                //     console.log(body)
                // });

                // const form = gotenBerg.form()
                // let webHookUrl = process.env.GOTENBERG_HOST + process.env.GOTENBERG_APPLICATION_BASE_URL + process.env.GOTENBERG_ENDPOINT + observationSubmissionId + "?internal-access-token=" + process.env.INTERNAL_ACCESS_TOKEN + "&fileName=aman.pdf"
                // form.append("files", process.env.APPLICATION_HOST + observationSubmissionId + "index.html");
                // form.append("files", process.env.APPLICATION_HOST + observationSubmissionId + "header.html");
                // form.append("files", process.env.APPLICATION_HOST + observationSubmissionId + "footer.html");
                // form.append("marginTop", 0);
                // form.append("marginBottom", 0);
                // form.append("marginLeft", 0);
                // form.append("marginRight", 0);
                // form.append("webhookURL", webHookUrl);

                console.log("Here")

            } catch (error) {
                return reject(error);
            }
        })

    }

};

