var request = require('request');


module.exports = class observationSubmissionsHelper {

    static generatePdf(observationSubmissionId) {
        return new Promise(async (resolve, reject) => {
            try {

                // Remote url 

                let gotenBergServiceURL = process.env.GOTENBERG_SERVICE_URL ? process.env.GOTENBERG_SERVICE_URL : "http://10.160.0.2:3000/convert/url"

                // const form = gotenBerg.form()
                let applicationHost = process.env.APPLICATION_HOST ? process.env.APPLICATION_HOST : "https://devhome.shikshalokam.org"
                let baseUrl = process.env.APPLICATION_BASE_URL ? process.env.APPLICATION_BASE_URL : "/assessment/"
                let gotenBergWebhookEndpoint = process.env.GOTENBERG_WEBHOOK_ENDPOINT ? process.env.GOTENBERG_WEBHOOK_ENDPOINT : "api/v1/gotenberg/fileUpload/"
                let observationSubmissionHtmlPath = process.env.OBSERVATION_SUBMISSIONS_HTML_PATH ? process.env.OBSERVATION_SUBMISSIONS_HTML_PATH : "observationSubmissions"

                let webHookUrl = applicationHost + baseUrl + gotenBergWebhookEndpoint + observationSubmissionId + "?internal-access-token=" + process.env.INTERNAL_ACCESS_TOKEN + "&fileName=submission.pdf"
                let remoteURL = applicationHost + baseUrl + observationSubmissionHtmlPath + "/" + observationSubmissionId + "/index.html"

                // form.append("remoteURL", remoteURL);
                // form.append("marginTop", 0);
                // form.append("marginBottom", 0);
                // form.append("marginLeft", 0);
                // form.append("marginRight", 0);
                // form.append("webhookURL", webHookUrl);

                let formData = {
                    "remoteURL": remoteURL,
                    "webhookURL": webHookUrl,
                    "marginTop": 0,
                    "marginBottom": 0,
                    "marginLeft": 0,
                    "marginRight": 0
                }


                var gotenBerg = request.post(gotenBergServiceURL, {
                    headers: { "Content-Type": "multipart/form-data" },
                    formData: formData
                }, function (err, res, body) {
                    if (err) {
                        throw 'upload failed:'
                    }
                    
                    console.log('Upload successful!  Server responded with:', body);
                    return
                });

                // From Files

                // var gotenBerg = request.post(process.env.GOTENBERG_SERVICE_URL, {
                //     headers: { "Content-Type": "multipart/form-data" }
                // }, function (err, res, body) {
                //     console.log(body)
                // });

                // const form = gotenBerg.form()
                // let applicationHost = process.env.APPLICATION_HOST ? process.env.APPLICATION_HOST : "https://devhome.shikshalokam.org"
                // let baseUrl = process.env.APPLICATION_BASE_URL ? process.env.APPLICATION_BASE_URL : "/assessment/"
                // let gotenBergWebhookEndpoint = process.env.GOTENBERG_WEBHOOK_ENDPOINT ? process.env.GOTENBERG_WEBHOOK_ENDPOINT : "api/v1/gotenberg/fileUpload/"
                // let observationSubmissionHtmlPath = process.env.OBSERVATION_SUBMISSIONS_HTML_PATH ? process.env.OBSERVATION_SUBMISSIONS_HTML_PATH : "observationSubmissions"

                // let webHookUrl = applicationHost + baseUrl + gotenBergWebhookEndpoint + observationSubmissionId + "?internal-access-token=" + process.env.INTERNAL_ACCESS_TOKEN + "&fileName=submission.pdf"
                // form.append("files", applicationHost + "/public/" + observationSubmissionHtmlPath + "/" + observationSubmissionId + "/index.html");
                // form.append("files", applicationHost + "/public/" + observationSubmissionHtmlPath + "/" + observationSubmissionId + "/header.html");
                // form.append("files", applicationHost + "/public/" + observationSubmissionHtmlPath + "/" + observationSubmissionId + "/footer.html");
                // form.append("marginTop", 0);
                // form.append("marginBottom", 0);
                // form.append("marginLeft", 0);
                // form.append("marginRight", 0);
                // form.append("webhookURL", webHookUrl);


            } catch (error) {
                return reject(error);
            }
        })

    }

};

