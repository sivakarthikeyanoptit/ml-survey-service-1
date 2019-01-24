let MongoClient = require("mongodb").MongoClient;
let url = "mongodb://localhost:27017/";

MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
    if (err) throw err
    let dbo = db.db("sl-assessment");
    const submissionsCollection = dbo.collection("submissions")
    submissionsCollection.find({}).project({ evidences: 1 }).toArray((err, submissionData) => {

        submissionData.forEach(eachSubmission => {
            eachSubmission['evidenceSubmissions'] = []
            Object.values(eachSubmission.evidences).forEach(singleEvidence => {
                if (singleEvidence.submissions) {
                    singleEvidence.submissions.forEach(eachIndividualSubmission => {
                        delete eachIndividualSubmission.answers
                        eachSubmission.evidenceSubmissions.push(eachIndividualSubmission);
                    });
                }

            })
            let findQuery = { _id: eachSubmission._id }
            let updateQuery = { $set: { evidenceSubmissions: eachSubmission.evidenceSubmissions } }
            submissionsCollection.updateOne(findQuery, updateQuery).then(() => {
                console.log("updated successfully")
            })
        })
    })
}) 