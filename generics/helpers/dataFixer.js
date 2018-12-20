
const processData = async function(schoolId) {

  let submissionQuery = {
    ["programInformation.name"]: process.env.PROGRAM_NAME_FOR_SCHEDULE
  };

  if(schoolId!='all'){
    console.log('specific');
    submissionQuery = {
      ["programInformation.name"]: process.env.PROGRAM_NAME_FOR_SCHEDULE,
      ["schoolInformation.externalId"]: schoolId
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
      evidences: 1,
      answers: 1
    }
  );


  if(!submissionDocuments){
    console.log('All fixes done!')
    return;
  }
 
  var update = {};

  for(var key in submissionDocuments){

    

  var newEv = new Array();

    submissionDocument = submissionDocuments[key]
    update = submissionDocument.toObject();

    console.log('Fixing for School Id '+submissionDocument.schoolInformation._id);
    console.log('Fixing for School Name'+submissionDocument.schoolInformation.name);
    console.log('Fixing for School External Id '+submissionDocument.schoolInformation.externalId);

    //update.answers = {};

    for(var evidence in submissionDocument.evidences){

        

      for(var subIndex in submissionDocument.evidences[evidence].submissions){
            for(var answerKey in submissionDocument.evidences[evidence].submissions[subIndex].answers){
                update.evidences[evidence].submissions[subIndex].answers[answerKey].payload.filesNotUploaded = new Array();
                //update.answers[answerKey] = update.evidences[evidence].submissions[subIndex].answers[answerKey];
            }
        }
      }

      for(var answerKey in update.answers){
        let answerInstance = submissionDocument.answers[answerKey];
        if(answerInstance.payload){
          update.answers[answerKey].payload.filesNotUploaded = new Array();
        }
      }
 

      let updateObj={$set:{evidences:update.evidences,answers:update.answers,isDataFixDone:true}};

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
