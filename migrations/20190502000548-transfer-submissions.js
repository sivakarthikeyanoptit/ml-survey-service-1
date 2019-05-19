module.exports = {
  async up(db) {
    
    let sourceDB = global.transferFromDb

    let submissionIds = await sourceDB.collection('submissions').find({}).project({_id: 1}).toArray();
    
    let solutionDocuments = await db.collection('solutions').find({}).project({entityTypeId: 1,entityType : 1}).toArray();
    let solutionDocumentMap = {}

    solutionDocuments.forEach(solution => {
      solutionDocumentMap[solution._id.toString()] = {
        entityTypeId: solution.entityTypeId,
        entityType: solution.entityType
      }
    });

    let chunkOfSubmissionsIdsDocument = _.chunk(submissionIds, 10)

    let oldSubmissionDocumentsArray = new Array

    await db.collection('submissions').createIndex( { entityId: 1} )

    await db.collection('submissions').createIndex( { entityExternalId: 1} )

    await db.collection('submissions').createIndex( { solutionId : 1} )

    await db.collection('submissions').createIndex( { solutionExternalId: 1} )

    await db.collection('submissions').createIndex( { entityTypeId : 1} )

    await db.collection('submissions').createIndex( {"entityType": "text" } )

    for (let pointerTosubmissionIdDocument = 0; pointerTosubmissionIdDocument < chunkOfSubmissionsIdsDocument.length; pointerTosubmissionIdDocument++) {
    
      let fetchSubmissionIds = new Array
      chunkOfSubmissionsIdsDocument[pointerTosubmissionIdDocument].forEach(submissionId => {
        fetchSubmissionIds.push(submissionId._id)
      })

      oldSubmissionDocumentsArray = await sourceDB.collection('submissions').find(
        {
          _id: {
            $in: fetchSubmissionIds
          }
        }
      ).toArray();

      await Promise.all(oldSubmissionDocumentsArray.map(async (eachSubmissionDocument) => {
        
        eachSubmissionDocument.isDeleted = false
        eachSubmissionDocument.criteria = eachSubmissionDocument.criterias
        eachSubmissionDocument.entityId = (eachSubmissionDocument.entityId) ? eachSubmissionDocument.entityId : eachSubmissionDocument.schoolId
        eachSubmissionDocument.entityExternalId = (eachSubmissionDocument.entityExternalId) ? eachSubmissionDocument.entityExternalId : eachSubmissionDocument.schoolExternalId
        eachSubmissionDocument.entityInformation = (eachSubmissionDocument.entityInformation) ? eachSubmissionDocument.entityInformation : eachSubmissionDocument.schoolInformation
        
        if(eachSubmissionDocument.schoolProfile) {
          eachSubmissionDocument.entityProfile = eachSubmissionDocument.schoolProfile
        }

        eachSubmissionDocument.solutionExternalId = eachSubmissionDocument.evaluationFrameworkExternalId
        eachSubmissionDocument.solutionId = eachSubmissionDocument.evaluationFrameworkId

        eachSubmissionDocument.entityTypeId = solutionDocumentMap[eachSubmissionDocument.evaluationFrameworkId.toString()].entityTypeId
        eachSubmissionDocument.entityType = solutionDocumentMap[eachSubmissionDocument.evaluationFrameworkId.toString()].entityType

        try {
          await db.collection('submissions').insertOne(_.omit(eachSubmissionDocument,[
            "schoolProfile",
            "schoolInformation",
            "schoolExternalId",
            "schoolId",
            "criterias",
            "evaluationFrameworkExternalId",
            "evaluationFrameworkId",
            "deleted"
          ]));
        } catch (error) {
          console.log(eachSubmissionDocument._id)
          console.log(error)
        }

        return true

      }))

    }

    global.migrationMsg = "Total submissions transferred - "+submissionIds.length

    return true
  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
