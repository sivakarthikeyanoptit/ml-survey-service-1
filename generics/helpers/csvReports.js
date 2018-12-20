const json2csv = require("json2csv").Parser;

const moment = require("moment-timezone");

const fs = require("fs");

const mkdirp = require("mkdirp");

const nodemailer = require("nodemailer");

function gmtToIst(gmtTime) {
  let istStart = moment(gmtTime)
    .tz("Asia/Kolkata")
    .format("YYYY-MM-DD HH:mm:ss");

  if (istStart == "Invalid date") {
    istStart = "-";
  }
  return istStart;
}

const getCSVData = async function(id, evidenceId) {
  let submissionQuery = {
    ["programInformation.name"]: id
  };

  let queryObject = "evidences." + evidenceId + "";

  let submissionDocument = await database.models.submissions.find(
    submissionQuery,
    {
      assessors: 1,
      schoolInformation: 1,
      programInformation: 1,
      status: 1,
      [queryObject]: 1
    }
  );

  let assessorElement = {};
  let ecmReports = [];

  for (
    let submissionInstance = 0;
    submissionInstance < submissionDocument.length;
    submissionInstance++
  ) {
    submissionDocument[submissionInstance].assessors.forEach(assessor => {
      assessorElement[assessor.userId] = {
        externalId: assessor.externalId
      };
    });

    if (
      (submissionDocument[submissionInstance].evidences[evidenceId]) && 
      submissionDocument[submissionInstance].evidences[evidenceId]
        .isSubmitted &&
      (submissionDocument[submissionInstance].status == "inprogress" ||
        submissionDocument[submissionInstance].status == "blocked")
    ) {
      submissionDocument[submissionInstance]["evidences"][
        evidenceId
      ].submissions.forEach(submission => {
        let answer = [];

        if (assessorElement[submission.submittedBy.toString()]) {
          Object.entries(submission.answers).map(submissionAnswer => {
            return answer.push(submissionAnswer[1]);
          });

          answer.forEach(QAndA => {
            let ecmCurrentReport = [];

            if (!(QAndA.responseType == "matrix")) {
              let imageLink = new Array();
              QAndA.fileName.forEach(imageSource => {

                let envVar = (process.env.NODE_ENV ? process.env.NODE_ENV : "development");
                let envString = ((envVar=='production')? "prod" : "dev");

                if (imageSource) {
                  imageLink.push(
                    " https://storage.cloud.google.com/sl-"+envString+"-storage/" +
                      imageSource.sourcePath +
                      " "
                  );
                } else {
                  if (process.env.NODE_ENV == "development") {
                    console.log("No image link is there");
                  }
                }
              });

              let imagePath;

              if (imageLink.length) {
                imagePath = imageLink.toString();
              }

              ecmCurrentReport.push({
                schoolName:
                  submissionDocument[submissionInstance].schoolInformation.name,
                schoolId:
                  submissionDocument[submissionInstance].schoolInformation
                    .externalId,
                question: QAndA.payload["question"][0],
                answer: QAndA.payload["labels"].toString(),
                assessorId:
                  assessorElement[submission.submittedBy.toString()].externalId,
                startTime: gmtToIst(QAndA.startTime),
                endTime: gmtToIst(QAndA.endTime),
                image: imagePath
              });
            } else {
              ecmCurrentReport.push({
                schoolName:
                  submissionDocument[submissionInstance].schoolInformation.name,
                schoolId:
                  submissionDocument[submissionInstance].schoolInformation
                    .externalId,
                question: QAndA.payload["question"][0],
                answer: "Instance Question",
                assessorId:
                  assessorElement[submission.submittedBy.toString()].externalId,
                startTime: gmtToIst(QAndA.startTime),
                endTime: gmtToIst(QAndA.endTime)
              });
              if (QAndA.payload.labels[0]) {
                for (
                  let instance = 0;
                  instance < QAndA.payload.labels[0].length;
                  instance++
                ) {
                  QAndA.payload.labels[0][instance].forEach(QAndAElement => {
                    let imageLink = new Array();
                    let envVar = (process.env.NODE_ENV ? process.env.NODE_ENV : "development");
                    let envString = ((envVar=='production')? "prod" : "dev");

                    QAndAElement.fileName.forEach(imageSource => {
                      imageLink.push(
                        " https://storage.cloud.google.com/sl-"+envString+"-storage/" +
                          imageSource.sourcePath +
                          " "
                      );
                    });

                    let imagePath;

                    if (imageLink.length) {
                      imagePath = imageLink.toString();
                    }

                    let radioResponse = {};
                    let multiSelectResponse = {};
                    let multiSelectResponseArray = [];

                    if (QAndAElement.responseType == "radio") {
                      QAndAElement.options.forEach(option => {
                        radioResponse[option.value] = option.label;
                      });
                      answer = radioResponse[QAndAElement.value];
                    } else if (QAndAElement.responseType == "multiselect") {
                      QAndAElement.options.forEach(option => {
                        multiSelectResponse[option.value] = option.label;
                      });

                      QAndAElement.value.forEach(value => {
                        multiSelectResponseArray.push(
                          multiSelectResponse[value]
                        );
                      });

                      answer = multiSelectResponseArray.toString();
                    } else {
                      answer = QAndAElement.value;
                    }

                    ecmCurrentReport.push({
                      schoolName:
                        submissionDocument[submissionInstance].schoolInformation
                          .name,
                      schoolId:
                        submissionDocument[submissionInstance].schoolInformation
                          .externalId,
                      question: QAndAElement.question[0],
                      answer: answer,
                      assessorId:
                        assessorElement[submission.submittedBy.toString()]
                          .externalId,
                      startTime: gmtToIst(QAndAElement.startTime),
                      endTime: gmtToIst(QAndAElement.endTime),
                      image: imagePath
                    });
                  });
                }
              }
            }
            ecmCurrentReport.forEach(currentEcm => {
              ecmReports.push(currentEcm);
            });
          });
        }
      });
    }
  }

  let fields = [
    {
      label: "School Name",
      value: "schoolName"
    },
    {
      label: "School Id",
      value: "schoolId"
    },
    {
      label: "Assessor Id",
      value: "assessorId"
    },
    {
      label: "Question",
      value: "question"
    },
    {
      label: "Answers",
      value: "answer"
    },
    {
      label: "Start Time",
      value: "startTime"
    },
    {
      label: "End Time",
      value: "endTime"
    },
    {
      label: "Image",
      value: "image"
    }
  ];

  const json2csvParser = new json2csv({ fields });
  const csv = json2csvParser.parse(ecmReports);

  let currentDate = new Date();

  var pathFile =
    "./public/csv/" +
    "ecmWiseReport_Of_evidenceId_" +
    evidenceId +
    "_" +
    moment(currentDate)
      .tz("Asia/Kolkata")
      .format("YYYY_MM_DD HH_mm") +
    ".csv";

     

  let transporter = nodemailer.createTransport({
      port: 465,
      host: 'email-smtp.us-east-1.amazonaws.com',
      secure: true,
      auth: {
        user: process.env.AWS_ACCESS_KEY_ID,
        pass: process.env.AWS_SECRET_ACCESS_KEY,
      },
      debug: true
  });

  fs.writeFile(pathFile, csv, function(err, data) {
    if (err) {
      throw err;
    }
  });

  let directoryName =
    "./public/csvFileBackup/" +
    moment(currentDate)
      .tz("Asia/Kolkata")
      .format("YYYY_MM_DD ");

  mkdirp(directoryName, function(err) {
    if (err) {
      if (process.env.NODE_ENV == "development") {
        console.error(err);
      }
    } else {
      if (process.env.NODE_ENV == "development") {
        console.log("Done!");
      }
    }
  });

  fs.readdir("./public/csv/", (err, files) => {
    let mailOptions = {
      to: process.env.REPORT_RECEIEVRS,
      subject: "csv file",
      from: process.env.REPORT_FROM_EMAIL,
      text: "",
      attachments: [
        {
          filename: "",
          content: ""
        }
      ]
    };

    if (files.length == 9) {
      files.forEach(file => {
        var readStream = fs.createReadStream("./public/csv/" + file, "utf8");
        let data = "";

        readStream
          .on("data", function(chunk) {
            data += chunk;
          })
          .on("end", function() {
            mailOptions.attachments.push({
              filename: file,
              content: new Buffer(data, "utf-8")
            });

            if (mailOptions.attachments.length == 9) {
              // transporter.sendMail(mailOptions, function(error, info) {
              //   if (error) {
              //     throw error;
              //   } else {
              //     console.log(`Email Successfully sent `);
              //   }
              // });
            }
          });

        fs.rename(
          "./public/csv/" + file,
          "./public/csvFileBackup/" +
            moment(currentDate)
              .tz("Asia/Kolkata")
              .format("YYYY_MM_DD ") +
            "/" +
            file,
          function(err) {
            if (err) throw err;
            if (process.env.NODE_ENV == "development") {
              console.log("moved successfully");
            }
          }
        );
      });
    }
  });

  return csv;
};

module.exports = {
  getCSVData: getCSVData
};
