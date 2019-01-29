const csv = require("csvtojson");

module.exports = class Assessors {

  async schools(req) {
    return new Promise(async (resolve, reject) => {
      try {

        let schools = new Array
        let responseMessage = "Not authorized to fetch schools for this user"

        if (_.includes(req.userDetails.allRoles, "ASSESSOR") || _.includes(req.userDetails.allRoles, "LEAD_ASSESSOR")) {

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
              $project: {
                "schools": 1,
                "schoolDocuments._id": 1,
                "schoolDocuments.externalId": 1,
                "schoolDocuments.name": 1,
                "schoolDocuments.addressLine1": 1,
                "schoolDocuments.addressLine2": 1,
                "schoolDocuments.city": 1,
                "schoolDocuments.state": 1
              }
            }
          ];

          const assessorsDocument = await database.models["school-assessors"].aggregate(assessorSchoolsQueryObject)

          let assessor
          let submissions
          let schoolPAISubmissionStatus = new Array

          for (let pointerToAssessorDocumentArray = 0; pointerToAssessorDocumentArray < assessorsDocument.length; pointerToAssessorDocumentArray++) {

            assessor = assessorsDocument[pointerToAssessorDocumentArray];

            submissions = await database.models.submissions.find(
              {
                schoolId: {
                  $in: assessor.schools
                },
                "evidences.PAI.isSubmitted": true
              },
              {
                "schoolId": 1
              }
            )

            schoolPAISubmissionStatus = submissions.reduce(
              (ac, school) => ({ ...ac, [school.schoolId.toString()]: true }), {})

            assessor.schoolDocuments.forEach(assessorSchool => {
              if (schoolPAISubmissionStatus[assessorSchool._id.toString()]) {
                assessorSchool.isParentInterviewCompleted = true
              } else {
                assessorSchool.isParentInterviewCompleted = false
              }
              schools.push(assessorSchool)
            })

          }

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
        if (!req.files || !req.files.assessors) {
          let responseMessage = "Bad request.";
          return resolve({ status: 400, message: responseMessage })
        }
        let assessorData = await csv().fromString(req.files.assessors.data.toString());
        const assessorUploadCount = assessorData.length;

        let schoolQueryList = {};
        let programQueryList = {};
        let evaluationFrameworkQueryList = {};

        assessorData.forEach(assessor => {
          assessor.schools.split(",").forEach(assessorSchool => {
            if (assessorSchool)
              schoolQueryList[assessorSchool.trim()] = assessorSchool.trim()
          })

          programQueryList[assessor.externalId] = assessor.programId

          evaluationFrameworkQueryList[assessor.externalId] = assessor.frameworkId

        });


        let schoolsFromDatabase = await database.models.schools.find({
          externalId: { $in: Object.values(schoolQueryList) }
        }, {
            externalId: 1
          });


        let programsFromDatabase = await database.models.programs.find({
          externalId: { $in: Object.values(programQueryList) }
        });

        let evaluationFrameworksFromDatabase = await database.models["evaluation-frameworks"].find({
          externalId: { $in: Object.values(evaluationFrameworkQueryList) }
        }, {
            externalId: 1
          });


        const schoolsData = schoolsFromDatabase.reduce(
          (ac, school) => ({ ...ac, [school.externalId]: school._id }), {})

        const programsData = programsFromDatabase.reduce(
          (ac, program) => ({ ...ac, [program.externalId]: program }), {})

        const evaluationFrameworksData = evaluationFrameworksFromDatabase.reduce(
          (ac, evaluationFramework) => ({ ...ac, [evaluationFramework.externalId]: evaluationFramework._id }), {})

        const roles = {
          ASSESSOR: "assessors",
          LEAD_ASSESSOR: "leadAssessors",
          PROJECT_MANAGER: "projectManagers",
          PROGRAM_MANAGER: "programManagers"
        };

        const creatorId = req.userDetails.userId;

        assessorData = await Promise.all(assessorData.map(async (assessor) => {
          let assessorSchoolArray = new Array
          assessor.schools.split(",").forEach(assessorSchool => {
            if (schoolsData[assessorSchool.trim()])
              assessorSchoolArray.push(schoolsData[assessorSchool.trim()])
          })

          assessor.schools = assessorSchoolArray
          assessor.programId = programsData[assessor.programId]._id
          assessor.createdBy = assessor.updatedBy = creatorId


          let fieldsWithOutSchool = {};
          Object.keys(database.models['school-assessors'].schema.paths).forEach(fieldName => {
            if (fieldName != 'schools' && assessor[fieldName]) fieldsWithOutSchool[fieldName] = assessor[fieldName];
          })

          let updateObject;
          if (assessor.schoolOperation == "UPDATE") {
            updateObject = { $set: { schools: assessor.schools, ...fieldsWithOutSchool } }
          }

          else if (assessor.schoolOperation == "ADD") {
            updateObject = { $addToSet: { schools: assessor.schools }, $set: fieldsWithOutSchool };
          }

          else if (assessor.schoolOperation == "DELETE"){
            updateObject = { $pull: { schools: { $in: assessor.schools } }, $set: fieldsWithOutSchool };
          }

          let programFrameworkRoles;
          let assessorRole;
          let assessorCsvDataProgramId
          let assessorCsvDataEvaluationFrameworkId
          let assessorProgramComponents
          let indexOfComponents

          if (assessorUploadCount === assessorData.length) {
            assessorCsvDataProgramId = programQueryList[assessor.externalId]
            assessorCsvDataEvaluationFrameworkId = evaluationFrameworkQueryList[assessor.externalId]
            assessorProgramComponents = programsData[assessorCsvDataProgramId].components

            indexOfComponents = assessorProgramComponents.findIndex(component => {
              return component.id.toString() == evaluationFrameworksData[assessorCsvDataEvaluationFrameworkId].toString()
            });

            if (indexOfComponents >= 0) {
              programFrameworkRoles = assessorProgramComponents[indexOfComponents].roles
              assessorRole = roles[assessor.role];

              //constructing program roles
              Object.keys(programFrameworkRoles).forEach(role => {
                let roleIndex = programFrameworkRoles[role].users.findIndex(user => user === assessor.userId);

                if (role === assessorRole) {
                  if (roleIndex < 0) {
                    programFrameworkRoles[role].users.push(assessor.userId);
                  }
                }
                else {
                  if ((roleIndex > 0)) {
                    programFrameworkRoles[role].users.splice(roleIndex, 1);
                  }
                  if (assessorRole && !programFrameworkRoles[assessorRole].users.includes(assessor.userId))
                    programFrameworkRoles[assessorRole].users.push(assessor.userId);
                }

              })
            }

            if (programsData[assessorCsvDataProgramId].components[indexOfComponents]) {
              programsData[assessorCsvDataProgramId].components[indexOfComponents].roles = programFrameworkRoles;
            }
          }

          return database.models["school-assessors"].findOneAndUpdate({ userId: assessor.userId }, updateObject,
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              returnNewDocument: true
            });

        })).catch(error => {
          return reject({ message: error });
        });

        Promise.all(Object.values(programsData).map(async (program) => {
          let queryObject = {
            _id: program._id
          }

          await database.models.programs.findOneAndUpdate(
            queryObject,
            { $set: { "components": program.components } }
          );
        })).catch(err => {
          return reject({ message: error });
        })


        let responseMessage = "Assessor record created successfully."

        let response = { message: responseMessage };

        return resolve(response);

      } catch (error) {
        return reject({ message: error });
      }

    })
  }

};
