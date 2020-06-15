module.exports = {
  async up(db) {
    
    global.migrationMsg = "Programs added for observations and observation submissions";
    
    let observationsSolution = 
    await db.collection('solutions').find({
      type : "observation",
      isReusable : true
    }).toArray(); 

     let programs = [];
     let programIds = [];
     let newSolutions = {};

    observationsSolution.forEach(observationSolution=>{
       
      let program = {
          "externalId" : observationSolution.externalId,
          "name" : observationSolution.name,
          "description" : observationSolution.description,
          "owner" : observationSolution.author,
          "createdBy" : observationSolution.createdBy,
          "updatedBy" : observationSolution.updatedBy,
          "isDeleted" : false,
          "status" : "active",
          "resourceType" : [ 
              "program"
          ],
          "language" : [ 
              "English"
          ],
          "keywords" : [],
          "concepts" : [],
          "createdFor" : [ 
              "0126427034137395203", 
              "0124487522476933120"
          ],
          "imageCompression" : {
              "quality" : 10
          },
          "components" : [ 
            ObjectID(observationSolution._id.toString())
          ],
          "updatedAt" : new Date(),
          "startDate" : new Date(),
          "endDate" : new Date(),
          "createdAt" : new Date(),
          "isAPrivateProgram" : false
      }

      programIds.push(observationSolution.externalId);
      programs.push(program);

      if( !newSolutions[observationSolution.externalId] ) {

        let newSolution = _.cloneDeep(observationSolution);

        if(newSolution.externalId.includes("TEMPLATE")) {
          newSolution.externalId = newSolution.externalId.replace("-OBSERVATION-TEMPLATE","");
          newSolution.externalId = newSolution.externalId.replace("-TEMPLATE","");
        } else {
          newSolution.externalId = newSolution.externalId + "-BASE-SOLUTION"
        }

        newSolution.isAPrivateProgram =  false;
        newSolutions[observationSolution.externalId] = _.omit(newSolution,["_id"]);
      }

     });

     let programDocuments = await db.collection("programs").insertMany(
       programs
     );

     let programExternalIdToData = programDocuments.ops.reduce(
      (ac, program) => ({
          ...ac,
          [program.externalId]: {
            programName : program.name,
            programExternalId : program.externalId,
            programId : ObjectID(program._id),
            programDescription : program.description
          }
      }), {});

      await Promise.all(observationsSolution.map(async solution => {

        let baseSolution = await db.collection("solutions").insertOne(newSolutions[solution.externalId]);

        let updateSolution = {
          programName : programExternalIdToData[solution.externalId].programName,
          programExternalId : programExternalIdToData[solution.externalId].programExternalId,
          programId : programExternalIdToData[solution.externalId].programId,
          programDescription : programExternalIdToData[solution.externalId].programDescription,
          parentSolutionId :  ObjectID(baseSolution.ops[0]._id),
          isReusable : false,
          isAPrivateProgram : false
        };

        await db.collection("solutions").updateOne({
          _id : solution._id
        },{
          $set : updateSolution
        });

        let observationUpdate = {
          programId : updateSolution.programId,
          programExternalId : updateSolution.programExternalId,
          isAPrivateProgram : false
        }

        await db.collection("observations").updateMany({
          solutionId : solution._id
        },{
          $set : observationUpdate
        });

        await db.collection("observationSubmissions").updateMany({
          solutionId : solution._id
        },{
          $set : observationUpdate
        });

        return;
      }));

      return;

  },

  async down(db) {
    // return await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
