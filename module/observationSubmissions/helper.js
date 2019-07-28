let request = require('request');
let slackClient = require(ROOT_PATH + "/generics/helpers/slackCommunications");
const moment = require("moment-timezone");
const ejs = require('ejs');
const fs = require('fs');

module.exports = class observationSubmissionsHelper {

    static generateHtml(observationSubmissionId) {
        return new Promise(async (resolve, reject) => {
            try {

                let observationSubmissionsDocument = await database.models.submissions.findOne({
                    _id: observationSubmissionId,
                    status: "completed"
                }, {
                        "entityInformation.name": 1,
                        "observationInformation.name": 1,
                        "answers": 1,
                        "solutionExternalId": 1,
                        "createdAt": 1,
                        "updatedAt": 1
                    }).lean()

                if (!observationSubmissionsDocument) {
                    throw "Observation Submissions is not found/Status is not completed"
                }

                let answerData = Object.values(observationSubmissionsDocument.answers)
                let questionIds = Object.keys(observationSubmissionsDocument.answers)

                let questionDocument = await database.models.questions.find({
                    _id: { $in: questionIds }
                }, { options: 1, question: 1, responseType: 1, validation: 1, instanceIdentifier: 1 }).lean();

                let questionData = questionDocument.reduce((acc, currentData) => {

                    if (currentData.options && currentData.options.length > 0) {
                        acc[currentData._id.toString()] = {
                            questionOptions: currentData.options,
                            questionName: currentData.question
                        }
                    } else if (currentData.responseType === "slider") {
                        let splitMaximumValue = currentData.validation.regex.split("[")[1].split("s]")[0]
                        let maximum = splitMaximumValue.split("-")[1]
                        acc[currentData._id.toString()] = {
                            maximumValue: maximum
                        }
                    } else if (currentData.instanceIdentifier) {
                        acc[currentData._id.toString()] = {
                            instanceIdentifier: currentData.instanceIdentifier
                        }
                    }
                    return acc
                }, {})

                let generalInfo = [
                    {
                        keyword: "Observation Name",
                        name: observationSubmissionsDocument.observationInformation && observationSubmissionsDocument.observationInformation.name ? observationSubmissionsDocument.observationInformation.name : "Sample Observation"
                    }, {
                        keyword: "Created At",
                        name: observationSubmissionsDocument.createdAt
                    },
                    {
                        keyword: "Updated At",
                        name: observationSubmissionsDocument.updatedAt
                    },
                    {
                        keyword: "Entity Name",
                        name: observationSubmissionsDocument.entityInformation.name
                    }
                ]

                let allSubmittedData = []
                let count = 0

                function text(answer) {
                    let textData = {}
                    textData["answer"] = answer.value
                    textData["responseType"] = answer.responseType
                    return textData
                }

                function number(answer) {
                    let number = text(answer)
                    number.answer = parseInt(number.answer)
                    return number
                }

                function date(answer) {
                    let date = text(answer)
                    let newDate = moment(date.answer).format("YYYY-MM-DD")
                    date["day"] = newDate.split("-")[2]
                    date["month"] = newDate.split("-")[1]
                    date["year"] = newDate.split("-")[0]
                    return date
                }

                function radio(answer) {
                    let radioResponse = {}
                    radioResponse["options"] = new Array

                    questionData[answer.qid] !== undefined && questionData[answer.qid].questionOptions.forEach(eachDataOption => {
                        let radioItems = {}
                        radioItems["label"] = eachDataOption.label
                        if (eachDataOption.value === answer.value) {
                            radioItems["checked"] = true
                        } else {
                            radioItems["checked"] = false
                        }
                        radioResponse.options.push(radioItems)
                    })
                    return radioResponse
                }

                function multiselect(answer) {
                    let multiSelectResponse = {}
                    multiSelectResponse["options"] = new Array

                    questionData[answer.qid].questionOptions.forEach(eachDataOption => {
                        let multiSelectItems = {}

                        let answerValueIndex = answer.value.findIndex(item => item === eachDataOption.value)

                        multiSelectItems["label"] = eachDataOption.label

                        if (answerValueIndex < 0) {
                            multiSelectItems["checked"] = false

                        } else {
                            multiSelectItems["checked"] = true
                        }
                        multiSelectResponse.options.push(multiSelectItems)

                    })
                    return multiSelectResponse
                }

                function slider(answer) {
                    let sliderResponse = {}
                    sliderResponse["answer"] = `${parseInt(answer.value)} of ${parseInt(questionData[answer.qid].maximumValue)}`

                    if (questionData[answer.qid].maximumValue) {
                        sliderResponse["sliderWidth"] = "width:" + (parseInt(answer.value) / parseInt(questionData[answer.qid].maximumValue)) * 100 + "%"
                    }

                    return sliderResponse
                }

                function checkForNotApplicable() {
                    let notApplicable = {}
                    notApplicable["answer"] = "Not Applicable"
                    notApplicable["responseType"] = "NA"
                    return notApplicable
                }

                function matrix(value, parentQuestion, questionId) {
                    let matrixResponse = {}
                    let matrixData = []
                    matrixResponse["question"] = `${count + 1}. ${parentQuestion}`
                    matrixResponse["responseType"] = "matrix"
                    let matrixCount = 0
                    let instanceIdentifierData = questionData[questionId].instanceIdentifier

                    for (let pointerToMatrixData = 0; pointerToMatrixData < value.length; pointerToMatrixData++) {

                        let singleData = []
                        let allValueArray = Object.values(value[pointerToMatrixData])

                        for (let i = 0; i < allValueArray.length; i++) {
                            let result

                            if (allValueArray[i].notApplicable === true) {
                                result = checkForNotApplicable()
                            } else {
                                switch (allValueArray[i].responseType) {
                                    case 'text':
                                        result = text(allValueArray[i])
                                        break;
                                    case 'number':
                                        result = number(allValueArray[i])
                                        break;
                                    case 'radio':
                                        result = radio(allValueArray[i])
                                        break;
                                    case 'multiselect':
                                        result = multiselect(allValueArray[i])
                                        break;
                                    case 'slider':
                                        result = slider(allValueArray[i])
                                        break;
                                    case 'date':
                                        result = date(allValueArray[i])
                                        break;
                                }
                            }

                            result["instanceChildrenCount"] = `${instanceIdentifierData} ${matrixCount + 1}`

                            result["question"] = `${i + 1}. ${allValueArray[i].payload.question[0]}`
                            result["responseType"] = allValueArray[i].responseType

                            singleData.push(result)

                        }
                        ++matrixCount
                        matrixData.push(singleData)
                    }

                    matrixResponse["data"] = matrixData
                    count++
                    return matrixResponse
                }


                for (let pointerToAnswer = 0; pointerToAnswer < answerData.length; pointerToAnswer++) {

                    let result

                    if (answerData[pointerToAnswer].responseType != "matrix" &&
                        answerData[pointerToAnswer].value != undefined) {

                        if (answerData[pointerToAnswer].notApplicable === true) {
                            result = checkForNotApplicable()
                        } else {
                            switch (answerData[pointerToAnswer].responseType) {
                                case 'text':
                                    result = text(answerData[pointerToAnswer])
                                    break;
                                case 'number':
                                    result = number(answerData[pointerToAnswer])
                                    break;
                                case 'radio':
                                    result = radio(answerData[pointerToAnswer])
                                    break;
                                case 'multiselect':
                                    result = multiselect(answerData[pointerToAnswer])
                                    break;
                                case 'slider':
                                    result = slider(answerData[pointerToAnswer])
                                    break;
                                case 'date':
                                    result = date(answerData[pointerToAnswer])
                                    break;
                            }
                        }

                        result["question"] = `${count + 1}. ${answerData[pointerToAnswer].payload.question[0]}`
                        result["responseType"] = answerData[pointerToAnswer].responseType
                        ++count
                        allSubmittedData.push(result)
                    } else {

                        if (answerData[pointerToAnswer].value && answerData[pointerToAnswer].value.length > 0) {
                            allSubmittedData.push(matrix(answerData[pointerToAnswer].value, answerData[pointerToAnswer].payload.question[0], answerData[pointerToAnswer].qid))
                        }
                    }
                }

                let observationSubmissionHtmlPath = process.env.OBSERVATION_SUBMISSIONS_HTML_PATH ? process.env.OBSERVATION_SUBMISSIONS_HTML_PATH : "observationSubmissions"

                const observationSubmissionFolder = `./public/${observationSubmissionHtmlPath}/`
                if (!fs.existsSync(observationSubmissionFolder)) fs.mkdirSync(observationSubmissionFolder);

                const htmlPath = `./public/${observationSubmissionHtmlPath}/${observationSubmissionsDocument._id.toString()}/`;
                if (!fs.existsSync(htmlPath)) fs.mkdirSync(htmlPath);

                let indexTemplate = ROOT_PATH + "/template/observationSubmissions/index.ejs"
                let header = ROOT_PATH + "/template/observationSubmissions/header.ejs"
                let footer = ROOT_PATH + "/template/observationSubmissions/footer.ejs"


                if (fs.existsSync(htmlPath + "index.html")) {
                    fs.unlinkSync(htmlPath + "index.html");
                }

                if (fs.existsSync(htmlPath + "header.html")) {
                    fs.unlinkSync(htmlPath + "header.html");
                }

                if (fs.existsSync(htmlPath + "footer.html")) {
                    fs.unlinkSync(htmlPath + "footer.html");
                }

                let ejsIndex = await ejs.renderFile(indexTemplate, { generalInfo: generalInfo, submissionData: allSubmittedData })
                fs.appendFileSync(htmlPath + "index.html", ejsIndex);


                let ejsHeader = await ejs.renderFile(header)
                fs.appendFileSync(htmlPath + "header.html", ejsHeader);


                let ejsFooter = await ejs.renderFile(footer)
                fs.appendFileSync(htmlPath + "footer.html", ejsFooter);

                let observationData = await self.generatePdf(observationSubmissionId)

                return resolve(observationData)

            } catch (error) {
                return reject(error);
            }
        })
    }

    static generatePdf(observationSubmissionId) {
        return new Promise(async (resolve, reject) => {
            try {

                // Remote url 

                let gotenBergServiceURL = process.env.GOTENBERG_SERVICE_URL ? process.env.GOTENBERG_SERVICE_URL : "http://10.160.0.2:3000/convert/url"
                let applicationHost = process.env.APPLICATION_BASE_HOST ? process.env.APPLICATION_BASE_HOST : "https://devhome.shikshalokam.org"
                let baseUrl = process.env.APPLICATION_BASE_URL ? process.env.APPLICATION_BASE_URL : "/assessment/"
                let gotenBergWebhookEndpoint = process.env.GOTENBERG_WEBHOOK_ENDPOINT ? process.env.GOTENBERG_WEBHOOK_ENDPOINT : "api/v1/gotenberg/fileUpload/"
                let observationSubmissionHtmlPath = process.env.OBSERVATION_SUBMISSIONS_HTML_PATH ? process.env.OBSERVATION_SUBMISSIONS_HTML_PATH : "observationSubmissions"

                let webHookUrl = applicationHost + baseUrl + gotenBergWebhookEndpoint + observationSubmissionId + "?internal-access-token=" + process.env.INTERNAL_ACCESS_TOKEN + "&fileName=submission.pdf"
                let remoteURL = applicationHost + baseUrl + observationSubmissionHtmlPath + "/" + observationSubmissionId + "/index.html"

                let formData = {
                    "remoteURL": remoteURL,
                    "webhookURL": webHookUrl,
                    "marginTop": 0,
                    "marginBottom": 0,
                    "marginLeft": 0,
                    "marginRight": 0
                }


                const gotenbergCallBack = function (err, res, body) {
                    if (err) {
                        formData.message = "Failed to connect to gotenberg service. - Error from gotenberg service."
                        let errorObject = {
                            formData: formData
                        }

                        slackClient.gotenbergErrorLogs(errorObject)
                        throw 'Failed to connect to gotenberg service.'
                    }
                    clearTimeout(gotenbergRequestTimeoutId)
                    return resolve({ message: "Success" });
                }

                var gotenBerg = request.post(gotenBergServiceURL, {
                    headers: { "Content-Type": "multipart/form-data" },
                    formData: formData
                }, gotenbergCallBack);

                const gotenbergRequestTimeoutId = setTimeout(() => {
                    gotenBerg.abort();
                    formData.message = "Failed to connect to gotenberg service. Request timed out after 10 seconds."
                    let errorObject = {
                        formData: formData
                    }
                    slackClient.gotenbergErrorLogs(errorObject)
                    return reject("Failed to connect to gotenberg service.");
                }, 10000);

                // From Files

                // let formData = {
                //     "remoteURL": remoteURL,
                //     "webhookURL": webHookUrl,
                //     "files": applicationHost + "/public/" + observationSubmissionHtmlPath + "/" + observationSubmissionId + "/index.html",
                //     "files": applicationHost + "/public/" + observationSubmissionHtmlPath + "/" + observationSubmissionId + "/header.html",
                //     "files": applicationHost + "/public/" + observationSubmissionHtmlPath + "/" + observationSubmissionId + "/footer.html"
                // }
            }
            catch (error) {
                return reject(error);
            }
        })

    }

};


