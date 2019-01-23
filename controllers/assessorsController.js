const csv = require("csvtojson");

module.exports = class Assessors {

  async schools(req) {
    return new Promise(async (resolve, reject) => {

      let schools = new Array
      let responseMessage = "Not authorized to fetch schools for this user"

      if (_.includes(req.userDetails.allRoles, "ASSESSOR") || _.includes(req.userDetails.allRoles, "LEAD_ASSESSOR")) {
        req.query = { userId: req.userDetails.userId };
        req.populate = {
          path: 'schools',
          select: ["name", "externalId", "addressLine1", "addressLine2", "city", "state", "isParentInterviewCompleted"]
        };
        const queryResult = await controllers.schoolAssessorsController.populate(req)
        queryResult.result.forEach(assessor => {
          assessor.schools.forEach(assessorSchool => {
            let currentSchool = assessorSchool.toObject();
            if (!currentSchool.isParentInterviewCompleted) {
              currentSchool.isParentInterviewCompleted = false;
            }
            schools.push(currentSchool)
          })
        });
        responseMessage = "School list fetched successfully"
      }

      return resolve({
        message: responseMessage,
        result: schools
      });

    }).catch(error => {
      reject({
        error: true,
        status: 404,
        message: "No record found"
      });
    })
  }


  async upload(req) {

    return new Promise(async (resolve, reject) => {

      try {
        if (!req.files || !req.files.assessors) {
          let responseMessage = "Bad request."
          return resolve({ status: 400, message: responseMessage })
        }
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

        // let programsData = {}
        // programsFromDatabase.forEach(programData => {
        //   programData.components.forEach(eachComponent => {
        //     programsData[programData.externalId] = eachComponent
        //   })
        // })

        const programsData = programsFromDatabase.reduce(
          (ac, program) => ({ ...ac, [program.externalId]: program }), {})

        const evaluationFrameworksData = evaluationFrameworksFromDatabase.reduce(
          (ac, evaluationFramework) => ({ ...ac, [evaluationFramework.externalId]: evaluationFramework._id }), {})

        // let programRoles = new Array;
        const roles = {
          ASSESSOR: "assessors",
          LEAD_ASSESSOR: "leadAssessors",
          PROJECT_MANAGER: "projectManagers",
          PROGRAM_MANAGER: "programManagers"
        };

        assessorData = await Promise.all(assessorData.map(async (assessor) => {
          let assessorSchoolArray = new Array
          assessor.schools.split(",").forEach(assessorSchool => {
            assessorSchoolArray.push(schoolsData[assessorSchool.trim()])
          })

          assessor.schools = assessorSchoolArray
          assessor.programId = programsData[assessor.programId]._id
          assessor.createdBy = assessor.updatedBy

          let updateObject;

          let otherFields = {
            'email': assessor.email,
            'name': assessor.name,
            'externalId': assessor.externalId,
            'role': assessor.role
          }
          if (assessor.operation == "Update") {
            updateObject = { $set: { schools: assessor.schools, ...otherFields } }
          }

          else if (assessor.operation == "Add") {
            updateObject = { $addToSet: { schools: assessor.schools }, $set: otherFields };
          }

          else {
            updateObject = { $pull: { schools: { $in: assessor.schools } }, $set: otherFields };
          }

          assessor = await database.models["school-assessors"].findOneAndUpdate({ userId: assessor.userId }, updateObject)

          let programFrameworkRoles;
          let assessorRolePerMap;
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
              assessorRolePerMap = roles[assessor.role]
              Object.keys(programFrameworkRoles).forEach(role => {

                let roleIndex = programFrameworkRoles[role].users.findIndex(user => user === assessor.userId);

                if (role === assessorRolePerMap) {
                  if (roleIndex < 0) {
                    programFrameworkRoles[role].users.push(assessor.userId)
                  }
                }
                else if ((roleIndex > 0)) {
                  programFrameworkRoles[role].users.splice(roleIndex, 1)
                }

              })
            }

            if (programsData[assessorCsvDataProgramId].components[indexOfComponents]) {

              programsData[assessorCsvDataProgramId].components[indexOfComponents].roles = programFrameworkRoles;
            }
          }
          return assessor
        }));

        await Promise.all(Object.values(programsData).map(async (program) => {
          let queryObject = {
            _id: program._id
          }

          await database.models.programs.findOneAndUpdate(
            queryObject,
            { $set: { "components": program.components } }
          );
        }))


        let responseMessage = "Assessor record created successfully."

        let response = { message: responseMessage };

        return resolve(response);

      } catch (error) {
        return reject({ message: error });
      }

    })
  }

};
