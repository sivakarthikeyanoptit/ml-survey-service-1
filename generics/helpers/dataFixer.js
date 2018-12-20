
const processData = async function(schoolId) {

  let submissionQuery = {
    ["programInformation.name"]: process.env.PROGRAM_NAME_FOR_SCHEDULE,
    isDataFixDone: { $ne: true }
  };

  if(schoolId!='all'){
    console.log('specific');
    submissionQuery = {
      ["programInformation.name"]: process.env.PROGRAM_NAME_FOR_SCHEDULE,
      ["schoolInformation.externalId"]: schoolId,
      isDataFixDone: { $ne: true }
    };
  }

  //let queryObject = "evidences." + evidenceId + "";

  let submissionDocuments = await database.models.submissions.find(
    submissionQuery,
    {
      assessors: 1,
      schoolInformation: 1,
      programInformation: 1,
      status: 1,
      evidences:1,
    }
  );


  if(!submissionDocuments){
    console.log('All fixes done!')
    return;
  }
 
  let update = {};

  for(var key in submissionDocuments){

    

  var newEv = new Array();

    submissionDocument = submissionDocuments[key]
    update = submissionDocument.toObject();

    console.log('Fixing for School Id '+submissionDocument.schoolInformation._id);
    console.log('Fixing for School Name'+submissionDocument.schoolInformation.name);
    console.log('Fixing for School External Id '+submissionDocument.schoolInformation.externalId);

    for(var evidence in submissionDocument.evidences){

        

        for(var subIndex in submissionDocument.evidences[evidence].submissions){
            for(var answerKey in submissionDocument.evidences[evidence].submissions[subIndex].answers){
                update.evidences[evidence].submissions[subIndex].answers[answerKey].payload.filesNotUploaded = new Array();
                
            }
        }
        //console.log("EV length="+newEv.length);
      }

      //console.log(update._id);

      let updateObj={$set:{evidences:update.evidences,isDataFixDone:true}};

      await database.models.submissions.findOneAndUpdate(
             {_id: ObjectId(update._id)},
             updateObj,
             {}
      );

    console.log('Finished data fix for for School Id : '+submissionDocument.schoolInformation._id);
    console.log('Finished data fix for School Name : '+submissionDocument.schoolInformation.name);
    console.log('Finished data fix for external id : '+submissionDocument.schoolInformation.externalId);

  }


};

module.exports = {
  processData: processData
};
