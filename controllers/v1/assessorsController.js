const csv = require("csvtojson");
let shikshalokam = require(ROOT_PATH + "/generics/helpers/shikshalokam");
let uniqueUserIdArray = [];
let userAndParentId = [];

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

          const assessorsDocument = await database.models.schoolAssessors.aggregate(assessorSchoolsQueryObject)

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

        let schoolQueryList = {};
        let programQueryList = {};
        let evaluationFrameworkQueryList = {};
        let skippedDocumentCount = 0;

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

        let evaluationFrameworksFromDatabase = await database.models.evaluationFrameworks.find({
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
          if (programsData[assessor.programId]) {
            assessor.programId = programsData[assessor.programId]._id;
          } else {
            assessor.programId = null;
            skippedDocumentCount += 1;
          }
          assessor.createdBy = assessor.updatedBy = creatorId


          let fieldsWithOutSchool = {};
          Object.keys(database.models.schoolAssessors.schema.paths).forEach(fieldName => {
            if (fieldName != 'schools' && assessor[fieldName]) fieldsWithOutSchool[fieldName] = assessor[fieldName];
          })

          let updateObject;
          if (assessor.schoolOperation == "OVERRIDE") {
            updateObject = { $set: { schools: assessor.schools, ...fieldsWithOutSchool } }
          }

          else if (assessor.schoolOperation == "APPEND") {
            updateObject = { $addToSet: { schools: assessor.schools }, $set: fieldsWithOutSchool };
          }

          else if (assessor.schoolOperation == "REMOVE") {
            updateObject = { $pull: { schools: { $in: assessor.schools } }, $set: fieldsWithOutSchool };
          }

          let programFrameworkRoles;
          let assessorRole;
          let assessorCsvDataProgramId
          let assessorCsvDataEvaluationFrameworkId
          let assessorProgramComponents
          let indexOfComponents

          assessorCsvDataProgramId = programQueryList[assessor.externalId]
          assessorCsvDataEvaluationFrameworkId = evaluationFrameworkQueryList[assessor.externalId]
          assessorProgramComponents = programsData[assessorCsvDataProgramId] ? programsData[assessorCsvDataProgramId].components : []

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
                if ((roleIndex >= 0)) {
                  programFrameworkRoles[role].users.splice(roleIndex, 1);
                }

                if (!assessorRole || !programFrameworkRoles[assessorRole]) skippedDocumentCount += 1;

                if (assessorRole && programFrameworkRoles[assessorRole] && !programFrameworkRoles[assessorRole].users.includes(assessor.userId))
                  programFrameworkRoles[assessorRole].users.push(assessor.userId);
              }

            })
          }

          if (programsData[assessorCsvDataProgramId] && programsData[assessorCsvDataProgramId].components[indexOfComponents]) {
            programsData[assessorCsvDataProgramId].components[indexOfComponents].roles = programFrameworkRoles;
          }


          return database.models.schoolAssessors.findOneAndUpdate({ userId: assessor.userId }, updateObject,
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              returnNewDocument: true
            });

        })).catch(error => {
          return reject({
            status: 500,
            message: error,
            errorObject: error
          });
        });

        Promise.all(Object.values(programsData).map(async (program) => {
          let queryObject = {
            _id: program._id
          }

          await database.models.programs.findOneAndUpdate(
            queryObject,
            { $set: { "components": program.components } }
          );
        })).catch(error => {
          return reject({
            status: 500,
            message: error,
            errorObject: error
          });
        })


        let responseMessage = "Assessor record created successfully."

        let response = { message: responseMessage };

        if (skippedDocumentCount > 0) {
          let responseMessage = `Not all records were inserted/updated.`;
          return resolve({ status: 400, message: responseMessage })
        }

        return resolve(response);

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })

  }

  async uploadForPortal(req) {

    return new Promise(async (resolve, reject) => {

      try {
        if (!req.files || !req.files.assessors) {
          throw "Bad request"
        }


        let programController = new programsBaseController;
        let evaluationFrameworkController = new evaluationFrameworksBaseController

        let programId = req.query.programId;

        if (!programId) {
          throw "Program Id is missing"
        }

        let componentId = req.query.componentId;

        if (!componentId) {
          throw "Component Id is missing"
        }

        let programDocument = await programController.programDocument([programId]);

        if (!programDocument) {
          throw "Bad request"
        }

        let evaluationFrameworkDocument = await evaluationFrameworkController.evaluationFrameworkDocument(new Array(componentId), ["_id"])

        if (!evaluationFrameworkDocument) {
          throw "Bad request"
        }

        let assessorData = await csv().fromString(req.files.assessors.data.toString());
        let schoolQueryList = {};
        let skippedDocumentCount = 0;

        assessorData.forEach(assessor => {
          assessor.schools.split(",").forEach(assessorSchool => {
            if (assessorSchool)
              schoolQueryList[assessorSchool.trim()] = assessorSchool.trim()
          })
        })

        let schoolsDocument = await database.models.schools.find({
          externalId: { $in: Object.values(schoolQueryList) }
        }, {
            externalId: 1
          });

        const schoolsData = schoolsDocument.reduce(
          (ac, school) => ({ ...ac, [school.externalId]: school._id }), {})

        const programsData = programDocument.reduce(
          (ac, program) => ({ ...ac, [program._id]: program }), {})

        const evaluationFrameworksData = evaluationFrameworkDocument.reduce(
          (ac, evaluationFramework) => ({ ...ac, [evaluationFramework._id]: evaluationFramework._id }), {})

        const roles = {
          ASSESSOR: "assessors",
          LEAD_ASSESSOR: "leadAssessors",
          PROJECT_MANAGER: "projectManagers",
          PROGRAM_MANAGER: "programManagers"
        };

        const creatorId = req.userDetails.userId;
        let finalResult;

        let externalIds = [];
        assessorData.forEach(assessor => {
          if (!externalIds.includes(assessor.externalId)) externalIds.push(assessor.externalId)
          if (!externalIds.includes(assessor.parentId)) externalIds.push(assessor.parentId)
        })
        await Promise.all(externalIds.map(async (singleExternalId) => {
          finalResult = await this.generateUniqueUserId(req.rspObj.userToken, singleExternalId)
        }))

        assessorData = await Promise.all(assessorData.map(async (assessor) => {

          let assessorSchoolArray = new Array
          // finalResult = [await shikshalokam.checkUser(req.rspObj.userToken, assessor.externalId), await shikshalokam.checkUser(req.rspObj.userToken, assessor.parentId)]
          let userId = finalResult.find(user => user.externalId == assessor.externalId)
          assessor.schools.split(",").forEach(assessorSchool => {
            if (schoolsData[assessorSchool.trim()])
              assessorSchoolArray.push(schoolsData[assessorSchool.trim()])
          })

          assessor.schools = assessorSchoolArray
          if (programsData[programId]) {
            assessor.programId = programsData[programId]._id;
          } else {
            assessor.programId = null;
            skippedDocumentCount += 1;
          }
          assessor.createdBy = assessor.updatedBy = creatorId

          let fieldsWithOutSchool = {};
          Object.keys(database.models.schoolAssessors.schema.paths).forEach(fieldName => {
            if (fieldName != 'schools' && assessor[fieldName]) fieldsWithOutSchool[fieldName] = assessor[fieldName];
          })

          let updateObject;
          if (fieldsWithOutSchool.parentId) {
            let parentId = finalResult.find(user => user.externalId == fieldsWithOutSchool.parentId)
            fieldsWithOutSchool.parentId = parentId.id
          }
          if (assessor.schoolOperation == "OVERRIDE") {
            updateObject = { $set: { schools: assessor.schools, ...fieldsWithOutSchool } }
          }

          else if (assessor.schoolOperation == "APPEND") {
            updateObject = { $addToSet: { schools: assessor.schools }, $set: fieldsWithOutSchool };
          }

          else if (assessor.schoolOperation == "REMOVE") {
            updateObject = { $pull: { schools: { $in: assessor.schools } }, $set: fieldsWithOutSchool };
          }
          let assessorCsvDataProgramId

          let programFrameworkRoles;
          let assessorRole;
          let assessorCsvDataEvaluationFrameworkId
          let assessorProgramComponents
          let indexOfComponents

          assessorCsvDataProgramId = programId
          assessorCsvDataEvaluationFrameworkId = componentId
          assessorProgramComponents = programsData[assessorCsvDataProgramId] ? programsData[assessorCsvDataProgramId].components : []

          indexOfComponents = assessorProgramComponents.findIndex(component => {
            return component.id.toString() == evaluationFrameworksData[assessorCsvDataEvaluationFrameworkId].toString()
          });

          if (indexOfComponents >= 0) {
            programFrameworkRoles = assessorProgramComponents[indexOfComponents].roles
            assessorRole = roles[assessor.role];

            Object.keys(programFrameworkRoles).forEach(role => {
              let roleIndex = programFrameworkRoles[role].users.findIndex(user => user === userId.id);

              if (role === assessorRole) {
                if (roleIndex < 0) {
                  programFrameworkRoles[role].users.push(userId.id);
                }
              }
              else {
                if ((roleIndex >= 0)) {
                  programFrameworkRoles[role].users.splice(roleIndex, 1);
                }

                if (!assessorRole || !programFrameworkRoles[assessorRole]) skippedDocumentCount += 1;

                if (assessorRole && programFrameworkRoles[assessorRole] && !programFrameworkRoles[assessorRole].users.includes(userId.id))
                  programFrameworkRoles[assessorRole].users.push(userId.id);
              }

            })
          }

          if (programsData[assessorCsvDataProgramId] && programsData[assessorCsvDataProgramId].components[indexOfComponents]) {
            programsData[assessorCsvDataProgramId].components[indexOfComponents].roles = programFrameworkRoles;
          }

          return database.models.schoolAssessors.findOneAndUpdate({ userId: userId.id }, updateObject,
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              returnNewDocument: true
            });

        })).catch(error => {
          throw error
        });

        Promise.all(Object.values(programsData).map(async (program) => {
          let queryObject = {
            _id: program._id
          }

          await database.models.programs.findOneAndUpdate(
            queryObject,
            { $set: { "components": program.components } }
          );
        })).catch(error => {
          throw error
        })


        let responseMessage = "Assessor record created successfully."

        let response = { message: responseMessage };

        if (skippedDocumentCount > 0) {
          let responseMessage = `Not all records were inserted/updated.`;
          return resolve({ status: 400, message: responseMessage })
        }

        return resolve(response);

      } catch (error) {
        return reject({
          status: 500,
          message: error,
          errorObject: error
        });
      }

    })
  }

  generateUniqueUserId(token, id) {
    return new Promise(async (resolve, reject) => {
      if (!(uniqueUserIdArray.includes(id))) {
        uniqueUserIdArray.push(id);
        let userId = await shikshalokam
          .checkUser(token, id)

        userAndParentId.push({ id: userId[0].id, externalId: id })
      }
      return resolve(userAndParentId);
    })

  }

};