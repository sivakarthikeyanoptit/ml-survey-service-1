const csv = require("csvtojson");

module.exports = class Assessors {

  async schools(req) {
    return new Promise(async (resolve,reject) => {
      try {

        let schools = new Array
        let responseMessage = "Not authorized to fetch schools for this user"
  
        if (_.includes(req.userDetails.allRoles,"ASSESSOR") || _.includes(req.userDetails.allRoles,"LEAD_ASSESSOR")) {
          
          let assessorSchoolsQueryObject = [
            {
              $match: {
                userId: req.userDetails.userId
              }
            },
            {
              $lookup: {
                from: "schools",
                localField: "schools",
                foreignField: "_id",
                as: "schoolDocuments"
              }
            },
            { 
              $project : { 
                "schoolDocuments._id" : 1,
                "schoolDocuments.externalId" : 1 , 
                "schoolDocuments.name" : 1 ,
                "schoolDocuments.addressLine1" : 1 , 
                "schoolDocuments.addressLine2" : 1 ,
                "schoolDocuments.city" : 1 , 
                "schoolDocuments.state" : 1
              }
            },
            {$unwind: "$schoolDocuments"},
            {
              $match: { 
                $or: [ 
                  { "schoolDocuments.name": { $regex: new RegExp(req.searchText,'i')} },
                  { "schoolDocuments.externalId": { $regex: new RegExp(req.searchText)} }
                ] 
              }
            },
            {
              $skip : req.pageSize * (req.pageNo - 1) 
            },
            {
              $limit : req.pageSize
            },
            {
              $group: {
                _id: "$_id",
                schools :{"$push":"$schoolDocuments"}
              }
            }
          ];

          console.log(assessorSchoolsQueryObject)
          const assessorsDocument = await database.models["school-assessors"].aggregate(assessorSchoolsQueryObject)

          console.log(assessorsDocument)
          assessorsDocument.forEach(assessor => {
            assessor.schools.forEach(assessorSchool => {
              schools.push(assessorSchool)
            })
          });
          responseMessage = "School list fetched successfully"
        }
  
        return resolve({
          message: responseMessage,
          result: schools
        });

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    });
  }


  async upload(req) {

    return new Promise(async (resolve, reject) => {

      try {
        let assessorData = await csv().fromString(req.files.assessors.data.toString());
        const assessorUploadCount = assessorData.length

        let schoolQueryList = {}
        let programQueryList = {}
        let evaluationFrameworkQueryList = {}

        assessorData.forEach(assessor => {
          assessor.schools.split(",").forEach(assessorSchool => {
            schoolQueryList[assessorSchool.trim()] = assessorSchool.trim()
          })

          programQueryList[assessor.externalId] = assessor.programId
          evaluationFrameworkQueryList[assessor.externalId] = assessor.frameworkId
        });


        let schoolsFromDatabase = await database.models.schools.find({
          externalId : { $in: Object.values(schoolQueryList) }
        }, {
          externalId: 1
        });

        let programsFromDatabase = await database.models.programs.find({
          externalId : { $in: Object.values(programQueryList) }
        });

        let evaluationFrameworksFromDatabase = await database.models["evaluation-frameworks"].find({
          externalId : { $in: Object.values(evaluationFrameworkQueryList) }
        }, {
          externalId: 1
        });

        const schoolsData = schoolsFromDatabase.reduce( 
          (ac, school) => ({...ac, [school.externalId]: school._id }), {} )
        
        const programsData = programsFromDatabase.reduce( 
          (ac, program) => ({...ac, [program.externalId]: program }), {} )

        const evaluationFrameworksData = evaluationFrameworksFromDatabase.reduce( 
            (ac, evaluationFramework) => ({...ac, [evaluationFramework.externalId]: evaluationFramework._id }), {} )

        const creatorId = req.userDetails.userId

        assessorData = await Promise.all(assessorData.map(async (assessor) => {
          
          let assessorSchoolArray = new Array
          assessor.schools.split(",").forEach(assessorSchool => {
            assessorSchoolArray.push(schoolsData[assessorSchool.trim()])
          })
          assessor.schools = assessorSchoolArray
          assessor.programId = programsData[assessor.programId]._id
          assessor.createdBy = assessor.updatedBy = creatorId

          assessor = await database.models["school-assessors"].findOneAndUpdate(
            { userId: assessor.userId },
            assessor,
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              returnNewDocument : true
            }
          );
          return assessor
        }));


        const assessorRoleMapping = {
          ASSESSOR: "assessors",
          LEAD_ASSESSOR: "leadAssessors",
          PROJECT_MANAGER: "projectManagers",
          PROGRAM_MANAGER:"programManagers"
        };

        if(assessorUploadCount === assessorData.length) {

          let assessorElement = new Object;
          let assessorProgramComponents = new Array
          let indexOfEvaluationFrameworkInProgram
          let programFrameworkRoles = new Array
          let assessorRolePerMap
          let userIdIndexInRole
          let assessorCsvDataProgramId
          let assessorCsvDataEvaluationFrameworkId

          for (let assessorIndexInData = 0; assessorIndexInData < assessorData.length; assessorIndexInData++) {
            assessorElement = assessorData[assessorIndexInData];
            
            assessorCsvDataProgramId = programQueryList[assessorElement.externalId] 
            assessorCsvDataEvaluationFrameworkId = evaluationFrameworkQueryList[assessorElement.externalId] 
            assessorProgramComponents = programsData[assessorCsvDataProgramId].components
            indexOfEvaluationFrameworkInProgram = assessorProgramComponents.findIndex( component => component.id.toString() === evaluationFrameworksData[assessorCsvDataEvaluationFrameworkId].toString() );
            
            if(indexOfEvaluationFrameworkInProgram >= 0) {
              programFrameworkRoles = assessorProgramComponents[indexOfEvaluationFrameworkInProgram].roles
              assessorRolePerMap = assessorRoleMapping[assessorElement.role]
              Object.keys(programFrameworkRoles).forEach(role => {
                if(role === assessorRolePerMap) {
                  if(programFrameworkRoles[role].users.findIndex( user => user === assessorElement.userId) < 0) {
                    programFrameworkRoles[role].users.push(assessorElement.userId)
                  }
                } else if (programFrameworkRoles[role].users.findIndex( user => user === assessorElement.userId) > 0) {
                  userIdIndexInRole = programFrameworkRoles[role].users.findIndex( user => user === assessorElement.userId)
                  programFrameworkRoles[role].users.splice(userIdIndexInRole,1)
                }
              })
            }

          }

          await Promise.all(Object.values(programsData).map(async (program) => {

            let queryObject = {
              _id: ObjectId(program._id.toString())
            }
            let updateObject = {}

            updateObject.$set = {
              ["components"]: program.components
            }

            await database.models.programs.findOneAndUpdate(
              queryObject,
              updateObject
            );

            return
          }));

        } else {
          throw "Something went wrong, not all records were inserted/updated."
        }

        let responseMessage = "Assessor record created successfully."

        let response = { message: responseMessage };

        return resolve(response);

      } catch (error) {
        return reject({message:error});
      }

    })
  }

};
