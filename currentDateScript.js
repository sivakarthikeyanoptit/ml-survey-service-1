let MongoClient = require("mongodb").MongoClient;
let url = "mongodb://localhost:27017/sl-assessment";

MongoClient.connect(url, function (err, db) {
    let dbo = db.db("sl-assessment");
    const submissionsCollection = dbo.collection("submissions")
    submissionsCollection.find({}).project({ evidences: 1 }).toArray((err, submissionData) => {
        submissionData['evidenceSubmissions'] = []
        submissionData.forEach(eachSubmission => {
            Object.values(eachSubmission.evidences).forEach(singleEvidence => {
                if (singleEvidence.submissions) {
                    singleEvidence.submissions.forEach(eachIndividualSubmission => {
                        submissionData.evidenceSubmissions.push(eachIndividualSubmission);
                    });
                }

            })
            let findQuery = { _id: eachSubmission._id }
            let updateQuery = { $set: { evidenceSubmissions: submissionData.evidenceSubmissions } }
            submissionsCollection.updateOne(findQuery, updateQuery).then(() => {
                console.log("updated successfully")
            })
        })
    })
});